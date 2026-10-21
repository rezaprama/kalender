/**
 * Government-source monitor. Deterministic, read-only, no AI: it never edits data.
 * Usage: npx tsx scripts/monitor.ts [--report path.md] [--offline]
 * Exit code 0; prints a Markdown report and, in GitHub Actions, sets `changes=true|false`.
 * Scheduled quarterly (1 Jan, Apr, Jul, Oct, about 08:00 WIB) and run manually when a decree is expected. Identical action findings share a stable fingerprint.
 */
import { appendFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { jakartaToday, type YearData } from '../src/core.ts';
import { loadOfficial } from './data.ts';

const UA = 'KalenderIndonesiaMonitor/1.0 (+https://github.com/rezaprama/kalender)';
/**
 * Required feeds must answer; an outage is an action item. Setkab's search-result feeds
 * (`?s=…&feed=rss2`) time out or return 500 on the server side (issue #6), so they are
 * optional extras: the main Setkab feed already carries the same articles.
 */
export const FEEDS: { url: string; required: boolean }[] = [
  { url: 'https://setkab.go.id/feed/', required: true },
  { url: 'https://www.kemenkopmk.go.id/rss.xml', required: true },
  { url: 'https://setkab.go.id/?s=libur+nasional&feed=rss2', required: false },
  { url: 'https://setkab.go.id/?s=cuti+bersama&feed=rss2', required: false },
];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const RELEVANT = /libur nasional|cuti bersama|hari libur/i;

export interface FeedItem { title: string; link: string; date?: string }
export interface Finding { kind: 'expectation' | 'candidate' | 'source' | 'isbat'; severity: 'action' | 'info'; message: string }

/** Ignore report dates and ordering so unchanged findings do not notify maintainers on every run. */
export function fingerprint(findings: Finding[]): string {
  const actions = [...new Set(findings.filter((f) => f.severity === 'action').map((f) => `${f.kind}:${f.message}`))].sort();
  return createHash('sha256').update(JSON.stringify(actions)).digest('hex');
}

/** RSS 2.0 items (title, link, pubDate) without an XML dependency. */
export function parseRss(xml: string): FeedItem[] {
  const text = (s = '') => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').trim();
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map(([item]) => {
    const pick = (tag: string) => item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
    const pub = pick('pubDate');
    return { title: text(pick('title')), link: text(pick('link')), date: pub ? new Date(pub).toISOString().slice(0, 10) : undefined };
  });
}

/** Feed items about holidays for `fromYear` or later that are not yet cited by any dataset. */
export function candidates(items: FeedItem[], knownUrls: Set<string>, fromYear: number): FeedItem[] {
  const norm = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const known = new Set([...knownUrls].map(norm));
  return items.filter((i) => RELEVANT.test(i.title) && [...i.title.matchAll(/\b(20\d\d)\b/g)].some((m) => Number(m[1]) >= fromYear) && !known.has(norm(i.link)));
}

/** Share of a year's holiday dates still findable in a source page ("20, 23, dan 24 Maret" and "21–22 Maret" both count). */
export function dateCoverage(pageText: string, data: YearData, sourceId: string): { found: number; total: number; missing: string[] } {
  const text = pageText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
  const dates = [...new Set(data.holidays.filter((h) => h.sourceId === sourceId).map((h) => h.date))];
  const missing = dates.filter((date) => {
    const day = Number(date.slice(8)), month = MONTHS_ID[Number(date.slice(5, 7)) - 1];
    return !new RegExp(`(^|[^0-9])${day}(?![0-9])[^.]{0,48}?${month}`, 'i').test(text);
  });
  return { found: dates.length - missing.length, total: dates.length, missing };
}

/** An unreachable required feed needs a curator; an optional one is only reported. */
export function feedUnreachable(feed: { url: string; required: boolean }, reason: string): Finding {
  return feed.required
    ? { kind: 'source', severity: 'action', message: `Feed unreachable (${reason}): ${feed.url}. Not treated as "no change".` }
    : { kind: 'source', severity: 'info', message: `Optional feed unreachable (${reason}): ${feed.url}. Covered by the required feeds.` };
}

/** Time-based expectations that need no network. */
export function expectations(official: Map<number, YearData>, today: string): Finding[] {
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7));
  const out: Finding[] = [];
  if (!official.has(year)) out.push({ kind: 'expectation', severity: 'action', message: `No official data for the current year ${year}.` });
  if (month >= 9 && !official.has(year + 1)) out.push({ kind: 'expectation', severity: 'action', message: `The ${year + 1} SKB is usually signed in September-October; no official ${year + 1} data yet.` });
  for (const data of official.values()) {
    for (const h of data.holidays.filter((x) => x.subjectTo === 'isbat')) {
      const days = Math.round((Date.parse(h.date) - Date.parse(today)) / 86400000);
      if (days < 0) out.push({ kind: 'isbat', severity: 'action', message: `${h.date} ${h.name}: date has passed. Confirm the Kemenag isbat result, update the date if it moved, and remove subjectTo.` });
      else if (days <= 45) out.push({ kind: 'isbat', severity: 'info', message: `${h.date} ${h.name}: isbat expected within ${days} days.` });
    }
  }
  return out;
}

async function get(url: string): Promise<{ status: number; body: string } | { error: string }> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000), redirect: 'follow' });
    return { status: response.status, body: await response.text() };
  } catch (error) {
    return { error: (error as Error & { cause?: { code?: string } }).cause?.code ?? (error as Error).message };
  }
}

export async function run(options: { offline?: boolean; today?: string } = {}): Promise<{ findings: Finding[]; report: string }> {
  const today = options.today ?? jakartaToday();
  const official = await loadOfficial();
  const findings = expectations(official, today);
  if (!options.offline) {
    const known = new Set([...official.values()].flatMap((d) => d.sources.map((s) => s.url)));
    for (const feed of FEEDS) {
      const res = await get(feed.url);
      if ('error' in res || res.status !== 200) { findings.push(feedUnreachable(feed, 'error' in res ? res.error : String(res.status))); continue; }
      for (const item of candidates(parseRss(res.body), known, Number(today.slice(0, 4)))) {
        findings.push({ kind: 'candidate', severity: 'action', message: `New article: [${item.title}](${item.link})${item.date ? ` (${item.date})` : ''}. Read the decree; add or amend data only with verified dates.` });
      }
    }
    const currentYear = Number(today.slice(0, 4));
    for (const data of official.values()) {
      if (data.year < currentYear - 1) continue; // older years are settled; they are re-checked manually
      for (const source of data.sources) {
        const res = await get(source.url);
        if ('error' in res || res.status !== 200) { findings.push({ kind: 'source', severity: 'action', message: `${data.year} source unreachable (${'error' in res ? res.error : res.status}): ${source.url}` }); continue; }
        if (/\.pdf($|\?)|\/download\//i.test(source.url)) continue; // scanned PDFs need visual review
        const coverage = dateCoverage(res.body, data, source.id);
        if (coverage.total && coverage.missing.length) findings.push({ kind: 'source', severity: 'action', message: `${data.year} ${source.id}: ${coverage.found}/${coverage.total} dates still found on the page; not found: ${coverage.missing.join(', ')}. The page may have changed or been amended.` });
      }
    }
  }
  const action = findings.filter((f) => f.severity === 'action');
  const report = [
    `# Holiday source monitor — ${today}`,
    '',
    action.length ? `**${action.length} item(s) need a curator.** Nothing has been changed automatically.` : 'No action needed. All monitored sources were reachable and consistent.',
    '',
    ...(['expectation', 'isbat', 'candidate', 'source'] as const).flatMap((kind) => {
      const list = findings.filter((f) => f.kind === kind);
      return list.length ? [`## ${kind}`, '', ...list.map((f) => `- ${f.severity === 'action' ? '**action**' : 'info'}: ${f.message}`), ''] : [];
    }),
    `Checked: ${FEEDS.filter((f) => f.required).length} required and ${FEEDS.filter((f) => !f.required).length} optional feeds, official sources for ${[...official.keys()].filter((y) => y >= Number(today.slice(0, 4)) - 1).join(', ')}.`,
    `<!-- kalender-monitor:${fingerprint(findings)} -->`,
  ].join('\n');
  return { findings, report };
}

if (process.argv[1]?.endsWith('monitor.ts')) {
  const args = process.argv.slice(2);
  const { findings, report } = await run({ offline: args.includes('--offline') });
  console.log(report);
  const out = args[args.indexOf('--report') + 1];
  if (args.includes('--report') && out) await writeFile(out, report + '\n');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changes=${findings.some((f) => f.severity === 'action')}\n`);
}
