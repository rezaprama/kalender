/**
 * Offline data audit: validates every year and summarises coverage, stale source
 * checks and pending isbat flags. Exit code 1 on validation failure or stale data.
 * Usage: npx tsx scripts/audit.ts [--max-age-days 400]
 */
import { jakartaToday } from '../src/core.ts';
import { loadYears } from './data.ts';
import { expectations } from './monitor.ts';

const args = process.argv.slice(2);
const maxAge = Number(args[args.indexOf('--max-age-days') + 1]) || 400;
const today = jakartaToday();
let failed = false;

let years: Awaited<ReturnType<typeof loadYears>>;
try {
  years = await loadYears();
} catch (error) {
  console.error(`Validation failed: ${(error as Error).message}`);
  process.exit(1);
}

const counts = { official: 0, estimated: 0, unverified: 0 };
for (const d of years.values()) counts[d.status]++;
console.log(`Years 1900-2100: ${counts.official} official, ${counts.estimated} estimated, ${counts.unverified} unverified.\n`);
console.log('| Year | National | Leave | Sources | Oldest check | Notes |');
console.log('| --- | ---: | ---: | ---: | --- | --- |');
for (const d of years.values()) {
  if (d.status !== 'official') continue;
  const national = d.holidays.filter((h) => h.type === 'national').length;
  const oldest = d.sources.map((s) => s.checked).sort()[0];
  const age = Math.round((Date.parse(today) - Date.parse(oldest)) / 86400000);
  const notes = [age > maxAge ? `STALE (${age} days)` : '', d.holidays.some((h) => h.subjectTo) ? 'pending isbat' : ''].filter(Boolean).join(', ');
  if (age > maxAge && d.year >= Number(today.slice(0, 4)) - 1) failed = true;
  console.log(`| ${d.year} | ${national} | ${d.holidays.length - national} | ${d.sources.length} | ${oldest} | ${notes} |`);
}
const pending = expectations(new Map([...years].filter(([, d]) => d.status === 'official')), today);
if (pending.length) {
  console.log('\nAttention:');
  for (const f of pending) console.log(`- [${f.severity}] ${f.message}`);
}
if (failed) {
  console.error(`\nCurrent or next-year sources were last checked more than ${maxAge} days ago. Re-verify them (docs/DATA_SOURCES.md).`);
  process.exit(1);
}
