import { AUTHOR, MAX_YEAR, MIN_YEAR, SITE, civil, toCSV, toICS, validYear, workdays, type Holiday, type Lang, type YearData } from './core.ts';

export const API_VERSION = 'v1';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'If-None-Match' };
const attribution = { name: AUTHOR.name, url: AUTHOR.url, project: SITE, license: { code: 'Apache-2.0', data: 'CC-BY-4.0' } };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function apiError(error: ApiError): Response {
  return json({ error: { code: error.code, message: error.message } }, error.status, { 'Cache-Control': 'no-store' });
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2) + '\n', {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...CORS, ...headers },
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
  const headers = { ETag: tag, 'Cache-Control': 'public, max-age=3600' };
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
      sources: data.sources, missing: data.missing, note: data.note[lang as Lang], attribution,
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
    attribution,
  }));
}

export function handleApi(request: Request, url: URL, years: Map<number, YearData>): Response {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') throw new ApiError(405, 'method_not_allowed', 'Use GET, HEAD, or OPTIONS.');
    switch (url.pathname.replace(/\/$/, '')) {
      case '/api/v1/holidays': return holidays(request, url, years);
      case '/api/v1/workdays': return workdaysRoute(request, url, years);
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
