<div align="center">

<img src="public/favicon.svg" width="56" height="56" alt="Kalender logo">

# kalender.

**Know the date. Check the source. Plan your time.**

An Indonesian calendar for 1900–2100, with sourced public holidays, collective leave, cultural calendars, an API, and a calendar for your own website.

[Open calendar](https://kalender.rezaprama.com) · [Bahasa Indonesia](README.id.md) · [API docs](docs/API.md) · [Embed](#put-a-calendar-on-your-website)

[![Checks](https://github.com/rezaprama/kalender/actions/workflows/ci.yml/badge.svg)](https://github.com/rezaprama/kalender/actions/workflows/ci.yml)
[![API: v1](https://img.shields.io/badge/API-v1-16624f)](https://kalender.rezaprama.com/openapi.json)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-242424)](LICENSE)

Made and maintained by [Reza Prama Arviandi](https://rezaprama.com).

</div>

Look up a holiday. Find a longer break. Check a weton. Bring the calendar into your app.

**Use it now.** [2026 calendar](https://kalender.rezaprama.com/2026) · [2027 holidays](https://kalender.rezaprama.com/libur?year=2027) · [Working days and leave planner](https://kalender.rezaprama.com/alat)

[![Monthly calendar with Indonesian holidays, Javanese dates, and a yearly holiday summary](docs/images/calendar-desktop.png)](https://kalender.rezaprama.com/2026/08?mode=jawa)

<details>
<summary>See the mobile calendar with Chinese dates</summary>

<img src="docs/images/calendar-mobile.png" width="390" alt="Mobile calendar with Chinese lunar dates, public holidays in red, and collective leave in amber">

</details>

## Choose your starting point

| You want to… | Start here |
| --- | --- |
| Check dates and plan time off | [Open the calendar](https://kalender.rezaprama.com) or [use the planning tools](https://kalender.rezaprama.com/alat) |
| Use the native Android app | [Offline calendar, private agenda, and device integration](android/README.md) |
| Add holidays to a calendar app | [Download the 2026 ICS file](https://kalender.rezaprama.com/api/v1/holidays?year=2026&format=ics) |
| Build an app or spreadsheet | [Try the API](#your-first-api-request), [read the reference](docs/API.md), or [download CSV](https://kalender.rezaprama.com/api/v1/holidays?year=2026&format=csv) |
| Put a calendar on your website | [Copy the embed](#put-a-calendar-on-your-website) |
| Verify a date or contribute a correction | [Check the sources](docs/DATA_SOURCES.md) and [contribution guide](CONTRIBUTING.md) |
| Run your own copy | [Start locally](#run-it-locally), then [deploy to Cloudflare](#deploy-your-own-copy) |

## What you can do

- Browse a year or a month, switch between Indonesian and English, open date details, and print a calendar.
- Separate national holidays from collective leave. Follow each official record back to its government decree or amendment.
- Add Javanese dates, pasaran, weton and neptu; Hijri dates; or Chinese lunar dates to the Gregorian calendar.
- Count working days, explore longer breaks, and export holidays as JSON, ICS, or CSV.
- Use a public API without a key, or a calendar embed that resizes with its contents.
- Read in light or dark mode, on a phone or desktop, with keyboard navigation.

The site renders HTML on Cloudflare Workers. No browser framework, ads, tracking scripts, or cookies. Calendar methods, uncertainty, and source links travel with the data.

## Which dates are official?

**The calendar covers 1900–2100. Verified holiday records currently cover 2022–2027.** These are different things.

| Years | API status | What is available |
| --- | --- | --- |
| 2022–2027 | `official` | National holidays and collective leave from verified government decisions, including amendments and election-day decrees |
| 2028–2100 | `estimated` | Partial calculated dates using the categories in Keppres 8/2024; Nyepi, Waisak, and collective leave are not guessed |
| 1945–2021 | `unverified` | Gregorian dates; the holiday archive has not yet been curated |
| 1900–1944 | `unverified` | Gregorian dates before the Republic of Indonesia; no modern Indonesian holiday dataset is applied |

An empty holiday array for an unverified year means **missing research**, not a holiday-free year. Calculated Islamic dates can differ by a day; dates subject to isbat keep that label. Javanese dates after 2052 are projections. See the [methods and calendar ranges](docs/METHODOLOGY.md).

Government sources are checked **quarterly** (1 January, April, July and October, around 08:00 WIB), and manually when a new decree is expected. New findings go to a review issue. A curator verifies the decree and amendments before a passing pull request updates the site and API. [How updates work](docs/RELEASE.md#maintain-holiday-data).

## Your first API request

No signup or API key. CORS is enabled. Check `status`, `missing`, and `sources` alongside the dates.

```bash
curl "https://kalender.rezaprama.com/api/v1/holidays?year=2026"
```

```js
const response = await fetch('https://kalender.rezaprama.com/api/v1/holidays?year=2026&lang=en');
if (!response.ok) throw new Error(`Calendar API: ${response.status}`);
const { status, holidays, sources, missing } = await response.json();

console.log(status); // 'official', 'estimated', or 'unverified'
for (const holiday of holidays) {
  console.log(holiday.date, holiday.nameLocalized, holiday.type);
}
// Match holiday.sourceId to sources[].id to show the government source.
// Inspect missing before treating the result as a complete holiday list.
```

| Endpoint | Example | Returns |
| --- | --- | --- |
| `/api/v1/holidays` | [`?year=2026`](https://kalender.rezaprama.com/api/v1/holidays?year=2026) | Holidays, collective leave, status, sources; JSON, ICS, or CSV |
| `/api/v1/date` | [`?date=2026-08-17`](https://kalender.rezaprama.com/api/v1/date?date=2026-08-17) | One Gregorian date across the supported calendars |
| `/api/v1/workdays` | [`?start=2026-08-01&end=2026-08-31`](https://kalender.rezaprama.com/api/v1/workdays?start=2026-08-01&end=2026-08-31) | Working-day count and data coverage |
| `/api/v1/convert` | [`?calendar=islamic&year=1447&month=10&day=1`](https://kalender.rezaprama.com/api/v1/convert?calendar=islamic&year=1447&month=10&day=1) | A Hijri, Javanese, or Chinese date converted to Gregorian |
| `/api/v1/observances` | [`?year=2026`](https://kalender.rezaprama.com/api/v1/observances?year=2026) | Calculated cultural and religious observances, distinct from public holidays |
| `/api/v1/calendars` | [Open endpoint](https://kalender.rezaprama.com/api/v1/calendars) | Supported calendars, methods, and conversion ranges |

[API reference and error responses](docs/API.md) · [OpenAPI 3.1](https://kalender.rezaprama.com/openapi.json) · [Interactive examples](https://kalender.rezaprama.com/api)

## Put a calendar on your website

Paste this into a page that allows custom HTML:

```html
<script src="https://kalender.rezaprama.com/embed.js" defer></script>
<kalender-indonesia year="2026" lang="id" mode="jawa">
  <a href="https://rezaprama.com">Kalender oleh Reza Prama Arviandi</a>
</kalender-indonesia>
```

Change `year`, use `lang="en"` for English, or choose another supported calendar mode in the [embed guide](https://kalender.rezaprama.com/api#embed). The component creates an iframe and adjusts its height. If your platform strips scripts, use an ordinary iframe from that guide.

Keep a visible credit link to [Reza Prama Arviandi](https://rezaprama.com). Review the [data licenses](LICENSE-DATA.md), especially the Chinese calendar conditions, before commercial use.

## Run it locally

Use **Node.js 22 or newer** and npm.

```bash
git clone https://github.com/rezaprama/kalender.git
cd kalender
npm ci
npm run hooks:install
npm run dev
```

Open **http://localhost:8787**. The dev command builds the data and assets, watches for changes, and starts Wrangler. For a Node preview without workerd, run `npm run build` followed by `npx tsx scripts/serve.ts`, then open http://localhost:8788.

| Command | Purpose |
| --- | --- |
| `npm run check` | Build, strict typechecking, Biome lint, data validation, and unit/integration/documentation tests |
| `npm run smoke` | Bundle the Worker in a dry run and check its routes |
| `npm run e2e` | Browser journeys and axe-core accessibility checks; install Chromium with `npx playwright install --with-deps --only-shell chromium` first |
| `npm run monitor` | Inspect government sources for new decisions; does not edit official records |
| `npm run hooks:install` | Enable this clone's commit attribution check; CI checks new commits too |

<details>
<summary>Project layout</summary>

```text
src/core.ts          civil-date math, ICS and CSV
src/calendars/       Gregorian, Hijri, Javanese and Chinese conversions
src/holidays.ts      holiday categories and partial projections
src/api.ts           public API routes
src/render.ts        server-rendered pages
src/worker.ts        routing, caching and security headers
src/client/          browser TypeScript and CSS
data/official/       sourced holiday records, one JSON file per year
scripts/             build, validation, monitoring and maintenance
tests/               unit, integration, documentation and browser tests
```

</details>

## Deploy your own copy

Fork this repository and use your own Cloudflare account. Before deploying, change the account ID, Worker name, and domain routes in [`wrangler.jsonc`](wrangler.jsonc). Site URLs and attribution are defined in [`src/core.ts`](src/core.ts); keep the original author's credit when adapting them.

Connect your fork through Cloudflare Workers Builds: production branch `main`, build command `npm run build`, deploy command `npx wrangler deploy`, Preview command `npx wrangler preview`. Or, after signing in with `npx wrangler login`, run `npm run deploy` locally.

This repository already deploys `main` to [kalender.rezaprama.com](https://kalender.rezaprama.com). Other branches use Cloudflare preview builds. See [deployment, verification, and maintenance](docs/RELEASE.md) for the full workflow.

## Help fill the archive

The most useful next contribution is a verified historical year, a missing decree amendment, an independent calendar reference, or an accessibility fix. Bring a government source and explain what changed. [Start with CONTRIBUTING.md](CONTRIBUTING.md) or [open an issue](https://github.com/rezaprama/kalender/issues/new/choose).

If this helps your project, a star makes it easier to find again. Forks, sourced corrections, and examples of real use help the calendar improve.

## Licenses and credit

| Part | Terms |
| --- | --- |
| Source code | [Apache-2.0](LICENSE) |
| Original data curation | [CC BY 4.0](LICENSE-DATA.md), with attribution |
| Indonesian government decisions | Their own rights and source notices; see [data licensing](LICENSE-DATA.md) |
| HKO-derived Chinese calendar table | **Non-commercial use only**, © Government of the Hong Kong SAR; [HKO conditions and disclaimer](third_party/hko/NOTICE.md). Excluded from Apache-2.0 and CC BY 4.0 |
| Third-party assets | Their included licenses; see [NOTICE](NOTICE) |

For websites using the data or embed, credit **[Reza Prama Arviandi](https://rezaprama.com)** with a normal link. Keep source and third-party notices required by the applicable license.
