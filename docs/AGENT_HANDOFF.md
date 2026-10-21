# Maintenance checkpoint

Date: 21 October 2026 (WIB).

- Public repository: <https://github.com/rezaprama/kalender>.
- Initial release pull request: <https://github.com/rezaprama/kalender/pull/1>.
- Production Worker: `kalender`, <https://kalender.rezaprama.com>.
- Release notes: [CHANGELOG.md](../CHANGELOG.md). Deployment and maintenance: [RELEASE.md](RELEASE.md).

## Verified baseline

- GitHub CI passed on the initial release branch: build, worker/client/browser typechecking, lint, 80 unit/integration/documentation tests, 11 bundle smoke checks and 37 browser tests.
- Local dependency audit found zero vulnerabilities. Common secret patterns were checked in all 159 historical blobs; no findings. `internal/` is ignored and untracked.
- Production had 38 successful route/API checks and 37 browser tests, including Umm al-Qura on the Workers runtime.
- Reported production Lighthouse: accessibility, best practices and SEO 100; performance mobile 92-100 and desktop 98-100. These are measurements, not a guarantee.

The release pull request adds daily monitoring with stable finding fingerprints and updates public deployment guidance. Its final CI run is the authority for the released commit.

## Data and licensing boundaries

- Gregorian calendar: 1900-2100. Official holiday archive: 2022-2027.
- Earlier holiday archives remain uncurated; future estimates are partial. Nyepi, Waisak and collective leave are not guessed. Future Islamic decrees remain subject to isbat.
- Code: Apache-2.0. Original data curation: CC BY 4.0. Government decisions retain their own rights.
- HKO-derived Chinese data is isolated and subject to non-commercial conditions; see [LICENSE-DATA.md](../LICENSE-DATA.md) and [HKO notice](../third_party/hko/NOTICE.md).
- Javanese dates after 2052 are projections. Hijri tabular conversion is not an isbat ruling. Umm al-Qura requires the runtime self-check.

## Operational details

- Static assets bypass the Worker. HTML pages and API requests use one shared generated dataset.
- HTML carries `no-transform` to prevent CDN script injection; Worker applies gzip itself.
- Source monitoring runs daily around 08:00 WIB. Unchanged action findings do not repeatedly notify. Curators verify decrees before changing official data.
- `wrangler dev` works locally after the official Windows VC++ x64 runtime installation. No runtime credentials are stored in the project.
- Public history is preserved. The original brief still exists in the first commit and was checked before publication.
