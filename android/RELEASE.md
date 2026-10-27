# Android releases

Code and data are built on GitHub-hosted runners. The publisher's private signing key stays on the owner's machine and is never sent to Actions or stored in this repository.

The public signing certificate SHA-256 is recorded in [`release-cert.sha256`](release-cert.sha256). This is a public fingerprint, not a secret. Published Android tags use `android-v…`; the web's existing tags are preserved.

## Create a signing identity once

Install JDK 17. On the publisher's machine:

```powershell
./android/scripts/init-signing.ps1 -Owner 'Your human publisher name'
```

The script creates a password-protected RSA-4096 PKCS12 keystore and its private password metadata in the current user's local application-data directory, under `Kalender/signing`. On Windows, ACL inheritance is removed and access is limited to the current user, SYSTEM, and administrators. An existing identity is never overwritten.

**Back up `release.keystore` and `private.json` securely, outside Git and separately from the working checkout. Losing this identity can prevent compatible updates to installed applications. Do not publish or send either file to CI.**

Fork maintainers must create their own publisher identity, change the application ID before publishing, and replace the public certificate fingerprint. Reza Prama Arviandi's publisher identity is not included in the source code.

## Build and sign

1. Pass the Android workflow and the required web/Worker checks on the release commit.
2. Download `kalender-android-unsigned` from the matching Android run. This is the optimized `release` variant with the production application ID, `com.rezaprama.kalender`.
3. Sign a new output file locally:

```powershell
./android/scripts/sign-release.ps1 `
  -InputApk artifacts/android/unsigned/app-release-unsigned.apk `
  -OutputApk artifacts/android/release/kalender-0.1.0-android.apk
```

The helper downloads the Apache-2.0 `apksig` library from Google Maven with a pinned SHA-256, signs with APK Signature Schemes v2/v3, and verifies the result for API 26+. The password is passed through a temporary process environment variable and never printed or placed in command-line arguments. The output APK and checksum files are public; the keystore remains private.

Signing must happen after ZIP alignment. Never edit a signed APK. See [Android's signing-tool documentation](https://developer.android.com/tools/apksigner).

## Publish and verify

- Bump `versionCode` for every new published Android build. Keep the application ID and signing identity stable so updates retain the private agenda. Do not replace published assets or move release tags.
- Create a prerelease tagged `android-v0.1.0` on the tested commit. Attach `kalender-0.1.0-android.apk` and `SHA256SUMS`.
- Run **Android release verification** with that tag. It downloads the public APK, validates its checksum and pinned signing certificate, installs it on API 26/35/37.0, checks the actual application UI, and records five process-cold startup measurements per emulator.
- Review the native screenshots and reports. Emulator timing is not a physical-device benchmark or a comparison with competitors.

The `preview` variant uses a temporary CI debug key and a separate `.preview` application ID. It is for development testing. The public release uses the owner's permanent signing identity and the production ID. A Play Store submission is a separate publishing step; keep this signing identity if choosing existing-key enrollment in Play App Signing.
