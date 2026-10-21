import { addDays, dayOfWeek, type Holiday, type Source } from './core.ts';
import { HKO_RIGHTS, chineseNewYear } from './calendars/chinese.ts';
import { easter } from './calendars/gregorian.ts';
import { fromHijri, toHijri } from './calendars/islamic.ts';

/** Holiday categories of Keppres 8/2024 plus decree-specific ones (election days). */
export type HolidayKey = 'newyear' | 'imlek' | 'isra' | 'nyepi' | 'friday' | 'easter' | 'labour' | 'ascension' | 'fitri' | 'adha' | 'waisak' | 'pancasila' | 'islam' | 'independence' | 'maulid' | 'christmas' | 'election';

export const NAMES: Record<Exclude<HolidayKey, 'election'>, [id: string, en: string]> = {
  newyear: ['Tahun Baru Masehi', "New Year's Day"],
  imlek: ['Tahun Baru Imlek', 'Chinese New Year'],
  isra: ['Isra Mikraj Nabi Muhammad SAW', "Isra and Mi'raj"],
  nyepi: ['Hari Suci Nyepi', 'Day of Silence (Nyepi)'],
  friday: ['Wafat Yesus Kristus', 'Good Friday'],
  easter: ['Kebangkitan Yesus Kristus (Paskah)', 'Easter Sunday'],
  labour: ['Hari Buruh Internasional', 'Labour Day'],
  ascension: ['Kenaikan Yesus Kristus', 'Ascension Day'],
  fitri: ['Hari Raya Idulfitri', 'Eid al-Fitr'],
  adha: ['Hari Raya Iduladha', 'Eid al-Adha'],
  waisak: ['Hari Raya Waisak', 'Vesak Day'],
  pancasila: ['Hari Lahir Pancasila', 'Pancasila Day'],
  islam: ['Tahun Baru Islam', 'Islamic New Year'],
  independence: ['Hari Proklamasi Kemerdekaan', 'Independence Day'],
  maulid: ['Maulid Nabi Muhammad SAW', "Prophet Muhammad's Birthday"],
  christmas: ['Kelahiran Yesus Kristus (Natal)', 'Christmas Day'],
};

/** Order matters: "Tahun Baru Islam" must not match the Gregorian new year. */
const PATTERNS: [HolidayKey, RegExp][] = [
  ['islam', /Tahun Baru Islam|Muharam/i], ['imlek', /Imlek/i], ['newyear', /Masehi/i], ['isra', /Isra/i], ['nyepi', /Nyepi/i],
  ['friday', /Wafat/i], ['easter', /Paskah|Kebangkitan/i], ['labour', /Buruh/i], ['ascension', /Kenaikan/i],
  ['fitri', /Idul ?Fitri/i], ['adha', /Idul ?Adha/i], ['waisak', /Waisak/i], ['pancasila', /Pancasila/i],
  ['independence', /Kemerdekaan|Proklamasi/i], ['maulid', /Maulid/i], ['christmas', /Natal|Kelahiran Yesus/i],
  ['election', /Pemungutan Suara|Pemilihan Umum|Pilkada/i],
];

export function holidayKey(name: string): HolidayKey | undefined {
  return PATTERNS.find(([, pattern]) => pattern.test(name))?.[0];
}

const FIXED: Partial<Record<HolidayKey, string>> = { newyear: '01-01', labour: '05-01', pancasila: '06-01', independence: '08-17', christmas: '12-25' };
const EASTER_OFFSET: Partial<Record<HolidayKey, number>> = { friday: -2, easter: 0, ascension: 39 };
/** Hijri month/day targets; Idulfitri spans two national days. */
const HIJRI: Partial<Record<HolidayKey, [month: number, days: number[]]>> = { isra: [7, [27]], fitri: [10, [1, 2]], adha: [12, [10]], islam: [1, [1]], maulid: [3, [12]] };
/** Dates set by astronomy-plus-religious-council rules we do not model; only a month window is checked. */
const WINDOW: Partial<Record<HolidayKey, [first: number, last: number]>> = { nyepi: [2, 4], waisak: [4, 6] };
const HIJRI_TOLERANCE = 2;

/**
 * Plausibility of a national-holiday date for its named category. Returns an
 * issue string, or undefined when plausible. Catches mislabels (e.g. Isra Mikraj
 * named Maulid) and transcription errors in curated data.
 */
export function implausible(h: Holiday, year: number): string | undefined {
  const key = holidayKey(h.name);
  if (!key) return `unrecognised holiday name "${h.name}"`;
  if (key === 'election') return undefined;
  const fixed = FIXED[key];
  if (fixed) return h.date.slice(5) === fixed ? undefined : `${key} expected on ${year}-${fixed}`;
  const offset = EASTER_OFFSET[key];
  if (offset !== undefined) {
    const expected = addDays(easter(year), offset);
    return h.date === expected ? undefined : `${key} expected on ${expected} (computus)`;
  }
  if (key === 'imlek') {
    const expected = chineseNewYear(year);
    return h.date === expected ? undefined : `imlek expected on ${expected}`;
  }
  const hijri = HIJRI[key];
  if (hijri) {
    for (let o = -HIJRI_TOLERANCE; o <= HIJRI_TOLERANCE; o++) {
      let probe: string;
      try { probe = addDays(h.date, o); } catch { continue; }
      const c = toHijri(probe, 'civil');
      if (c.month === hijri[0] && hijri[1].includes(c.day)) return undefined;
    }
    return `${key} is more than ${HIJRI_TOLERANCE} days from ${hijri[1].join('/')} ${hijri[0]} (tabular Hijri)`;
  }
  const window = WINDOW[key]!;
  const month = Number(h.date.slice(5, 7));
  return month >= window[0] && month <= window[1] ? undefined : `${key} outside months ${window[0]}-${window[1]}`;
}

/** Collective leave must be a weekday close to a national holiday of the same category. */
export function implausibleLeave(h: Holiday, national: Holiday[]): string | undefined {
  const key = holidayKey(h.name);
  if (!key) return `unrecognised holiday name "${h.name}"`;
  if ([0, 6].includes(dayOfWeek(h.date))) return 'collective leave on a weekend';
  const near = national.some((n) => holidayKey(n.name) === key && Math.abs(Date.parse(n.date) - Date.parse(h.date)) <= 10 * 86400000);
  return near ? undefined : `no national ${key} holiday within 10 days`;
}

export const METHODOLOGY_URL = 'https://github.com/rezaprama/kalender/blob/main/docs/METHODOLOGY.md';
export const ESTIMATE_SOURCES: Source[] = [
  { id: 'keppres-8-2024', title: 'Keppres 8/2024 tentang Hari-hari Libur: kategori libur yang berlaku (bukan penetapan tanggal tahun ini)', url: 'https://peraturan.bpk.go.id/Details/276688/keppres-no-8-tahun-2024-hari-hari-libur', published: '2024-01-29', checked: '2026-10-21', decree: 'Keputusan Presiden Nomor 8 Tahun 2024' },
  { id: 'calc-computus', title: 'Perhitungan: Paskah Gregorian (algoritme Meeus/Jones/Butcher)', url: `${METHODOLOGY_URL}#christian-holidays`, published: '2026-10-21', checked: '2026-10-21' },
  { id: 'calc-chinese', title: 'Perhitungan: tabel kalender Tionghoa Hong Kong Observatory 1901-2100', url: `${METHODOLOGY_URL}#chinese-calendar`, published: '2026-10-21', checked: '2026-10-21', rights: HKO_RIGHTS },
  { id: 'calc-hijri-civil', title: 'Perhitungan: Hijriah tabular (islamic-civil); dapat berbeda ±1 hari dari sidang isbat', url: `${METHODOLOGY_URL}#islamic-calendar`, published: '2026-10-21', checked: '2026-10-21' },
];

/**
 * Projection for a year without a decree: categories from Keppres 8/2024, dates
 * from deterministic calculations. Nyepi, Waisak and collective leave are not
 * projected because they depend on decisions we cannot reproduce.
 */
export function estimateHolidays(year: number): Holiday[] {
  const out: Holiday[] = [];
  const add = (key: Exclude<HolidayKey, 'election'>, date: string, sourceId: string, uncertaintyDays?: number) => {
    const [name, nameEn] = NAMES[key];
    out.push({ date, name, nameEn, type: 'national', status: 'estimated', sourceId, ...(uncertaintyDays ? { uncertaintyDays } : {}) });
  };
  for (const [key, md] of Object.entries(FIXED) as [Exclude<HolidayKey, 'election'>, string][]) add(key, `${year}-${md}`, 'keppres-8-2024');
  for (const [key, offset] of Object.entries(EASTER_OFFSET) as [Exclude<HolidayKey, 'election'>, number][]) add(key, addDays(easter(year), offset), 'calc-computus');
  add('imlek', chineseNewYear(year), 'calc-chinese');
  // A Hijri year is ~11 days shorter, so an observance can fall twice in one Gregorian year.
  const first = toHijri(`${year}-01-01`, 'civil').year;
  for (const hy of [first, first + 1]) {
    for (const [key, [month, days]] of Object.entries(HIJRI) as [Exclude<HolidayKey, 'election'>, [number, number[]]][]) {
      for (const day of days) {
        let date: string;
        try { date = fromHijri(hy, month, day, 'civil'); } catch { continue; }
        if (date.startsWith(`${year}-`)) add(key, date, 'calc-hijri-civil', 1);
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
