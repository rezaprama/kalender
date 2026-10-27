package com.rezaprama.kalender.core

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

data class HijriDate(val year: Int, val month: Int, val day: Int)
data class JavaDate(val year: Int, val month: Int, val day: Int, val yearName: String, val kurup: String, val projected: Boolean)
data class Weton(val weekday: String, val pasaran: String, val neptu: Int)
data class Workdays(val total: Int, val weekends: Int, val holidays: Int, val working: Int)

object CalendarMath {
    val minimum: LocalDate = LocalDate.of(1900, 1, 1)
    val maximum: LocalDate = LocalDate.of(2100, 12, 31)
    val javaMonths = listOf("Sura", "Sapar", "Mulud", "Bakda Mulud", "Jumadilawal", "Jumadilakir", "Rejeb", "Ruwah", "Pasa", "Sawal", "Sela", "Besar")
    val hijriMonths = listOf("Muharam", "Safar", "Rabiulawal", "Rabiulakhir", "Jumadilawal", "Jumadilakhir", "Rajab", "Syakban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah")
    private val anchor = LocalDate.of(1936, 3, 24).toEpochDay()
    private val javaLengths = intArrayOf(354, 355, 354, 354, 355, 354, 354, 355)
    private val javaMonthLengths = intArrayOf(30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29)
    private val yearNames = listOf("Alip", "Ehe", "Jimawal", "Je", "Dal", "Be", "Wawu", "Jimakir")

    fun requireDate(date: LocalDate): LocalDate {
        require(date in minimum..maximum) { "Date must be in 1900–2100" }
        return date
    }

    fun monthDays(month: YearMonth): List<LocalDate?> {
        requireDate(month.atDay(1))
        val offset = month.atDay(1).dayOfWeek.value - 1
        return List(42) { i -> (i - offset + 1).takeIf { it in 1..month.lengthOfMonth() }?.let(month::atDay) }
    }

    private fun fixedIslamic(year: Int, month: Int, day: Int): Long =
        227014L + day + 29L * (month - 1) + (6L * month - 1) / 11 + 354L * (year - 1) + (3L + 11L * year) / 30

    fun hijri(date: LocalDate): HijriDate {
        requireDate(date)
        val fixed = date.toEpochDay() + 719163
        val year = ((30 * (fixed - 227015) + 10646) / 10631).toInt()
        val month = minOf(12, kotlin.math.ceil((fixed - 29 - fixedIslamic(year, 1, 1)) / 29.5).toInt() + 1)
        return HijriDate(year, month, (fixed - fixedIslamic(year, month, 1) + 1).toInt())
    }

    fun javanese(date: LocalDate): JavaDate {
        requireDate(date)
        val asapon = date.toEpochDay() >= anchor
        val days = date.toEpochDay() - anchor - if (asapon) 0 else 1
        var remaining = Math.floorMod(days, 2835L).toInt()
        var yearIndex = 0
        while (remaining >= javaLengths[yearIndex]) remaining -= javaLengths[yearIndex++]
        val year = 1867 + 8 * Math.floorDiv(days, 2835L).toInt() + yearIndex
        var monthIndex = 0
        while (monthIndex < 11 && remaining >= javaMonthLengths[monthIndex]) remaining -= javaMonthLengths[monthIndex++]
        return JavaDate(year, monthIndex + 1, remaining + 1, yearNames[yearIndex], if (asapon) "Asapon" else "Aboge", asapon && date.toEpochDay() >= anchor + 15 * 2835)
    }

    fun weton(date: LocalDate): Weton {
        requireDate(date)
        val day = date.dayOfWeek.value % 7
        val pasaran = Math.floorMod(date.toEpochDay() - LocalDate.of(1945, 8, 17).toEpochDay(), 5).toInt()
        return Weton(listOf("Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")[day], listOf("Legi", "Pahing", "Pon", "Wage", "Kliwon")[pasaran], intArrayOf(5, 4, 3, 7, 8, 6, 9)[day] + intArrayOf(5, 9, 7, 4, 8)[pasaran])
    }

    fun workdays(start: LocalDate, end: LocalDate, excluded: Set<LocalDate>): Workdays {
        requireDate(start); requireDate(end); require(end >= start)
        var day = start; var weekends = 0; var holidays = 0; var total = 0
        while (day <= end) {
            total++
            if (day.dayOfWeek == DayOfWeek.SATURDAY || day.dayOfWeek == DayOfWeek.SUNDAY) weekends++
            else if (day in excluded) holidays++
            day = day.plusDays(1)
        }
        return Workdays(total, weekends, holidays, total - weekends - holidays)
    }

    fun parseDeepLink(value: String?): LocalDate? = runCatching {
        if (value == null) return null
        val uri = java.net.URI(value)
        val allowed = (uri.scheme == "kalender" && uri.host == "date") ||
            (uri.scheme == "https" && uri.host == "kalender.rezaprama.com")
        if (!allowed) return null
        val date = if (uri.scheme == "kalender") uri.path.removePrefix("/") else {
            val query = uri.rawQuery.orEmpty().split("&").firstOrNull { it.startsWith("date=") }?.removePrefix("date=")
            query ?: uri.path.removePrefix("/").takeIf { it.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) }
        }
        requireDate(LocalDate.parse(date))
    }.getOrNull()

    fun format(date: LocalDate, language: String): String = date.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.forLanguageTag(language)))
    fun today(zone: ZoneId): LocalDate = LocalDate.now(zone).coerceIn(minimum, maximum)
}
