# Agent handoff

Authoritative checkpoint. Update at every milestone. States: NOT_STARTED · IN_PROGRESS · VERIFIED · BLOCKED · DEFERRED.

## Current
- Branch: `feat/kalender-completion` (from `main` @ 6927e9e "chore: preserve initial Codex implementation"). No remote configured. Nothing pushed or deployed.
- Status: RELEASE_READY. All local work verified; external publication (GitHub push, Cloudflare deploy) awaits owner approval — steps in docs/RELEASE.md.
- Next action (owner): push `main` + `feat/kalender-completion`, open PR, connect Workers Builds; then verify live (RELEASE.md §3) and run Lighthouse on production.

## Milestones
| Phase | State | Evidence |
| --- | --- | --- |
| 1 Foundation and recovery | VERIFIED (wrangler dev BLOCKED by environment) | `npm run check` exit 0; Node preview renders `/`, `/en/2026/08`, `/alat`; dialog works, no console errors |
| 2 Holiday data correctness | VERIFIED | 2022–2027 re-read from setkab/setneg/kemenkopmk/kemenag pages, all dates match; validator with declared counts + plausibility; HKO Chinese table; 53 tests |
| 3 Frontend, UX, a11y | VERIFIED | `npm run e2e` 28/28: axe-core WCAG 2.2 AA on 9 pages × light/dark = 0 violations; keyboard grid, shared date URL, tools, theme, embed, phone overflow, 24px targets. Screenshots reviewed (desktop/mobile/print) |
| 4 Multi-calendar | VERIFIED | Javanese (weton/neptu, Asapon/Aboge, windu table + Kraton 1960 Be), Hijri civil (own arithmetic vs ICU every day), Umm al-Qura (self-checked), Chinese (HKO), observances; /api/v1/date|convert|observances|calendars; UI mode overlay; check 67/67, e2e 35/35 |
| 5 API, embed, OSS docs | VERIFIED | ICS structural validator on official/estimated/empty years; estimates labelled in ICS/CSV; `<kalender-indonesia>` web component tested cross-origin with auto-height; docs examples executed by tests/docs.test.ts; LICENSE (canonical Apache-2.0), LICENSE-DATA (CC BY 4.0), NOTICE (Phosphor MIT, HKO, gov sources); check 72/72, e2e 36/36 |
| 6 SEO, perf, security, CI, monitoring | VERIFIED (CI not executed on GitHub: no remote) | Lighthouse (local Node preview, compressed): mobile 100/100/100/100 on /2026, /en/2026/08, /api, /2026/03?mode=jawa; desktop 100 perf. npm audit 0. noindex policy, HSTS, JSON CSP. monitor.ts live run OK + unit tests; audit.ts; ci.yml/monitor.yml parse; check 78/78, e2e 36/36 |
| 7 Final integration | VERIFIED (local) | 14 user scenarios covered by e2e (incl. 1900/2100 limits, all calendars in details, ICS download, phone axe); wrangler dry-run bundle 477 KiB / 42.6 KiB gzip, smoke 11/11 on the bundle; check 78/78; e2e 37/37; audit OK; monitor live OK |

## Decisions
- Hosting: Workers + Static Assets (owner confirmed). `run_worker_first` and `not_found_handling` removed: `dist/` has no HTML, so static files never invoke the Worker and every unmatched path (pages, `/api/*`, `/embed`) reaches it.
- Year datasets are generated at build into `src/generated/years.json` (~280 KB) and bundled into the Worker; the same data ships as `dist/data/{year}.json`. One source: `scripts/data.ts`.
- Client code has its own tsconfig (`src/client/tsconfig.json`) because `@cloudflare/workers-types` conflicts with DOM types.
- Lint: Biome (single dependency). CSS rules `noImportantStyles` / `noDescendingSpecificity` disabled (intentional `!important` in sr-only, print, reduced-motion).
- `addDays` now throws outside 1900–2100 (found by tests).
- Estimates 2028–2100 come from `src/holidays.ts` (Keppres 8/2024 categories + computus + HKO Imlek + tabular Hijri ±1). `date-holidays` and `scripts/seed.mjs` removed: data files are the only source of truth.
- Chinese calendar is table-driven from HKO 1901–2100 (checksum-tested). ICU `chinese` rejected: 447 days / 13 lunar years differ, incl. Imlek 2027 (ICU 7 Feb vs HKO+SKB 6 Feb).
- Hijri: tabular `civil` implemented arithmetically (no ICU dependency in Workers); Umm al-Qura via ICU only after a runtime self-check. MABIMS predictor DEFERRED (needs lunar ephemeris + isbat history; still ±1 on borderline nights).
- Javanese: kraton convention = Aboge before 1936-03-24, Asapon after; after Jimakir 1986 J (2052) flagged `projected`. Neptu numbers only, no interpretations.
- Chinese: supported 1900-12-22..2100-12-31 only (ICU fallback removed).
- Observances (src/observances.ts) are computed, never stored with holidays.
- Secondary calendar overlay is client-side (`data-alt` + CSS ::after), mode in `?mode=` and localStorage.
- `subjectTo: "isbat"` on decreed Idulfitri/Iduladha of years whose isbat has not happened (2027). Remove after the isbat confirms the date.
- UI: roving tabindex (one tab stop per month, arrows/Home/End), date URLs `#YYYY-MM-DD` open the detail dialog, next-holiday card lists national holidays only, leave summarised in mini months.
- Browser tests: `scripts/browser.ts` falls back to any installed Playwright Chromium (pinned build 1248 missing locally). axe runs with `bypassCSP` (CSP blocks injected scripts, as intended).
- Monitoring: deterministic, stateless, read-only (expectations, Setkab search RSS + Kemenko PMK RSS candidates, per-date source coverage, isbat reminders). Runs quarterly + 20 Sept; opens/comments one issue labelled `monitor`. No AI calls.
- Indexing: month pages and archive holiday lists are `noindex` unless official or within current −1..+3 years; sitemap lists official + near years only.
- CI actions pinned to major tags (@v5); Dependabot keeps them updated. Pin to SHAs if org policy requires.
- Licensing: HKO-derived Chinese table isolated in src/calendars/chinese-hko-data.ts, excluded from Apache-2.0/CC BY, non-commercial under HKO conditions (third_party/hko/NOTICE.md); disclaimer on /sumber and in API. Public spec docs/PRODUCT_SPEC.md; original brief kept in gitignored internal/.
- Historical: 1900–1944 `pre-independence`; 1945–2021 archive not curated (DEFERRED: needs per-year decree evidence).

## Known defects / blockers
- Workers runtime itself never executed here (workerd crash); bundle verified in Node. Check Umm al-Qura/ICU on production (RELEASE.md §3).
- GitHub Actions workflows parsed but never run (no remote).
- Historical holidays 1945–2021 not curated (DEFERRED); Nyepi/Waisak not projected; MABIMS predictor DEFERRED.
- **Environment:** `wrangler dev` crashes (workerd access violation 0xc0000005), reproduced with a trivial worker. `System32\vcruntime140.dll` is 14.28 while registry reports VC++ 14.50. Owner action: reinstall the latest Microsoft Visual C++ Redistributable x64. Workaround: `npx tsx scripts/serve.ts`.
- Sources page now describes quarterly + September monitoring; must be implemented in Phase 6 (scripts/monitor.ts) or the copy changed.
- Web tools: WebFetch/WebSearch fail in this environment (model error); research uses the built-in browser + Bing.

## Verification log
- 2026-10-21 Phase 7: check 78/78, smoke 11/11 (wrangler dry-run bundle), e2e 37/37, audit exit 0, monitor live: no action needed.
- 2026-10-21 Phase 6: check 78/78, e2e 36/36, npm audit 0, Lighthouse local 100s (see above), monitor live: no action needed. Assets: JS 27.5 KB raw / 11.1 KB gzip; CSS 24.4 / 5.8 KB; /2026 HTML 78 KB raw / 8.5 KB br.
- 2026-10-21 Phase 5: check 72/72 (incl. docs examples), e2e 36/36.
- 2026-10-21 Phase 4: check 67/67, e2e 35/35 (axe incl. overlay pages). workerd runtime still unverified (local crash) — ICU-dependent paths guarded.
- 2026-10-21 Phase 3: check 53/53, e2e 28/28. Automated a11y covers only machine-checkable WCAG criteria; no manual screen-reader pass yet.
- 2026-10-21 Phase 2: `npm run check` exit 0, 53 tests. Evidence ledger: docs/DATA_SOURCES.md.
- 2026-10-21 Phase 1: build OK (201 years, 6 official), typecheck OK (worker + client), Biome 0 diagnostics, 34 tests pass (weekday of every date 1900–2100 vs Sakamoto, leap years, pasaran cycle, workdays, breaks, ICS folding/escaping, CSV, dataset validation, routing, API errors/ETag/CORS).
