/**
 * Browser user journeys + axe-core WCAG 2.2 AA audit against the Node preview.
 * Run: npm run build && npm run e2e
 */
import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { after, before, describe, test } from 'node:test';
import type { Browser, Page } from 'playwright';
import { jakartaToday } from '../../src/core.ts';
import { launch } from '../../scripts/browser.ts';

const PORT = 8791;
const BASE = `http://localhost:${PORT}`;
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
let server: ChildProcess;
let browser: Browser;

before(async () => {
  server = spawn(process.execPath, ['--import', 'tsx', 'scripts/serve.ts'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 100 && !(await fetch(BASE).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 100));
  browser = await launch();
});
after(async () => { await browser?.close(); server?.kill(); });

async function open(path: string, options: { mobile?: boolean; dark?: boolean } = {}): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: options.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, colorScheme: options.dark ? 'dark' : 'light', hasTouch: options.mobile, bypassCSP: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { page, errors };
}

async function axe(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    // biome-ignore lint/suspicious/noExplicitAny: axe is injected at runtime
    const r = await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.map((v: { id: string; impact: string; nodes: { target: string[] }[] }) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
  });
  return result;
}

describe('accessibility (axe-core, WCAG 2.2 AA)', () => {
  for (const path of ['/2026', '/en/2026/08', '/libur?year=2027', '/alat', '/api', '/sumber', '/embed?year=2026&month=3', '/2100', '/404-not-here', '/2026?mode=jawa', '/en/2026/08?mode=tionghoa', '/2026/03?mode=hijriah']) {
    for (const dark of [false, true]) {
      test(`${path} ${dark ? 'dark' : 'light'}`, async () => {
        const { page, errors } = await open(path, { dark });
        assert.deepEqual(await axe(page), []);
        assert.deepEqual(errors.filter((e) => !/404/.test(e)), []);
        await page.close();
      });
    }
  }
});

describe('journeys', () => {
  test('today is marked and is the tab stop of its month', async () => {
    const today = jakartaToday();
    const { page } = await open(`/${today.slice(0, 4)}`);
    const day = page.locator(`.day[data-date="${today}"]`);
    assert.equal(await day.getAttribute('aria-current'), 'date');
    assert.equal(await day.getAttribute('tabindex'), '0');
    await page.close();
  });

  test('keyboard: one tab stop per month, arrows move, Enter opens details, Escape returns focus', async () => {
    const { page } = await open('/2026/03');
    const first = page.locator('.day[data-date="2026-03-01"]');
    await first.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), '2026-03-02');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), '2026-03-09');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), '2026-03-15');
    assert.equal(await page.locator('.days [tabindex="0"]').count(), 1);
    await page.keyboard.press('Enter');
    await page.locator('#date-dialog[open]').waitFor();
    await page.locator('#dialog-content .detail-list').waitFor();
    assert.match(await page.locator('#dialog-content').innerText(), /Minggu/);
    assert.equal(new URL(page.url()).hash, '#2026-03-15');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#date-dialog[open]') && location.hash === '');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), '2026-03-15');
    assert.equal(new URL(page.url()).hash, '');
    const yearView = await open('/2026');
    assert.equal(await yearView.page.locator('.days [tabindex="0"]').count(), 12);
    await yearView.page.close();
    await page.close();
  });

  test('shared date URL opens its details with holiday and weton', async () => {
    const { page } = await open('/2026/08#2026-08-17');
    await page.locator('#dialog-content .detail-events').waitFor();
    const text = await page.locator('#dialog-content').innerText();
    assert.match(text, /Hari Proklamasi Kemerdekaan/);
    assert.match(text, /Senin Legi/);
    await page.close();
  });

  test('year navigation, year form and language switch', async () => {
    const { page } = await open('/2026');
    await page.getByRole('link', { name: /Berikutnya: 2027/ }).click();
    assert.equal(new URL(page.url()).pathname, '/2027');
    await page.fill('#year', '1950');
    await page.press('#year', 'Enter');
    await page.waitForURL(/\/1950$/);
    assert.match(await page.locator('.data-notice').innerText(), /belum diverifikasi/);
    await page.locator('.lang-switch').click();
    assert.equal(new URL(page.url()).pathname, '/en/1950');
    await page.close();
  });

  test('holiday search and type filter', async () => {
    const { page } = await open('/libur?year=2026');
    await page.fill('#holiday-search', 'natal');
    assert.equal(await page.locator('tr[data-holiday-type]:visible').count(), 2);
    await page.selectOption('#holiday-type', 'leave');
    assert.equal(await page.locator('tr[data-holiday-type]:visible').count(), 1);
    await page.fill('#holiday-search', 'tidak ada');
    assert.ok(await page.locator('.empty-message').isVisible());
    await page.close();
  });

  test('tools: working days, long weekends, weton, date calculator', async () => {
    const { page } = await open('/alat?year=2026');
    await page.click('#work-form button[type=submit]');
    await page.locator('#work-result p').first().waitFor();
    assert.match(await page.locator('#work-result').innerText(), /\d+ hari kerja/);
    await page.click('#break-form button[type=submit]');
    await page.locator('#break-result p, #break-result li').first().waitFor();
    assert.ok(await page.locator('#break-result li').count() > 0);
    await page.click('#date-form button[type=submit]');
    await page.locator('#date-result dl').waitFor();
    assert.match(await page.locator('#date-result').innerText(), /Senin Legi/);
    await page.click('#diff-form button[type=submit]');
    assert.match(await page.locator('#diff-result').innerText(), /228/);
    await page.fill('#add-form input[name=days]', '-1');
    await page.click('#add-form button[type=submit]');
    await page.locator('#add-result dl').waitFor();
    assert.match(await page.locator('#add-result').innerText(), /31 Desember 2025/);
    await page.close();
  });

  test('secondary calendar mode: overlay, accessible labels, shareable URL, remembered', async () => {
    const { page } = await open('/2026/06');
    await page.selectOption('#calendar-mode', 'jawa');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.mode), 'jawa');
    assert.equal(new URL(page.url()).searchParams.get('mode'), 'jawa');
    assert.equal(await page.locator('.day[data-date="2026-06-17"]').getAttribute('data-alt'), 'Kliwon · 1 Sura');
    assert.match(await page.locator('.month-alt').first().innerText(), /1960 Be/);
    assert.match(await page.locator('.mode-note').innerText(), /Asapon/);
    await page.selectOption('#calendar-mode', 'hijriah');
    const year = await open('/2026');
    assert.equal(await year.page.evaluate(() => document.documentElement.dataset.mode), 'masehi'); // new context: nothing stored
    await year.page.close();
    await page.goto(BASE + '/2026');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.mode), 'hijriah'); // remembered in this context
    assert.match((await page.locator('.day[data-date="2026-03-20"]').getAttribute('aria-label'))!, /1 Syawal/);
    await page.close();
  });

  test('theme toggle persists across reloads', async () => {
    const { page } = await open('/2026');
    await page.click('#theme-toggle');
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.reload();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
    await page.close();
  });

  test('embed navigates months and keeps attribution', async () => {
    const { page } = await open('/embed?year=2026&month=12&lang=en');
    await page.click('[data-embed-step="1"]');
    await page.waitForURL(/month=1/);
    const url = new URL(page.url());
    assert.deepEqual([url.searchParams.get('year'), url.searchParams.get('month')], ['2027', '1']);
    assert.equal(await page.locator('a[href="https://rezaprama.com"]').count(), 1);
    await page.close();
  });

  test('web component embeds the calendar on a third-party page and resizes it', async () => {
    // A different origin (another port) stands in for a third-party site.
    const { createServer } = await import('node:http');
    const host = createServer((_, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!doctype html><title>Host</title><body><kalender-indonesia year="2026" month="8" lang="en" mode="jawa"><a href="https://rezaprama.com">Calendar by Reza Prama Arviandi</a></kalender-indonesia><script src="${BASE}/embed.js"></script></body>`);
    });
    await new Promise<void>((resolve) => host.listen(PORT + 100, resolve));
    after(() => host.close());
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT + 100}/`);
    const frame = page.locator('kalender-indonesia iframe[data-kalender]');
    await frame.waitFor();
    assert.match((await frame.getAttribute('src'))!, /\/embed\?year=2026&month=8&lang=en&mode=jawa$/);
    await page.waitForFunction(() => document.querySelector<HTMLIFrameElement>('kalender-indonesia iframe')!.style.height !== '620px');
    const inner = page.frameLocator('kalender-indonesia iframe');
    assert.equal(await inner.locator('.day[data-date="2026-08-17"]').getAttribute('data-alt'), 'Lgi');
    await page.evaluate(() => document.querySelector('kalender-indonesia')!.setAttribute('month', '9'));
    assert.match((await frame.getAttribute('src'))!, /month=9/);
    await page.close();
  });

  test('no horizontal overflow on a phone', async () => {
    for (const path of ['/2026', '/2026/08', '/libur', '/alat', '/api', '/sumber', '/embed']) {
      const { page } = await open(path, { mobile: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `${path} overflows by ${overflow}px`);
      await page.close();
    }
  });

  test('touch targets for calendar days are at least 24x24 CSS px', async () => {
    for (const mobile of [false, true]) {
      const { page } = await open('/2026', { mobile });
      const smallest = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.day:not(.empty)')].map((d) => Math.min(d.getBoundingClientRect().width, d.getBoundingClientRect().height))));
      assert.ok(smallest >= 24, `smallest day target ${smallest}px`);
      await page.close();
    }
  });
});
