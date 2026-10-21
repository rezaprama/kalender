# Kalender Indonesia

**Kalender Indonesia yang bisa diperiksa.** Libur nasional dan cuti bersama yang ditelusuri ke keputusan pemerintah, kalender Masehi 1900–2100, konversi Jawa, Hijriah, dan Tionghoa, API JSON/ICS/CSV gratis, serta kalender yang bisa dipasang di situs lain.

[English](README.md) · Situs: <https://kalender.rezaprama.com> · API: [`/openapi.json`](https://kalender.rezaprama.com/openapi.json)

Dibuat dan dirawat oleh [Reza Prama Arviandi](https://rezaprama.com).

## Apa bedanya

- **Setiap tanggal resmi punya sumber.** Setiap libur menautkan SKB 3 Menteri, perubahannya, atau Keppres yang menetapkannya. Validator menolak data resmi yang tidak bersumber dari situs `.go.id` atau yang jumlahnya tidak sama dengan yang tertulis di keputusan. Lihat [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).
- **Jujur soal yang belum diketahui.** Setiap tahun berstatus `official`, `estimated`, atau `unverified`. Proyeksi untuk tahun tanpa SKB diberi label dan tingkat ketidakpastian (tanggal Islam ±1 hari), dan tidak pernah disebut keputusan pemerintah. Tahun historis yang kosong berarti "belum dikurasi", bukan "tidak ada libur".
- **Empat kalender, satu model tanggal.** Masehi adalah kalender utama. Jawa (weton, neptu, kurup Asapon dan Aboge), Hijriah (tabular dan Umm al-Qura), dan Tionghoa (tabel Hong Kong Observatory) adalah konversi dengan metode dan rentang yang terdokumentasi. Lihat [docs/METHODOLOGY.md](docs/METHODOLOGY.md).
- **Ringan dan cepat.** HTML dirender di Cloudflare Workers, sekitar 11 KB JavaScript (gzip), tanpa framework, tanpa pelacak, tanpa cookie.

## Cakupan data

| Tahun | Status | Isi |
| --- | --- | --- |
| 2022–2027 | `official` | Libur nasional dan cuti bersama dari SKB terverifikasi, termasuk perubahan dan Keppres hari pemungutan suara |
| 2028–2100 | `estimated` | Kategori Keppres 8/2024 dengan tanggal hasil perhitungan. Nyepi, Waisak, dan cuti bersama tidak ditebak |
| 1945–2021 | `unverified` | Hanya kalender Masehi. Arsip libur belum dikurasi |
| 1900–1944 | `unverified` | Sebelum Republik Indonesia berdiri. Belum ada libur nasional |

Kontribusi tahun historis lengkap dengan sumbernya sangat diterima: lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## API dalam 30 detik

Tanpa API key, CORS terbuka, JSON secara bawaan.

```bash
curl "https://kalender.rezaprama.com/api/v1/holidays?year=2026"
```

```js
const res = await fetch('https://kalender.rezaprama.com/api/v1/holidays?year=2026');
const { status, holidays, sources } = await res.json();
```

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/v1/holidays?year=` | Libur dan cuti bersama, `format=json\|ics\|csv` |
| `GET /api/v1/workdays?start=&end=` | Jumlah hari kerja dalam rentang, beserta cakupan data |
| `GET /api/v1/date?date=` | Satu tanggal di semua kalender, beserta libur dan peringatan |
| `GET /api/v1/convert?calendar=&year=&month=&day=` | Tanggal Hijriah, Jawa, atau Tionghoa ke Masehi |
| `GET /api/v1/observances?year=` | Peringatan keagamaan dan budaya hasil perhitungan (bukan libur) |
| `GET /api/v1/calendars` | Kalender yang didukung, metode, dan rentangnya |

Referensi lengkap: [docs/API.md](docs/API.md) dan dokumen OpenAPI 3.1 di `/openapi.json`.

## Pasang di situsmu

```html
<script src="https://kalender.rezaprama.com/embed.js" defer></script>
<kalender-indonesia year="2026" lang="id" mode="jawa">
  <a href="https://rezaprama.com">Kalender oleh Reza Prama Arviandi</a>
</kalender-indonesia>
```

Web component ini membuat iframe yang tingginya menyesuaikan sendiri. `<iframe src="https://kalender.rezaprama.com/embed?year=2026">` biasa juga bisa dipakai.

## Pengembangan

Kebutuhan: Node.js 22 atau lebih baru, npm.

```bash
npm install
npm run build
npm run dev
```

| Perintah | Fungsi |
| --- | --- |
| `npm run build` | Dataset, aset ber-hash, OpenAPI, dan sitemap ke `dist/` dan `src/generated/` |
| `npm run dev` | Build, pantau perubahan, dan jalankan `wrangler dev` di :8787 |
| `npx tsx scripts/serve.ts` | Routing yang sama di Node (:8788), untuk mesin yang tidak bisa menjalankan workerd |
| `npm run check` | Build, typecheck, lint (Biome), serta tes unit dan integrasi |
| `npm run e2e` | Perjalanan pengguna di browser dan audit axe-core WCAG 2.2 AA (butuh Chromium Playwright) |
| `npm run monitor` | Periksa sumber pemerintah untuk SKB baru |

Struktur kode dan alur deploy dijelaskan di [README.md](README.md#layout).

## Lisensi dan atribusi

- Kode: [Apache-2.0](LICENSE)
- Data kurasi: [CC BY 4.0](LICENSE-DATA.md)
- Pemberitahuan pihak ketiga: [NOTICE](NOTICE)

Jika memakai data atau embed di situs web, cantumkan [Reza Prama Arviandi](https://rezaprama.com) dengan tautan biasa.
