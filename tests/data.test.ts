import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { describe, test } from 'node:test';
import type { YearData } from '../src/core.ts';
import { loadYears, validate } from '../scripts/data.ts';

const official = async () => Promise.all((await readdir('data/official')).filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(`data/official/${f}`, 'utf8')) as YearData));
const clone = <T>(value: T): T => structuredClone(value);

describe('dataset', () => {
  test('covers every year 1900-2100 exactly once', async () => {
    const years = await loadYears();
    assert.equal(years.size, 201);
    for (let y = 1900; y <= 2100; y++) assert.equal(years.get(y)?.year, y);
  });

  test('official files are valid, sorted, and fully sourced from government domains', async () => {
    for (const data of await official()) {
      assert.equal(data.status, 'official', String(data.year));
      assert.doesNotThrow(() => validate(data));
      const dates = data.holidays.map((h) => h.date);
      assert.deepEqual(dates, [...dates].sort(), `${data.year} not sorted`);
      for (const h of data.holidays) {
        const source = data.sources.find((s) => s.id === h.sourceId)!;
        assert.ok(new URL(source.url).hostname.endsWith('.go.id'), `${data.year} ${h.date}`);
      }
    }
  });

  test('non-official years never claim official status', async () => {
    for (const data of (await loadYears()).values()) {
      if (data.status === 'official') continue;
      assert.ok(data.holidays.every((h) => h.status !== 'official'), String(data.year));
      assert.ok(data.missing.length > 0, `${data.year} must declare missing coverage`);
    }
  });
});

describe('validate()', () => {
  test('rejects invalid records', async () => {
    const base = (await official())[0];
    const cases: [string, (d: YearData) => void][] = [
      ['wrong year', (d) => { d.holidays[0].date = `${d.year + 1}-01-01`; }],
      ['impossible date', (d) => { d.holidays[0].date = `${d.year}-02-30`; }],
      ['duplicate', (d) => { d.holidays.push(clone(d.holidays[0])); }],
      ['bad type', (d) => { (d.holidays[0] as { type: string }).type = 'regional'; }],
      ['unknown source', (d) => { d.holidays[0].sourceId = 'nope'; }],
      ['official from non-government host', (d) => { d.sources = d.sources.map((s) => ({ ...s, url: 'https://example.com/x' })); }],
      ['http source', (d) => { d.sources[0].url = d.sources[0].url.replace('https:', 'http:'); }],
      ['year out of range', (d) => { d.year = 2101; }],
    ];
    for (const [name, mutate] of cases) {
      const data = clone(base);
      mutate(data);
      assert.throws(() => validate(data), Error, name);
    }
  });
});
