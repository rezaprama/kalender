import { civil, iso, type Lang } from '../core.ts';

/**
 * Hijri conversion. Neither method reproduces Indonesian isbat decisions
 * (MABIMS criteria + rukyat). Measured against the 31 decreed Islamic holidays
 * of 2022-2027: civil 21 exact (misses ±1 day), umalqura 17 (misses always -1 day).
 *
 * - civil: arithmetic tabular calendar (leap years 2,5,7,10,13,16,18,21,24,26,29 of
 *   each 30-year cycle; epoch Friday 16 July 622 Julian = R.D. 227015), implemented
 *   here from Reingold & Dershowitz, Calendrical Calculations. No runtime dependency.
 * - umalqura: Saudi Umm al-Qura via ICU (Intl). Only offered when the runtime's ICU
 *   passes a self-check; otherwise `umalquraAvailable()` is false.
 */
export type HijriMethod = 'civil' | 'umalqura';
export const HIJRI_METHODS: Record<HijriMethod, { label: { id: string; en: string } }> = {
  civil: { label: { id: 'Tabular (aritmetika)', en: 'Tabular (arithmetic)' } },
  umalqura: { label: { id: 'Umm al-Qura (Arab Saudi)', en: 'Umm al-Qura (Saudi Arabia)' } },
};
export const HIJRI_MONTHS = {
  id: ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'],
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'],
} as const;

export interface HijriDate { year: number; month: number; day: number; method: HijriMethod }

const EPOCH = 227015;
const DAY = 86400000;
/** Rata Die (R.D. 1 = 0001-01-01 proleptic Gregorian) of a civil date. */
const rataDie = (date: string) => Math.floor(civil(date).valueOf() / DAY) + 719163;
const fromRataDie = (rd: number) => iso(new Date((rd - 719163) * DAY + DAY / 2));
const fixedFromIslamic = (y: number, m: number, d: number) => EPOCH - 1 + d + 29 * (m - 1) + Math.floor((6 * m - 1) / 11) + 354 * (y - 1) + Math.floor((3 + 11 * y) / 30);
export const isHijriLeapYear = (year: number) => (((14 + 11 * year) % 30) + 30) % 30 < 11;
export const hijriMonthLength = (year: number, month: number) => (month % 2 === 1 || (month === 12 && isHijriLeapYear(year)) ? 30 : 29);

function civilFromFixed(rd: number): Omit<HijriDate, 'method'> {
  const year = Math.floor((30 * (rd - EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((rd - 29 - fixedFromIslamic(year, 1, 1)) / 29.5) + 1);
  return { year, month, day: rd - fixedFromIslamic(year, month, 1) + 1 };
}

let umalquraFormat: Intl.DateTimeFormat | undefined;
let umalquraOk: boolean | undefined;
function umalquraParts(ms: number): Omit<HijriDate, 'method'> {
  umalquraFormat ??= new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  const parts = umalquraFormat.formatToParts(new Date(ms));
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '', 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Self-check: Saudi Eid al-Fitr 1447 fell on 20 March 2026. Guards against runtimes without ICU calendar data. */
export function umalquraAvailable(): boolean {
  if (umalquraOk === undefined) {
    try {
      const p = umalquraParts(Date.UTC(2026, 2, 20, 12));
      umalquraOk = p.year === 1447 && p.month === 10 && p.day === 1;
    } catch { umalquraOk = false; }
  }
  return umalquraOk;
}

export function toHijri(date: string, method: HijriMethod = 'civil'): HijriDate {
  if (method === 'civil') return { ...civilFromFixed(rataDie(date)), method };
  if (!umalquraAvailable()) throw new Error('Umm al-Qura is not available in this runtime.');
  return { ...umalquraParts(civil(date).valueOf()), method };
}

/** Inverse conversion. Throws RangeError for nonexistent dates or results outside 1900-2100. */
export function fromHijri(year: number, month: number, day: number, method: HijriMethod = 'civil'): string {
  if (![year, month, day].every(Number.isInteger) || month < 1 || month > 12 || day < 1 || day > 30) throw new RangeError('Invalid Hijri date.');
  if (method === 'civil') {
    if (day > hijriMonthLength(year, month)) throw new RangeError('Invalid Hijri date: month has 29 days.');
    return iso(civil(fromRataDie(fixedFromIslamic(year, month, day))));
  }
  // Umm al-Qura: start from the tabular date (always within a few days) and search nearby.
  if (day > 30) throw new RangeError('Invalid Hijri date.');
  const approx = (fixedFromIslamic(year, month, Math.min(day, 29)) - 719163) * DAY + DAY / 2;
  for (const delta of [0, -1, 1, -2, 2, -3, 3]) {
    const ms = approx + (delta + (day === 30 ? 1 : 0)) * DAY;
    const got = umalquraAvailable() ? umalquraParts(ms) : undefined;
    if (got && got.year === year && got.month === month && got.day === day) return iso(civil(iso(new Date(ms))));
  }
  throw new RangeError('Invalid Hijri date for this method.');
}

export function formatHijri(h: HijriDate, lang: Lang = 'id'): string {
  return `${h.day} ${HIJRI_MONTHS[lang][h.month - 1]} ${h.year} ${lang === 'id' ? 'H' : 'AH'}`;
}
