# Changelog

All notable changes are listed here. Dates are in WIB. Data changes are listed separately from code changes because they affect what users rely on.

## [Unreleased]

### Changed
- Build tooling: esbuild 0.28.2 and Wrangler 4.153.0, with matching Cloudflare runtime dependencies.
- Government-source monitoring runs quarterly (1 January, April, July, October) instead of daily, with manual runs when a decree is expected. Setkab search feeds are optional; an unreachable required feed still needs a curator.
- JSON API bodies containing HKO-derived Chinese-calendar data list the HKO non-commercial terms in `attribution.license.exceptions`.
- GitHub Actions: checkout, setup-node and upload-artifact v7. Dependabot no longer proposes TypeScript or `@types/node` major upgrades automatically.

### Fixed
- Wrangler/Miniflare now use Undici 7.30.1, addressing [excessive content encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c), [EventSource memory growth](https://github.com/advisories/GHSA-4qv8-2p9j-2685), and [integrity algorithm parsing](https://github.com/advisories/GHSA-f72v-6w45-q472) in development tooling.
- The commit attribution check rejects newer assistant identities, `Assisted-by`-style trailers and assistant session links; human co-authors remain accepted.

## [1.0.0] — 2026-10-21

### Data
- Official national holidays and collective leave for 2022–2027, re-verified on 2026-10-21 against setkab.go.id, setneg.go.id, kemenkopmk.go.id, kemenag.go.id and JDIH sources. Adds the 2025 amendment (SKB 933/2025: collective leave 18 August 2025) and decree numbers.
- 2027 Idulfitri and Iduladha flagged `subjectTo: "isbat"` until the Kemenag decisions.
- Projections for 2028–2100 rebuilt from Keppres 8/2024 categories, Easter computus, Hong Kong Observatory Imlek dates and tabular Hijri (±1 day). This replaces the `date-holidays` estimates, which, among other gaps, labelled Isra Mikraj 2028 as Maulid.
- 1900–1944 marked pre-independence. 1945–2021 explicitly "not yet curated".

### Added
- Cloudflare Worker with server-rendered pages in Indonesian and English, static assets served before the Worker.
- API: `/api/v1/holidays` (JSON, ICS, CSV), `/workdays`, `/date`, `/convert`, `/observances`, `/calendars`, OpenAPI 3.1.
- Calendars: Javanese (weton, neptu, Asapon/Aboge kurup), Hijri (tabular arithmetic, Umm al-Qura with runtime self-check), Chinese (HKO tables 1901–2100), calculated observances.
- Secondary calendar overlay, shareable date links, date calculator, long-weekend finder, working-day counter, print view.
- `<kalender-indonesia>` web component and iframe embed with automatic height.
- Validation: provenance, decree counts and holiday-category plausibility; 70+ unit and integration tests; Playwright journeys with an axe-core WCAG 2.2 AA audit.

### Operations
- Daily government-source checks at 08:00 WIB, with unchanged findings deduplicated and reports retained as workflow artifacts.
- Public repository, pull-request CI and documented production deployment on Cloudflare Workers.
