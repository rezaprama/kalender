/**
 * Full-page screenshots for visual review: `npx tsx scripts/screens.ts [path ...]`.
 * Starts the Node preview on :8790 (run `npm run build` first). Output: artifacts/screens/ (gitignored).
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { launch } from './browser.ts';

const PORT = 8790;
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/2026', '/en/2026/08', '/libur', '/alat', '/api', '/sumber', '/embed?year=2026&month=8'];
// Run node directly (no shell) so kill() stops the server itself.
const server = spawn(process.execPath, ['--import', 'tsx', 'scripts/serve.ts'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
try {
  for (let i = 0; i < 50; i++) {
    if (await fetch(`http://localhost:${PORT}/`).then((r) => r.ok, () => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await mkdir('artifacts/screens', { recursive: true });
  const browser = await launch();
  for (const [device, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      const page = await browser.newPage({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
      for (const path of paths) {
        await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
        const name = `${device}-${scheme}${path.replace(/[^a-z0-9]+/gi, '_')}.png`;
        await page.screenshot({ path: `artifacts/screens/${name}`, fullPage: true });
        console.log(name);
      }
      await page.close();
    }
  }
  await browser.close();
} finally {
  server.kill();
}
