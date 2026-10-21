# Changelog

All notable changes are listed here. Dates are in WIB. Data changes are listed separately from code changes because they affect what users rely on.

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
