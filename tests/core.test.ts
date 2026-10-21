import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MAX_YEAR, MIN_YEAR, addDays, breaks, civil, dayOfWeek, daysInMonth, pasaran, toCSV, toICS, validYear, workdays, type Holiday, type YearData } from '../src/core.ts';

/** Sakamoto's weekday algorithm: an implementation independent of Date (0 = Sunday). */
function sakamoto(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const pad = (n: number) => String(n).padStart(2, '0');

describe('Gregorian range and validation', () => {
  test('accepts exactly 1900-2100', () => {
    assert.equal(MIN_YEAR, 1900);
    assert.equal(MAX_YEAR, 2100);
    assert.ok(validYear(1900) && validYear(2100));
    assert.ok(!validYear(1899) && !validYear(2101) && !validYear(2026.5) && !validYear(Number.NaN));
    assert.doesNotThrow(() => civil('1900-01-01'));
    assert.doesNotThrow(() => civil('2100-12-31'));
    assert.throws(() => civil('1899-12-31'), RangeError);
    assert.throws(() => civil('2101-01-01'), RangeError);
  });

  test('rejects malformed and impossible dates', () => {
    for (const bad of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-01', '20260101', '', '2026-02-30T00:00']) {
      assert.throws(() => civil(bad), RangeError, bad);
    }
  });

  test('leap years follow the century rule (1900 and 2100 are not leap years, 2000 is)', () => {
    assert.equal(daysInMonth(1900, 2), 28);
    assert.equal(daysInMonth(2000, 2), 29);
    assert.equal(daysInMonth(2100, 2), 28);
    assert.throws(() => civil('1900-02-29'));
    assert.doesNotThrow(() => civil('2000-02-29'));
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) assert.equal(daysInMonth(y, 2), isLeap(y) ? 29 : 28, String(y));
  });

  test('month lengths', () => {
    const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) assert.equal(daysInMonth(2023, m), expected[m - 1]);
  });

  test('every weekday from 1900 to 2100 matches an independent algorithm', () => {
    let date = '1900-01-01', checked = 0;
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          assert.equal(date, `${y}-${pad(m)}-${pad(d)}`);
          if (dayOfWeek(date) !== sakamoto(y, m, d)) assert.fail(`weekday mismatch at ${date}`);
          checked++;
          if (date !== '2100-12-31') date = addDays(date, 1);
        }
      }
    }
    assert.equal(checked, 73414);
  });

  test('known weekdays', () => {
    assert.equal(dayOfWeek('1900-01-01'), 1); // Monday
    assert.equal(dayOfWeek('1945-08-17'), 5); // Friday, Proclamation of Independence
    assert.equal(dayOfWeek('2100-12-31'), 5); // Friday
  });

  test('date arithmetic is timezone independent', () => {
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
    assert.equal(addDays('2023-12-31', 1), '2024-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
    assert.throws(() => addDays('2100-12-31', 1), RangeError);
  });
});

describe('Javanese pasaran', () => {
  test('anchor: 17 August 1945 was Jumat Legi', () => assert.equal(pasaran('1945-08-17'), 'Legi'));

  test('cycles every five days in order, including before the anchor', () => {
    const order = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
    for (let i = -20; i <= 20; i++) assert.equal(pasaran(addDays('1945-08-17', i)), order[((i % 5) + 5) % 5]);
  });

  test('a 35-day wetonan cycle repeats weekday and pasaran', () => {
    for (const date of ['1900-01-01', '1999-12-31', '2026-10-21']) {
      const next = addDays(date, 35);
      assert.equal(pasaran(next), pasaran(date));
      assert.equal(dayOfWeek(next), dayOfWeek(date));
    }
  });
});

const sample = (overrides: Partial<Holiday>[] = []): Holiday[] => overrides.map((o, i) => ({ date: `2026-01-0${i + 1}`, name: 'Libur', nameEn: 'Holiday', type: 'national', status: 'official', sourceId: 's', ...o }));

describe('workdays', () => {
  test('counts inclusive range and excludes weekend holidays once', () => {
    // 2026-01-01 Thursday (holiday), 2026-01-03 Saturday (holiday on weekend)
    const holidays = sample([{ date: '2026-01-01' }, { date: '2026-01-03' }, { date: '2026-01-02', type: 'leave' }]);
    const result = workdays('2026-01-01', '2026-01-07', holidays);
    assert.deepEqual([result.total, result.weekends, result.excludedHolidays, result.working], [7, 2, 1, 4]);
    const withLeave = workdays('2026-01-01', '2026-01-07', holidays, true);
    assert.equal(withLeave.working, 3);
    const sixDay = workdays('2026-01-01', '2026-01-07', holidays, false, true);
    assert.deepEqual([sixDay.weekends, sixDay.excludedHolidays, sixDay.working], [1, 2, 4]);
  });

  test('single-day and maximum ranges', () => {
    assert.equal(workdays('2026-01-05', '2026-01-05', []).working, 1);
    assert.throws(() => workdays('2026-01-06', '2026-01-05', []), RangeError);
    assert.throws(() => workdays('2000-01-01', '2010-12-31', []), RangeError);
  });
});

describe('long-weekend finder', () => {
  test('finds a four-day break with one bridge day and no overlaps', () => {
    // 2026-05-14 Thursday holiday: Thu + (Fri leave) + Sat + Sun
    const result = breaks(2026, sample([{ date: '2026-05-14' }]), 1, true);
    const top = result.find((b) => b.start === '2026-05-14');
    assert.ok(top, 'expected a break starting on the holiday');
    assert.deepEqual([top.end, top.days, top.leave], ['2026-05-17', 4, ['2026-05-15']]);
    for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) assert.ok(result[i].end < result[j].start || result[j].end < result[i].start);
  });

  test('zero budget returns only natural breaks of three or more days', () => {
    for (const b of breaks(2026, sample([{ date: '2026-05-14' }, { date: '2026-05-15' }]), 0)) assert.equal(b.leave.length, 0);
  });
});

const yearData = (holidays: Holiday[]): YearData => ({ year: 2026, status: 'official', updated: '2026-10-21', version: '2026.10.21', holidays, sources: [{ id: 's', title: 'T', url: 'https://example.go.id', published: '2026-01-01', checked: '2026-10-21' }], missing: [], note: { id: 'n', en: 'n' } });

describe('ICS export (RFC 5545)', () => {
  const holidays = sample([{ name: 'Tahun Baru, Masehi; uji\\coba', nameEn: 'New Year' }, { name: 'Hari Raya Idulfitri 1447 Hijriah dengan nama yang sangat panjang sekali untuk menguji pelipatan baris' }]);
  const ics = toICS(yearData(holidays));

  test('uses CRLF and folds lines at 75 octets', () => {
    assert.ok(ics.endsWith('\r\n'));
    assert.ok(!/[^\r]\n/.test(ics), 'bare LF found');
    for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  });

  test('one all-day VEVENT per holiday with escaped text', () => {
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
    assert.match(ics, /DTSTART;VALUE=DATE:20260101/);
    assert.match(ics, /DTEND;VALUE=DATE:20260102/);
    const unfolded = ics.replace(/\r\n /g, '');
    assert.match(unfolded, /SUMMARY:Tahun Baru\\, Masehi\\; uji\\\\coba/);
    assert.ok(unfolded.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'));
  });
});

describe('CSV export', () => {
  test('BOM, header, quoting and localisation', () => {
    const csv = toCSV(sample([{ name: 'Libur "khusus", satu', nameEn: 'Special' }]), 'id');
    assert.ok(csv.startsWith('﻿date,name,type,status,source_id\r\n'));
    assert.match(csv, /"2026-01-01","Libur ""khusus"", satu","national","official","s"/);
    assert.match(toCSV(sample([{ nameEn: 'Special' }]), 'en'), /"Special"/);
  });
});
