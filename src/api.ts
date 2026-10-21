import { CALENDARS, describeDate } from './calendars/index.ts';
import { HKO_ATTRIBUTION, HKO_RIGHTS, fromChinese } from './calendars/chinese.ts';
import { fromHijri, umalquraAvailable } from './calendars/islamic.ts';
import { fromJavanese } from './calendars/javanese.ts';
import { observancesInYear } from './observances.ts';
import { AUTHOR, MAX_YEAR, MIN_YEAR, SITE, civil, toCSV, toICS, validYear, workdays, type Holiday, type Lang, type YearData } from './core.ts';

export const API_VERSION = 'v1';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'If-None-Match' };
const AUTHOR_CREDIT = { name: AUTHOR.name, url: AUTHOR.url, project: SITE };
/**
 * License block for API bodies. CC BY 4.0 covers the project's own curation only; when a
 * response contains Chinese-calendar data derived from Hong Kong Observatory tables, the
 * HKO non-commercial terms are listed so machine readers do not assume commercial reuse.
 */
export function attributionFor(usesHko: boolean) {
  return {
    ...AUTHOR_CREDIT,
    license: { code: 'Apache-2.0', data: 'CC-BY-4.0', ...(usesHko ? { exceptions: [{ fields: 'Chinese calendar data', terms: HKO_RIGHTS, ...HKO_ATTRIBUTION }] } : {}) },
  };
}
const usesHko = (holidays: Holiday[]) => holidays.some((h) => h.sourceId === 'calc-chinese');

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function apiError(error: ApiError): Response {
  return json({ error: { code: error.code, message: error.message } }, error.status, { 'Cache-Control': 'no-store' });
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", ...CORS, ...headers },
  });
}

function param<T extends string>(url: URL, name: string, allowed: readonly T[], fallback?: T): T | undefined {
  const value = url.searchParams.get(name);
  if (value === null || value === '') return fallback;
  if (!(allowed as readonly string[]).includes(value)) throw new ApiError(400, 'invalid_parameter', `${name} must be one of: ${allowed.join(', ')}.`);
  return value as T;
}

function yearParam(url: URL, name = 'year'): number {
  const raw = url.searchParams.get(name);
  if (raw === null) throw new ApiError(400, 'missing_parameter', `${name} is required (${MIN_YEAR}-${MAX_YEAR}).`);
  const year = Number(raw);
  if (!/^\d{4}$/.test(raw) || !validYear(year)) throw new ApiError(400, 'invalid_parameter', `${name} must be an integer from ${MIN_YEAR} to ${MAX_YEAR}.`);
  return year;
}

function dateParam(url: URL, name: string): string {
  const raw = url.searchParams.get(name);
  if (!raw) throw new ApiError(400, 'missing_parameter', `${name} is required (YYYY-MM-DD).`);
  try { civil(raw); } catch { throw new ApiError(400, 'invalid_parameter', `${name} must be a valid YYYY-MM-DD date from ${MIN_YEAR}-01-01 to ${MAX_YEAR}-12-31.`); }
  return raw;
}

function boolParam(url: URL, name: string): boolean {
  const value = param(url, name, ['true', 'false', '1', '0'] as const, 'false');
  return value === 'true' || value === '1';
}

/** Weak ETag over data version + query: the response is a pure function of both. */
function etag(data: { version: string }, url: URL): string {
  let hash = 2166136261;
  for (const char of `${data.version}|${url.search}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `W/"${(hash >>> 0).toString(16)}"`;
}

function cached(request: Request, tag: string, make: () => Response): Response {
  const headers = { ETag: tag, 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' };
  if (request.headers.get('If-None-Match') === tag) return new Response(null, { status: 304, headers: { ...CORS, ...headers } });
  const response = make();
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

function holidays(request: Request, url: URL, years: Map<number, YearData>): Response {
  const year = yearParam(url);
  const data = years.get(year)!;
  const lang = param(url, 'lang', ['id', 'en'] as const, 'id')!;
  const format = param(url, 'format', ['json', 'ics', 'csv'] as const, 'json')!;
  const type = param(url, 'type', ['national', 'leave'] as const);
  const status = param(url, 'status', ['official', 'estimated', 'unverified'] as const);
  const monthRaw = url.searchParams.get('month');
  const month = monthRaw ? Number(monthRaw) : undefined;
  if (monthRaw && (!/^\d{1,2}$/.test(monthRaw) || month! < 1 || month! > 12)) throw new ApiError(400, 'invalid_parameter', 'month must be an integer from 1 to 12.');
  const rows = data.holidays.filter((h) => (!type || h.type === type) && (!status || h.status === status) && (!month || Number(h.date.slice(5, 7)) === month));
  return cached(request, etag(data, url), () => {
    const suffix = `${year}${month ? '-' + String(month).padStart(2, '0') : ''}`;
    if (format === 'ics') return new Response(toICS(data, lang, rows), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `inline; filename="kalender-${suffix}.ics"`, ...CORS } });
    if (format === 'csv') return new Response(toCSV(rows, lang), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="kalender-${suffix}.csv"`, ...CORS } });
    return json({
      year, status: data.status, updated: data.updated, version: data.version,
      holidays: rows.map((h: Holiday) => ({ ...h, nameLocalized: lang === 'en' ? h.nameEn : h.name })),
      sources: data.sources, missing: data.missing, note: data.note[lang as Lang], attribution: attributionFor(usesHko(rows)),
    });
  });
}

function workdaysRoute(request: Request, url: URL, years: Map<number, YearData>): Response {
  const start = dateParam(url, 'start'), end = dateParam(url, 'end');
  if (end < start) throw new ApiError(400, 'invalid_range', 'end must not be before start.');
  const includeLeave = boolParam(url, 'includeLeave'), saturdayWorking = boolParam(url, 'saturdayWorking');
  const spanned: YearData[] = [];
  for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)); y++) spanned.push(years.get(y)!);
  let result: ReturnType<typeof workdays>;
  try { result = workdays(start, end, spanned.flatMap((d) => d.holidays), includeLeave, saturdayWorking); }
  catch (error) { throw new ApiError(400, 'invalid_range', (error as Error).message); }
  const version = spanned.map((d) => d.version).join(',');
  return cached(request, etag({ version }, url), () => json({
    ...result,
    coverage: spanned.map((d) => ({ year: d.year, status: d.status, missing: d.missing })),
    official: spanned.every((d) => d.status === 'official'),
    attribution: attributionFor(usesHko(spanned.flatMap((d) => d.holidays).filter((h) => h.date >= start && h.date <= end))),
  }));
}

function intParam(url: URL, name: string, min: number, max: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null) throw new ApiError(400, 'missing_parameter', `${name} is required.`);
  const value = Number(raw);
  if (!/^-?\d+$/.test(raw) || value < min || value > max) throw new ApiError(400, 'invalid_parameter', `${name} must be an integer from ${min} to ${max}.`);
  return value;
}

function dateInfo(date: string, lang: Lang, years: Map<number, YearData>) {
  const data = years.get(Number(date.slice(0, 4)))!;
  return {
    ...describeDate(date, lang),
    holidays: data.holidays.filter((h) => h.date === date).map((h) => ({ ...h, nameLocalized: lang === 'en' ? h.nameEn : h.name, source: data.sources.find((s) => s.id === h.sourceId) })),
    coverage: { year: data.year, status: data.status, missing: data.missing },
  };
}

function dateRoute(request: Request, url: URL, years: Map<number, YearData>): Response {
  const date = dateParam(url, 'date');
  const lang = param(url, 'lang', ['id', 'en'] as const, 'id')!;
  return cached(request, etag(years.get(Number(date.slice(0, 4)))!, url), () => { const info = dateInfo(date, lang, years); return json({ ...info, calendars: CALENDARS, attribution: attributionFor(info.chinese !== null) }); });
}

function convertRoute(request: Request, url: URL, years: Map<number, YearData>): Response {
  const calendar = param(url, 'calendar', ['islamic', 'javanese', 'chinese'] as const);
  if (!calendar) throw new ApiError(400, 'missing_parameter', 'calendar is required (islamic, javanese, chinese).');
  const lang = param(url, 'lang', ['id', 'en'] as const, 'id')!;
  const month = intParam(url, 'month', 1, 12), day = intParam(url, 'day', 1, 30);
  let date: string, method: string;
  try {
    if (calendar === 'islamic') {
      method = param(url, 'method', ['civil', 'umalqura'] as const, 'civil')!;
      if (method === 'umalqura' && !umalquraAvailable()) throw new ApiError(501, 'method_unavailable', 'Umm al-Qura data is not available in this runtime.');
      date = fromHijri(intParam(url, 'year', 1317, 1525), month, day, method as 'civil' | 'umalqura');
    } else if (calendar === 'javanese') {
      method = param(url, 'kurup', ['asapon', 'aboge'] as const, 'asapon')!;
      date = fromJavanese(intParam(url, 'year', 1817, 2034), month, day, method as 'asapon' | 'aboge');
    } else {
      method = 'hko';
      date = fromChinese(intParam(url, 'year', 1900, 2100), month, day, param(url, 'leap', ['true', 'false'] as const, 'false') === 'true');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'invalid_date', (error as Error).message);
  }
  return cached(request, etag({ version: API_VERSION }, url), () => { const info = dateInfo(date, lang, years); return json({ calendar, method, input: Object.fromEntries(url.searchParams), ...info, attribution: attributionFor(info.chinese !== null) }); });
}

function observancesRoute(request: Request, url: URL): Response {
  const year = yearParam(url);
  const lang = param(url, 'lang', ['id', 'en'] as const, 'id')!;
  return cached(request, etag({ version: API_VERSION }, url), () => json({
    year,
    note: lang === 'id' ? 'Peringatan hasil perhitungan, bukan hari libur. Tanggal Islam tabular ±1 hari.' : 'Calculated observances, not public holidays. Islamic dates are tabular, ±1 day.',
    observances: observancesInYear(year).map((o) => ({ ...o, nameLocalized: lang === 'en' ? o.nameEn : o.name })),
    attribution: attributionFor(observancesInYear(year).some((o) => o.calendar === 'chinese')),
  }));
}

export function handleApi(request: Request, url: URL, years: Map<number, YearData>): Response {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') throw new ApiError(405, 'method_not_allowed', 'Use GET, HEAD, or OPTIONS.');
    switch (url.pathname.replace(/\/$/, '')) {
      case '/api/v1/holidays': return holidays(request, url, years);
      case '/api/v1/workdays': return workdaysRoute(request, url, years);
      case '/api/v1/date': return dateRoute(request, url, years);
      case '/api/v1/convert': return convertRoute(request, url, years);
      case '/api/v1/observances': return observancesRoute(request, url);
      case '/api/v1/calendars': return cached(request, etag({ version: API_VERSION }, url), () => json({ calendars: CALENDARS, attribution: attributionFor(true) }));
      default: throw new ApiError(404, 'not_found', 'Unknown API endpoint. See /openapi.json.');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const response = apiError(error);
      if (error.status === 405) response.headers.set('Allow', 'GET, HEAD, OPTIONS');
      return response;
    }
    throw error;
  }
}
