# API reference

Base URL: `https://kalender.rezaprama.com`. Machine-readable spec: [`/openapi.json`](https://kalender.rezaprama.com/openapi.json) (OpenAPI 3.1). Every example below is executed by the test suite (`tests/docs.test.ts`).

## Conventions

- Dates are `YYYY-MM-DD`, from `1900-01-01` to `2100-12-31`.
- `GET`, `HEAD` and `OPTIONS`; `Access-Control-Allow-Origin: *`; no API key.
- Successful responses carry `ETag` and `Cache-Control: public, max-age=3600`. Send `If-None-Match` to get `304`.
- Errors: `{"error":{"code":"invalid_parameter","message":"..."}}` with status `400`, `404`, `405` or `501`.
- `lang=id|en` selects `nameLocalized`; canonical `name` is always Indonesian.
- Every response includes `attribution`. Please credit Reza Prama Arviandi (https://rezaprama.com) when you publish the data.
- `attribution.license.data` (`CC-BY-4.0`) covers the project's own curation. When a JSON body contains Chinese-calendar data derived from Hong Kong Observatory tables (`/date`, `/convert`, `/calendars`, Chinese observances, or projected Tahun Baru Imlek from 2028), `attribution.license.exceptions` lists the HKO terms: non-commercial use only. Sources derived from HKO carry the same text in `rights`. CSV and ICS exports do not repeat it; see [LICENSE-DATA.md](../LICENSE-DATA.md).

## Status and uncertainty

| Field | Meaning |
| --- | --- |
| `status: "official"` | The date and type are stated by a government decree (`sourceId` → `sources[]`) |
| `status: "estimated"` | A projection or calculation, not a decision |
| `status: "unverified"` | Year not curated; an empty list does not mean "no holidays" |
| `uncertaintyDays` | The calculated date may move by this many days (Hijri projections: 1) |
| `subjectTo: "isbat"` | Decreed date that a later Kemenag isbat decision may still change |
| `missing` | What the year's data does not cover (e.g. `collective-leave`, `nyepi`) |

## Endpoints

### Holidays

```
GET /api/v1/holidays?year=2026
GET /api/v1/holidays?year=2026&month=3&type=leave&lang=en
GET /api/v1/holidays?year=2026&format=ics
GET /api/v1/holidays?year=2028&format=csv
```

`format=ics` is suitable for calendar subscriptions; estimates are prefixed `[Perkiraan]` / `[Estimate]`. CSV columns: `date,name,type,status,source_id,uncertainty_days,subject_to`.

### Working days

```
GET /api/v1/workdays?start=2026-01-01&end=2026-12-31&includeLeave=true
```

Inclusive range, at most 3,660 days. `saturdayWorking=true` uses a six-day week. `official: false` means at least one year in the range has no official data.

### One date in every calendar

```
GET /api/v1/date?date=2026-08-17&lang=en
```

Returns `javanese` (`weton` with neptu, `kraton` and `aboge` dates), `islamic` (`civil`, and `umalqura` or `null`), `chinese` (or `null` before 1900-12-22), `observances`, `holidays` with their sources, and `coverage`.

### Conversion to Gregorian

```
GET /api/v1/convert?calendar=islamic&year=1447&month=10&day=1
GET /api/v1/convert?calendar=islamic&year=1447&month=10&day=1&method=umalqura
GET /api/v1/convert?calendar=javanese&year=1960&month=1&day=1&kurup=aboge
GET /api/v1/convert?calendar=chinese&year=2023&month=2&day=1&leap=true
```

The Chinese lunar `year` is the Gregorian year in which that lunar year began. A Hijri result is a calculation, not a Kemenag decision.

### Observances and calendar metadata

```
GET /api/v1/observances?year=2026&lang=en
GET /api/v1/calendars
```

## Static datasets

```
GET /data/2026.json
GET /data/index.json
```

The per-year files have the same records as the API (without `nameLocalized`). `index.json` lists each year's status and version.

## Example: next public holiday in JavaScript

```js
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const year = Number(today.slice(0, 4));
const res = await fetch(`https://kalender.rezaprama.com/api/v1/holidays?year=${year}&type=national`);
if (!res.ok) throw new Error((await res.json()).error.message);
const { holidays, status } = await res.json();
const next = holidays.find((h) => h.date >= today);
console.log(next ? `${next.date} ${next.name} (${status})` : 'No more holidays this year');
```
