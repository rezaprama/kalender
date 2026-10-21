# Contributing

Thank you for helping. Kontribusi dalam Bahasa Indonesia maupun English sama-sama diterima.

## The most valuable contributions

1. **Sourced corrections and new years.** A missing amendment, a historical year with its decree, a broken source link.
2. **Calendar validation.** Independent reference dates for the Javanese, Hijri or Chinese calendars, especially edge cases.
3. **Accessibility and usability fixes**, with the steps to reproduce.

Please open an issue before large features so we can agree on scope.

## Data rules (non-negotiable)

- `official` requires a government source (`*.go.id`) that lists the date, plus every later amendment. Add the decree numbers and the counts the decree states (`declared`).
- Never infer a holiday from a pattern, a news site or another calendar site. Secondary sites can point you to a decree; they are not the source.
- Do not apply modern holiday rules to years before they existed.
- Calculated dates (Hijri, projections) must stay labelled as calculations.
- Record what you checked, and when, in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

The validator (`scripts/data.ts`) checks provenance, counts, duplicates, weekend leave and whether each date fits its named holiday (fixed dates, Easter computus, Imlek from the HKO table, ±2 days of the tabular Hijri date). If it rejects a genuine decree, explain why in the pull request rather than weakening the check.

## Development

```bash
npm ci
npm run hooks:install
npm run build
npm run check   # must pass before every commit
npm run e2e     # browser + accessibility; run for UI changes
```

- TypeScript strict, no framework. Keep calendar math (`src/calendars/`, `src/core.ts`), data (`data/`, `src/holidays.ts`), presentation (`src/render.ts`, `src/client/`) and API (`src/api.ts`) separate.
- Add or update tests with every behaviour change. Calendar code needs an independent reference in its test, not just a round trip.
- Dates are `YYYY-MM-DD` strings handled at UTC noon. Never use the local timezone for date-only values.
- UI changes must keep `npm run e2e` (axe-core WCAG 2.2 AA, keyboard journeys) passing in light and dark mode.
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) in English, e.g. `fix(data): add 2021 Idulfitri amendment`.

## Commit authorship

Credit the people who contributed. AI tools may assist your work, but do not list assistants or vendors as commit authors, committers, co-authors, sign-offs, or promotional credits in commits and pull request descriptions. Preserve real human co-authors and required third-party notices.

`npm run hooks:install` enables the local commit-message check for this clone. The required CI job checks every newly introduced commit, including intermediate commits in a pull request. Published history is preserved; older commits are outside the new-commit check. Shared [Claude Code settings](.claude/settings.json) disable automatic commit, pull request, and session-link attribution for this project. See the [repository instructions](AGENTS.md).

## Content and licensing

- Code contributions are accepted under Apache-2.0, data contributions under CC BY 4.0.
- Do not copy code, text, design assets or data compilations from other calendar websites.
- Do not commit generated files (`dist/`, `src/generated/`) or research captures (`artifacts/`).

## Reporting security issues

See [SECURITY.md](SECURITY.md). Please do not open public issues for vulnerabilities.
