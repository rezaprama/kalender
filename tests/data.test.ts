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

describe('plausibility checks', () => {
  const year2026 = async () => clone((await official()).find((d) => d.year === 2026)!);
  const expectFail = async (name: string, mutate: (d: YearData) => void, pattern: RegExp) => {
    const data = await year2026();
    mutate(data);
    assert.throws(() => validate(data), pattern, name);
  };

  test('catches mislabelled and mistyped records', async () => {
    await expectFail('Isra Mikraj labelled as Maulid', (d) => { d.holidays.find((h) => /Isra/.test(h.name))!.name = 'Maulid Nabi Muhammad SAW'; }, /maulid/);
    await expectFail('Imlek one day late', (d) => { d.holidays.find((h) => h.type === 'national' && /Imlek/.test(h.name))!.date = '2026-02-18'; }, /imlek expected/);
    await expectFail('Christmas on the wrong day', (d) => { d.holidays.find((h) => h.type === 'national' && /Natal/.test(h.name))!.date = '2026-12-26'; }, /christmas expected/);
    await expectFail('Good Friday shifted', (d) => { d.holidays.find((h) => /Wafat/.test(h.name))!.date = '2026-04-02'; }, /computus/);
    await expectFail('unknown name', (d) => { d.holidays[0].name = 'Hari Libur Baru'; }, /unrecognised/);
    await expectFail('leave on a Saturday', (d) => { d.holidays.find((h) => h.type === 'leave')!.date = '2026-02-14'; }, /weekend/);
    await expectFail('leave far from its holiday', (d) => { const h = d.holidays.find((x) => x.type === 'leave' && /Natal/.test(x.name))!; h.date = '2026-12-01'; d.holidays.sort((a, b) => a.date.localeCompare(b.date)); }, /within 10 days/);
    await expectFail('count differs from decree', (d) => { d.declared = { national: 18, leave: 8 }; }, /declared/);
    await expectFail('estimated event in an official year', (d) => { d.holidays[0].status = 'estimated'; }, /inconsistent/);
  });

  test('an election holiday requires a presidential decree', async () => {
    const data = clone((await official()).find((d) => d.year === 2024)!);
    assert.doesNotThrow(() => validate(data));
    const keppres = data.holidays.find((h) => /Pemungutan/.test(h.name))!.sourceId;
    data.sources.find((s) => s.id === keppres)!.decree = 'Pengumuman';
    assert.throws(() => validate(data), /presidential decree/);
  });

  test('the same observance may fall twice in one Gregorian year (Isra Mikraj 2027)', async () => {
    const data = (await official()).find((d) => d.year === 2027)!;
    assert.deepEqual(data.holidays.filter((h) => /Isra/.test(h.name)).map((h) => h.date), ['2027-01-05', '2027-12-26']);
  });

  test('decreed Islamic holidays still awaiting isbat are flagged', async () => {
    const data = (await official()).find((d) => d.year === 2027)!;
    assert.deepEqual(data.holidays.filter((h) => h.subjectTo === 'isbat').map((h) => h.date), ['2027-03-10', '2027-03-11', '2027-05-17']);
  });
});

describe('projections and archives', () => {
  test('estimated years: Keppres categories, labelled uncertainty, no guessed Nyepi/Waisak/leave', async () => {
    const years = await loadYears();
    for (let y = 2028; y <= 2100; y++) {
      const data = years.get(y)!;
      assert.equal(data.status, 'estimated');
      assert.ok(data.holidays.every((h) => h.type === 'national' && h.status === 'estimated'), String(y));
      assert.ok(!data.holidays.some((h) => /Nyepi|Waisak/.test(h.name)), String(y));
      for (const name of ['Tahun Baru Masehi', 'Tahun Baru Imlek', 'Wafat Yesus Kristus', 'Hari Buruh Internasional', 'Hari Lahir Pancasila', 'Hari Proklamasi Kemerdekaan', 'Kelahiran Yesus Kristus (Natal)']) {
        assert.equal(data.holidays.filter((h) => h.name === name).length, 1, `${y} ${name}`);
      }
      for (const h of data.holidays) assert.equal(h.uncertaintyDays === 1, h.sourceId === 'calc-hijri-civil', `${y} ${h.name}`);
    }
    assert.deepEqual(years.get(2028)!.holidays.filter((h) => /Isra|Maulid/.test(h.name)).map((h) => `${h.date} ${h.name}`), ['2028-08-03 Maulid Nabi Muhammad SAW', '2028-12-14 Isra Mikraj Nabi Muhammad SAW']);
    assert.equal(years.get(2030)!.holidays.find((h) => /Imlek/.test(h.name))!.date, '2030-02-03'); // HKO; ICU says 2030-02-02
  });

  test('historical years make no holiday claims and explain why', async () => {
    const years = await loadYears();
    assert.deepEqual(years.get(1900)!.missing, ['pre-independence']);
    assert.deepEqual(years.get(1950)!.missing, ['national-holiday-archive', 'collective-leave-archive']);
    for (let y = 1900; y <= 2021; y++) assert.equal(years.get(y)!.holidays.length, 0);
  });
});
