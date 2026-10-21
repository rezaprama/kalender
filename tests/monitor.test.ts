import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadOfficial } from '../scripts/data.ts';
import { candidates, dateCoverage, expectations, parseRss, run } from '../scripts/monitor.ts';

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Pemerintah Tetapkan Hari Libur Nasional dan Cuti Bersama Tahun 2028]]></title><link>https://setkab.go.id/libur-2028/</link><pubDate>Tue, 12 Sep 2027 08:00:00 +0000</pubDate></item>
<item><title>Inilah SKB 3 Menteri Libur Nasional dan Cuti Bersama 2027</title><link>https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027</link><pubDate>Tue, 15 Sep 2026 08:00:00 +0000</pubDate></item>
<item><title>Presiden Resmikan Bendungan</title><link>https://setkab.go.id/bendungan/</link></item>
<item><title>Libur Nasional dan Cuti Bersama 2019</title><link>https://setkab.go.id/old-2019/</link></item>
</channel></rss>`;

// Text in the style of the Kemenko PMK 2026 announcement (lists, ranges and "dan").
const PAGE_2026 = `<ul><li>1 Januari: Tahun Baru 2026 Masehi</li><li>16 Januari: Isra Mikraj</li><li>17 Februari: Imlek</li><li>19 Maret: Nyepi</li>
<li>21–22 Maret: Idul Fitri</li><li>3 April: Wafat</li><li>5 April: Paskah</li><li>1 Mei: Buruh</li><li>14 Mei: Kenaikan</li><li>27 Mei: Iduladha</li>
<li>31 Mei: Waisak</li><li>1 Juni: Pancasila</li><li>16 Juni: Muharam</li><li>17 Agustus: Proklamasi</li><li>25 Agustus: Maulid</li><li>25 Desember: Natal</li></ul>
<p>Cuti bersama: 16 Februari; 18 Maret; 20, 23, dan 24 Maret; 15 Mei; 28 Mei; 24 Desember.</p>`;

describe('monitor', () => {
  test('parses RSS and keeps only new, relevant, current articles', () => {
    const items = parseRss(RSS);
    assert.equal(items.length, 4);
    assert.equal(items[0].date, '2027-09-12');
    const found = candidates(items, new Set(['https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027']), 2027);
    assert.deepEqual(found.map((i) => i.link), ['https://setkab.go.id/libur-2028/']);
  });

  test('date coverage handles ranges and lists, and detects missing dates', async () => {
    const data = (await loadOfficial()).get(2026)!;
    assert.deepEqual(dateCoverage(PAGE_2026, data, 'skb-2026'), { found: 25, total: 25, missing: [] });
    const amended = PAGE_2026.replace('24 Desember', '');
    assert.deepEqual(dateCoverage(amended, data, 'skb-2026').missing, ['2026-12-24']);
    const other = dateCoverage(PAGE_2026.replace(/Maret/g, 'April'), data, 'skb-2026');
    assert.ok(other.missing.includes('2026-03-21') && other.missing.includes('2026-03-23'));
  });

  test('time-based expectations and isbat reminders', async () => {
    const official = await loadOfficial();
    assert.deepEqual(expectations(official, '2026-10-21').map((f) => f.kind), []);
    const late = expectations(official, '2027-10-01');
    assert.ok(late.some((f) => f.kind === 'expectation' && /2028 SKB/.test(f.message)));
    assert.ok(late.some((f) => f.kind === 'isbat' && f.severity === 'action' && f.message.startsWith('2027-03-10')));
    const soon = expectations(official, '2027-02-20');
    assert.ok(soon.some((f) => f.kind === 'isbat' && f.severity === 'info'));
  });

  test('offline run produces a report without touching the network', async () => {
    const { report } = await run({ offline: true, today: '2027-10-01' });
    assert.match(report, /need a curator/);
    assert.match(report, /Nothing has been changed automatically/);
  });
});
