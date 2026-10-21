import { civil, iso, type Lang } from '../core.ts';
import { LEAP_MONTH_INDICES, MONTH_LENGTHS_HEX } from './chinese-hko-data.ts';

export { HKO_ATTRIBUTION, HKO_RIGHTS, LEAP_MONTH_INDICES, MONTH_LENGTHS_HEX } from './chinese-hko-data.ts';

/**
 * Chinese lunisolar calendar, table-driven from the Hong Kong Observatory
 * Gregorian-Lunar Calendar Conversion Tables 1901-2100 (retrieved 2026-10-21).
 * ICU's astronomical `chinese` calendar is NOT used for 1900-12-22..2100-12-31:
 * it disagrees with HKO and the Indonesian SKB on some new moons close to
 * midnight Beijing time (e.g. Imlek 2027: HKO/SKB 6 Feb, ICU 7 Feb).
 * Supported range: 1900-12-22 to 2100-12-31. Earlier dates throw RangeError.
 */
const TABLE_START = '1900-12-22'; // first day of the 11th month of lunar year 1900 (Geng-zi)
const START_MONTH = 11;
const START_YEAR = 1900;
const MONTH_COUNT = 2475;

export interface ChineseDate {
  /** Gregorian year in which this lunar year began. */
  year: number;
  month: number;
  leap: boolean;
  day: number;
  /** Kongzili year used in Indonesian decrees: year + 551. */
  kongzili: number;
  stem: number;
  branch: number;
  source: 'hko';
}

export const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'] as const;
export const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'] as const;
export const ZODIAC = {
  id: ['Tikus', 'Kerbau', 'Macan', 'Kelinci', 'Naga', 'Ular', 'Kuda', 'Kambing', 'Monyet', 'Ayam', 'Anjing', 'Babi'],
  en: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'],
} as const;

interface Month { start: number; year: number; month: number; leap: boolean }
let months: Month[] | undefined;
const DAY = 86400000;

/** Decoded month table (start as UTC-noon epoch ms). */
export function monthTable(): readonly Month[] {
  if (months) return months;
  const leaps = new Set(LEAP_MONTH_INDICES);
  const list: Month[] = [{ start: civil(TABLE_START).valueOf(), year: START_YEAR, month: START_MONTH, leap: false }];
  for (let i = 1; i < MONTH_COUNT; i++) {
    const nibble = Number.parseInt(MONTH_LENGTHS_HEX[(i - 1) >> 2], 16);
    const long = (nibble >> (3 - ((i - 1) & 3))) & 1;
    const prev = list[i - 1];
    const leap = leaps.has(i);
    const month = leap ? prev.month : (prev.month % 12) + 1;
    list.push({ start: prev.start + (29 + long) * DAY, year: !leap && month === 1 ? prev.year + 1 : prev.year, month, leap });
  }
  return (months = list);
}

function cycle(year: number) {
  const c = (((year - 4) % 60) + 60) % 60;
  return { stem: c % 10, branch: c % 12 };
}

export function toChinese(date: string): ChineseDate {
  const ms = civil(date).valueOf();
  const table = monthTable();
  if (ms >= table[0].start) {
    let lo = 0, hi = table.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (table[mid].start <= ms) lo = mid;
      else hi = mid - 1;
    }
    const m = table[lo];
    return { year: m.year, month: m.month, leap: m.leap, day: Math.round((ms - m.start) / DAY) + 1, kongzili: m.year + 551, ...cycle(m.year), source: 'hko' };
  }
  throw new RangeError(`Chinese calendar supported from ${TABLE_START} (HKO table coverage).`);
}

/** First day of the lunar year that begins in Gregorian `year` (1901-2100). */
export function chineseNewYear(year: number): string {
  const m = monthTable().find((x) => x.year === year && x.month === 1 && !x.leap);
  if (!m) throw new RangeError(`Chinese New Year ${year} is outside the HKO table (1901-2100).`);
  return new Date(m.start).toISOString().slice(0, 10);
}

/** Gregorian date of a Chinese lunar date (lunar year = Gregorian year in which it began). */
export function fromChinese(year: number, month: number, day: number, leap = false): string {
  const table = monthTable();
  const i = table.findIndex((m) => m.year === year && m.month === month && m.leap === leap);
  if (i < 0 || !Number.isInteger(day) || day < 1) throw new RangeError('Invalid or unsupported Chinese date.');
  const length = i + 1 < table.length ? (table[i + 1].start - table[i].start) / DAY : 1;
  if (day > length) throw new RangeError(`Month has ${length} days.`);
  return iso(new Date(table[i].start + (day - 1) * DAY));
}

export function formatChinese(c: ChineseDate, lang: Lang = 'id'): string {
  const month = lang === 'id' ? `bulan ${c.leap ? 'kabisat ' : ''}${c.month}` : `${c.leap ? 'leap ' : ''}month ${c.month}`;
  const day = lang === 'id' ? `tanggal ${c.day}` : `day ${c.day}`;
  return `${day}, ${month}, ${lang === 'id' ? 'tahun' : 'year'} ${STEMS[c.stem]}-${BRANCHES[c.branch]} (${ZODIAC[lang][c.branch]}), ${c.kongzili} Kongzili`;
}
