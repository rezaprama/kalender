package com.rezaprama.kalender.core

import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

data class AgendaEvent(
    val id: Long = 0,
    val title: String,
    val start: Long,
    val end: Long,
    val allDay: Boolean = false,
    val zone: String = "Asia/Jakarta",
    val location: String = "",
    val notes: String = "",
    val device: Boolean = false,
    val uid: String = java.util.UUID.randomUUID().toString(),
) {
    init {
        require(title.isNotBlank() && title.length <= 500)
        require(end > start)
        require(location.length <= 1000 && notes.length <= 10000)
        require(listOf(title, location, notes).none { '\u0000' in it })
        require(uid.matches(Regex("[A-Za-z0-9-]{1,120}")))
        ZoneId.of(zone)
        val dateZone = if (allDay) ZoneOffset.UTC else ZoneId.of(zone)
        if (allDay) require(Math.floorMod(start, 86400000L) == 0L && Math.floorMod(end, 86400000L) == 0L)
        CalendarMath.requireDate(Instant.ofEpochMilli(start).atZone(dateZone).toLocalDate())
        require(end <= CalendarMath.maximum.plusDays(1).atStartOfDay(dateZone).toInstant().toEpochMilli())
    }

    fun occursOn(date: LocalDate, displayZone: ZoneId): Boolean {
        val dayZone = if (allDay) ZoneOffset.UTC else displayZone
        val from = date.atStartOfDay(dayZone).toInstant().toEpochMilli()
        val until = date.plusDays(1).atStartOfDay(dayZone).toInstant().toEpochMilli()
        return start < until && end > from
    }
}

object IcsExport {
    private fun escape(value: String) = value.replace("\\", "\\\\").replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n").replace(";", "\\;").replace(",", "\\,")
    private fun fold(line: String): String {
        val chunks = mutableListOf<String>(); val chunk = StringBuilder(); var length = 0
        for (point in line.codePoints().toArray()) {
            val character = String(Character.toChars(point)); val size = character.toByteArray(StandardCharsets.UTF_8).size
            if (length + size > 75) { chunks += chunk.toString(); chunk.clear().append(' '); length = 1 }
            chunk.append(character); length += size
        }
        chunks += chunk.toString(); return chunks.joinToString("\r\n")
    }

    fun encode(event: AgendaEvent, now: Instant = Instant.now()): String {
        val utc = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC)
        val start = Instant.ofEpochMilli(event.start); val end = Instant.ofEpochMilli(event.end)
        val lines = mutableListOf("BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Reza Prama Arviandi//Kalender Android//ID", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:${event.uid}@kalender.rezaprama.com", "DTSTAMP:${utc.format(now)}")
        if (event.allDay) {
            lines += "DTSTART;VALUE=DATE:${start.atZone(ZoneOffset.UTC).toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE)}"
            lines += "DTEND;VALUE=DATE:${end.atZone(ZoneOffset.UTC).toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE)}"
        } else {
            lines += "DTSTART:${utc.format(start)}"; lines += "DTEND:${utc.format(end)}"
        }
        lines += "SUMMARY:${escape(event.title)}"
        lines += "LOCATION:${escape(event.location)}"
        lines += "DESCRIPTION:${escape(event.notes)}"
        lines += "URL:https://kalender.rezaprama.com"
        lines += "END:VEVENT"; lines += "END:VCALENDAR"
        return lines.joinToString("\r\n", postfix = "\r\n") { fold(it) }
    }
}
