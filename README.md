# Kalender Indonesia

**An Indonesian calendar you can check.** Public holidays and collective leave traced to government decrees, Gregorian dates for 1900–2100, Javanese, Hijri and Chinese conversions, a free JSON/ICS/CSV API and an embeddable calendar.

[Bahasa Indonesia](README.id.md) · Website: <https://kalender.rezaprama.com> · API: [`/openapi.json`](https://kalender.rezaprama.com/openapi.json)

Made and maintained by [Reza Prama Arviandi](https://rezaprama.com).

## What makes it different

- **Every official date has a source.** Each holiday links to the SKB 3 Menteri, amendment or Keppres that declared it. The validator rejects official records that do not come from a `.go.id` source or that disagree with the counts stated in the decree. See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).
- **It says what it does not know.** Each year is `official`, `estimated` or `unverified`. Projections for years without a decree are labelled, carry their uncertainty (Islamic dates ±1 day) and never claim to be government decisions. An empty historical year means "not yet curated", not "no holidays".
- **Four calendars, one date model.** The Gregorian calendar is primary. Javanese (weton, neptu, Asapon and Aboge kurup), Hijri (tabular and Umm al-Qura) and Chinese (Hong Kong Observatory tables) are conversions with documented methods and ranges. See [docs/METHODOLOGY.md](docs/METHODOLOGY.md).
- **Small and fast.** Server-rendered HTML on Cloudflare Workers, about 11 KB of gzipped JavaScript, no framework, no tracking, no cookies.

## Data coverage

| Years | Status | Contents |
| --- | --- | --- |
| 2022–2027 | `official` | National holidays and collective leave from verified decrees, including amendments and election-day Keppres |
| 2028–2100 | `estimated` | Keppres 8/2024 categories with calculated dates. Nyepi, Waisak and collective leave are not guessed |
| 1945–2021 | `unverified` | Gregorian calendar only. Holiday archive not yet curated |
| 1900–1944 | `unverified` | Before the Republic of Indonesia. No national holidays apply |

Contributions of sourced historical years are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## API in 30 seconds

No key, CORS enabled, JSON by default.

```bash
curl "https://kalender.rezaprama.com/api/v1/holidays?year=2026"
```

```js
const res = await fetch('https://kalender.rezaprama.com/api/v1/holidays?year=2026&lang=en');
const { status, holidays, sources } = await res.json();
// holidays: [{ date, name, nameEn, nameLocalized, type: 'national' | 'leave', status, sourceId }]
```

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/holidays?year=` | Holidays and collective leave, `format=json\|ics\|csv` |
| `GET /api/v1/workdays?start=&end=` | Working days in a range, with data coverage |
| `GET /api/v1/date?date=` | One date in every calendar, with holidays and observances |
| `GET /api/v1/convert?calendar=&year=&month=&day=` | Hijri, Javanese or Chinese date to Gregorian |
| `GET /api/v1/observances?year=` | Calculated religious and cultural observances (not holidays) |
| `GET /api/v1/calendars` | Supported calendars, methods and ranges |

Full reference: [docs/API.md](docs/API.md) and the OpenAPI 3.1 document at `/openapi.json`.

## Embed

```html
<script src="https://kalender.rezaprama.com/embed.js" defer></script>
<kalender-indonesia year="2026" lang="id" mode="jawa">
  <a href="https://rezaprama.com">Kalender oleh Reza Prama Arviandi</a>
</kalender-indonesia>
```

The web component creates an iframe that resizes itself. A plain `<iframe src="https://kalender.rezaprama.com/embed?year=2026">` works too.

## Development

Requirements: Node.js 22 or later, npm.

```bash
npm install
npm run build
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run build` | Datasets, hashed assets, OpenAPI, sitemap into `dist/` and `src/generated/` |
| `npm run dev` | Build, watch and run `wrangler dev` on :8787 |
| `npx tsx scripts/serve.ts` | Same routing on Node (:8788), for machines where workerd cannot start |
| `npm run check` | Build, typecheck, lint (Biome) and unit/integration tests |
| `npm run e2e` | Browser journeys and axe-core WCAG 2.2 AA audit (needs Playwright Chromium) |
| `npm run monitor` | Check government sources for new decrees (see below) |

### Layout

```
src/core.ts          civil-date math, ICS/CSV
src/calendars/       gregorian, islamic, chinese (HKO table), javanese, describeDate()
src/holidays.ts      holiday categories, projections, plausibility checks
src/observances.ts   calculated observances (never stored as holidays)
src/api.ts           /api/v1/*
src/render.ts        server-rendered pages
src/worker.ts        routing and security headers
src/client/          browser JS and CSS
data/official/       curated, sourced holiday years
scripts/             build, data validation, preview, monitoring
tests/               node:test suites; tests/e2e/ Playwright journeys
```

## Deployment

Cloudflare Workers with static assets. `dist/` is served directly; only HTML pages, `/embed` and `/api/*` run the Worker.

```bash
npm run deploy
```

Connecting the GitHub repository in Cloudflare Workers Builds works with build command `npm run build` and deploy command `npx wrangler deploy`. The custom domain `kalender.rezaprama.com` is declared in `wrangler.jsonc`.

## License and attribution

- Code: [Apache-2.0](LICENSE)
- Original curated data: [CC BY 4.0](LICENSE-DATA.md)
- Chinese calendar table: Hong Kong Observatory data, © Government of the Hong Kong SAR, **non-commercial use only** under [HKO conditions](third_party/hko/NOTICE.md). It is not covered by Apache-2.0 or CC BY 4.0.
- Third-party notices: [NOTICE](NOTICE)

If you use the data or the embed on a website, please credit [Reza Prama Arviandi](https://rezaprama.com) with a normal link.
