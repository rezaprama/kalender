#!/usr/bin/env bash
set -euo pipefail

# The emulator action shuts down its device when this script returns.
# Collect inside the script, including when an instrumented test fails.
collect() {
  mkdir -p artifacts/android-device
  timeout 15s adb pull /sdcard/Download/kalender-test-screens artifacts/android-device/screens || true
  timeout 15s adb logcat -d -s AndroidRuntime > artifacts/android-device/crashes.txt || true
}
trap collect EXIT
adb shell settings put system font_scale "${ANDROID_TEST_FONT_SCALE:-1.0}"
android/gradlew -p android :app:connectedDebugAndroidTest --no-daemon
bash android/scripts/preview-smoke.sh
