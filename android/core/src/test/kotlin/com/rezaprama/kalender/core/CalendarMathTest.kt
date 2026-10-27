package com.rezaprama.kalender.core

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset

class CalendarMathTest {
    @Test fun `Gregorian month grids have exactly the real dates across 201 years`() {
        for (year in 1900..2100) for (month in 1..12) {
            val target = java.time.YearMonth.of(year, month)
            val grid = CalendarMath.monthDays(target)
            assertEquals(42, grid.size)
            assertEquals((1..target.lengthOfMonth()).map(target::atDay), grid.filterNotNull())
            assertEquals(target.atDay(1).dayOfWeek.value - 1, grid.indexOf(target.atDay(1)))
        }
    }

    @Test fun `weton and neptu use an independent historical anchor`() {
        val independence = CalendarMath.weton(LocalDate.of(1945, 8, 17))
        assertEquals("Jumat", independence.weekday); assertEquals("Legi", independence.pasaran); assertEquals(11, independence.neptu)
        var date = CalendarMath.minimum
        val historical = LocalDate.of(1633, 7, 8)
        while (date <= CalendarMath.maximum) {
            val offset = Math.floorMod(java.time.temporal.ChronoUnit.DAYS.between(historical, date), 5).toInt()
            assertEquals(date.toString(), listOf("Legi", "Pahing", "Pon", "Wage", "Kliwon")[offset], CalendarMath.weton(date).pasaran)
            date = date.plusDays(1)
        }
    }

    @Test fun `Hijri tabular conversion matches independent 30 year month walk on every supported day`() {
        // 1 Muharram 1355 = 24 March 1936; walk the arithmetic month lengths directly.
        var date = LocalDate.of(1936, 3, 24)
        for (year in 1250 until 1355) date = date.minusDays(if ((11 * year + 14) % 30 < 11) 355L else 354L)
        for (year in 1250..1525) for (month in 1..12) {
            val leap = ((11 * year + 14) % 30) < 11
            val length = if (month % 2 == 1 || (month == 12 && leap)) 30 else 29
            for (day in 1..length) {
                if (date > CalendarMath.maximum) return
                if (date >= CalendarMath.minimum) assertEquals(date.toString(), HijriDate(year, month, day), CalendarMath.hijri(date))
                date = date.plusDays(1)
            }
        }
    }

    @Test fun `Javanese anchors and projected boundary are explicit`() {
        val epoch = CalendarMath.javanese(LocalDate.of(1936, 3, 24))
        assertEquals(1867, epoch.year); assertEquals(1, epoch.month); assertEquals(1, epoch.day); assertEquals("Asapon", epoch.kurup)
        val kraton = CalendarMath.javanese(LocalDate.of(2026, 6, 17))
        assertEquals(1960, kraton.year); assertEquals(1, kraton.month); assertEquals(1, kraton.day)
        assertEquals("Aboge", CalendarMath.javanese(LocalDate.of(1900, 1, 1)).kurup)
        assertTrue(CalendarMath.javanese(LocalDate.of(2100, 1, 1)).projected)
    }

    @Test fun `working days do not subtract a holiday twice on a weekend`() {
        val august = CalendarMath.workdays(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), setOf(LocalDate.of(2026, 8, 17), LocalDate.of(2026, 8, 25), LocalDate.of(2026, 8, 2)))
        assertEquals(Workdays(31, 10, 2, 19), august)
    }

    @Test fun `deep links reject invalid dates and unrelated hosts`() {
        assertEquals(LocalDate.of(2026, 8, 17), CalendarMath.parseDeepLink("kalender://date/2026-08-17"))
        assertEquals(LocalDate.of(2026, 8, 17), CalendarMath.parseDeepLink("https://kalender.rezaprama.com/2026/08?date=2026-08-17"))
        for (link in listOf("kalender://date/1900-02-29", "kalender://date/2101-01-01", "https://evil.example/2026-08-17", "file:///2026-08-17", "kalender://date/2026-08-17%0A")) assertNull(link, CalendarMath.parseDeepLink(link))
    }

    @Test fun `all day dates stay on their date across WIB WITA WIT`() {
        val day = LocalDate.of(2026, 8, 17)
        val start = day.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val event = AgendaEvent(title = "Libur", start = start, end = start + 86400000, allDay = true)
        for (zone in listOf("Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "America/New_York")) {
            assertTrue(event.occursOn(day, ZoneId.of(zone)))
            assertFalse(event.occursOn(day.minusDays(1), ZoneId.of(zone)))
        }
        val ics = IcsExport.encode(event)
        assertTrue(ics.contains("DTSTART;VALUE=DATE:20260817\r\nDTEND;VALUE=DATE:20260818"))
    }

    @Test fun `ICS escapes injected fields and folds Unicode lines by bytes`() {
        val event = AgendaEvent(id = 1, title = "Rapat, tim; satu\nBEGIN:VEVENT " + "🇮🇩".repeat(40), start = 1786957200000, end = 1786960800000)
        val ics = IcsExport.encode(event)
        assertEquals(1, Regex("(?m)^BEGIN:VEVENT\\r?$").findAll(ics).count())
        assertTrue(ics.contains("SUMMARY:Rapat\\, tim\\; satu\\nBEGIN:VEVENT"))
        ics.split("\r\n").forEach { assertTrue(it, it.toByteArray(Charsets.UTF_8).size <= 75) }
        assertFalse(ics.contains('\uFFFD'))
    }
}
