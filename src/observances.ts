import { addDays, civil } from './core.ts';
import { toChinese, type ChineseDate } from './calendars/chinese.ts';
import { toHijri } from './calendars/islamic.ts';
import { toJavanese } from './calendars/javanese.ts';

/**
 * Religious and cultural observances derived from calendar conversions. They are
 * NOT public holidays and are never merged into the holiday dataset. Islamic
 * observances use the tabular calendar and carry ±1 day uncertainty; Chinese
 * ones use the HKO table; 1 Sura uses the kurup in force (Asapon since 1936).
 */
export interface Observance {
  date: string;
  name: string;
  nameEn: string;
  calendar: 'islamic' | 'chinese' | 'javanese';
  uncertaintyDays?: number;
}

type Rule = { calendar: Observance['calendar']; name: string; nameEn: string; month: number; day: number };
const ISLAMIC: Rule[] = [
  { calendar: 'islamic', name: 'Asyura', nameEn: 'Ashura', month: 1, day: 10 },
  { calendar: 'islamic', name: 'Nisfu Syakban', nameEn: 'Mid-Shaban', month: 8, day: 15 },
  { calendar: 'islamic', name: 'Awal Ramadan', nameEn: 'First day of Ramadan', month: 9, day: 1 },
  { calendar: 'islamic', name: 'Nuzulul Quran', nameEn: 'Nuzul al-Quran', month: 9, day: 17 },
  { calendar: 'islamic', name: 'Hari Arafah', nameEn: 'Day of Arafah', month: 12, day: 9 },
];
const CHINESE: Rule[] = [
  { calendar: 'chinese', name: 'Cap Go Meh', nameEn: 'Lantern Festival (Cap Go Meh)', month: 1, day: 15 },
  { calendar: 'chinese', name: 'Peh Cun', nameEn: 'Dragon Boat Festival (Peh Cun)', month: 5, day: 5 },
  { calendar: 'chinese', name: 'Sembahyang Rebutan (Cioko)', nameEn: 'Ghost Festival (Cioko)', month: 7, day: 15 },
  { calendar: 'chinese', name: 'Festival Kue Bulan (Tiong Ciu)', nameEn: 'Mid-Autumn Festival (Tiong Ciu)', month: 8, day: 15 },
];

export function observancesOn(date: string): Observance[] {
  const out: Observance[] = [];
  const h = toHijri(date, 'civil');
  for (const r of ISLAMIC) if (h.month === r.month && h.day === r.day) out.push({ date, name: r.name, nameEn: r.nameEn, calendar: r.calendar, uncertaintyDays: 1 });
  let c: ChineseDate | undefined;
  try { c = toChinese(date); } catch { c = undefined; }
  if (c && !c.leap) for (const r of CHINESE) if (c.month === r.month && c.day === r.day) out.push({ date, name: r.name, nameEn: r.nameEn, calendar: r.calendar });
  if (c) {
    let next: ChineseDate | undefined;
    try { next = toChinese(addDays(date, 1)); } catch { next = undefined; }
    if (next && next.month === 1 && next.day === 1 && !next.leap) out.push({ date, name: 'Malam Tahun Baru Imlek', nameEn: 'Chinese New Year’s Eve', calendar: 'chinese' });
  }
  const j = toJavanese(date);
  if (j.month === 1 && j.day === 1) out.push({ date, name: `1 Sura ${j.year} ${j.yearName} (Tahun Baru Jawa)`, nameEn: `1 Sura ${j.year} ${j.yearName} (Javanese New Year)`, calendar: 'javanese' });
  return out;
}

export function observancesInYear(year: number): Observance[] {
  const out: Observance[] = [];
  for (let ms = civil(`${year}-01-01`).valueOf(); ms <= civil(`${year}-12-31`).valueOf(); ms += 86400000) out.push(...observancesOn(new Date(ms).toISOString().slice(0, 10)));
  return out;
}
