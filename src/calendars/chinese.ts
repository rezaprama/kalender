import { civil, iso, type Lang } from '../core.ts';

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
/** Month lengths, 1 bit per month after the first (1 = 30 days, 0 = 29), hex nibbles MSB first. FNV-1a: f468db94. */
export const MONTH_LENGTHS_HEX =
  '52ba95d49ba4db2ad5556a9ad4aea57526e93749754b6a9ad52da95b49ba4bd25d92da95b52b6a56d2ae92f49764b6a5752b6a56b4ada4dd25d92dc95d4ada55aaab5556c9764b725752b6956cab5555aa6d52da95d4aea55d2ad555aaab54b6a5752ba93749b6556aaad52da95d4ada4dd26e92ea96d52daa5b52b6937497a4bb25b52b6a56d2ada55d25e92ec96d4aea56b2ad655b49b64bb25b52ba95b4ab5556aaad92ec96e4aea56d2ad555aaab54baa5b52ba95d49ba55aaab5536a96d4aea4ed26e936a9ad535aa5b52ba95b49ba4bd25d52daa5ad2b6a56d26e92f49754b6a56d2ada55b49ba4bd25d92da95d4ad5556caae92ec9764b6a5752b6956aaad54daa5d52da95d4ada55aaab5556a9754b6a57527693729b5556aa6d52da95d49da2dd26d52daa6b52b6a5752768b745764baa4';
/** Indices (into the month list starting at TABLE_START = 0) of leap months. */
export const LEAP_MONTH_INDICES = [31, 67, 102, 131, 167, 201, 231, 266, 302, 337, 366, 402, 437, 466, 502, 537, 572, 602, 637, 672, 702, 737, 772, 808, 837, 872, 908, 937, 972, 1007, 1038, 1071, 1107, 1142, 1172, 1206, 1242, 1277, 1307, 1342, 1378, 1408, 1442, 1477, 1512, 1541, 1577, 1612, 1645, 1677, 1713, 1747, 1777, 1812, 1847, 1877, 1912, 1947, 1983, 2012, 2047, 2083, 2112, 2147, 2182, 2218, 2247, 2282, 2318, 2347, 2382, 2417, 2452];
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
