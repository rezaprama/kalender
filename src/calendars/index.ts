import { MAX_YEAR, MIN_YEAR, civil, dayOfWeek, type Lang } from '../core.ts';
import { observancesOn, type Observance } from '../observances.ts';
import { BRANCHES, STEMS, ZODIAC, toChinese, type ChineseDate } from './chinese.ts';
import { HIJRI_MONTHS, formatHijri, toHijri, umalquraAvailable, type HijriDate } from './islamic.ts';
import { ASAPON_END, toJavanese, weton, type JavaneseDate, type Weton } from './javanese.ts';

export type CalendarId = 'gregorian' | 'islamic' | 'chinese' | 'javanese';
export interface CalendarInfo {
  id: CalendarId;
  name: { id: string; en: string };
  range: [string, string];
  methods: string[];
  notes: { id: string; en: string };
}

/** Supported ranges and conventions, exposed at /api/v1/calendars. */
export const CALENDARS: CalendarInfo[] = [
  { id: 'gregorian', name: { id: 'Masehi', en: 'Gregorian' }, range: [`${MIN_YEAR}-01-01`, `${MAX_YEAR}-12-31`], methods: ['gregorian'],
    notes: { id: 'Tanggal sipil; hari dalam seminggu diuji untuk setiap tanggal.', en: 'Civil dates; the weekday of every date is tested.' } },
  { id: 'islamic', name: { id: 'Hijriah', en: 'Hijri' }, range: [`${MIN_YEAR}-01-01`, `${MAX_YEAR}-12-31`], methods: ['civil', 'umalqura'],
    notes: { id: 'Perhitungan, bukan keputusan sidang isbat Kemenag; dapat berbeda ±1 hari dari praktik Indonesia.', en: 'A calculation, not a Kemenag isbat decision; may differ by ±1 day from Indonesian practice.' } },
  { id: 'chinese', name: { id: 'Tionghoa (Imlek)', en: 'Chinese lunisolar' }, range: ['1900-12-22', `${MAX_YEAR}-12-31`], methods: ['hko'],
    notes: { id: 'Tabel Hong Kong Observatory 1901-2100. Tanggal sebelum 22 Desember 1900 tidak didukung.', en: 'Hong Kong Observatory tables 1901-2100. Dates before 22 December 1900 are not supported.' } },
  { id: 'javanese', name: { id: 'Jawa', en: 'Javanese' }, range: [`${MIN_YEAR}-01-01`, `${MAX_YEAR}-12-31`], methods: ['kraton', 'aboge'],
    notes: { id: `Kurup Aboge sampai 23 Maret 1936, Asapon sesudahnya. Mulai ${ASAPON_END} kurup Asapon berakhir; tanggal sesudahnya adalah proyeksi. Hari Jawa berganti saat magrib; situs memakai tengah malam.`, en: `Aboge kurup until 23 March 1936, Asapon after. Asapon ends on ${ASAPON_END}; later dates are projections. The Javanese day begins at sunset; this site uses midnight.` } },
];

export interface DateDescription {
  date: string;
  weekday: number;
  javanese: { weton: Weton; kraton: JavaneseDate; aboge: JavaneseDate };
  islamic: { civil: HijriDate & { formatted: string }; umalqura: (HijriDate & { formatted: string }) | null; monthName: string };
  chinese: (ChineseDate & { zodiac: string; cycle: string }) | null;
  observances: Observance[];
}

export function describeDate(date: string, lang: Lang = 'id'): DateDescription {
  civil(date);
  const hc = toHijri(date, 'civil');
  const hu = umalquraAvailable() ? toHijri(date, 'umalqura') : null;
  let chinese: DateDescription['chinese'] = null;
  try {
    const c = toChinese(date);
    chinese = { ...c, zodiac: ZODIAC[lang][c.branch], cycle: `${STEMS[c.stem]}-${BRANCHES[c.branch]}` };
  } catch { /* outside HKO coverage */ }
  return {
    date,
    weekday: dayOfWeek(date),
    javanese: { weton: weton(date), kraton: toJavanese(date), aboge: toJavanese(date, 'aboge') },
    islamic: { civil: { ...hc, formatted: formatHijri(hc, lang) }, umalqura: hu ? { ...hu, formatted: formatHijri(hu, lang) } : null, monthName: HIJRI_MONTHS[lang][hc.month - 1] },
    chinese,
    observances: observancesOn(date),
  };
}
