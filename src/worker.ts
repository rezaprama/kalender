import { jakartaToday, pathFor, validYear, type Lang, type YearData } from './core.ts';
import { handleApi } from './api.ts';
import { render, type Assets, type PageOptions } from './render.ts';
import yearsJson from './generated/years.json';
import manifest from './generated/manifest.json';

type Page = NonNullable<PageOptions['page']>;
const years = new Map<number, YearData>(Object.entries(yearsJson as Record<string, YearData>).map(([y, d]) => [Number(y), d]));
const assets: Assets = { css: manifest.css, js: manifest.js, icons: manifest.icons };
const officialYears: number[] = manifest.officialYears;
const PAGE_SLUGS: Record<Lang, Record<string, Page>> = {
  id: { libur: 'holidays', alat: 'tools', sumber: 'sources', api: 'api' },
  en: { holidays: 'holidays', tools: 'tools', sources: 'sources', api: 'api' },
};

const BASE_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'";
function htmlHeaders(embed: boolean): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=600',
    'Content-Security-Policy': `${BASE_CSP}; frame-ancestors ${embed ? '*' : "'self'"}`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000',
    ...(embed ? {} : { 'X-Frame-Options': 'SAMEORIGIN' }),
  };
}

function page(request: Request, options: Omit<PageOptions, 'assets' | 'officialYears' | 'data'> & { data?: YearData }, status = 200): Response {
  const data = options.data ?? years.get(options.year)!;
  const html = render({ ...options, data, assets, officialYears });
  return new Response(request.method === 'HEAD' ? null : html, { status, headers: htmlHeaders(!!options.embed) });
}

function notFound(request: Request, lang: Lang): Response {
  const year = Number(jakartaToday().slice(0, 4));
  return page(request, { lang, year, page: '404', path: lang === 'en' ? '/en/404' : '/404' }, 404);
}

function redirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

function indexableYear(year: number, current: number): boolean {
  return years.get(year)?.status === 'official' || (year >= current - 1 && year <= current + 3);
}

function queryYear(url: URL): number | undefined {
  const raw = url.searchParams.get('year');
  const year = Number(raw);
  return raw && /^\d{4}$/.test(raw) && validYear(year) ? year : undefined;
}

export function route(request: Request): Response {
  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname.startsWith('/api/')) return handleApi(request, url, years);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  if (pathname.length > 1 && pathname.endsWith('/')) return redirect(pathname.replace(/\/+$/, '') + url.search, 301);

  const segments = pathname.split('/').filter(Boolean);
  const lang: Lang = segments[0] === 'en' ? 'en' : 'id';
  const rest = lang === 'en' ? segments.slice(1) : segments;
  const current = Number(jakartaToday().slice(0, 4));

  if (rest[0] === 'embed' && rest.length === 1 && lang === 'id') {
    const embedLang: Lang = url.searchParams.get('lang') === 'en' ? 'en' : 'id';
    const monthRaw = Number(url.searchParams.get('month'));
    const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : undefined;
    return page(request, { lang: embedLang, year: queryYear(url) ?? current, month, page: 'calendar', path: '/embed', embed: true });
  }

  // Calendar: "/", "/en", "/2026", "/2026/08", "/en/2026/08".
  if (rest.length === 0 || /^\d{4}$/.test(rest[0])) {
    const year = rest.length ? Number(rest[0]) : current;
    if (!validYear(year) || rest.length > 2) return notFound(request, lang);
    let month: number | undefined;
    if (rest[1] !== undefined) {
      month = Number(rest[1]);
      if (!/^\d{2}$/.test(rest[1]) || month < 1 || month > 12) return notFound(request, lang);
    }
    const target = queryYear(url);
    if (url.searchParams.has('year')) return redirect(pathFor(target ?? year, lang, month));
    // Month pages only for years with official data or near today; thousands of empty months add no value to search.
    return page(request, { lang, year, month, page: 'calendar', path: pathname, noindex: month !== undefined && !indexableYear(year, current) });
  }

  const slug = PAGE_SLUGS[lang][rest[0]];
  if (slug && rest.length === 1) {
    const year = queryYear(url) ?? current;
    return page(request, { lang, year, page: slug, path: url.searchParams.has('year') ? `${pathname}?year=${year}` : pathname, noindex: slug === 'holidays' && !indexableYear(year, current) });
  }
  return notFound(request, lang);
}

export default {
  fetch(request: Request): Response {
    try {
      return route(request);
    } catch (error) {
      console.error('Unhandled error', error);
      return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  },
} satisfies ExportedHandler;
