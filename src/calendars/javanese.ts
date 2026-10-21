import { civil, dayOfWeek, iso, pasaran } from '../core.ts';

/**
 * Javanese (Sultan Agung) calendar: arithmetic lunar year of 354/355 days in an
 * 8-year windu of 2,835 days (= 81 wetonan of 35 days). Leap (wuntu) years:
 * Ehe, Dal, Jimakir; the extra day goes to Besar.
 *
 * Kurup (120-year era named after the weton of 1 Sura Alip):
 * - Aboge (Alip Rebo Wage): 1749-1866 J, still kept by Aboge communities.
 * - Asapon (Alip Selasa Pon): 1 Sura 1867 J = Tuesday 24 March 1936 through Jimakir 1986 J.
 * After 1986 J no successor kurup has been fixed by the courts, so later dates
 * are continued Asapon arithmetic and flagged `projected`.
 * Sources: id.wikipedia.org/wiki/Kalender_Jawa (kurup and windu tables);
 * Kraton Yogyakarta "1 Sura Be 1960" = 17 June 2026 matches this arithmetic.
 */
export type Kurup = 'asapon' | 'aboge';
/** `kraton`: the kurup in force at that date (Aboge before 24 March 1936, Asapon after). `aboge`: Aboge throughout. */
export type JavaneseConvention = 'kraton' | 'aboge';

export const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'] as const;
/** Indonesian weekday names, Sunday first (matches Date#getUTCDay). */
export const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
/** Traditional neptu values (Primbon Betaljemur Adammakna), Sunday first and in pasaran order. */
export const NEPTU_DAY = [5, 4, 3, 7, 8, 6, 9] as const;
export const NEPTU_PASARAN = [5, 9, 7, 4, 8] as const;
export const MONTHS = ['Sura', 'Sapar', 'Mulud', 'Bakda Mulud', 'Jumadilawal', 'Jumadilakir', 'Rejeb', 'Ruwah', 'Pasa', 'Sawal', 'Sela', 'Besar'] as const;
export const YEAR_NAMES = ['Alip', 'Ehe', 'Jimawal', 'Je', 'Dal', 'Be', 'Wawu', 'Jimakir'] as const;
const YEAR_LENGTHS = [354, 355, 354, 354, 355, 354, 354, 355];
const MONTH_LENGTHS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
const WINDU_DAYS = 2835;
const DAY = 86400000;
/** 1 Sura 1867 J (Alip) in each kurup. */
const ANCHOR: Record<Kurup, number> = { asapon: Date.UTC(1936, 2, 24, 12), aboge: Date.UTC(1936, 2, 25, 12) };
const ANCHOR_YEAR = 1867;
/** First day after Jimakir 1986 J in Asapon: 15 windu after the anchor. */
export const ASAPON_END = iso(new Date(ANCHOR.asapon + 15 * WINDU_DAYS * DAY));

export interface Weton { weekday: string; pasaran: string; neptu: { weekday: number; pasaran: number; total: number } }
export interface JavaneseDate { year: number; yearName: string; month: number; monthName: string; day: number; kurup: Kurup; projected: boolean }

/** Pasaran index (core anchor: 17 August 1945 was Jumat Legi). */
export function pasaranIndex(date: string): number {
  return PASARAN.indexOf(pasaran(date) as (typeof PASARAN)[number]);
}

export function weton(date: string): Weton {
  const d = dayOfWeek(date), p = pasaranIndex(date);
  return { weekday: WEEKDAYS[d], pasaran: PASARAN[p], neptu: { weekday: NEPTU_DAY[d], pasaran: NEPTU_PASARAN[p], total: NEPTU_DAY[d] + NEPTU_PASARAN[p] } };
}

export function kurupAt(date: string, convention: JavaneseConvention = 'kraton'): Kurup {
  return convention === 'aboge' || civil(date).valueOf() < ANCHOR.asapon ? 'aboge' : 'asapon';
}

export function toJavanese(date: string, convention: JavaneseConvention = 'kraton'): JavaneseDate {
  const kurup = kurupAt(date, convention);
  let days = Math.round((civil(date).valueOf() - ANCHOR[kurup]) / DAY);
  let year = ANCHOR_YEAR + 8 * Math.floor(days / WINDU_DAYS);
  days = ((days % WINDU_DAYS) + WINDU_DAYS) % WINDU_DAYS;
  let index = 0;
  while (days >= YEAR_LENGTHS[index]) days -= YEAR_LENGTHS[index++];
  year += index;
  let month = 0;
  for (; month < 11; month++) {
    if (days < MONTH_LENGTHS[month]) break;
    days -= MONTH_LENGTHS[month];
  }
  return { year, yearName: YEAR_NAMES[index], month: month + 1, monthName: MONTHS[month], day: days + 1, kurup, projected: kurup === 'asapon' && date >= ASAPON_END };
}

/** Gregorian date of a Javanese date in the given kurup. Throws RangeError for nonexistent days or results outside 1900-2100. */
export function fromJavanese(year: number, month: number, day: number, kurup: Kurup = 'asapon'): string {
  const offset = (((year - ANCHOR_YEAR) % 8) + 8) % 8;
  const leap = YEAR_LENGTHS[offset] === 355;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > MONTH_LENGTHS[month - 1] + (month === 12 && leap ? 1 : 0)) throw new RangeError('Invalid Javanese date.');
  let days = Math.floor((year - ANCHOR_YEAR - offset) / 8) * WINDU_DAYS;
  for (let i = 0; i < offset; i++) days += YEAR_LENGTHS[i];
  for (let m = 0; m < month - 1; m++) days += MONTH_LENGTHS[m];
  return iso(civil(iso(new Date(ANCHOR[kurup] + (days + day - 1) * DAY))));
}
