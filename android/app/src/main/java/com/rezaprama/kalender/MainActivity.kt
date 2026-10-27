@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.rezaprama.kalender

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.Context
import android.content.res.Configuration
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.CalendarContract
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import com.rezaprama.kalender.core.AgendaEvent
import com.rezaprama.kalender.core.CalendarMath
import com.rezaprama.kalender.core.IcsExport
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

private val BrandRed = Color(0xffc0262d)
private val DateSaver = Saver<LocalDate, String>(save = { it.toString() }, restore = LocalDate::parse)
private val TimeSaver = Saver<LocalTime, String>(save = { it.toString() }, restore = LocalTime::parse)
private val PaperColors = lightColorScheme(
    primary = BrandRed, onPrimary = Color.White, primaryContainer = Color(0xffffdad9), onPrimaryContainer = Color(0xff710e17),
    secondary = Color(0xff45454d), onSecondary = Color.White, secondaryContainer = Color(0xffe8e7e0), onSecondaryContainer = Color(0xff24242a),
    tertiary = Color(0xff745400), tertiaryContainer = Color(0xffffe2a2), onTertiaryContainer = Color(0xff372600),
    background = Color(0xfff8f8f5), onBackground = Color(0xff202024), surface = Color(0xfff8f8f5), onSurface = Color(0xff202024),
    surfaceVariant = Color(0xffe8e7e0), onSurfaceVariant = Color(0xff55555b), outline = Color(0xff77777c), outlineVariant = Color(0xffcfcec7),
    surfaceContainerLowest = Color.White, surfaceContainerLow = Color(0xfff3f3ee), surfaceContainer = Color(0xffeeeee8), surfaceContainerHigh = Color(0xffe8e8e2), surfaceContainerHighest = Color(0xffe2e2dc),
)
private val InkColors = darkColorScheme(
    primary = Color(0xffffa1a6), onPrimary = Color(0xff650b14), primaryContainer = Color(0xff8c1a23), onPrimaryContainer = Color(0xffffdad9),
    secondary = Color(0xffc9c8c1), onSecondary = Color(0xff303036), secondaryContainer = Color(0xff35353b), onSecondaryContainer = Color(0xffe7e6df),
    tertiary = Color(0xffecc16d), tertiaryContainer = Color(0xff554000), onTertiaryContainer = Color(0xffffe2a2),
    background = Color(0xff141417), onBackground = Color(0xffe8e7e2), surface = Color(0xff141417), onSurface = Color(0xffe8e7e2),
    surfaceVariant = Color(0xff38383e), onSurfaceVariant = Color(0xffc7c6c0), outline = Color(0xff99989d), outlineVariant = Color(0xff49494e),
    surfaceContainerLowest = Color(0xff101013), surfaceContainerLow = Color(0xff1c1c20), surfaceContainer = Color(0xff222226), surfaceContainerHigh = Color(0xff2a2a2e), surfaceContainerHighest = Color(0xff333337),
)
private fun CalendarState.tr(id: String, en: String) = if (language == "id") id else en

class MainActivity : ComponentActivity() {
    private lateinit var model: CalendarViewModel
    override fun attachBaseContext(base: Context) {
        val language = base.getSharedPreferences("settings", 0).getString("language", "id")!!
        val locale = Locale.forLanguageTag(language)
        val configuration = Configuration(base.resources.configuration).apply { setLocale(locale); setLayoutDirection(locale) }
        super.attachBaseContext(base.createConfigurationContext(configuration))
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        model = ViewModelProvider(this)[CalendarViewModel::class.java]
        if (savedInstanceState == null) handleIntent(intent)
        setContent {
            val state by model.state.collectAsStateWithLifecycle()
            val initialLanguage = remember { state.language }
            LaunchedEffect(state.language) { if (state.language != initialLanguage) recreate() }
            val dark = when (state.theme) { "dark" -> true; "light" -> false; else -> isSystemInDarkTheme() }
            SideEffect {
                WindowCompat.getInsetsController(window, window.decorView).apply {
                    isAppearanceLightStatusBars = !dark
                    isAppearanceLightNavigationBars = !dark
                }
            }
            MaterialTheme(colorScheme = if (dark) InkColors else PaperColors, shapes = Shapes(medium = RoundedCornerShape(16.dp), large = RoundedCornerShape(24.dp))) {
                CalendarApp(state, model, ::openLink, ::shareEvent, ::openInCalendar)
            }
            LaunchedEffect(state.loading) { if (!state.loading) { withFrameNanos { }; reportFullyDrawn() } }
        }
    }
    override fun onResume() { super.onResume(); if (::model.isInitialized) model.onResume() }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); handleIntent(intent) }
    private fun handleIntent(intent: Intent) { CalendarMath.parseDeepLink(intent.dataString)?.let(model::select) }

    private fun launchSafely(intent: Intent) {
        try { startActivity(intent) } catch (_: ActivityNotFoundException) { model.message(model.state.value.tr("Tidak ada aplikasi yang dapat membuka ini.", "No application can open this action.")) }
        catch (_: SecurityException) { model.message(model.state.value.tr("Aplikasi tujuan menolak akses.", "The destination application denied access.")) }
    }
    private fun openLink(url: String) {
        val uri = Uri.parse(url)
        if (uri.scheme == "https") launchSafely(Intent(Intent.ACTION_VIEW, uri))
    }
    private fun openInCalendar(event: AgendaEvent) {
        val intent = if (event.device) Intent(Intent.ACTION_VIEW, android.content.ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, event.id)) else Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI).apply {
            putExtra(CalendarContract.Events.TITLE, event.title)
            putExtra(CalendarContract.Events.EVENT_LOCATION, event.location)
            putExtra(CalendarContract.Events.DESCRIPTION, event.notes)
            putExtra(CalendarContract.EXTRA_EVENT_ALL_DAY, event.allDay)
        }
        intent.putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, event.start)
        intent.putExtra(CalendarContract.EXTRA_EVENT_END_TIME, event.end)
        launchSafely(intent)
    }
    private fun shareEvent(event: AgendaEvent) {
        lifecycleScope.launch {
            val uri = try { withContext(Dispatchers.IO) {
                val directory = File(cacheDir, "exports").apply { mkdirs() }
                directory.listFiles()?.filter { it.lastModified() < System.currentTimeMillis() - 86400000 }?.forEach(File::delete)
                val file = File(directory, "kalender-${event.uid}.ics")
                file.writeText(IcsExport.encode(event), Charsets.UTF_8)
                FileProvider.getUriForFile(this@MainActivity, "$packageName.files", file)
            } } catch (_: Exception) { model.message(model.state.value.tr("Berkas ICS belum dapat dibagikan.", "The ICS file could not be shared.")); return@launch }
            launchSafely(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                type = "text/calendar"; putExtra(Intent.EXTRA_STREAM, uri)
                clipData = android.content.ClipData.newRawUri("Calendar", uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }, model.state.value.tr("Bagikan agenda", "Share event")))
        }
    }
}

@Composable
private fun Glyph(resource: Int, description: String?, modifier: Modifier = Modifier) {
    Icon(painterResource(resource), contentDescription = description, modifier = modifier.size(24.dp))
}

@Composable
private fun CalendarApp(state: CalendarState, model: CalendarViewModel, open: (String) -> Unit, share: (AgendaEvent) -> Unit, external: (AgendaEvent) -> Unit) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var creating by rememberSaveable { mutableStateOf(false) }
    var editingId by rememberSaveable { mutableLongStateOf(0L) }
    val editing = state.events.firstOrNull { it.id == editingId }
    var deleting by remember { mutableStateOf<AgendaEvent?>(null) }
    val tabState = rememberSaveableStateHolder()
    val snackbars = remember { SnackbarHostState() }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        model.connect(granted)
        if (!granted) model.message(state.tr("Izin Kalender belum diberikan. Kamu dapat mengaktifkannya lewat setelan aplikasi.", "Calendar permission was not granted. You can enable it in app settings."))
    }
    val context = LocalContext.current
    LaunchedEffect(state.message) { state.message?.let { snackbars.showSnackbar(it); model.message(null) } }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(title = { Text("kalender.", fontWeight = FontWeight.ExtraBold) }, actions = {
                TextButton(onClick = { model.select(CalendarMath.today(ZoneId.of(state.zone))); tab = 0 }) { Text(state.tr("Hari ini", "Today")) }
                if (tab == 0) IconButton(onClick = { editingId = 0; creating = true }) { Glyph(R.drawable.plus, state.tr("Tambah agenda", "Add event")) }
            })
        },
        bottomBar = {
            NavigationBar {
                listOf(Triple(R.drawable.calendar_blank, "Kalender", "Calendar"), Triple(R.drawable.list_bullets, "Agenda", "Agenda"), Triple(R.drawable.sliders_horizontal, "Alat", "Tools")).forEachIndexed { index, item ->
                    NavigationBarItem(selected = tab == index, onClick = { tab = index }, icon = { Glyph(item.first, null) }, label = { Text(state.tr(item.second, item.third)) })
                }
            }
        },
        floatingActionButton = { if (tab == 1) FloatingActionButton(onClick = { editingId = 0; creating = true }) { Glyph(R.drawable.plus, state.tr("Tambah agenda", "Add event")) } },
        snackbarHost = { SnackbarHost(snackbars) },
    ) { insets ->
        Box(Modifier.fillMaxSize().padding(insets)) {
            tabState.SaveableStateProvider(tab) { when (tab) {
                0 -> MonthScreen(state, model, open, { editingId = it.id; creating = true }, external)
                1 -> AgendaScreen(state, model, { editingId = it.id; creating = true }, external)
                else -> ToolsScreen(state, model, open) { enabled ->
                    if (!enabled) model.connect(false)
                    else if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) model.connect(true)
                    else permission.launch(Manifest.permission.READ_CALENDAR)
                }
            } }
        }
    }
    if (creating && (editingId == 0L || editing != null)) key(editingId) {
        EventEditor(state, editing, onDismiss = { creating = false }, onSave = { event, completed -> model.save(event) { success -> completed(success); if (success) creating = false } }, onShare = share, onExternal = external, onDelete = { deleting = it })
    }
    deleting?.let { event ->
        AlertDialog(onDismissRequest = { deleting = null }, title = { Text(state.tr("Hapus agenda?", "Delete event?")) }, text = { Text(event.title) }, confirmButton = { TextButton(onClick = { model.remove(event); deleting = null; creating = false }) { Text(state.tr("Hapus", "Delete")) } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text(state.tr("Batal", "Cancel")) } })
    }
}

@Composable
private fun MonthHeader(state: CalendarState, model: CalendarViewModel) {
    val context = LocalContext.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            TextButton(onClick = { pickDate(context, state.date, model::select) }) {
                Text(state.month.format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale.forLanguageTag(state.language))), fontSize = 26.sp, fontWeight = FontWeight.Bold)
            }
            Text(if (state.loading) state.tr("Memuat data offline…", "Loading offline data…") else if (state.holidays.official) state.tr("Libur bersumber resmi", "Official holiday sources") else state.tr("Arsip libur belum tersedia", "Holiday archive unavailable"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 12.dp))
        }
        IconButton(onClick = { model.moveMonth(-1) }, enabled = state.month > java.time.YearMonth.of(1900, 1)) { Glyph(R.drawable.caret_left, state.tr("Bulan sebelumnya", "Previous month")) }
        IconButton(onClick = { model.moveMonth(1) }, enabled = state.month < java.time.YearMonth.of(2100, 12)) { Glyph(R.drawable.caret_right, state.tr("Bulan berikutnya", "Next month")) }
    }
}

private fun visibleEvents(state: CalendarState, date: LocalDate? = null): List<AgendaEvent> =
    (state.events + state.deviceEvents).filter { date == null || it.occursOn(date, ZoneId.of(state.zone)) }.sortedBy { it.start }

@Composable
private fun AgendaStatus(state: CalendarState) {
    if (state.agendaLoading || state.deviceLoading) Text(state.tr("Memuat agenda…", "Loading events…"), style = MaterialTheme.typography.bodySmall)
    if (state.agendaError) Text(state.tr("Agenda lokal belum dapat dibaca. Coba buka kembali aplikasi.", "Local events are unavailable. Try reopening the app."), color = MaterialTheme.colorScheme.error)
    if (state.deviceError) Text(state.tr("Kalender perangkat belum dapat dibaca. Periksa penyedia kalender atau hubungkan ulang lewat Alat.", "Device calendars are unavailable. Check your calendar provider or reconnect in Tools."), color = MaterialTheme.colorScheme.error)
}

@Composable
private fun MonthScreen(state: CalendarState, model: CalendarViewModel, open: (String) -> Unit, edit: (AgendaEvent) -> Unit, external: (AgendaEvent) -> Unit) {
    var mode by rememberSaveable { mutableStateOf("masehi") }
    val holidays = remember(state.holidays) { state.holidays.holidays.groupBy { it.date } }
    val events = remember(state.events, state.deviceEvents, state.date, state.zone) { visibleEvents(state, state.date) }
    val today = CalendarMath.today(ZoneId.of(state.zone))
    val eventDates = remember(state.events, state.deviceEvents, state.month, state.zone) {
        buildSet {
            for (event in state.events + state.deviceEvents) {
                val zone = if (event.allDay) ZoneOffset.UTC else ZoneId.of(state.zone)
                var day = maxOf(state.month.atDay(1), Instant.ofEpochMilli(event.start).atZone(zone).toLocalDate())
                val last = minOf(state.month.atEndOfMonth(), Instant.ofEpochMilli(event.end - 1).atZone(zone).toLocalDate())
                while (day <= last) { add(day); day = day.plusDays(1) }
            }
        }
    }
    LazyColumn(Modifier.fillMaxSize().testTag("month-list"), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { MonthHeader(state, model) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("masehi" to state.tr("Masehi", "Gregorian"), "jawa" to state.tr("Jawa", "Javanese"), "hijri" to state.tr("Hijriah", "Hijri")).forEach { (key, label) -> FilterChip(selected = mode == key, onClick = { mode = key }, label = { Text(label) }) }
            }
        }
        item {
            Column(Modifier.fillMaxWidth().pointerInput(state.month) {
                var drag = 0f
                detectHorizontalDragGestures(onDragStart = { drag = 0f }, onHorizontalDrag = { change, amount -> change.consume(); drag += amount }, onDragEnd = { if (abs(drag) > 90) model.moveMonth(if (drag < 0) 1 else -1) })
            }) {
                Row(Modifier.fillMaxWidth()) {
                    (if (state.language == "id") listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min") else listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")).forEach { Text(it, Modifier.weight(1f).padding(vertical = 8.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, style = MaterialTheme.typography.labelSmall) }
                }
                val grid = remember(state.month) { CalendarMath.monthDays(state.month) }
                grid.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth()) {
                        week.forEach { date ->
                            if (date == null) Spacer(Modifier.weight(1f).heightIn(min = 56.dp))
                            else {
                                val selected = date == state.date
                                val national = holidays[date].orEmpty().any { !it.leave }
                                val leave = holidays[date].orEmpty().any { it.leave }
                                val color = when { selected -> MaterialTheme.colorScheme.primary; national -> MaterialTheme.colorScheme.errorContainer; leave -> MaterialTheme.colorScheme.tertiaryContainer; else -> Color.Transparent }
                                val content = when { selected -> MaterialTheme.colorScheme.onPrimary; national -> MaterialTheme.colorScheme.onErrorContainer; leave -> MaterialTheme.colorScheme.onTertiaryContainer; date.dayOfWeek.value == 7 -> MaterialTheme.colorScheme.primary; else -> MaterialTheme.colorScheme.onSurface }
                                Surface(onClick = { model.select(date) }, modifier = Modifier.weight(1f).padding(2.dp).semantics { contentDescription = CalendarMath.format(date, state.language) + holidays[date].orEmpty().joinToString { ": " + if (state.language == "id") it.name else it.nameEn } + if (date in eventDates) state.tr(". Ada agenda", ". Has events") else ""; this.selected = selected }, shape = RoundedCornerShape(14.dp), color = color, contentColor = content) {
                                    Column(Modifier.heightIn(min = 56.dp).padding(vertical = 7.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(date.dayOfMonth.toString(), fontSize = 18.sp, fontWeight = if (selected || national) FontWeight.Bold else FontWeight.Normal)
                                        when (mode) {
                                            "jawa" -> Text(CalendarMath.weton(date).pasaran.take(3), fontSize = 10.sp)
                                            "hijri" -> Text(CalendarMath.hijri(date).day.toString(), fontSize = 10.sp)
                                            else -> if (date == today || date in eventDates) Box(Modifier.size(4.dp).background(content, CircleShape))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        item {
            val weton = CalendarMath.weton(state.date)
            val hijri = CalendarMath.hijri(state.date)
            val jawa = CalendarMath.javanese(state.date)
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(CalendarMath.format(state.date, state.language), fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
                    Text("${weton.weekday} ${weton.pasaran} · Neptu ${weton.neptu}", style = MaterialTheme.typography.bodyMedium)
                    Text("${hijri.day} ${CalendarMath.hijriMonths[hijri.month - 1]} ${hijri.year} H", style = MaterialTheme.typography.bodyMedium)
                    Text("${jawa.day} ${CalendarMath.javaMonths[jawa.month - 1]} ${jawa.year} ${jawa.yearName} · ${jawa.kurup}", style = MaterialTheme.typography.bodyMedium)
                    Text(state.tr("Hijriah adalah hitungan tabular, bukan hasil isbat. Hari Jawa di sini berganti tengah malam.", "Hijri is tabular, not an isbat ruling. Javanese days here change at midnight."), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (jawa.projected) Text(state.tr("Tanggal Jawa ini merupakan proyeksi.", "This Javanese date is a projection."), style = MaterialTheme.typography.labelMedium)
                }
            }
        }
        items(holidays[state.date].orEmpty()) { holiday ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(if (state.language == "id") holiday.name else holiday.nameEn, fontWeight = FontWeight.Bold)
                    Text(if (holiday.leave) state.tr("Cuti bersama", "Collective leave") else state.tr("Libur nasional", "National holiday"), style = MaterialTheme.typography.labelMedium)
                    if (holiday.subjectToIsbat) Text(state.tr("Menunggu keputusan isbat.", "Subject to isbat confirmation."), style = MaterialTheme.typography.bodySmall)
                    TextButton(onClick = { open(holiday.source) }) { Text(state.tr("Baca sumber pemerintah", "Read government source")); Glyph(R.drawable.arrow_square_out, null) }
                }
            }
        }
        if (!state.holidays.official && !state.loading) item { Text(state.tr("Tidak ada daftar libur terverifikasi untuk tahun ini. Ini bukan berarti tidak ada hari libur.", "No verified holiday archive for this year. This does not mean there were no holidays."), style = MaterialTheme.typography.bodyMedium) }
        item { Text(state.tr("Agendamu", "Your events"), style = MaterialTheme.typography.titleMedium, modifier = Modifier.semantics { heading() }) }
        item { AgendaStatus(state) }
        if (events.isEmpty() && !state.agendaLoading && !state.deviceLoading && !state.agendaError && !state.deviceError) item { Text(state.tr("Belum ada agenda pada tanggal ini.", "No events on this date."), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        items(events, key = { it.uid }) { EventCard(it, state, if (it.device) external else edit) }
    }
}

@Composable
private fun EventCard(event: AgendaEvent, state: CalendarState, click: (AgendaEvent) -> Unit) {
    OutlinedCard(onClick = { click(event) }, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(event.title, fontWeight = FontWeight.Bold)
            val zone = if (event.allDay) ZoneOffset.UTC else ZoneId.of(state.zone)
            val start = Instant.ofEpochMilli(event.start).atZone(zone)
            val end = Instant.ofEpochMilli(if (event.allDay) event.end - 1 else event.end).atZone(zone)
            val locale = Locale.forLanguageTag(state.language)
            val range = if (event.allDay) {
                state.tr("Sepanjang hari", "All day") + if (start.toLocalDate() == end.toLocalDate()) "" else " · " + start.format(DateTimeFormatter.ofPattern("d MMM", locale)) + "–" + end.format(DateTimeFormatter.ofPattern("d MMM yyyy", locale))
            } else {
                val pattern = if (start.toLocalDate() == end.toLocalDate()) "HH:mm" else "d MMM HH:mm"
                start.format(DateTimeFormatter.ofPattern(pattern, locale)) + "–" + end.format(DateTimeFormatter.ofPattern(pattern, locale)) + " · " + when (state.zone) { "Asia/Jayapura" -> "WIT"; "Asia/Makassar" -> "WITA"; else -> "WIB" }
            }
            Text(range, style = MaterialTheme.typography.bodyMedium)
            if (event.location.isNotBlank()) Text(event.location, style = MaterialTheme.typography.bodyMedium)
            Text(if (event.device) state.tr("Kalender perangkat", "Device calendar") else state.tr("Tersimpan di perangkat ini", "Stored on this device"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun AgendaScreen(state: CalendarState, model: CalendarViewModel, edit: (AgendaEvent) -> Unit, external: (AgendaEvent) -> Unit) {
    val rows = remember(state.events, state.deviceEvents) { visibleEvents(state) }
    LazyColumn(Modifier.fillMaxSize().testTag("agenda-list"), contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 100.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { MonthHeader(state, model) }
        item { AgendaStatus(state) }
        if (rows.isEmpty() && !state.agendaLoading && !state.deviceLoading && !state.agendaError && !state.deviceError) item { Text(state.tr("Belum ada agenda bulan ini. Tambahkan agenda, atau hubungkan kalender perangkat lewat Alat.", "No events this month. Add one, or connect device calendars in Tools."), modifier = Modifier.padding(16.dp)) }
        items(rows, key = { it.uid }) { event ->
            val zone = if (event.allDay) ZoneOffset.UTC else ZoneId.of(state.zone)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(CalendarMath.format(Instant.ofEpochMilli(event.start).atZone(zone).toLocalDate(), state.language), style = MaterialTheme.typography.labelLarge)
                EventCard(event, state, if (event.device) external else edit)
            }
        }
    }
}

@Composable
private fun ToolsScreen(state: CalendarState, model: CalendarViewModel, open: (String) -> Unit, connect: (Boolean) -> Unit) {
    val context = LocalContext.current
    var from by rememberSaveable { mutableStateOf(state.date.withDayOfMonth(1).toString()) }
    var until by rememberSaveable { mutableStateOf(state.month.atEndOfMonth().toString()) }
    var includeLeave by rememberSaveable { mutableStateOf(false) }
    var licenses by remember { mutableStateOf<String?>(null) }
    var loadingLicense by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val begin = LocalDate.parse(from); val end = LocalDate.parse(until)
    val result = remember(begin, end, state.holidays, includeLeave) {
        if (end < begin || end.year != begin.year || begin.year != state.holidays.year || !state.holidays.official) null
        else CalendarMath.workdays(begin, end, state.holidays.holidays.filter { !it.leave || includeLeave }.map { it.date }.toSet())
    }
    LazyColumn(Modifier.fillMaxSize().testTag("tools-list"), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item { Text(state.tr("Waktu, sesuai caramu.", "Time, on your terms."), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold) }
        item {
            OutlinedCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(state.tr("Hitung hari kerja", "Count working days"), style = MaterialTheme.typography.titleMedium)
                    OutlinedButton(onClick = { pickDate(context, begin) { from = it.toString(); model.select(it) } }, modifier = Modifier.fillMaxWidth()) { Text(state.tr("Dari: ", "From: ") + from) }
                    OutlinedButton(onClick = { pickDate(context, end) { until = it.toString(); model.select(it) } }, modifier = Modifier.fillMaxWidth()) { Text(state.tr("Sampai: ", "Until: ") + until) }
                    Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(checked = includeLeave, onCheckedChange = { includeLeave = it }, modifier = Modifier.semantics { contentDescription = state.tr("Kurangi cuti bersama", "Exclude collective leave") }); Text(state.tr("Kurangi cuti bersama", "Exclude collective leave")) }
                    Text(state.tr("Senin–Jumat; kedua tanggal ikut dihitung.", "Monday–Friday; both dates included."), style = MaterialTheme.typography.bodySmall)
                    if (result != null) Text("${result.working} " + state.tr("hari kerja", "working days"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    else Text(state.tr("Pilih rentang satu tahun yang arsip liburnya sudah resmi, dengan tanggal akhir setelah awal.", "Choose a range in one verified holiday year, ending on or after the start."), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        item {
            OutlinedCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(state.tr("Integrasi perangkat", "Device integration"), style = MaterialTheme.typography.titleMedium)
                    Text(state.tr("Baca agenda dari kalender yang terlihat di perangkat. Akun dan agenda tidak dikirim ke server kami. Menambah ke kalender lain tetap melalui editor perangkat.", "Read events from visible device calendars. Accounts and events are never sent to our server. Adding to another calendar opens its editor."), style = MaterialTheme.typography.bodyMedium)
                    Row(verticalAlignment = Alignment.CenterVertically) { Text(state.tr("Tampilkan kalender perangkat", "Show device calendars"), Modifier.weight(1f)); Switch(checked = state.connected, onCheckedChange = connect, modifier = Modifier.semantics { contentDescription = state.tr("Hubungkan kalender perangkat", "Connect device calendars") }) }
                    if (state.deviceEvents.size >= 500) Text(state.tr("Menampilkan 500 kejadian pertama bulan ini.", "Showing the first 500 occurrences this month."), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        item {
            OutlinedCard {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(state.tr("Data libur ${state.date.year}", "Holiday data ${state.date.year}"), style = MaterialTheme.typography.titleMedium)
                    Text(if (state.holidays.official) state.tr("Sumber resmi · diperiksa ${state.holidays.updated}", "Official sources · checked ${state.holidays.updated}") else state.tr("Belum tersedia arsip resmi.", "No official archive available."))
                    Button(onClick = model::refresh, enabled = !state.refreshing) { Glyph(R.drawable.arrows_clockwise, null); Spacer(Modifier.width(8.dp)); Text(if (state.refreshing) state.tr("Memperbarui…", "Updating…") else state.tr("Perbarui libur", "Update holidays")) }
                    Text(state.tr("Data bawaan bekerja offline. Pembaruan mengambil data publik dari kalender.rezaprama.com saat kamu menekan tombol ini.", "Bundled data works offline. Updates fetch public data from kalender.rezaprama.com only when you press this button."), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(state.tr("Bahasa", "Language"), style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("id" to "Indonesia", "en" to "English").forEach { (value, label) -> FilterChip(selected = state.language == value, onClick = { model.setting("language", value) }, label = { Text(label) }) } }
                Text(state.tr("Zona waktu", "Time zone"), style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("Asia/Jakarta" to "WIB", "Asia/Makassar" to "WITA", "Asia/Jayapura" to "WIT").forEach { (value, label) -> FilterChip(selected = state.zone == value, onClick = { model.setting("zone", value) }, label = { Text(label) }) } }
                Text(state.tr("Tema", "Theme"), style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { listOf("system" to state.tr("Sistem", "System"), "light" to state.tr("Terang", "Light"), "dark" to state.tr("Gelap", "Dark")).forEach { (value, label) -> FilterChip(selected = state.theme == value, onClick = { model.setting("theme", value) }, label = { Text(label) }) } }
            }
        }
        item {
            HorizontalDivider()
            Text("Reza Prama Arviandi", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 20.dp))
            TextButton(onClick = { open("https://rezaprama.com") }) { Text("rezaprama.com"); Glyph(R.drawable.arrow_square_out, null) }
            TextButton(onClick = { open("https://github.com/rezaprama/kalender") }) { Text(state.tr("Kode sumber dan API", "Source code and API")) }
            TextButton(enabled = !loadingLicense, onClick = {
                loadingLicense = true
                scope.launch {
                    licenses = withContext(Dispatchers.IO) { listOf("LICENSE", "LICENSE-DATA.md", "NOTICE", "PHOSPHOR.txt").joinToString("\n\n") { file -> context.assets.open("licenses/$file").bufferedReader().use { it.readText() } } }
                    loadingLicense = false
                }
            }) { Text(state.tr("Lisensi dan atribusi", "Licenses and attribution")) }
            Text(state.tr("Versi pratinjau 0.1.0. Agenda lokal belum memiliki pengingat atau sinkronisasi cloud sendiri. Ekspor ICS atau gunakan kalender perangkat untuk fitur itu.", "Preview 0.1.0. Local events do not yet have reminders or their own cloud sync. Export ICS or use device calendars for those features."), style = MaterialTheme.typography.bodySmall)
        }
    }
    licenses?.let { value -> AlertDialog(onDismissRequest = { licenses = null }, title = { Text(state.tr("Lisensi", "Licenses")) }, text = { LazyColumn { item { Text(value, style = MaterialTheme.typography.bodySmall) } } }, confirmButton = { TextButton(onClick = { licenses = null }) { Text(state.tr("Tutup", "Close")) } }) }
}

@Composable
private fun EventEditor(state: CalendarState, event: AgendaEvent?, onDismiss: () -> Unit, onSave: (AgendaEvent, (Boolean) -> Unit) -> Unit, onShare: (AgendaEvent) -> Unit, onExternal: (AgendaEvent) -> Unit, onDelete: (AgendaEvent) -> Unit) {
    val context = LocalContext.current
    val keyboard = LocalSoftwareKeyboardController.current
    val zone = ZoneId.of(event?.zone ?: state.zone)
    val dateZone = if (event?.allDay == true) ZoneOffset.UTC else zone
    val draftUid = rememberSaveable { event?.uid ?: java.util.UUID.randomUUID().toString() }
    var title by rememberSaveable { mutableStateOf(event?.title.orEmpty()) }
    var firstDate by rememberSaveable(stateSaver = DateSaver) { mutableStateOf(event?.let { Instant.ofEpochMilli(it.start).atZone(dateZone).toLocalDate() } ?: state.date) }
    var lastDate by rememberSaveable(stateSaver = DateSaver) { mutableStateOf(event?.let { Instant.ofEpochMilli(it.end).atZone(dateZone).toLocalDate().let { date -> if (it.allDay) date.minusDays(1) else date } } ?: state.date) }
    var start by rememberSaveable(stateSaver = TimeSaver) { mutableStateOf(event?.takeUnless { it.allDay }?.let { Instant.ofEpochMilli(it.start).atZone(zone).toLocalTime() } ?: LocalTime.of(9, 0)) }
    var end by rememberSaveable(stateSaver = TimeSaver) { mutableStateOf(event?.takeUnless { it.allDay }?.let { Instant.ofEpochMilli(it.end).atZone(zone).toLocalTime() } ?: LocalTime.of(10, 0)) }
    var allDay by rememberSaveable { mutableStateOf(event?.allDay ?: false) }
    var location by rememberSaveable { mutableStateOf(event?.location.orEmpty()) }
    var notes by rememberSaveable { mutableStateOf(event?.notes.orEmpty()) }
    var error by rememberSaveable { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    fun draft(): AgendaEvent? = runCatching {
        val from = if (allDay) firstDate.atStartOfDay(ZoneOffset.UTC) else firstDate.atTime(start).atZone(zone)
        val until = if (allDay) lastDate.plusDays(1).atStartOfDay(ZoneOffset.UTC) else lastDate.atTime(end).atZone(zone)
        AgendaEvent(event?.id ?: 0, title, from.toInstant().toEpochMilli(), until.toInstant().toEpochMilli(), allDay, zone.id, location, notes, uid = draftUid)
    }.getOrNull()
    ModalBottomSheet(onDismissRequest = { if (!saving) onDismiss() }) {
        LazyColumn(contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.imePadding().testTag("editor-list")) {
            item { Text(if (event == null) state.tr("Agenda baru", "New event") else state.tr("Edit agenda", "Edit event"), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
            item { OutlinedTextField(title, { if (it.length <= 500) title = it }, Modifier.fillMaxWidth(), label = { Text(state.tr("Judul", "Title")) }, keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences), singleLine = true) }
            item { Row(verticalAlignment = Alignment.CenterVertically) { Text(state.tr("Sepanjang hari", "All day"), Modifier.weight(1f)); Switch(allDay, { allDay = it }, modifier = Modifier.semantics { contentDescription = state.tr("Sepanjang hari", "All day") }) } }
            item { OutlinedButton(onClick = { pickDate(context, firstDate) { firstDate = it; if (lastDate < it) lastDate = it } }, Modifier.fillMaxWidth()) { Text(state.tr("Mulai: ", "Start: ") + firstDate) } }
            if (!allDay) item { OutlinedButton(onClick = { TimePickerDialog(context, { _, hour, minute -> start = LocalTime.of(hour, minute) }, start.hour, start.minute, true).show() }, Modifier.fillMaxWidth()) { Text(start.format(DateTimeFormatter.ofPattern("HH:mm"))) } }
            item { OutlinedButton(onClick = { pickDate(context, lastDate) { lastDate = it } }, Modifier.fillMaxWidth()) { Text(state.tr("Selesai: ", "End: ") + lastDate) } }
            if (!allDay) item { OutlinedButton(onClick = { TimePickerDialog(context, { _, hour, minute -> end = LocalTime.of(hour, minute) }, end.hour, end.minute, true).show() }, Modifier.fillMaxWidth()) { Text(end.format(DateTimeFormatter.ofPattern("HH:mm"))) } }
            item { Text(if (allDay) state.tr("Tanggal akhir ikut dihitung.", "End date is included.") else state.tr("Zona waktu: ", "Time zone: ") + zone.id, style = MaterialTheme.typography.bodySmall) }
            item { OutlinedTextField(location, { if (it.length <= 1000) location = it }, Modifier.fillMaxWidth(), label = { Text(state.tr("Lokasi", "Location")) }) }
            item { OutlinedTextField(notes, { if (it.length <= 10000) notes = it }, Modifier.fillMaxWidth(), label = { Text(state.tr("Catatan", "Notes")) }, minLines = 2, maxLines = 6) }
            item { Text(state.tr("Agenda lokal tanpa pengingat otomatis. Gunakan editor kalender perangkat jika perlu pengingat.", "Local events have no automatic reminders. Use the device calendar editor if you need reminders."), style = MaterialTheme.typography.bodySmall) }
            if (error) item { Text(state.tr("Isi judul dan pastikan waktu selesai setelah waktu mulai.", "Enter a title and an end time after the start."), color = MaterialTheme.colorScheme.error) }
            item {
                Button(enabled = title.isNotBlank() && !saving, onClick = {
                    val candidate = draft()
                    if (candidate == null) error = true else { keyboard?.hide(); saving = true; error = false; onSave(candidate) { saving = false } }
                }, modifier = Modifier.fillMaxWidth()) { Text(if (saving) state.tr("Menyimpan…", "Saving…") else state.tr("Simpan di perangkat", "Save on device")) }
            }
            item { OutlinedButton(enabled = title.isNotBlank() && !saving, onClick = {
                val candidate = draft(); error = candidate == null
                if (candidate != null) { keyboard?.hide(); onExternal(candidate) }
            }, modifier = Modifier.fillMaxWidth()) { Text(state.tr("Buka editor kalender perangkat", "Open device calendar editor")) } }
            item { OutlinedButton(enabled = title.isNotBlank() && !saving, onClick = {
                val candidate = draft(); error = candidate == null
                if (candidate != null) { keyboard?.hide(); onShare(candidate) }
            }, modifier = Modifier.fillMaxWidth()) { Glyph(R.drawable.share_network, null); Spacer(Modifier.width(8.dp)); Text(state.tr("Bagikan ICS", "Share ICS")) } }
            item { Text(state.tr("Editor perangkat dan ekspor ICS memakai isi formulir saat ini. Penyimpanan ke agenda aplikasi ini dilakukan lewat tombol Simpan di perangkat.", "The device editor and ICS export use the current form. Save on device stores it in this app's private agenda."), style = MaterialTheme.typography.bodySmall) }
            if (event != null) {
                item { TextButton(onClick = { onDelete(event) }, modifier = Modifier.fillMaxWidth()) { Text(state.tr("Hapus agenda", "Delete event"), color = MaterialTheme.colorScheme.error) } }
            }
        }
    }
}

private fun pickDate(context: android.content.Context, initial: LocalDate, select: (LocalDate) -> Unit) {
    DatePickerDialog(context, { _, year, month, day -> select(LocalDate.of(year, month + 1, day)) }, initial.year, initial.monthValue - 1, initial.dayOfMonth).apply {
        datePicker.minDate = CalendarMath.minimum.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        datePicker.maxDate = CalendarMath.maximum.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
    }.show()
}
