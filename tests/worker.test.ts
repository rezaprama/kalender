import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, test } from 'node:test';
import { route } from '../src/worker.ts';

const BASE = 'https://kalender.rezaprama.com';
const get = (path: string, init?: RequestInit) => route(new Request(BASE + path, init));
const html = async (path: string) => { const r = get(path); return { r, body: await r.text() }; };

describe('pages', () => {
  test('home renders the current year in Indonesian with hashed assets that exist', async () => {
    const { r, body } = await html('/');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type')!, /text\/html/);
    assert.match(body, /<html lang="id">/);
    const assets = [...body.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    assert.equal(assets.length, 2);
    for (const a of assets) assert.ok(existsSync(`dist${a}`), a);
    assert.ok(existsSync('dist/theme.js') && existsSync('dist/favicon.svg') && existsSync('dist/data/2026.json'));
  });

  test('year and month routes in both languages', async () => {
    for (const [path, lang] of [['/2026', 'id'], ['/en/2026', 'en'], ['/2026/08', 'id'], ['/en/1900/01', 'en'], ['/2100/12', 'id'], ['/en', 'en']] as const) {
      const { r, body } = await html(path);
      assert.equal(r.status, 200, path);
      assert.match(body, new RegExp(`<html lang="${lang}"`), path);
      assert.match(body, new RegExp(`<link rel="canonical" href="${BASE}${path === '/en' ? '/en' : path}">`), path);
    }
    const { body } = await html('/2026');
    assert.match(body, /data-date="2026-08-17"/);
    assert.match(body, /Hari Proklamasi Kemerdekaan/);
    assert.match((await html('/en/2026')).body, /Independence Day/);
  });

  test('information pages', async () => {
    for (const path of ['/libur', '/alat', '/sumber', '/api', '/en/holidays', '/en/tools', '/en/sources', '/en/api', '/libur?year=1950']) assert.equal(get(path).status, 200, path);
    assert.match((await html('/libur?year=2025')).body, /2025-08-18/);
  });

  test('invalid routes return 404 pages', async () => {
    for (const path of ['/1899', '/2101', '/2026/13', '/2026/1', '/2026/08/01', '/en/libur', '/holidays', '/nope', '/en/embed']) {
      const r = get(path);
      assert.equal(r.status, 404, path);
      assert.match(await r.text(), /noindex/);
    }
  });

  test('redirects: trailing slash and year form submission', () => {
    const slash = get('/2026/');
    assert.equal(slash.status, 301);
    assert.equal(slash.headers.get('location'), '/2026');
    const form = get('/en/2026/03?year=2030');
    assert.equal(form.status, 302);
    assert.equal(form.headers.get('location'), '/en/2030/03');
    assert.equal(get('/2026?year=abcd').headers.get('location'), '/2026');
  });

  test('security headers and methods', async () => {
    const r = get('/2026');
    assert.match(r.headers.get('content-security-policy')!, /frame-ancestors 'self'/);
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(get('/2026', { method: 'POST' }).status, 405);
    const head = get('/2026', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });

  test('embed is frameable, noindex, and localised', async () => {
    const { r, body } = await html('/embed?year=2026&lang=en&month=8');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('x-frame-options'), null);
    assert.match(r.headers.get('content-security-policy')!, /frame-ancestors \*/);
    assert.match(body, /<html lang="en" class="embed-document">/);
    assert.match(body, /noindex/);
    assert.match(body, /data-date="2026-08-17"/);
    assert.match(body, /href="https:\/\/rezaprama.com"/);
  });
});

describe('API', () => {
  test('holidays JSON with provenance', async () => {
    const r = get('/api/v1/holidays?year=2026');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const body = await r.json() as { status: string; holidays: { type: string; sourceId: string; nameLocalized: string }[]; sources: { id: string }[]; attribution: { url: string } };
    assert.equal(body.status, 'official');
    assert.equal(body.holidays.filter((h) => h.type === 'national').length, 17);
    assert.equal(body.holidays.filter((h) => h.type === 'leave').length, 8);
    assert.ok(body.holidays.every((h) => body.sources.some((s) => s.id === h.sourceId)));
    assert.equal(body.attribution.url, 'https://rezaprama.com');
  });

  test('filters, localisation and formats', async () => {
    const en = await get('/api/v1/holidays?year=2026&month=8&type=national&lang=en').json() as { holidays: { date: string; nameLocalized: string }[] };
    assert.deepEqual(en.holidays.map((h) => h.date), ['2026-08-17', '2026-08-25']);
    assert.equal(en.holidays[0].nameLocalized, 'Independence Day');
    const ics = get('/api/v1/holidays?year=2026&format=ics');
    assert.match(ics.headers.get('content-type')!, /text\/calendar/);
    assert.match(await ics.text(), /^BEGIN:VCALENDAR/);
    const csv = get('/api/v1/holidays?year=2026&format=csv');
    assert.match(csv.headers.get('content-disposition')!, /kalender-2026\.csv/);
  });

  test('conditional requests', () => {
    const tag = get('/api/v1/holidays?year=2026').headers.get('etag')!;
    assert.ok(tag);
    assert.equal(get('/api/v1/holidays?year=2026', { headers: { 'If-None-Match': tag } }).status, 304);
    assert.notEqual(get('/api/v1/holidays?year=2026&lang=en').headers.get('etag'), tag);
  });

  test('validation errors are JSON 400s', async () => {
    for (const q of ['', 'year=2101', 'year=1899', 'year=20x6', 'year=2026&month=13', 'year=2026&format=xml', 'year=2026&type=regional', 'year=2026&lang=fr']) {
      const r = get(`/api/v1/holidays?${q}`);
      assert.equal(r.status, 400, q);
      const body = await r.json() as { error: { code: string } };
      assert.ok(body.error.code, q);
    }
  });

  test('methods and unknown endpoints', () => {
    assert.equal(get('/api/v1/holidays?year=2026', { method: 'OPTIONS' }).status, 204);
    const post = get('/api/v1/holidays?year=2026', { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS');
    assert.equal(get('/api/v1/nope').status, 404);
  });

  test('workdays across years reports coverage', async () => {
    const r = get('/api/v1/workdays?start=2026-01-01&end=2026-12-31');
    const body = await r.json() as { working: number; official: boolean; coverage: { year: number }[] };
    assert.equal(r.status, 200);
    assert.equal(body.official, true);
    assert.equal(body.coverage.length, 1);
    assert.ok(body.working > 200 && body.working < 262);
    const mixed = await get('/api/v1/workdays?start=2027-12-01&end=2028-01-31').json() as { official: boolean };
    assert.equal(mixed.official, false);
    assert.equal(get('/api/v1/workdays?start=2026-02-01&end=2026-01-01').status, 400);
    assert.equal(get('/api/v1/workdays?start=2026-02-30&end=2026-03-01').status, 400);
    assert.equal(get('/api/v1/workdays?start=2000-01-01&end=2026-01-01').status, 400);
  });
});

describe('consistency', () => {
  test('API, static dataset and pages agree for official, estimated and archive years', async () => {
    const { readFile } = await import('node:fs/promises');
    for (const year of [1950, 2026, 2027, 2028, 2100]) {
      const file = JSON.parse(await readFile(`dist/data/${year}.json`, 'utf8')) as { status: string; holidays: Record<string, unknown>[] };
      const api = await get(`/api/v1/holidays?year=${year}`).json() as { status: string; holidays: Record<string, unknown>[] };
      assert.equal(api.status, file.status, String(year));
      assert.deepEqual(api.holidays.map(({ nameLocalized: _, ...h }) => h), file.holidays, String(year));
      const page = await get(`/libur?year=${year}`).text();
      assert.equal((page.match(/<tr data-holiday-type=/g) ?? []).length, file.holidays.length, String(year));
    }
  });

  test('estimates and pending isbat are labelled on pages', async () => {
    assert.match(await get('/libur?year=2028').text(), /Perkiraan ±1 hari/);
    assert.match(await get('/en/holidays?year=2027').text(), /Subject to isbat/);
  });
});

describe('calendar API', () => {
  test('/api/v1/date combines every calendar with holidays and coverage', async () => {
    const r = get('/api/v1/date?date=2026-08-17&lang=en');
    assert.equal(r.status, 200);
    const body = await r.json() as { javanese: { weton: { weekday: string; pasaran: string; neptu: { total: number } }; kraton: { year: number; yearName: string } }; islamic: { civil: { year: number; month: number; day: number } }; chinese: { month: number; kongzili: number }; holidays: { nameLocalized: string; source: { url: string } }[]; coverage: { status: string }; calendars: unknown[] };
    assert.deepEqual([body.javanese.weton.weekday, body.javanese.weton.pasaran, body.javanese.weton.neptu.total], ['Senin', 'Legi', 9]);
    assert.equal(body.javanese.kraton.yearName, 'Be');
    assert.equal(body.islamic.civil.year, 1448);
    assert.equal(body.chinese.kongzili, 2577);
    assert.equal(body.holidays[0].nameLocalized, 'Independence Day');
    assert.match(body.holidays[0].source.url, /\.go\.id\//);
    assert.equal(body.coverage.status, 'official');
    assert.equal(body.calendars.length, 4);
    const early = await get('/api/v1/date?date=1900-06-01').json() as { chinese: unknown };
    assert.equal(early.chinese, null);
  });

  test('/api/v1/convert for Hijri, Javanese and Chinese', async () => {
    const hijri = await get('/api/v1/convert?calendar=islamic&year=1447&month=10&day=1').json() as { date: string; method: string };
    assert.deepEqual([hijri.date, hijri.method], ['2026-03-20', 'civil']);
    const uq = await get('/api/v1/convert?calendar=islamic&year=1447&month=10&day=1&method=umalqura').json() as { date: string };
    assert.equal(uq.date, '2026-03-20');
    const jawa = await get('/api/v1/convert?calendar=javanese&year=1960&month=1&day=1').json() as { date: string };
    assert.equal(jawa.date, '2026-06-17');
    const aboge = await get('/api/v1/convert?calendar=javanese&year=1960&month=1&day=1&kurup=aboge').json() as { date: string };
    assert.equal(aboge.date, '2026-06-18');
    const imlek = await get('/api/v1/convert?calendar=chinese&year=2027&month=1&day=1').json() as { date: string };
    assert.equal(imlek.date, '2027-02-06');
    for (const q of ['', 'calendar=mayan&year=1&month=1&day=1', 'calendar=islamic&year=1447&month=13&day=1', 'calendar=islamic&year=1447&month=2&day=30', 'calendar=chinese&year=2024&month=2&day=1&leap=true', 'calendar=islamic&year=1200&month=1&day=1']) {
      assert.equal(get(`/api/v1/convert?${q}`).status, 400, q);
    }
  });

  test('/api/v1/observances and /api/v1/calendars', async () => {
    const o = await get('/api/v1/observances?year=2026&lang=en').json() as { observances: { nameLocalized: string; calendar: string }[]; note: string };
    assert.ok(o.observances.some((x) => x.nameLocalized === 'Lantern Festival (Cap Go Meh)'));
    assert.match(o.note, /not public holidays/);
    const c = await get('/api/v1/calendars').json() as { calendars: { id: string; range: string[] }[] };
    assert.deepEqual(c.calendars.map((x) => x.id), ['gregorian', 'islamic', 'chinese', 'javanese']);
    assert.deepEqual(c.calendars.find((x) => x.id === 'chinese')!.range, ['1900-12-22', '2100-12-31']);
  });
});

test('every handled API endpoint is documented in openapi.json', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('src/api.ts', 'utf8');
  const handled = [...source.matchAll(/case '(\/api\/v1\/[a-z]+)'/g)].map((m) => m[1]).sort();
  const spec = JSON.parse(await readFile('dist/openapi.json', 'utf8')) as { paths: Record<string, unknown> };
  assert.deepEqual(Object.keys(spec.paths).sort(), handled);
});

describe('exports', () => {
  /** Minimal RFC 5545 structural validator: line length, CRLF, balanced components, required properties. */
  function validateIcs(text: string): string[] {
    const problems: string[] = [];
    if (!text.endsWith('\r\n') || /[^\r]\n/.test(text)) problems.push('line endings');
    const lines = text.split('\r\n').slice(0, -1);
    for (const line of lines) if (new TextEncoder().encode(line).length > 75) problems.push(`long line: ${line.slice(0, 30)}`);
    const unfolded = text.replace(/\r\n[ \t]/g, '').split('\r\n').filter(Boolean);
    const stack: string[] = [];
    let event: Set<string> | undefined;
    const uids = new Set<string>();
    for (const line of unfolded) {
      const [name] = line.split(/[:;]/);
      if (name === 'BEGIN') { stack.push(line.slice(6)); if (line === 'BEGIN:VEVENT') event = new Set(); }
      else if (name === 'END') {
        if (stack.pop() !== line.slice(4)) problems.push(`unbalanced ${line}`);
        if (line === 'END:VEVENT') { for (const p of ['UID', 'DTSTAMP', 'DTSTART', 'SUMMARY']) if (!event!.has(p)) problems.push(`VEVENT missing ${p}`); event = undefined; }
      } else if (event) {
        event.add(name);
        if (name === 'UID') { if (uids.has(line)) problems.push(`duplicate ${line}`); uids.add(line); }
      }
    }
    if (stack.length) problems.push('unclosed components');
    if (!unfolded.includes('VERSION:2.0') || !unfolded.some((l) => l.startsWith('PRODID:'))) problems.push('missing VERSION/PRODID');
    return problems;
  }

  test('ICS for official, estimated and empty years is structurally valid', async () => {
    for (const year of [1950, 2024, 2027, 2028, 2100]) {
      for (const lang of ['id', 'en']) assert.deepEqual(validateIcs(await get(`/api/v1/holidays?year=${year}&format=ics&lang=${lang}`).text()), [], `${year} ${lang}`);
    }
  });

  test('estimates are labelled in ICS and CSV; official events are not', async () => {
    const ics = (await get('/api/v1/holidays?year=2028&format=ics').text()).replace(/\r\n /g, '');
    const summaries = ics.split('\r\n').filter((l) => l.startsWith('SUMMARY:'));
    assert.ok(summaries.length > 0 && summaries.every((l) => l.startsWith('SUMMARY:[Perkiraan] ')));
    assert.match(ics, /±1 hari/);
    const official = (await get('/api/v1/holidays?year=2026&format=ics&lang=en').text()).replace(/\r\n /g, '');
    assert.ok(!/\[Estimate\]/.test(official));
    const csv = await get('/api/v1/holidays?year=2028&format=csv').text();
    const rows = csv.trim().split('\r\n').slice(1);
    assert.ok(rows.every((r) => r.includes('"estimated"')));
    assert.ok(rows.some((r) => r.endsWith('"1",""')));
    assert.match(await get('/api/v1/holidays?year=2027&format=csv').text(), /"isbat"/);
  });
});

describe('search indexing and headers', () => {
  test('month pages are indexed only for official or near years; archive holiday lists are noindex', async () => {
    const robots = async (path: string) => (await get(path).text()).match(/<meta name="robots" content="([^"]+)"/)![1];
    assert.equal(await robots('/2026/04'), 'index,follow');
    assert.equal(await robots('/2022/04'), 'index,follow');
    assert.equal(await robots('/1950/04'), 'noindex,follow');
    assert.equal(await robots('/2090/04'), 'noindex,follow');
    assert.equal(await robots('/1950'), 'index,follow');
    assert.equal(await robots('/libur?year=1950'), 'noindex,follow');
    assert.equal(await robots('/libur?year=2026'), 'index,follow');
  });

  test('HSTS on pages, locked-down CSP and nosniff on API responses', () => {
    assert.equal(get('/2026').headers.get('strict-transport-security'), 'max-age=31536000');
    const api = get('/api/v1/holidays?year=2026');
    assert.match(api.headers.get('content-security-policy')!, /default-src 'none'/);
    assert.equal(get('/api/v1/holidays?year=2026&format=ics').headers.get('x-content-type-options'), 'nosniff');
  });
});
