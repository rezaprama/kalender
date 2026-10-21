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
