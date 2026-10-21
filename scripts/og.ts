/** Generates public/og.png (1200x630) from an HTML template. Run when the brand changes: `npx tsx scripts/og.ts`. */
import { launch } from './browser.ts';

const days = Array.from({ length: 35 }, (_, i) => {
  const d = i - 2;
  const red = i % 7 === 6;
  return d < 1 || d > 31 ? '<span></span>' : `<span class="${d === 17 ? 'holiday' : red ? 'sun' : ''}">${d}</span>`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #f8f8f5; color: #17171b; font-family: "Segoe UI", system-ui, sans-serif; display: grid; grid-template-columns: 1fr 420px; gap: 64px; padding: 80px 88px; }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 40px; font-weight: 700; letter-spacing: -1px; }
  .mark { width: 64px; height: 64px; border-radius: 16px; background: #17171b; color: #f8f8f5; display: grid; place-items: center; font-size: 38px; }
  .dot { color: #c0262d; }
  h1 { margin-top: 64px; font-size: 64px; line-height: 1.05; letter-spacing: -2.5px; }
  p { margin-top: 28px; font-size: 27px; color: #5d5d66; line-height: 1.35; }
  .card { align-self: center; background: #fff; border: 1px solid #e3e2dc; border-radius: 22px; padding: 30px; }
  .card strong { font-size: 30px; letter-spacing: -1px; }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 18px; }
  .grid span { aspect-ratio: 1; display: grid; place-items: center; font-size: 19px; border-radius: 50%; }
  .grid .sun { color: #c0262d; }
  .grid .holiday { background: #c0262d; color: #fff; font-weight: 700; }
  .meta { margin-top: 16px; font-size: 17px; color: #5d5d66; }
</style></head><body>
  <div>
    <div class="brand"><span class="mark">k</span><span>kalender<span class="dot">.</span></span></div>
    <h1>Kalender Indonesia<span class="dot">.</span></h1>
    <p>Libur nasional dan cuti bersama dengan sumber resmi. Masehi, Hijriah, Tionghoa, Jawa. 1900–2100.</p>
  </div>
  <div class="card"><strong>Agustus</strong><div class="grid">${days}</div><div class="meta">17 · Hari Proklamasi Kemerdekaan</div></div>
</body></html>`;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: 'public/og.png', type: 'png' });
await browser.close();
console.log('public/og.png written');
