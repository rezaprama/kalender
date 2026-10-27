#!/usr/bin/env bash
set -euo pipefail

# Run only on the disposable CI emulator, after native instrumentation passes.
output="artifacts/android-device"
mkdir -p "$output"
apk="${ANDROID_APK_PATH:-artifacts/android-preview/app-preview.apk}"
app_id="${ANDROID_APP_ID:-com.rezaprama.kalender.preview}"
tools="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
"$tools/apksigner" verify --verbose --print-certs "$apk" > "$output/signature.txt"
if [[ -n "${ANDROID_EXPECTED_CERT:-}" ]]; then
  grep -Fq "Signer #1 certificate SHA-256 digest: $ANDROID_EXPECTED_CERT" "$output/signature.txt"
fi
"$tools/aapt" dump permissions "$apk" > "$output/permissions.txt"
if grep -Eq 'WRITE_CALENDAR|READ_CONTACTS|ACCESS_FINE_LOCATION|com.google.android.gms.permission.AD_ID' "$output/permissions.txt"; then
  echo 'Unexpected sensitive permission in optimized preview' >&2
  exit 1
fi
adb install -r "$apk"
sha256sum "$apk" > "$output/apk-sha256.txt"
stat --format='%s' "$apk" > "$output/apk-bytes.txt"
adb shell getprop ro.build.version.sdk > "$output/api.txt"
adb shell getprop ro.product.model > "$output/device.txt"
if ! adb shell getconf PAGE_SIZE > "$output/page-size.txt" 2>/dev/null; then
  printf 'unavailable\n' > "$output/page-size.txt"
fi
for trial in 1 2 3 4 5; do
  adb shell am force-stop "$app_id"
  adb shell am start -W -a android.intent.action.VIEW \
    -n "$app_id/com.rezaprama.kalender.MainActivity" \
    -d kalender://date/2026-08-17 > "$output/start-$trial.txt"
  grep -q 'Status: ok' "$output/start-$trial.txt"
done
adb shell uiautomator dump /sdcard/kalender-preview.xml
adb pull /sdcard/kalender-preview.xml "$output/preview-ui.xml"
grep -q 'kalender\.' "$output/preview-ui.xml"
grep -Fq "package=\"$app_id\"" "$output/preview-ui.xml"
adb exec-out screencap -p > "$output/optimized-preview.png"
python3 - <<'PY'
import json, os, pathlib, re, statistics
directory = pathlib.Path('artifacts/android-device')
times = []
for file in sorted(directory.glob('start-*.txt')):
    match = re.search(r'TotalTime:\s*(\d+)', file.read_text())
    if match:
        times.append(int(match[1]))
if len(times) != 5:
    raise SystemExit('Missing startup measurements')
report = {
    'environment': 'GitHub-hosted Android emulator; not a physical-device benchmark',
    'build': os.environ.get('ANDROID_BUILD_LABEL', 'R8-optimized preview, temporary debug signing'),
    'applicationId': os.environ.get('ANDROID_APP_ID', 'com.rezaprama.kalender.preview'),
    'api': directory.joinpath('api.txt').read_text().strip(),
    'device': directory.joinpath('device.txt').read_text().strip(),
    'pageSizeBytes': int(directory.joinpath('page-size.txt').read_text().strip()) if directory.joinpath('page-size.txt').read_text().strip().isdigit() else None,
    'apkBytes': int(directory.joinpath('apk-bytes.txt').read_text().strip()),
    'coldStartTotalTimeMs': times,
    'medianMs': statistics.median(times),
}
directory.joinpath('measurement.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
PY
