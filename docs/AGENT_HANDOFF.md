# Maintenance checkpoint

Date: 28 October 2026 (WIB).

## Android early access (28 October 2026)

- Branch `codex/android-app` adds a native Kotlin/Compose app under `android/`, separate from the Worker runtime. Owner selected Indonesian calendar, private agenda, and device-calendar integration as the focus.
- Pure Kotlin core: Gregorian 1900–2100, tabular Hijri, Aboge/Asapon Javanese dates, weton, workdays, event validation and RFC 5545 export. App: offline government holiday assets, private SQLite agenda, opt-in Calendar Provider reads, device-editor intents, ICS sharing, ID/EN, themes and WIB/WITA/WIT.
- The Android package excludes HKO conversion tables. Official data remains curated once in `data/official/` and copied by Gradle. No background source-monitoring schedule changes.
- Native UI includes saved drafts across activity recreation, retained tab state, loading/error states, optional Calendar Provider reads, and ICS/device-editor actions using the current form. No Play Store release, local reminders, direct cloud sync, or competitor performance claim. See the [English](../android/README.md) and [Indonesian](../android/README.id.md) guides.
- [Android run 40579169807](https://github.com/rezaprama/kalender/actions/runs/40579169807) passed at `2d66f0e`: nine pure Kotlin tests (including exhaustive range checks), Android lint with zero errors, R8 APK build, seven native tests on API 26 and eight each on API 35/37.0. All three install/run the optimized preview; API 37 uses 16 KB pages and 130% text. Native screenshots are in `docs/images/android-*.png`. The required web/Worker checks also passed. Re-run results on the final PR head remain authoritative.
- The owner signing identity was created outside the checkout at `%LOCALAPPDATA%/Kalender/signing`, protected with Windows ACLs. Do not display `private.json` in logs or messages; the local signing helper may read it without printing it. Never overwrite the key or upload it to Git/CI. Public certificate fingerprint: `android/release-cert.sha256`. Use the local signing helper and [Android release guide](../android/RELEASE.md). Development `.preview` builds retain temporary keys; public APKs use the stable production identity.
- Local web `npm run check`: 86 passing tests. All nine Kotlin core tests pass locally. A Windows JDK 17 NIO issue required a process-only socket fallback to run local Gradle; no global environment changes were made.
- [PR #12](https://github.com/rezaprama/kalender/pull/12) merged as `b9e478a`. [Android 0.1.0](https://github.com/rezaprama/kalender/releases/tag/android-v0.1.0) is an owner-signed prerelease built from tested commit `ad7f7fe` (identical file tree to the merge). Public APK: 1,444,952 bytes; SHA-256 `e2a2bfa88ec8a7ee30533e2f8754083d9a9918f0fc8c532036689184cd98778d`. Its HTTPS download was checked without authentication. [Signed release verification](https://github.com/rezaprama/kalender/actions/runs/40586402127) passed on API 26/35/37.0: full pinned certificate, public checksum, install, five process-cold launches, actual UI, and installation as an update. One API 35 attempt encountered a Pixel Launcher ANR; a fresh-emulator retry passed. Published APK bytes, tags and signing identity remain unchanged.
- [PR #17](https://github.com/rezaprama/kalender/pull/17) merged the format-independent publisher check with five positive/negative tests; it still requires exactly one signer and the full pinned certificate. Native APK code and released bytes were not changed.
- Newly opened dependency PRs #14/#15 require a larger toolchain migration (AGP 9.4.1 needs Gradle 9.6.0; Compose 1.12.1 needs SDK 37 and AGP 9.1+). #16 updates only the JVM compiler family and is held for alignment with Android/Compose. Dependabot groups all Kotlin plugin IDs and permits patch updates while holding those coordinated upgrades. See [Android release maintenance](../android/RELEASE.md#toolchain-maintenance).
- #13 merged Biome 2.6.3 after passing web/Worker checks. #14–#16 were closed with migration/alignment reasons. #18 merged the toolchain policy and stabilized keyboard/window targeting in device tests; all API 26/35/37 checks passed before merge. The subsequently opened #19 Gradle 9 wrapper update was also closed: the wrapper is part of the same coordinated migration and its major updates are held explicitly. The published Android runtime source and APK remain unchanged.
- #20 merged as `49de6a1` after all three device suites passed (7/8/8 cases). Its keyboard helper uses application window tokens and actual IME insets to remove Espresso's intermittent Android 15 window-focus dependency. Dependabot then opened #21 for Gradle 8.14.6, a supported 8.x maintenance update with security fixes. Both its distribution and wrapper JAR match Gradle's official SHA-256 values; the full Android/web/Cloudflare checks gate its merge. Documentation distinguishes this maintenance wrapper from the immutable 0.1.0 APK built with Gradle 8.13.

## Dependency maintenance (27 October 2026)

- [PR #11](https://github.com/rezaprama/kalender/pull/11) updates esbuild to 0.28.2. Its lockfile removes duplicate esbuild installations previously nested under tsx and Wrangler.
- Fresh dependency auditing found vulnerable Undici 7.29.1 in Wrangler/Miniflare. The PR also updates Wrangler to 4.153.0, which supplies the patched Undici 7.30.1 without an override. TypeScript and Node-types major upgrades remain held per the owner's decision.
- Local clean install, build, typecheck, lint, 86 tests, and 11 Worker bundle smoke checks pass. `npm audit` reports zero vulnerabilities. The required GitHub CI and Cloudflare checks remain the merge gate and authority for the merged commit.

## Independent audit (22 October 2026)

- Calendars, all 73,414 days 1900-01-01..2100-12-31, against references not shared with the implementation: Gregorian weekday (Python `datetime`), pasaran anchored on 1 Sura Alip 1555 = Jumat Legi 8 July 1633, tabular Hijri (Python 30-year cycle walk and ICU `islamic-civil`), Easter 1901-2100 (Gauss algorithm): 0 mismatches. Javanese round trip: 0 failures; every 1 Sura Alip is Selasa Pon in Asapon and Rebo Wage in Aboge. Chinese month starts for 1917 (leap month) and 2057 match HKO's primary tables.
- Holidays 2022-2027 rechecked; 2027 matches setneg.go.id (SKB 1205/2026, 3/2026, 2/2026: 18 national, 8 collective leave). August 2026 = 19 working days, locally and on production.
- Fixed: Setkab search-feed outages (issue #6) no longer raise action items; HKO non-commercial terms appear in `attribution.license.exceptions`; the `calc-chinese` source no longer claims ICU.
- Fixed: attribution check missed Claude Fable/Mythos identities, `Assisted-by`, `Claude-Session` trailers, assistant session URLs and other coding agents. Human co-authors stay accepted.
- Added issue forms that require a government source for data corrections.
- Promo video (ignored `artifacts/promo`): the 9:16 version placed the logo, the Proklamasi callout and the credit under Reels/Stories UI. Re-rendered both formats with a safe-zone layout, explicit owner credit, and vendored OFL fonts. Verification, covers, silent version and ZIP regenerated.
- Not measured in this session: Lighthouse (production and PageSpeed API unreachable from the sandbox). Typecheck, lint, smoke and e2e are run by CI, not locally (npm registry unreachable).
- Owner decision (22 October 2026): source monitoring runs quarterly (1 Jan, Apr, Jul, Oct), not daily; manual runs when a decree is expected.

- Public repository: <https://github.com/rezaprama/kalender>.
- Initial release pull request: <https://github.com/rezaprama/kalender/pull/1>.
- Initial release merged to `main` as `8e2ba41`; both the release-branch and main CI runs passed.
- Production Worker: `kalender`, <https://kalender.rezaprama.com>.
- Cloudflare Workers Builds is connected to `rezaprama/kalender`, production branch `main`, build `npm run build`, deploy `npx wrangler deploy`.
- Non-production Git builds use Cloudflare's beta `npx wrangler preview`. `wrangler.jsonc` explicitly includes `previews: {}`; assets and production routes remain at the top level. The Worker has no stateful data bindings or secrets to duplicate.
- Release notes: [CHANGELOG.md](../CHANGELOG.md). Deployment and maintenance: [RELEASE.md](RELEASE.md).

## Verified baseline

- GitHub CI passed on the released branch and `main`: build, worker/client/browser typechecking, lint, 81 unit/integration/documentation tests, 11 bundle smoke checks and 37 browser tests.
- Local dependency audit found zero vulnerabilities. Common secret patterns were checked in all 159 historical blobs; no findings. `internal/` is ignored and untracked.
- Production had 38 successful route/API checks and 37 browser tests, including Umm al-Qura on the Workers runtime.
- Reported production Lighthouse: accessibility, best practices and SEO 100; performance mobile 92-100 and desktop 98-100. These are measurements, not a guarantee.

Daily source monitoring was dispatched successfully in GitHub Actions. Two Setkab search feeds were unreachable and are tracked in [issue #6](https://github.com/rezaprama/kalender/issues/6); Kemenko PMK and the cited source pages were checked. The final CI run is the authority for each released commit.

## Data and licensing boundaries

- Gregorian calendar: 1900-2100. Official holiday archive: 2022-2027.
- Earlier holiday archives remain uncurated; future estimates are partial. Nyepi, Waisak and collective leave are not guessed. Future Islamic decrees remain subject to isbat.
- Code: Apache-2.0. Original data curation: CC BY 4.0. Government decisions retain their own rights.
- HKO-derived Chinese data is isolated and subject to non-commercial conditions; see [LICENSE-DATA.md](../LICENSE-DATA.md) and [HKO notice](../third_party/hko/NOTICE.md).
- Javanese dates after 2052 are projections. Hijri tabular conversion is not an isbat ruling. Umm al-Qura requires the runtime self-check.

## Operational details

- Static assets bypass the Worker. HTML pages and API requests use one shared generated dataset.
- HTML carries `no-transform` to prevent CDN script injection; Worker applies gzip itself.
- Source monitoring runs quarterly around 08:00 WIB (1 Jan, Apr, Jul, Oct) and on manual dispatch. Unchanged action findings do not repeatedly notify. Curators verify decrees before changing official data.
- `wrangler dev` works locally after the official Windows VC++ x64 runtime installation. No runtime credentials are stored in the project.
- Public history is preserved. The original brief still exists in the first commit and was checked before publication.

## Documentation and attribution policy

- Both READMEs have a visual introduction, desktop/mobile calendar captures, routes for visitors and developers, runnable API examples, embed instructions, and explicit data/license boundaries.
- Owner requested no further Claude contributor attribution. `.claude/settings.json` disables commit/PR/session-link attribution. `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md` require human authorship and preserve legal notices.
- `npm run hooks:install` enables the checked-in commit-message hook in each clone; already installed in this checkout. The required CI job checks every new commit's author, committer, and attribution trailers, including intermediate PR commits. Existing history and `v1.0.0` remain intact.
- GitHub's contributors API returned only `rezaprama` during this change. Eleven old commits still contain Claude co-author trailers; removing them would rewrite published history and is outside the chosen prevention approach.
- Local `npm run check` passes with 83 tests, including attribution policy and executable documentation examples. The pull request CI remains the authority for the merged version.
- During this change, Cloudflare's first Preview build timed out before initialization. Later builds used legacy `npx wrangler versions upload` and failed the Worker identity check. **Previews Base** and existing branch Previews have separate build configurations. Both the base and this branch's **Settings → Builds → Preview command** were explicitly set to `npx wrangler preview`. Retry from the branch Preview's own build page.
