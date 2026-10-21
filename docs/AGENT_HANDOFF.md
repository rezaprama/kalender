# Agent handoff

Authoritative checkpoint. Update at every milestone. States: NOT_STARTED · IN_PROGRESS · VERIFIED · BLOCKED · DEFERRED.

## Current
- Branch: `feat/kalender-completion` (from `main` @ 6927e9e "chore: preserve initial Codex implementation"). No remote configured. Nothing pushed or deployed.
- Phase: 3 — frontend, UX, accessibility. Next action: full-page Playwright screenshots (desktop/mobile, light/dark), fix layout defects, keyboard/a11y audit.

## Milestones
| Phase | State | Evidence |
| --- | --- | --- |
| 1 Foundation and recovery | VERIFIED (wrangler dev BLOCKED by environment) | `npm run check` exit 0; Node preview renders `/`, `/en/2026/08`, `/alat`; dialog works, no console errors |
| 2 Holiday data correctness | VERIFIED | 2022–2027 re-read from setkab/setneg/kemenkopmk/kemenag pages, all dates match; validator with declared counts + plausibility; HKO Chinese table; 53 tests |
| 3 Frontend, UX, a11y | IN_PROGRESS | |
| 4 Multi-calendar | NOT_STARTED | |
| 5 API, embed, OSS docs | NOT_STARTED | |
| 6 SEO, perf, security, CI, monitoring | NOT_STARTED | |
| 7 Final integration | NOT_STARTED | |

## Decisions
- Hosting: Workers + Static Assets (owner confirmed). `run_worker_first` and `not_found_handling` removed: `dist/` has no HTML, so static files never invoke the Worker and every unmatched path (pages, `/api/*`, `/embed`) reaches it.
- Year datasets are generated at build into `src/generated/years.json` (~280 KB) and bundled into the Worker; the same data ships as `dist/data/{year}.json`. One source: `scripts/data.ts`.
- Client code has its own tsconfig (`src/client/tsconfig.json`) because `@cloudflare/workers-types` conflicts with DOM types.
- Lint: Biome (single dependency). CSS rules `noImportantStyles` / `noDescendingSpecificity` disabled (intentional `!important` in sr-only, print, reduced-motion).
- `addDays` now throws outside 1900–2100 (found by tests).
- Estimates 2028–2100 come from `src/holidays.ts` (Keppres 8/2024 categories + computus + HKO Imlek + tabular Hijri ±1). `date-holidays` and `scripts/seed.mjs` removed: data files are the only source of truth.
- Chinese calendar is table-driven from HKO 1901–2100 (checksum-tested). ICU `chinese` rejected: 447 days / 13 lunar years differ, incl. Imlek 2027 (ICU 7 Feb vs HKO+SKB 6 Feb).
- Hijri: tabular `civil` for display (21/31 exact vs decrees), never presented as isbat. MABIMS predictor = Phase 4 candidate.
- `subjectTo: "isbat"` on decreed Idulfitri/Iduladha of years whose isbat has not happened (2027). Remove after the isbat confirms the date.
- Historical: 1900–1944 `pre-independence`; 1945–2021 archive not curated (DEFERRED: needs per-year decree evidence).

## Known defects / blockers
- **Environment:** `wrangler dev` crashes (workerd access violation 0xc0000005), reproduced with a trivial worker. `System32\vcruntime140.dll` is 14.28 while registry reports VC++ 14.50. Owner action: reinstall the latest Microsoft Visual C++ Redistributable x64. Workaround: `npx tsx scripts/serve.ts`.
- Sources page now describes quarterly + September monitoring; must be implemented in Phase 6 (scripts/monitor.ts) or the copy changed.
- Web tools: WebFetch/WebSearch fail in this environment (model error); research uses the built-in browser + Bing.
- `/og.png` referenced but missing.

## Verification log
- 2026-10-21 Phase 2: `npm run check` exit 0, 53 tests. Evidence ledger: docs/DATA_SOURCES.md.
- 2026-10-21 Phase 1: build OK (201 years, 6 official), typecheck OK (worker + client), Biome 0 diagnostics, 34 tests pass (weekday of every date 1900–2100 vs Sakamoto, leap years, pasaran cycle, workdays, breaks, ICS folding/escaping, CSV, dataset validation, routing, API errors/ETag/CORS).
