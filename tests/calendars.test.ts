import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addDays } from '../src/core.ts';
import { LEAP_MONTH_INDICES, MONTH_LENGTHS_HEX, chineseNewYear, fromChinese, monthTable, toChinese } from '../src/calendars/chinese.ts';
import { easter } from '../src/calendars/gregorian.ts';
import { fromHijri, hijriMonthLength, isHijriLeapYear, toHijri, umalquraAvailable } from '../src/calendars/islamic.ts';
import { ASAPON_END, NEPTU_DAY, NEPTU_PASARAN, fromJavanese, toJavanese, weton } from '../src/calendars/javanese.ts';
import { observancesInYear, observancesOn } from '../src/observances.ts';

const fnv = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16); };

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
  test('every day 1900-2100 matches ICU islamic-civil, an independent implementation', () => {
    const icu = new Intl.DateTimeFormat('en-u-ca-islamic-civil', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
    let date = '1900-01-01';
    for (;;) {
      const h = toHijri(date, 'civil');
      const p = icu.formatToParts(new Date(`${date}T12:00:00Z`));
      const get = (type: string) => Number.parseInt(p.find((x) => x.type === type)!.value, 10);
      if (h.year !== get('year') || h.month !== get('month') || h.day !== get('day')) assert.fail(`mismatch at ${date}: ${JSON.stringify(h)}`);
      if (date === '2100-12-31') break;
      date = addDays(date, 1);
    }
  });

  test('known anchors: 1 Muharram 1355 = 24 March 1936; month lengths and leap years', () => {
    assert.deepEqual(toHijri('1936-03-24'), { year: 1355, month: 1, day: 1, method: 'civil' });
    assert.equal(isHijriLeapYear(1447), true); // 1447 mod 30 = 7, a leap year of the cycle
    assert.equal(isHijriLeapYear(1448), false);
    assert.equal(hijriMonthLength(1447, 12), 30);
    assert.equal(hijriMonthLength(1448, 12), 29);
    let leaps = 0;
    for (let y = 1441; y <= 1470; y++) if (isHijriLeapYear(y)) leaps++;
    assert.equal(leaps, 11);
  });

  test('Umm al-Qura self-check passes in Node', () => assert.equal(umalquraAvailable(), true));

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

  test('dates before the HKO table are rejected, not guessed', () => {
    assert.throws(() => toChinese('1900-12-21'), RangeError);
    assert.equal(toChinese('1900-12-22').day, 1);
    assert.throws(() => chineseNewYear(1900), RangeError);
  });

  test('fromChinese inverts toChinese, including leap months', () => {
    for (let ms = Date.UTC(1900, 11, 22, 12); ms <= Date.UTC(2100, 11, 31, 12); ms += 23 * 86400000) {
      const date = new Date(ms).toISOString().slice(0, 10);
      const c = toChinese(date);
      assert.equal(fromChinese(c.year, c.month, c.day, c.leap), date);
    }
    assert.equal(fromChinese(2023, 2, 1, true), '2023-03-22');
    assert.throws(() => fromChinese(2024, 2, 1, true), RangeError); // no leap 2nd month in 2024
    assert.throws(() => fromChinese(2026, 1, 31), RangeError);
  });
});

describe('Javanese calendar', () => {
  test('weton and neptu (Primbon values)', () => {
    assert.deepEqual(weton('1945-08-17'), { weekday: 'Jumat', pasaran: 'Legi', neptu: { weekday: 6, pasaran: 5, total: 11 } });
    assert.deepEqual([...NEPTU_DAY], [5, 4, 3, 7, 8, 6, 9]);
    assert.deepEqual([...NEPTU_PASARAN], [5, 9, 7, 4, 8]);
    assert.equal(weton('2026-08-17').neptu.total, 4 + 5); // Senin Legi
  });

  test('Asapon epoch: 1 Sura 1867 Alip = Selasa Pon 24 March 1936 (= 1 Muharram 1355)', () => {
    assert.deepEqual(toJavanese('1936-03-24'), { year: 1867, yearName: 'Alip', month: 1, monthName: 'Sura', day: 1, kurup: 'asapon', projected: false });
    const w = weton('1936-03-24');
    assert.deepEqual([w.weekday, w.pasaran], ['Selasa', 'Pon']);
  });

  test('1 Sura weton of every year in the Asapon kurup matches the windu table', () => {
    const table: Record<string, string> = { Alip: 'Selasa Pon', Ehe: 'Sabtu Pahing', Jimawal: 'Kamis Pahing', Je: 'Senin Legi', Dal: 'Jumat Kliwon', Be: 'Rabu Kliwon', Wawu: 'Minggu Wage', Jimakir: 'Kamis Pon' };
    for (let year = 1867; year <= 1986; year++) {
      const date = fromJavanese(year, 1, 1);
      if (date < '1900-01-01' || date > '2100-12-31') continue;
      const j = toJavanese(date), w = weton(date);
      assert.deepEqual([j.year, j.month, j.day], [year, 1, 1]);
      assert.equal(`${w.weekday} ${w.pasaran}`, table[j.yearName], `${year} ${j.yearName}`);
    }
  });

  test('Kraton Yogyakarta: 1 Sura Be 1960 = 17 June 2026', () => {
    const j = toJavanese('2026-06-17');
    assert.deepEqual([j.year, j.yearName, j.monthName, j.day], [1960, 'Be', 'Sura', 1]);
  });

  test('Aboge runs one day behind Asapon and is the kraton kurup before 1936', () => {
    assert.deepEqual([toJavanese('2026-06-18', 'aboge').day, toJavanese('2026-06-18', 'aboge').month], [1, 1]);
    assert.equal(toJavanese('1936-03-23').kurup, 'aboge');
    assert.equal(toJavanese('1920-01-01').kurup, 'aboge');
  });

  test('round trip, wuntu years have 30 Besar, projection flag after Jimakir 1986', () => {
    for (let ms = Date.UTC(1936, 2, 24, 12); ms <= Date.UTC(2100, 11, 31, 12); ms += 19 * 86400000) {
      const date = new Date(ms).toISOString().slice(0, 10);
      const j = toJavanese(date);
      assert.equal(fromJavanese(j.year, j.month, j.day), date);
    }
    assert.doesNotThrow(() => fromJavanese(1959, 12, 30)); // Dal is wuntu
    assert.throws(() => fromJavanese(1960, 12, 30), RangeError); // Be is not
    assert.equal(toJavanese(ASAPON_END).projected, true);
    assert.equal(toJavanese(addDays(ASAPON_END, -1)).projected, false);
    assert.deepEqual([toJavanese(ASAPON_END).year, toJavanese(ASAPON_END).day], [1987, 1]);
  });
});

describe('observances', () => {
  test('calculated observances are labelled and never public holidays', () => {
    const list = observancesInYear(2026);
    const names = list.map((o) => o.name);
    for (const expected of ['Awal Ramadan', 'Cap Go Meh', 'Festival Kue Bulan (Tiong Ciu)', 'Malam Tahun Baru Imlek']) assert.ok(names.includes(expected), expected);
    assert.ok(list.filter((o) => o.calendar === 'islamic').every((o) => o.uncertaintyDays === 1));
    assert.ok(list.filter((o) => o.calendar !== 'islamic').every((o) => o.uncertaintyDays === undefined));
    assert.equal(list.find((o) => o.name === 'Cap Go Meh')!.date, '2026-03-03'); // 15th day after Imlek 17 Feb
    assert.equal(list.find((o) => o.name === 'Malam Tahun Baru Imlek')!.date, '2026-02-16');
    assert.ok(observancesOn('2026-06-17').some((o) => o.name.startsWith('1 Sura 1960 Be')));
  });
});
