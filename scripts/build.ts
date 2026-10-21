/**
 * Production build: datasets, hashed client assets, icons, OpenAPI, sitemap.
 * Output: dist/ (static assets served before the Worker) and src/generated/ (bundled into the Worker).
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { MAX_YEAR, MIN_YEAR, SITE, jakartaToday, type YearData } from '../src/core.ts';
import { openapi } from './openapi.ts';
import { loadYears } from './data.ts';

const ICONS = ['seal-check', 'info', 'arrow-up-right', 'arrow-right', 'caret-left', 'caret-right', 'squares-four', 'calendar-blank', 'printer', 'sun-horizon', 'calculator', 'download-simple', 'code', 'magnifying-glass', 'copy', 'plus', 'translate', 'moon', 'github-logo', 'x'];
const hash = (content: string | Uint8Array) => createHash('sha256').update(content).digest('hex').slice(0, 10);

async function bundle(entry: string, ext: 'js' | 'css'): Promise<string> {
  const result = await build({ entryPoints: [entry], bundle: true, minify: true, write: false, format: 'esm', target: ['es2022', 'safari15'], legalComments: 'none', logLevel: 'warning' });
  const code = result.outputFiles[0].contents;
  const name = `/assets/${ext === 'js' ? 'app' : 'styles'}.${hash(code)}.${ext}`;
  await writeFile(`dist${name}`, code);
  return name;
}

async function icons(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const name of ICONS) {
    const svg = await readFile(`node_modules/@phosphor-icons/core/assets/regular/${name}.svg`, 'utf8');
    result[name] = svg.trim().replace('<svg ', '<svg aria-hidden="true" focusable="false" ');
  }
  return result;
}

function sitemap(years: Map<number, YearData>): string {
  const current = Number(jakartaToday().slice(0, 4));
  const listed = [...years.values()].filter((d) => d.status === 'official' || Math.abs(d.year - current) <= 3).map((d) => d.year);
  const paths = ['/', '/en', '/libur', '/en/holidays', '/alat', '/en/tools', '/api', '/en/api', '/sumber', '/en/sources', ...listed.flatMap((y) => [`/${y}`, `/en/${y}`])];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export async function run(): Promise<void> {
  const started = Date.now();
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist/assets', { recursive: true });
  await mkdir('dist/data', { recursive: true });
  await mkdir('src/generated', { recursive: true });

  const years = await loadYears();
  if (years.size !== MAX_YEAR - MIN_YEAR + 1) throw new Error(`Expected ${MAX_YEAR - MIN_YEAR + 1} years, got ${years.size}`);
  const all: Record<number, YearData> = {};
  for (const [year, data] of years) {
    all[year] = data;
    await writeFile(`dist/data/${year}.json`, JSON.stringify(data));
  }
  await writeFile('dist/data/index.json', JSON.stringify({
    range: [MIN_YEAR, MAX_YEAR],
    years: [...years.values()].map((d) => ({ year: d.year, status: d.status, version: d.version, holidays: d.holidays.length })),
  }));
  await writeFile('src/generated/years.json', JSON.stringify(all));

  await cp('public', 'dist', { recursive: true });
  const [js, css, iconMap] = await Promise.all([bundle('src/client/main.ts', 'js'), bundle('src/client/styles.css', 'css'), icons()]);
  const officialYears = [...years.values()].filter((d) => d.status === 'official').map((d) => d.year);
  await writeFile('src/generated/manifest.json', JSON.stringify({ js, css, icons: iconMap, officialYears }, null, 2));
  await writeFile('dist/openapi.json', JSON.stringify(openapi(), null, 2));
  await writeFile('dist/sitemap.xml', sitemap(years));
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /embed\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Built ${years.size} years, ${officialYears.length} official, assets ${js} ${css} in ${Date.now() - started} ms`);
}

if (process.argv[1]?.endsWith('build.ts')) await run();
