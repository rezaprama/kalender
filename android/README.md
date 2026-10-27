# Kalender for Android

An offline Indonesian calendar with a private agenda and optional device-calendar integration. Native Kotlin and Jetpack Compose, with the same government-sourced holiday archive as [Kalender](https://kalender.rezaprama.com).

**Preview 0.1.0 · Android 8.0 or newer · Indonesian and English**

Made and maintained by [Reza Prama Arviandi](https://rezaprama.com).

## What works

| Calendar | Personal agenda | Integration |
| --- | --- | --- |
| Gregorian dates, 1900–2100 | Create, edit, and delete local events | Read visible device calendars after explicit permission |
| Official holidays and collective leave, 2022–2027 | Timed and multi-day all-day events | Open the device calendar's event editor |
| Government source links and isbat labels | Private SQLite storage; no account required | Share an event as an RFC 5545 ICS file |
| Tabular Hijri; Javanese date, weton, pasaran, neptu | Monthly agenda; WIB, WITA, WIT | Open `kalender://date/2026-08-17` links |
| Working-day counter for verified holiday years | Light, dark, or system theme | Manual holiday updates from the public API |

Opening the calendar, browsing dates, and using the private agenda need no network connection. Updates run only when requested. No ads, analytics SDK, WebView, or embedded browser engine.

## Install a preview

Open a successful run in [Android Actions](https://github.com/rezaprama/kalender/actions/workflows/android.yml), download **kalender-android-preview**, and extract its APK. Install it on a test phone using Android's normal package installer or `adb install`.

The optimized preview uses R8 and resource shrinking. Its application ID is `com.rezaprama.kalender.preview`, with a **temporary CI debug signing key**. Different CI runs may have different keys; Android may require uninstalling an older preview. Uninstalling deletes its private agenda. Export important events first. This is not a Play Store release or a stable signing identity.

## Build

Install JDK 17 and Android SDK platform 36 with build tools. From this directory:

```sh
./gradlew :core:test :app:lintDebug :app:assembleDebug
./gradlew :app:assemblePreview
./gradlew :app:connectedDebugAndroidTest
```

On Windows, use `gradlew.bat`. Set `ANDROID_HOME` or your untracked `local.properties` to the SDK location. Do not commit signing keys, `local.properties`, or downloaded SDK files.

Core date and ICS tests also run without an Android SDK:

```sh
./gradlew -p core test
```

The Gradle 8.13 distribution and wrapper JAR are checksum-pinned. The compatible toolchain is AGP 8.13.2, Kotlin 2.2.21, JDK 17, and Compose BOM 2026.03.00. [AGP compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes).

## Privacy and permissions

Local events live in the app's private database. Automatic Android backup is disabled. This database is not uploaded to Kalender, Google, or any other service.

- `INTERNET`: fetch public holiday data when **Update holidays** is pressed, over HTTPS. The request contains a year, not personal event contents.
- `READ_CALENDAR`: optional, requested only when **Show device calendars** is enabled. Visible calendars are read through Android's Calendar Provider; recurring instances are expanded by the provider. At most 500 occurrences are shown per month.
- No `WRITE_CALENDAR`, contacts, location, notification, or exact-alarm permission. Adding an event elsewhere opens the device's editor so the user chooses its destination.
- Sharing ICS grants temporary read access to one exported file through a narrowly scoped FileProvider. Another app receives the event only after the user chooses to share it.

Google Calendar and Samsung Calendar integration depends on the calendars actually exposed by the device's Calendar Provider. Direct Google OAuth, CalDAV, and iCloud account synchronization are not included. Apple's calendar apps can consume compatible exported ICS files; Android does not run Apple Calendar.

See [Android's Calendar Provider documentation](https://developer.android.com/identity/providers/calendar-provider) for the platform permission and intent model.

## Accuracy and scope

The Gregorian range is 1900–2100; the official holiday archive currently covers 2022–2027. Missing archives are explicitly labelled. The Android app does not present estimated future holidays as official. Government decrees are curated in the existing repository workflow; Android updates do not scrape or approve new decrees automatically.

Hijri conversion is arithmetic/tabular and may differ from an isbat decision. Javanese dates use Aboge before the Asapon transition, Asapon after it, and label post-2052 dates as projections. Days change at civil midnight. The Android package does **not** bundle the HKO Chinese-conversion table. See [calendar methodology](../docs/METHODOLOGY.md) and [data licensing](../LICENSE-DATA.md).

Local reminders, recurring local events, widgets, ICS import, and a cloud-sync service are not included in this preview. Device calendars retain their own reminder and synchronization behavior.

## Verification and performance

The workflow runs exhaustive Gregorian grids and Hijri/weton tests over the supported range, Javanese reference anchors, timezone and ICS tests, Android lint, optimized APK builds, and native UI/storage tests on API 26, 35, and 37.0. Calendar Provider integration is exercised with temporary recurring and all-day events on API 29+. The optimized preview is also signature-checked, installed, launched, and sampled five times for emulator startup timing. Device reports and native screenshots are uploaded with each run. A green run is the evidence for that commit; a written test is not proof that it passed.

Run instrumented tests on a disposable emulator: they reset the development app's private agenda and temporarily create a test calendar. They do not target the preview or production application ID.

Performance claims require measurement. APK size can be measured from the optimized preview; startup and frame performance must be benchmarked on named physical devices before comparing with other calendar apps. The initial architecture avoids startup network requests and background polling, queries only the visible month from SQLite, and keeps storage/network work off the UI thread. No claim of being faster than Google, Samsung, or Apple is made.

## Project structure

```text
android/
  core/    Pure Kotlin date math, event model, ICS export, unit tests
  app/     Compose UI, ViewModel, SQLite, API cache, Calendar Provider
```

Official holiday JSON is copied from `../data/official/` during the build. It is not maintained in a second dataset. Code is Apache-2.0; curated data and government decisions follow [LICENSE-DATA.md](../LICENSE-DATA.md). Phosphor icons retain their MIT notice in the app's license screen.
