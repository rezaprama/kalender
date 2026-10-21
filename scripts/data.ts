import { readFile, readdir } from 'node:fs/promises';
import { MAX_YEAR, MIN_YEAR, civil, type YearData } from '../src/core.ts';
import { ESTIMATE_SOURCES, estimateHolidays, implausible, implausibleLeave } from '../src/holidays.ts';

export const DATA_VERSION = '2026.10.21';
const STATUSES = ['official', 'estimated', 'unverified'];

export async function loadOfficial(): Promise<Map<number, YearData>> {
  const official = new Map<number, YearData>();
  for (const file of (await readdir('data/official')).sort()) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(await readFile(`data/official/${file}`, 'utf8')) as YearData;
    if (file !== `${data.year}.json`) throw new Error(`${file} contains year ${data.year}`);
    validate(data);
    official.set(data.year, data);
  }
  return official;
}

function historical(year: number): YearData {
  // Before the 17 August 1945 proclamation there were no national holidays of the Republic.
  const pre = year < 1945;
  return {
    year, status: 'unverified', updated: DATA_VERSION.replaceAll('.', '-'), version: DATA_VERSION, holidays: [], sources: [],
    missing: pre ? ['pre-independence'] : ['national-holiday-archive', 'collective-leave-archive'],
    note: pre
      ? { id: 'Sebelum Proklamasi 17 Agustus 1945 belum ada hari libur nasional Republik Indonesia. Kalender Masehi tetap lengkap; libur masa kolonial tidak dicakup.', en: 'Before the 17 August 1945 proclamation there were no national holidays of the Republic of Indonesia. The Gregorian calendar is complete; colonial-era holidays are not covered.' }
      : { id: 'Kalender Masehi tersedia. Arsip hari libur dan cuti bersama tahun ini belum diverifikasi; daftar kosong bukan berarti tidak ada libur.', en: 'Gregorian calendar is available. Holiday and collective-leave archives for this year have not been verified; an empty list does not mean there were no holidays.' },
  };
}

function estimated(year: number): YearData {
  return {
    year, status: 'estimated', updated: DATA_VERSION.replaceAll('.', '-'), version: DATA_VERSION, holidays: estimateHolidays(year), sources: ESTIMATE_SOURCES,
    missing: ['official-decree', 'collective-leave', 'nyepi', 'waisak'],
    note: {
      id: 'Belum ada SKB untuk tahun ini. Tanggal adalah proyeksi dari kategori Keppres 8/2024 dan perhitungan kalender; tanggal Islam dapat bergeser ±1 hari mengikuti sidang isbat. Nyepi, Waisak, dan cuti bersama tidak ditebak.',
      en: 'No decree exists for this year yet. Dates are projected from Keppres 8/2024 categories and calendar calculations; Islamic dates may shift by ±1 day after the isbat. Nyepi, Vesak and collective leave are not guessed.',
    },
  };
}

/** Every year 1900-2100: curated official years, calculated projections after them, unverified archive before them. */
export async function loadYears(): Promise<Map<number, YearData>> {
  const official = await loadOfficial();
  const first = Math.min(...official.keys()), last = Math.max(...official.keys());
  const result = new Map<number, YearData>();
  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    const data = official.get(year) ?? (year > last ? estimated(year) : year < first ? historical(year) : undefined);
    if (!data) throw new Error(`Gap in official data: ${year}`);
    validate(data);
    result.set(year, data);
  }
  return result;
}

/** Throws on the first structural, provenance or plausibility problem. */
export function validate(data: YearData): void {
  const fail = (message: string): never => { throw new Error(`${data.year}: ${message}`); };
  if (!Number.isInteger(data.year) || data.year < MIN_YEAR || data.year > MAX_YEAR) fail('invalid year');
  if (!STATUSES.includes(data.status)) fail('invalid status');
  for (const s of data.sources) {
    if (new URL(s.url).protocol !== 'https:') fail(`source ${s.id} must use HTTPS`);
    if (!s.title || !/^\d{4}-\d{2}-\d{2}$/.test(s.published) || !/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) fail(`source ${s.id} needs title, published and checked dates`);
  }
  if (new Set(data.sources.map((s) => s.id)).size !== data.sources.length) fail('duplicate source id');
  if (data.status !== 'official' && data.missing.length === 0) fail('non-official years must declare missing coverage');

  const seen = new Set<string>();
  let previous = '';
  for (const h of data.holidays) {
    const key = `${h.date}:${h.type}:${h.name}`;
    civil(h.date);
    if (!h.date.startsWith(`${data.year}-`)) fail(`wrong event year: ${h.date}`);
    if (h.date < previous) fail(`events not sorted at ${h.date}`);
    previous = h.date;
    if (seen.has(key)) fail(`duplicate: ${key}`);
    seen.add(key);
    if (!['national', 'leave'].includes(h.type) || !STATUSES.includes(h.status)) fail(`invalid event enum: ${key}`);
    if ((data.status === 'official') !== (h.status === 'official')) fail(`event status ${h.status} inconsistent with year status ${data.status}: ${key}`);
    if (h.uncertaintyDays !== undefined && (!Number.isInteger(h.uncertaintyDays) || h.uncertaintyDays < 1 || h.status === 'official')) fail(`invalid uncertaintyDays: ${key}`);
    if (h.subjectTo !== undefined && h.subjectTo !== 'isbat') fail(`invalid subjectTo: ${key}`);
    const source = data.sources.find((s) => s.id === h.sourceId);
    if (!h.name || !h.nameEn || !source) fail(`missing provenance: ${key}`);
    if (h.status === 'official' && !new URL(source!.url).hostname.endsWith('.go.id')) fail(`official event needs a government source: ${key}`);
  }

  const national = data.holidays.filter((h) => h.type === 'national');
  for (const h of national) {
    const issue = implausible(h, data.year);
    if (issue) fail(`${h.date} ${h.name}: ${issue}`);
    if (/Pemungutan Suara|Pemilihan|Pilkada/i.test(h.name) && !/Keputusan Presiden|Keppres/.test(data.sources.find((s) => s.id === h.sourceId)?.decree ?? '')) fail(`${h.date}: election holiday needs a presidential decree source`);
  }
  for (const h of data.holidays.filter((h) => h.type === 'leave')) {
    const issue = implausibleLeave(h, national);
    if (issue) fail(`${h.date} ${h.name}: ${issue}`);
  }

  if (data.status === 'official') {
    if (!data.declared) fail('official years must state declared counts from the decree');
    const leave = data.holidays.length - national.length;
    if (national.length !== data.declared!.national || leave !== data.declared!.leave) fail(`counts ${national.length}/${leave} differ from declared ${data.declared!.national}/${data.declared!.leave}`);
  }
}
