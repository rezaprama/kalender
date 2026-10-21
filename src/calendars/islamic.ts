import { civil, iso, type Lang } from '../core.ts';

/**
 * Hijri conversion through ICU (Intl). Both methods are arithmetic/tabular or
 * pre-computed conventions; neither reproduces Indonesian isbat decisions
 * (MABIMS criteria + rukyat). Measured against official 2022-2027 dates:
 * civil 21/31 exact (misses ±1 day), umalqura 17/31 (misses always -1 day).
 */
export type HijriMethod = 'civil' | 'umalqura';
export const HIJRI_METHODS: Record<HijriMethod, { calendar: string; label: { id: string; en: string } }> = {
  civil: { calendar: 'islamic-civil', label: { id: 'Tabular (aritmetika, epoch Jumat 16 Juli 622)', en: 'Tabular (arithmetic, Friday 16 July 622 epoch)' } },
  umalqura: { calendar: 'islamic-umalqura', label: { id: 'Umm al-Qura (Arab Saudi)', en: 'Umm al-Qura (Saudi Arabia)' } },
};
export const HIJRI_MONTHS = {
  id: ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah'],
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'],
} as const;

export interface HijriDate { year: number; month: number; day: number; method: HijriMethod }

const formatters = new Map<HijriMethod, Intl.DateTimeFormat>();
function formatter(method: HijriMethod): Intl.DateTimeFormat {
  let f = formatters.get(method);
  if (!f) formatters.set(method, (f = new Intl.DateTimeFormat(`en-u-ca-${HIJRI_METHODS[method].calendar}`, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })));
  return f;
}

function partsAt(ms: number, method: HijriMethod): Omit<HijriDate, 'method'> {
  const parts = formatter(method).formatToParts(new Date(ms));
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? '', 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function toHijri(date: string, method: HijriMethod = 'civil'): HijriDate {
  return { ...partsAt(civil(date).valueOf(), method), method };
}

/** Inverse conversion by bounded search. Throws RangeError for nonexistent dates (e.g. 30 in a 29-day month) or results outside 1900-2100. */
export function fromHijri(year: number, month: number, day: number, method: HijriMethod = 'civil'): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 30) throw new RangeError('Invalid Hijri date.');
  const DAY = 86400000, EPOCH = Date.UTC(622, 6, 16, 12);
  let ms = EPOCH + Math.round(((year - 1) * 354.36667 + (month - 1) * 29.530589 + (day - 1)) * DAY);
  for (let i = 0; i < 8; i++) {
    const got = partsAt(ms, method);
    const diff = Math.round((year - got.year) * 354.36667 + (month - got.month) * 29.530589 + (day - got.day));
    if (diff === 0) break;
    ms += diff * DAY;
  }
  for (const delta of [0, -1, 1]) {
    const got = partsAt(ms + delta * DAY, method);
    if (got.year === year && got.month === month && got.day === day) return iso(civil(iso(new Date(ms + delta * DAY))));
  }
  throw new RangeError('Invalid Hijri date for this method.');
}

export function formatHijri(h: HijriDate, lang: Lang = 'id'): string {
  return `${h.day} ${HIJRI_MONTHS[lang][h.month - 1]} ${h.year} ${lang === 'id' ? 'H' : 'AH'}`;
}
