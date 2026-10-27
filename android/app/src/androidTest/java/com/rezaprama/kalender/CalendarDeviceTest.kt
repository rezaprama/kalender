package com.rezaprama.kalender

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import com.rezaprama.kalender.core.AgendaEvent
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZoneOffset

class CalendarDeviceTest {
    @get:Rule val compose = createEmptyComposeRule()
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    private var scenario: ActivityScenario<MainActivity>? = null

    @Before fun resetTestDevice() {
        context.deleteDatabase("agenda.db")
        context.getSharedPreferences("settings", 0).edit().clear().commit()
    }

    @After fun closeActivity() { scenario?.close() }

    private fun launch(date: String = "2026-08-17") {
        scenario = ActivityScenario.launch(Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("kalender://date/$date")
        })
        compose.waitUntil(15_000) {
            compose.onAllNodesWithText("Memuat data offline…").fetchSemanticsNodes().isEmpty() &&
                compose.onAllNodesWithText("kalender.").fetchSemanticsNodes().isNotEmpty()
        }
    }

    private fun screenshot(name: String) {
        compose.waitForIdle()
        val directory = File(context.externalCacheDir, "screens").apply { mkdirs() }
        val bitmap = InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot()
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }

    @Test fun offlineCalendarNavigatesAndExplainsHolidaySources() {
        launch()
        compose.onNodeWithText("Agustus 2026").assertIsDisplayed()
        compose.onNodeWithText("Libur bersumber resmi").assertIsDisplayed()
        screenshot("calendar-light")
        compose.onNodeWithContentDescription("Bulan berikutnya").performClick()
        compose.onNodeWithText("September 2026").assertIsDisplayed()
        compose.onNodeWithContentDescription("Bulan sebelumnya").performClick()
        compose.onNodeWithText("Hijriah").performClick()
        compose.onNodeWithTag("month-list").performScrollToNode(hasText("Hari Proklamasi Kemerdekaan"))
        compose.onNodeWithText("Hari Proklamasi Kemerdekaan").assertIsDisplayed()
        screenshot("holiday-detail")
    }

    @Test fun privateEventSurvivesActivityRecreation() {
        launch()
        compose.onNodeWithContentDescription("Tambah agenda").performClick()
        compose.onNodeWithText("Judul").performTextInput("Rapat produk Indonesia")
        compose.onNodeWithTag("editor-list").performScrollToNode(hasText("Simpan di perangkat"))
        compose.onNodeWithText("Simpan di perangkat").performClick()
        compose.waitUntil(10_000) { compose.onAllNodesWithText("Agenda baru").fetchSemanticsNodes().isEmpty() }
        compose.onNodeWithText("Agenda", useUnmergedTree = false).performClick()
        compose.waitUntil(10_000) { compose.onAllNodesWithText("Rapat produk Indonesia").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Rapat produk Indonesia").assertIsDisplayed()
        screenshot("personal-agenda")
        scenario!!.recreate()
        compose.onNodeWithText("Rapat produk Indonesia").assertIsDisplayed()
        compose.onNodeWithText("Rapat produk Indonesia").performClick()
        compose.onNodeWithTag("editor-list").performScrollToNode(hasText("Hapus agenda"))
        compose.onNodeWithText("Hapus agenda").performClick()
        compose.onNodeWithText("Hapus", substring = false).performClick()
        compose.waitUntil(10_000) { compose.onAllNodesWithText("Rapat produk Indonesia").fetchSemanticsNodes().isEmpty() }
    }

    @Test fun settingsStayBilingualAndDeviceAccessStartsDisabled() {
        launch()
        compose.onNodeWithText("Alat").performClick()
        compose.onNodeWithTag("tools-list").performScrollToNode(hasContentDescription("Hubungkan kalender perangkat"))
        compose.onNodeWithContentDescription("Hubungkan kalender perangkat").assertIsOff()
        compose.onNodeWithTag("tools-list").performScrollToNode(hasText("English"))
        compose.onNodeWithText("English").performClick()
        compose.onNodeWithText("Tools").assertIsDisplayed()
        compose.onNodeWithTag("tools-list").performScrollToNode(hasText("Dark"))
        compose.onNodeWithText("Dark").performClick()
        compose.onNodeWithText("Calendar").performClick()
        screenshot("calendar-dark-english")
        compose.onNodeWithText("August 2026").assertIsDisplayed()
        val permissions = context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS).requestedPermissions.orEmpty()
        assertFalse(Manifest.permission.WRITE_CALENDAR in permissions)
        assertFalse(Manifest.permission.READ_CONTACTS in permissions)
    }

    @Test fun historicalYearsDoNotPretendToHaveOfficialHolidays() {
        launch("1900-01-01")
        compose.onNodeWithText("Januari 1900").assertIsDisplayed()
        compose.onNodeWithText("Arsip libur belum tersedia").assertIsDisplayed()
        screenshot("historical-calendar")
    }

    @Test fun allBundledGovernmentYearsLoadWithSources() = runBlocking {
        val repository = HolidayRepository(context)
        for (year in 2022..2027) {
            val result = repository.load(year)
            assertTrue("$year must have a validated offline archive", result.official)
            assertTrue(result.holidays.isNotEmpty())
            assertTrue(result.holidays.all { it.date.year == year && Uri.parse(it.source).host!!.endsWith(".go.id") })
        }
        assertFalse(repository.load(1900).official)
        assertFalse(repository.load(2100).official)
    }

    @Test fun sqliteRoundTripKeepsUnicodeAndExclusiveAllDayDates() = runBlocking {
        val date = LocalDate.of(2026, 8, 17)
        val start = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        val event = AgendaEvent(title = "Rapat ' tim 🇮🇩", start = start, end = start + 86400000, allDay = true, notes = "Baris satu\nBaris dua")
        val store = AgendaStore(context)
        try {
            val id = store.save(event)
            for (zone in listOf("Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura")) {
                val loaded = store.load(YearMonth.of(2026, 8), ZoneId.of(zone)).single()
                assertEquals(event.copy(id = id), loaded)
                assertTrue(loaded.occursOn(date, ZoneId.of(zone)))
            }
            store.save(event.copy(id = id, title = "Revisi"))
            assertEquals("Revisi", store.load(YearMonth.of(2026, 8), ZoneOffset.UTC).single().title)
            store.remove(event.copy(id = id))
            assertTrue(store.load(YearMonth.of(2026, 8), ZoneOffset.UTC).isEmpty())
        } finally { store.close() }
    }
}
