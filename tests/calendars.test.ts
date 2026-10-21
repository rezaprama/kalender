import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addDays } from '../src/core.ts';
import { LEAP_MONTH_INDICES, MONTH_LENGTHS_HEX, chineseNewYear, monthTable, toChinese } from '../src/calendars/chinese.ts';
import { easter } from '../src/calendars/gregorian.ts';
import { fromHijri, toHijri } from '../src/calendars/islamic.ts';

const fnv = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16); };
const rataDie = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) + 719163;

describe('Gregorian Easter (computus)', () => {
  test('known dates, including those confirmed by Indonesian decrees 2024-2027', () => {
    const known: Record<number, string> = { 1943: '1943-04-25', 2000: '2000-04-23', 2008: '2008-03-23', 2011: '2011-04-24', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2038: '2038-04-25' };
    for (const [year, date] of Object.entries(known)) assert.equal(easter(Number(year)), date);
  });
  test('always a Sunday between 22 March and 25 April', () => {
    for (let y = 1900; y <= 2100; y++) {
      const date = easter(y);
      assert.equal(new Date(`${date}T12:00:00Z`).getUTCDay(), 0, date);
      assert.ok(date.slice(5) >= '03-22' && date.slice(5) <= '04-25', date);
    }
  });
});

describe('Hijri (tabular islamic-civil)', () => {
  /** Calendrical Calculations (Reingold & Dershowitz), fixed-from-islamic; epoch R.D. 227015. Independent of ICU. */
  const fixedFromIslamic = (y: number, m: number, d: number) => d + 29 * (m - 1) + Math.floor((6 * m - 1) / 11) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 227015 - 1;

  test('every day 1900-2100 matches the published arithmetic algorithm', () => {
    let date = '1900-01-01';
    for (;;) {
      const h = toHijri(date, 'civil');
      if (fixedFromIslamic(h.year, h.month, h.day) !== rataDie(date)) assert.fail(`mismatch at ${date}: ${JSON.stringify(h)}`);
      if (date === '2100-12-31') break;
      date = addDays(date, 1);
    }
  });

  test('fromHijri inverts toHijri for both methods', () => {
    for (const method of ['civil', 'umalqura'] as const) {
      for (let ms = Date.UTC(1900, 0, 1, 12); ms <= Date.UTC(2100, 11, 31, 12); ms += 37 * 86400000) {
        const date = new Date(ms).toISOString().slice(0, 10);
        const h = toHijri(date, method);
        assert.equal(fromHijri(h.year, h.month, h.day, method), date, `${method} ${date}`);
      }
    }
  });

  test('rejects impossible dates', () => {
    assert.throws(() => fromHijri(1447, 13, 1), RangeError);
    assert.throws(() => fromHijri(1447, 1, 31), RangeError);
    assert.throws(() => fromHijri(1200, 1, 1), RangeError); // before 1900
  });
});

describe('Chinese lunisolar (HKO table)', () => {
  test('embedded table matches the checksum computed from the HKO source files', () => {
    assert.equal(MONTH_LENGTHS_HEX.length, 619);
    assert.equal(fnv(MONTH_LENGTHS_HEX), 'f468db94');
    assert.equal(LEAP_MONTH_INDICES.length, 73);
  });

  test('structure: 29/30-day months, 12 or 13 months per lunar year, ends on 2100-12-31', () => {
    const table = monthTable();
    assert.equal(new Date(table.at(-1)!.start).toISOString().slice(0, 10), '2100-12-31');
    const perYear = new Map<number, number>();
    for (let i = 1; i < table.length; i++) {
      const days = (table[i].start - table[i - 1].start) / 86400000;
      assert.ok(days === 29 || days === 30);
      perYear.set(table[i].year, (perYear.get(table[i].year) ?? 0) + 1);
    }
    for (let y = 1901; y <= 2099; y++) assert.ok([12, 13].includes(perYear.get(y)!), `${y}: ${perYear.get(y)}`);
  });

  test('HKO spot checks', () => {
    const cases: [string, number, number, boolean][] = [
      ['1901-02-19', 1, 1, false], ['1901-01-20', 12, 1, false], ['2023-02-20', 2, 1, false], ['2023-03-22', 2, 1, true],
      ['2023-04-20', 3, 1, false], ['2027-02-06', 1, 1, false], ['2027-02-05', 12, 29, false], ['2033-11-22', 11, 1, false],
      ['2033-12-22', 11, 1, true], ['2100-02-09', 1, 1, false], ['2100-12-31', 12, 1, false],
    ];
    for (const [date, month, day, leap] of cases) {
      const c = toChinese(date);
      assert.deepEqual([c.month, c.day, c.leap, c.source], [month, day, leap, 'hko'], date);
    }
  });

  test('Imlek matches every Indonesian decree 2022-2027, with Kongzili year', () => {
    assert.deepEqual([2022, 2023, 2024, 2025, 2026, 2027].map(chineseNewYear), ['2022-02-01', '2023-01-22', '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-06']);
    assert.equal(toChinese('2026-02-17').kongzili, 2577); // "Tahun Baru Imlek 2577 Kongzili" (SKB 2026)
    assert.equal(toChinese('2027-02-06').kongzili, 2578);
  });

  test('sexagenary cycle and zodiac', () => {
    const c = toChinese('2027-02-06');
    assert.deepEqual([c.stem, c.branch], [3, 7]); // Ding-wei, Goat
    const d = toChinese('2024-02-10');
    assert.deepEqual([d.stem, d.branch], [0, 4]); // Jia-chen, Dragon
  });

  test('ICU fallback before the HKO table joins it without a gap', () => {
    const before = toChinese('1900-12-21');
    assert.deepEqual([before.month, before.day, before.source], [10, 30, 'icu']);
    assert.equal(toChinese('1900-01-31').month, 1); // Chinese New Year 1900 (ICU)
    assert.equal(chineseNewYear(1900), '1900-01-31');
  });
});
