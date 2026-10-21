// Smoke-tests the exact Worker bundle produced by `wrangler deploy --dry-run`.
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(process.argv[2] ?? ".wrangler/dry-run/worker.js").href);
const worker = mod.default;
const checks = [
  ['/', 200, /<html lang="id">/], ['/en/2026/08', 200, /Independence Day/], ['/2100', 200, /2100/], ['/1899', 404, /noindex/],
  ['/embed?year=2026&month=8&lang=en', 200, /embed-document/], ['/api/v1/holidays?year=2026', 200, /"status": "official"/],
  ['/api/v1/holidays?year=2026&format=ics', 200, /BEGIN:VCALENDAR/], ['/api/v1/date?date=2026-08-17', 200, /"pasaran": "Legi"/],
  ['/api/v1/convert?calendar=chinese&year=2027&month=1&day=1', 200, /"date": "2027-02-06"/], ['/api/v1/convert?calendar=islamic&year=1447&month=10&day=1&method=umalqura', 200, /2026-03-20/],
  ['/api/v1/holidays?year=2101', 400, /invalid_parameter/],
];
let failed = 0;
for (const [path, status, pattern] of checks) {
  const res = await worker.fetch(new Request('https://kalender.rezaprama.com' + path), {}, {});
  const body = await res.text();
  const ok = res.status === status && pattern.test(body);
  if (!ok) failed++;
  console.log(ok ? 'PASS' : 'FAIL', res.status, path);
}
process.exit(failed ? 1 : 0);
