/** Calendar math uses Gregorian civil dates at UTC noon, never browser-local midnight. */
export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const SITE = 'https://kalender.rezaprama.com';
export const AUTHOR = { name: 'Reza Prama Arviandi', url: 'https://rezaprama.com' } as const;
export type Lang = 'id' | 'en';
export type Status = 'official' | 'estimated' | 'unverified';
export type HolidayType = 'national' | 'leave';
export interface Source { id: string; title: string; url: string; published: string; checked: string; decree?: string }
/** uncertaintyDays: calculated dates that may shift (e.g. ±1 for Hijri). subjectTo: decreed date that a later Kemenag isbat may still change. */
export interface Holiday { date: string; name: string; nameEn: string; type: HolidayType; status: Status; sourceId: string; uncertaintyDays?: number; subjectTo?: 'isbat' }
export interface YearData {
  year: number; status: Status; updated: string; version: string; holidays: Holiday[];
  sources: Source[]; missing: string[]; note: { id: string; en: string };
  /** Counts stated by the cited decrees after amendments (official years only); validated against the records. */
  declared?: { national: number; leave: number };
}
export const MONTHS = {
  id: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
};
export const WEEKDAYS = { id: ['Sen','Sel','Rab','Kam','Jum','Sab','Min'], en: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] };
export function validYear(year: number): boolean { return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR; }
export function civil(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new RangeError('Date must use YYYY-MM-DD.');
  const result = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(result.valueOf()) || result.toISOString().slice(0,10) !== date || !validYear(result.getUTCFullYear())) throw new RangeError('Date outside 1900-2100 or invalid.');
  return result;
}
export function iso(date: Date): string { return date.toISOString().slice(0,10); }
/** Result is range-checked: stepping past 1900-01-01 or 2100-12-31 throws RangeError. */
export function addDays(date: string, count: number): string { const d = civil(date); d.setUTCDate(d.getUTCDate()+count); const result = iso(d); civil(result); return result; }
export function daysInMonth(year: number, month: number): number { return new Date(Date.UTC(year,month,0,12)).getUTCDate(); }
export function dayOfWeek(date: string): number { return civil(date).getUTCDay(); }
export function jakartaToday(now = new Date()): string { return new Intl.DateTimeFormat('en-CA',{ timeZone:'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit' }).format(now); }
export function formatDate(date: string, lang: Lang = 'id', weekday = false): string {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB',{day:'numeric',month:'long',year:'numeric',...(weekday ? {weekday:'long' as const} : {}),timeZone:'UTC'}).format(civil(date));
}
/** Reference: 17 August 1945 = Friday Legi. Civil day changes at midnight, not sunset. */
export function pasaran(date: string): string {
  const offset = Math.round((civil(date).valueOf()-Date.UTC(1945,7,17,12))/86400000);
  return ['Legi','Pahing','Pon','Wage','Kliwon'][((offset%5)+5)%5];
}
export function escapeHtml(value: unknown): string { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
export function pathFor(year: number, lang: Lang = 'id', month?: number): string { return `${lang === 'en' ? '/en' : ''}/${year}${month ? `/${String(month).padStart(2,'0')}` : ''}`; }
export function workdays(start: string, end: string, holidays: Holiday[], includeLeave = false, saturdayWorking = false) {
  const first = civil(start), last = civil(end);
  const total = Math.round((last.valueOf()-first.valueOf())/86400000)+1;
  if (total < 1 || total > 3660) throw new RangeError('Range must be 1-3660 days, inclusive.');
  const off = new Set(holidays.filter(h=>h.type === 'national' || includeLeave).map(h=>h.date));
  let working = 0, weekends = 0, excludedHolidays = 0;
  for (let i=0;i<total;i++) {
    const date = new Date(first.valueOf()+i*86400000), day = date.getUTCDay(), key = iso(date);
    if (day === 0 || (!saturdayWorking && day === 6)) weekends++;
    else if (off.has(key)) excludedHolidays++;
    else working++;
  }
  return { start, end, total, working, weekends, excludedHolidays, includeLeave, saturdayWorking, inclusive: true };
}
/** Consecutive days off plus up to `budget` optional working days. National/leave dates counted once. */
export function breaks(year: number, holidays: Holiday[], budget = 1, includeLeave = true) {
  const off = new Set(holidays.filter(h=>h.type === 'national' || includeLeave).map(h=>h.date));
  const result: {start:string;end:string;days:number;leave:string[]}[] = [];
  const start = `${year}-01-01`, count = daysInMonth(year,2) === 29 ? 366 : 365;
  const isOff = (date: string) => [0,6].includes(dayOfWeek(date)) || off.has(date);
  for (let i=0;i<count;i++) {
    const from = addDays(start,i);
    if (!isOff(from) || (i>0 && isOff(addDays(from,-1)))) continue;
    const leave: string[]=[]; let end=from;
    for (let j=i;j<Math.min(count,i+20);j++) {
      const current = addDays(start,j);
      if (!isOff(current)) { if (leave.length >= budget) break; leave.push(current); }
      else { end=current; if (j-i+1 >= 3 && leave.length <= budget) result.push({start:from,end,days:j-i+1,leave:[...leave]}); }
    }
  }
  return result.sort((a,b)=>b.days-a.days || a.leave.length-b.leave.length || a.start.localeCompare(b.start))
    .filter((item,index,all)=>!all.slice(0,index).some(other=>item.start<=other.end && item.end>=other.start)).slice(0,6);
}
function icsEscape(value: string): string { return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'); }
/** RFC 5545 line folding counts UTF-8 octets, never UTF-16 code units. */
function foldLine(line: string): string {
  let current='', bytes=0; const parts:string[]=[];
  for (const char of line) { const size = new TextEncoder().encode(char).length; if (bytes+size>75) { parts.push(current); current=' '; bytes=1; } current+=char; bytes+=size; }
  parts.push(current); return parts.join('\r\n');
}
export function toICS(data: YearData, lang: Lang = 'id', holidays = data.holidays): string {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Reza Prama Arviandi//Kalender Indonesia//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',`X-WR-CALNAME:${lang === 'id' ? 'Libur Indonesia' : 'Indonesia holidays'} ${data.year}`,`X-WR-CALDESC:${icsEscape(`${data.note[lang]} ${AUTHOR.name} ${AUTHOR.url}`)}`];
  for (const h of holidays) {
    const next = new Date(civil(h.date).valueOf()+86400000);
    lines.push('BEGIN:VEVENT',`UID:${h.date}-${h.type}-${encodeURIComponent(h.name)}@kalender.rezaprama.com`,`DTSTAMP:${data.updated.replaceAll('-','')}T000000Z`,`DTSTART;VALUE=DATE:${h.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${iso(next).replaceAll('-','')}`,`SUMMARY:${icsEscape(`${h.status === 'official' ? '' : '[Estimate] '}${lang === 'en' ? h.nameEn : h.name}${h.type === 'leave' ? (lang === 'id' ? ' (cuti bersama)' : ' (collective leave)') : ''}`)}`,`DESCRIPTION:${icsEscape(`${h.status}. ${data.sources.find(s=>s.id === h.sourceId)?.url ?? SITE}. ${AUTHOR.name} ${AUTHOR.url}`)}`,`URL:${SITE}${pathFor(data.year,lang)}`,'TRANSP:TRANSPARENT','END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.map(foldLine).join('\r\n')+'\r\n';
}
export function toCSV(holidays: Holiday[], lang: Lang = 'id'): string {
  const quote=(value:string)=>`"${value.replaceAll('"','""')}"`;
  return '\uFEFFdate,name,type,status,source_id\r\n'+holidays.map(h=>[h.date,lang === 'en' ? h.nameEn : h.name,h.type,h.status,h.sourceId].map(quote).join(',')).join('\r\n')+'\r\n';
}
