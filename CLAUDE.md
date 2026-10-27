# Kalender Indonesia — agent instructions

Indonesian multi-calendar site, holiday dataset, public API and embed. Owner: Reza Prama Arviandi (https://rezaprama.com). Gregorian range 1900–2100 inclusive. Default language Bahasa Indonesia, secondary English.

**Start every session** by reading `docs/AGENT_HANDOFF.md` (current phase, decisions, next action) and `git status`. Product spec: `docs/PRODUCT_SPEC.md` (read only the section you need). Original owner brief, kept local and unpublished: `internal/PROJECT_CONTEXT.md`.

## Stack and commands
- Cloudflare Workers + Static Assets (`wrangler.jsonc`). No framework: TypeScript string-template SSR.
- `npm run build` → `dist/` (static, served before the Worker) + `src/generated/` (bundled into the Worker). Run before typecheck/tests on a fresh clone.
- `npm run check` = build + typecheck + lint (Biome) + tests (`node:test` via tsx). Must pass before every commit.
- `npm run dev` (wrangler) or `npx tsx scripts/serve.ts` (Node preview on :8788, same routing) when workerd cannot start on Windows.
- `npm run e2e` (Playwright + axe-core), `npm run smoke` (wrangler dry-run bundle smoke test), `npm run monitor` (gov sources, read-only), `npx tsx scripts/audit.ts`.
- Release/deploy steps: `docs/RELEASE.md`. Data evidence: `docs/DATA_SOURCES.md`. Methods: `docs/METHODOLOGY.md`.

## Layout
- `src/core.ts` date math (UTC-noon civil dates), exports. `src/calendars/` calendar systems. `src/render.ts` HTML. `src/api.ts` API. `src/worker.ts` routing. `src/client/` browser JS/CSS.
- `data/official/YYYY.json` curated government-sourced years. `scripts/data.ts` loads + validates all years.
- `android/core/` pure Kotlin date/event/ICS logic. `android/app/` native Compose app. See `android/README.md` for SDK, build, privacy and preview-signing boundaries. Android changes require native CI in addition to the web check; never claim performance or device results without a measured run.

## Non-negotiable rules
- Follow the human-only authorship policy in `AGENTS.md`. Do not add assistant co-author trailers or promotional commit/PR credits. Shared `.claude/settings.json` disables automatic attribution.
- Never mark a holiday `official` without a government source (`*.go.id`) that lists that date; record decree numbers and amendments.
- Calculated dates (Hijri, Chinese, estimates) are never presented as official decisions. Label method and uncertainty.
- Do not apply modern holiday law to years before it existed. Missing data ≠ no holidays.
- Do not report tests, scores or deployment that were not actually executed.
- No push, deploy, DNS or account changes without explicit owner approval.
- Code, identifiers, commits in English; talk to the owner in Bahasa Indonesia.
- Keep `docs/AGENT_HANDOFF.md` current at each milestone; keep this file short.
