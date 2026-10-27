package com.rezaprama.kalender

import android.Manifest
import android.app.Application
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import com.rezaprama.kalender.core.AgendaEvent
import com.rezaprama.kalender.core.CalendarMath
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

data class CalendarState(
    val date: LocalDate,
    val month: YearMonth,
    val holidays: HolidayYear,
    val events: List<AgendaEvent> = emptyList(),
    val deviceEvents: List<AgendaEvent> = emptyList(),
    val zone: String = "Asia/Jakarta",
    val language: String = "id",
    val theme: String = "system",
    val connected: Boolean = false,
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val message: String? = null,
)

class CalendarViewModel(application: Application, private val saved: SavedStateHandle) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("settings", 0)
    private val repository = HolidayRepository(application)
    private val agenda = AgendaStore(application)
    private val initialZone = preferences.getString("zone", "Asia/Jakarta")!!
    private val initialDate = runCatching { LocalDate.parse(saved.get<String>("date")) }.getOrNull()?.let { CalendarMath.requireDate(it) } ?: CalendarMath.today(ZoneId.of(initialZone))
    private val mutable = MutableStateFlow(CalendarState(initialDate, YearMonth.from(initialDate), HolidayYear(initialDate.year), zone = initialZone, language = preferences.getString("language", "id")!!, theme = preferences.getString("theme", "system")!!))
    val state = mutable.asStateFlow()
    private var loadJob: Job? = null

    init { loadYear(initialDate.year); reloadAgenda(); onResume() }

    fun select(date: LocalDate) {
        CalendarMath.requireDate(date)
        saved["date"] = date.toString()
        val changedYear = date.year != mutable.value.holidays.year
        val changedMonth = YearMonth.from(date) != mutable.value.month
        mutable.update { it.copy(date = date, month = YearMonth.from(date)) }
        if (changedYear) loadYear(date.year)
        if (changedMonth) { reloadDevice(); reloadAgenda() }
    }

    fun moveMonth(delta: Long) {
        val month = mutable.value.month.plusMonths(delta)
        if (month.year in 1900..2100) select(month.atDay(minOf(mutable.value.date.dayOfMonth, month.lengthOfMonth())))
    }

    private fun loadYear(year: Int) {
        loadJob?.cancel()
        mutable.update { it.copy(loading = true, holidays = HolidayYear(year)) }
        loadJob = viewModelScope.launch {
            val data = repository.load(year)
            if (mutable.value.date.year == year) mutable.update { it.copy(holidays = data, loading = false) }
        }
    }

    fun refresh() {
        if (mutable.value.refreshing) return
        val year = mutable.value.date.year
        mutable.update { it.copy(refreshing = true) }
        viewModelScope.launch {
            try {
                val updated = repository.refresh(year)
                if (mutable.value.date.year == year) mutable.update { it.copy(holidays = updated) }
                message(if (mutable.value.language == "id") "Data resmi diperbarui." else "Official data updated.")
            } catch (_: Exception) {
                message(if (mutable.value.language == "id") "Pembaruan belum tersedia. Data offline tetap dipakai." else "Update unavailable. Offline data is retained.")
            } finally { mutable.update { it.copy(refreshing = false) } }
        }
    }

    fun setting(key: String, value: String) {
        when (key) {
            "language" -> { require(value in setOf("id", "en")); mutable.update { it.copy(language = value) } }
            "zone" -> { require(value in setOf("Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura")); mutable.update { it.copy(zone = value) }; reloadDevice(); reloadAgenda() }
            "theme" -> { require(value in setOf("system", "light", "dark")); mutable.update { it.copy(theme = value) } }
            else -> return
        }
        preferences.edit().putString(key, value).apply()
    }

    fun connect(enabled: Boolean) {
        val allowed = enabled && ContextCompat.checkSelfPermission(getApplication(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
        preferences.edit().putBoolean("device_calendar", allowed).apply()
        mutable.update { it.copy(connected = allowed, deviceEvents = emptyList()) }
        if (allowed) reloadDevice()
    }

    fun onResume() { connect(preferences.getBoolean("device_calendar", false)) }

    private fun reloadDevice() {
        if (!mutable.value.connected) return
        val snapshot = mutable.value
        viewModelScope.launch {
            try {
                val events = DeviceCalendar.read(getApplication(), snapshot.month, ZoneId.of(snapshot.zone))
                if (mutable.value.connected && mutable.value.month == snapshot.month && mutable.value.zone == snapshot.zone) mutable.update { it.copy(deviceEvents = events) }
            } catch (_: SecurityException) { connect(false) }
            catch (_: Exception) { message(if (snapshot.language == "id") "Kalender perangkat belum dapat dibaca." else "Device calendars are unavailable.") }
        }
    }

    private fun reloadAgenda() {
        val snapshot = mutable.value
        viewModelScope.launch {
            try {
                val events = agenda.load(snapshot.month, ZoneId.of(snapshot.zone))
                if (mutable.value.month == snapshot.month && mutable.value.zone == snapshot.zone) mutable.update { it.copy(events = events) }
            } catch (_: Exception) { message(if (snapshot.language == "id") "Agenda lokal belum dapat dibaca." else "Local events are unavailable.") }
        }
    }

    fun save(event: AgendaEvent, completed: (Boolean) -> Unit) { viewModelScope.launch { try { agenda.save(event); reloadAgenda(); completed(true) } catch (_: Exception) { message(if (mutable.value.language == "id") "Agenda belum tersimpan." else "Event could not be saved."); completed(false) } } }
    fun remove(event: AgendaEvent) { viewModelScope.launch { try { agenda.remove(event); reloadAgenda() } catch (_: Exception) { message(if (mutable.value.language == "id") "Agenda belum terhapus." else "Event could not be deleted.") } } }
    fun message(value: String?) { mutable.update { it.copy(message = value) } }
    override fun onCleared() { agenda.close(); super.onCleared() }
}
