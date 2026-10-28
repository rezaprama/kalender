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
# Let first-boot launcher/package services settle before rapid UI tests.
sleep 5
mkdir -p artifacts/android-device
adb install -r -t artifacts/android-test-apks/debug/app-debug.apk
adb install -r -t artifacts/android-test-apks/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -r -e class com.rezaprama.kalender.CalendarDeviceTest \
  com.rezaprama.kalender.debug.test/androidx.test.runner.AndroidJUnitRunner \
  | tee artifacts/android-device/instrumentation.txt
python3 - <<'PY'
import json, pathlib, re
directory = pathlib.Path('artifacts/android-device')
output = directory.joinpath('instrumentation.txt').read_text()
result = re.search(r'(?m)^OK\s*\((\d+) tests?\)', output)
if not result or int(result[1]) < 7:
    raise SystemExit('Native instrumentation did not report a complete passing suite')
directory.joinpath('test-summary.json').write_text(json.dumps({
    'runner': 'androidx.test.runner.AndroidJUnitRunner',
    'class': 'com.rezaprama.kalender.CalendarDeviceTest',
    'testsPassed': int(result[1]),
    'failures': 0,
    'rawReport': 'instrumentation.txt',
}, indent=2) + '\n')
PY
bash android/scripts/preview-smoke.sh
