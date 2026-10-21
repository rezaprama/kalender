# Agent handoff

Authoritative checkpoint. Update at every milestone. States: NOT_STARTED · IN_PROGRESS · VERIFIED · BLOCKED · DEFERRED.

## Current
- Branch: `feat/kalender-completion` (from `main` @ 6927e9e "chore: preserve initial Codex implementation"). No remote configured. Nothing pushed or deployed.
- Phase: 2 — holiday data correctness. Next action: audit 2022–2027 against government documents.

## Milestones
| Phase | State | Evidence |
| --- | --- | --- |
| 1 Foundation and recovery | VERIFIED (wrangler dev BLOCKED by environment) | `npm run check` exit 0; Node preview renders `/`, `/en/2026/08`, `/alat`; dialog works, no console errors |
| 2 Holiday data correctness | IN_PROGRESS | |
| 3 Frontend, UX, a11y | NOT_STARTED | |
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

## Known defects / blockers
- **Environment:** `wrangler dev` crashes (workerd access violation 0xc0000005), reproduced with a trivial worker. `System32\vcruntime140.dll` is 14.28 while registry reports VC++ 14.50. Owner action: reinstall the latest Microsoft Visual C++ Redistributable x64. Workaround: `npx tsx scripts/serve.ts`.
- Estimated years 2028–2100 come from `date-holidays` (mislabel: 2028-12-14 "Maulid" is likely Isra Mikraj; Nyepi/Waisak/Isra missing; lunar rules thin out near 2100). Fix in Phase 2.
- Sources page text claims daily GitHub Actions monitoring — not implemented and contradicts quarterly policy. Fix in Phase 2/6.
- `/og.png` referenced but missing.

## Verification log
- 2026-10-21 Phase 1: build OK (201 years, 6 official), typecheck OK (worker + client), Biome 0 diagnostics, 34 tests pass (weekday of every date 1900–2100 vs Sakamoto, leap years, pasaran cycle, workdays, breaks, ICS folding/escaping, CSV, dataset validation, routing, API errors/ETag/CORS).
