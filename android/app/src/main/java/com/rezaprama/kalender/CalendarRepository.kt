package com.rezaprama.kalender

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.Uri
import android.provider.CalendarContract
import android.util.AtomicFile
import com.rezaprama.kalender.core.AgendaEvent
import com.rezaprama.kalender.core.CalendarMath
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

data class Holiday(val date: LocalDate, val name: String, val nameEn: String, val leave: Boolean, val source: String, val subjectToIsbat: Boolean)
data class HolidayYear(val year: Int, val official: Boolean = false, val updated: String = "", val holidays: List<Holiday> = emptyList())

class HolidayRepository(private val context: Context) {
    private val cache = File(context.filesDir, "holidays")
    private val preferences = context.getSharedPreferences("holiday_versions", Context.MODE_PRIVATE)

    internal fun parse(raw: String, requestedYear: Int): HolidayYear {
        val data = JSONObject(raw)
        require(requestedYear >= 1945 && data.getInt("year") == requestedYear && data.getString("status") == "official")
        val sources = data.getJSONArray("sources")
        val links = buildMap {
            for (i in 0 until sources.length()) {
                val row = sources.getJSONObject(i); val link = row.getString("url"); val uri = Uri.parse(link)
                require(uri.scheme == "https" && uri.host.orEmpty().endsWith(".go.id"))
                put(row.getString("id"), link)
            }
        }
        val rows = data.getJSONArray("holidays")
        require(rows.length() in 1..100)
        val dates = (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            val date = CalendarMath.requireDate(LocalDate.parse(row.getString("date")))
            require(date.year == requestedYear && row.getString("status") == "official")
            val type = row.getString("type"); require(type in setOf("national", "leave"))
            Holiday(date, row.getString("name"), row.getString("nameEn"), type == "leave", links.getValue(row.getString("sourceId")), row.optString("subjectTo") == "isbat")
        }
        require(dates.distinctBy { Triple(it.date, it.leave, it.name) }.size == dates.size)
        val updated = LocalDate.parse(data.getString("updated")).toString()
        return HolidayYear(requestedYear, true, updated, dates)
    }

    suspend fun load(year: Int): HolidayYear = withContext(Dispatchers.IO) {
        val cached = runCatching { parse(AtomicFile(File(cache, "$year.json")).readFully().toString(Charsets.UTF_8), year) }.getOrNull()
        cached ?: runCatching { context.assets.open("official/$year.json").bufferedReader().use { parse(it.readText(), year) } }.getOrDefault(HolidayYear(year))
    }

    suspend fun refresh(year: Int): HolidayYear = withContext(Dispatchers.IO) {
        require(year in 1900..2100)
        val connection = URL("https://kalender.rezaprama.com/api/v1/holidays?year=$year").openConnection() as HttpURLConnection
        connection.connectTimeout = 5000; connection.readTimeout = 10000; connection.instanceFollowRedirects = false
        connection.setRequestProperty("Accept", "application/json")
        val file = AtomicFile(File(cache, "$year.json"))
        if (file.baseFile.exists()) preferences.getString("etag-$year", null)?.let { connection.setRequestProperty("If-None-Match", it) }
        try {
            if (connection.responseCode == 304) return@withContext load(year)
            check(connection.responseCode == 200) { "HTTP ${connection.responseCode}" }
            val buffer = ByteArrayOutputStream()
            connection.inputStream.use { input ->
                val chunk = ByteArray(8192)
                while (true) {
                    val read = input.read(chunk); if (read < 0) break
                    require(buffer.size() + read <= 1024 * 1024) { "Response too large" }; buffer.write(chunk, 0, read)
                }
            }
            val raw = buffer.toString("UTF-8")
            val result = parse(raw, year)
            check(cache.exists() || cache.mkdirs())
            val stream = file.startWrite()
            try { stream.write(raw.toByteArray()); file.finishWrite(stream) } catch (error: Exception) { file.failWrite(stream); throw error }
            preferences.edit().putString("etag-$year", connection.getHeaderField("ETag")).apply()
            result
        } finally { connection.disconnect() }
    }
}

class AgendaStore(context: Context) : SQLiteOpenHelper(context, "agenda.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE, title TEXT NOT NULL, start INTEGER NOT NULL, end INTEGER NOT NULL, all_day INTEGER NOT NULL, zone TEXT NOT NULL, location TEXT NOT NULL, notes TEXT NOT NULL)")
        db.execSQL("CREATE INDEX events_range ON events(all_day, start, end)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) { error("Unsupported schema upgrade") }

    suspend fun load(month: YearMonth, zone: ZoneId): List<AgendaEvent> = withContext(Dispatchers.IO) {
        val from = month.atDay(1); val until = month.plusMonths(1).atDay(1)
        val args = arrayOf(until.atStartOfDay(zone).toInstant().toEpochMilli(), from.atStartOfDay(zone).toInstant().toEpochMilli(), until.atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli(), from.atStartOfDay(java.time.ZoneOffset.UTC).toInstant().toEpochMilli()).map(Long::toString).toTypedArray()
        readableDatabase.query("events", null, "(all_day=0 AND start<? AND end>?) OR (all_day=1 AND start<? AND end>?)", args, null, null, "start ASC").use { rows ->
            buildList {
                fun text(name: String) = rows.getString(rows.getColumnIndexOrThrow(name))
                fun number(name: String) = rows.getLong(rows.getColumnIndexOrThrow(name))
                while (rows.moveToNext()) add(AgendaEvent(number("id"), text("title"), number("start"), number("end"), number("all_day") == 1L, text("zone"), text("location"), text("notes"), uid = text("uid")))
            }
        }
    }

    suspend fun save(event: AgendaEvent) = withContext(Dispatchers.IO) {
        require(!event.device)
        val values = ContentValues().apply {
            put("uid", event.uid); put("title", event.title.trim()); put("start", event.start); put("end", event.end)
            put("all_day", if (event.allDay) 1 else 0); put("zone", event.zone); put("location", event.location); put("notes", event.notes)
        }
        if (event.id == 0L) writableDatabase.insertOrThrow("events", null, values)
        else { check(writableDatabase.update("events", values, "id=?", arrayOf(event.id.toString())) == 1); event.id }
    }

    suspend fun remove(event: AgendaEvent) = withContext(Dispatchers.IO) {
        require(!event.device)
        writableDatabase.delete("events", "id=?", arrayOf(event.id.toString()))
    }
}

object DeviceCalendar {
    suspend fun read(context: Context, month: YearMonth, zone: ZoneId): List<AgendaEvent> = withContext(Dispatchers.IO) {
        val start = month.atDay(1).atStartOfDay(zone).toInstant().toEpochMilli()
        val end = month.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant().toEpochMilli()
        val uri = CalendarContract.Instances.CONTENT_URI.buildUpon().appendPath(start.toString()).appendPath(end.toString()).build()
        val fields = arrayOf(CalendarContract.Instances.EVENT_ID, CalendarContract.Events.TITLE, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END, CalendarContract.Events.ALL_DAY, CalendarContract.Events.EVENT_LOCATION)
        context.contentResolver.query(uri, fields, "${CalendarContract.Calendars.VISIBLE}=1", null, "${CalendarContract.Instances.BEGIN} ASC")?.use { rows ->
            buildList {
                while (rows.moveToNext() && size < 500) {
                    val id = rows.getLong(0); val begin = rows.getLong(2); val until = rows.getLong(3)
                    runCatching { AgendaEvent(id, rows.getString(1)?.takeIf(String::isNotBlank) ?: "Agenda", begin, until, rows.getInt(4) == 1, zone.id, rows.getString(5).orEmpty(), device = true, uid = "device-$id-$begin") }.getOrNull()?.let(::add)
                }
            }
        }.orEmpty()
    }
}
