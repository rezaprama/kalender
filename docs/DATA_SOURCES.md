# Data sources and evidence ledger

This ledger records, per year, which government documents support each `official` record in `data/official/`. It covers national holidays and nationally announced collective leave (*cuti bersama*) after all amendments. Local holidays, school calendars, observances without national-holiday status and employer-specific arrangements are out of scope.

`official` means a government declaration supports that date and type. It does not promise that every employee gets the day off: collective leave for civil servants follows ASN rules, and for private employers it follows each employer's policy.

| Year | National dates | Collective leave | Final evidence | Last checked |
| --- | ---: | ---: | --- | --- |
| 2022 | 16 | 4 | SKB 678/2022, 2/2022, 2/2022 (second amendment, 7 July 2022) | 2026-10-21 |
| 2023 | 16 | 11 | SKB 624/2023, 2/2023, 2/2023 (second amendment, 16 June 2023) | 2026-10-21 |
| 2024 | 19 | 10 | SKB 236/2024, 1/2024, 2/2024 + Keppres 10/2024 and 33/2024 | 2026-10-21 |
| 2025 | 17 | 11 | SKB 1017/2024, 2/2024, 2/2024 + amendment SKB 933/2025, 1/2025, 3/2025 | 2026-10-21 |
| 2026 | 17 | 8 | SKB 1497/2025, 2/2025, 5/2025 | 2026-10-21 |
| 2027 | 18 | 8 | SKB 1205/2026, 3/2026, 2/2026 | 2026-10-21 |

Counts are civil dates, not table rows: a two-day Idulfitri entry is two events. Holidays falling on weekends remain national holidays. The counts are stored as `declared` in each year file and the validator rejects any mismatch.

Since 2024 the holiday *categories* are set by [Keppres 8/2024 tentang Hari-hari Libur](https://peraturan.bpk.go.id/Details/276688/keppres-no-8-tahun-2024-hari-hari-libur) (adopted 29 January 2024; it revokes Keppres 251/1967 and its amendments). The annual SKB fixes the dates. Each SKB states that 1 Ramadan, Idulfitri and Iduladha are determined by a Minister of Religious Affairs decision (sidang isbat), so decreed Islamic dates for a future year carry `subjectTo: "isbat"` until that decision exists.

## 2022

The [signed second amendment from JDIH Kemnaker](https://jdih.kemnaker.go.id/asset/data_puu/2022SKB_Libnas.pdf), page 3, moves Iduladha from Saturday 9 July to Sunday **10 July 2022**. Page 4 restates all national holidays and four collective leave dates: 29 April and 4, 5, 6 May. The [JDIH regulation record](https://jdih.kemnaker.go.id/peraturan/detail/2200/keputusan-bersama-menteri-agama-menteri-ketenagakerjaan-dan-menteri-pendayagunaan-aparatur-negara-dan-reformasi-birokrasi-republik-indonesia-nomor-2-tahun-2022) confirms adoption on 7 July 2022.

The [7 April Setkab announcement](https://setkab.go.id/inilah-skb-3-menteri-perubahan-hari-libur-nasional-dan-cuti-bersama-tahun-2022/) (SKB 375/2022, 1/2022, 1/2022, amending SKB 963/2021, 3/2021, 4/2021) adds the four collective leave days. Its 9 July Iduladha entry is superseded by the second amendment; copying that announcement alone would give a wrong final calendar. Re-checked 2026-10-21: the Setkab list matches the dataset except Iduladha, and press coverage of the 7 July 2022 SKB confirms the move to 10 July.

## 2023

The [21 June 2023 Setkab announcement](https://setkab.go.id/pemerintah-terbitkan-skb-perubahan-libur-nasional-dan-cuti-bersama-2023-2/) reproduces the full lists after the second amendment (SKB 624/2023, 2/2023, 2/2023, amending SKB 1066/2022, 3/2022, 3/2022). The [JDIH Kemenko Infra announcement](https://jdih.kemenkoinfra.go.id/skb-3-menteri-perubahan-kedua-terkait-hari-libur-nasional-dan-cuti-bersama-tahun-2023) gives the adoption date, 16 June 2023. Re-checked 2026-10-21: all 16 national and 11 leave dates match.

The [29 March amendment announcement](https://setkab.go.id/pemerintah-terbitkan-skb-perubahan-libur-nasional-dan-cuti-bersama-2023/) replaced the original Idulfitri leave dates of 21, 24, 25, 26 April with **19, 20, 21, 24, 25 April**; 26 April is not retained. The second amendment adds **28 and 30 June** for Iduladha.

## 2024

The [signed amendment hosted by JDIH Kemenko PMK](https://jdih.kemenkopmk.go.id/download/document/SKB%20Perubahan%20tentang%20Hari%20Libur%20Nasional%20dan%20Cuti%20Bersama%202024), adopted 26 February 2024 and listed by JDIH Kemenag as Keputusan Menteri Agama 236/2024, supplies the 17 recurring national dates and 10 collective leave dates. Its appendix (pages 4-5) was read visually. It adopts the Keppres 8/2024 names (Wafat/Kebangkitan/Kenaikan/Kelahiran Yesus Kristus); dates are unchanged from the September 2023 SKB.

Two further national holidays come from presidential decrees:

- **14 February 2024**, general election polling day: [Keppres 10/2024](https://peraturan.bpk.go.id/Details/277337/keppres-no-10-tahun-2024), adopted 6 February 2024.
- **27 November 2024**, regional election polling day: [Keppres 33/2024](https://peraturan.bpk.go.id/Details/308159/keppres-no-33-tahun-2024), adopted 21 November 2024. The declaration is nationwide.

The national total is therefore **19**, although the annual SKB states 17.

## 2025

[Kemenko PMK, 15 October 2024](https://www.kemenkopmk.go.id/index.php/pemerintah-tetapkan-hari-libur-nasional-dan-cuti-bersama-tahun-2025): SKB 1017/2024, 2/2024, 2/2024 with 17 national dates and 10 collective leave dates. All dates match the dataset.

[Setneg, 7 August 2025](https://setneg.go.id/baca/index/sambut_hut_ke_80_kemerdekaan_ri_pemerintah_tetapkan_18_agustus_2025_sebagai_cuti_bersama): amendment SKB 933/2025, 1/2025, 3/2025, signed 7 August 2025, adds **18 August 2025** as collective leave for the 80th Independence anniversary. Final: 17 national, 11 leave.

## 2026

[Kemenko PMK, 19 September 2025](https://www.kemenkopmk.go.id/pemerintah-tetapkan-17-hari-libur-nasional-dan-8-hari-cuti-bersama-tahun-2026) lists 17 national and 8 collective leave dates; [Setneg](https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2026) gives the numbers SKB 1497/2025, 2/2025, 5/2025. All dates match the dataset.

The isbat decisions confirmed the decreed Islamic dates: Kemenag announced 1 Syawal 1447 H = Saturday 21 March 2026 (19 March 2026) and 1 Zulhijah 1447 H = 18 May 2026, Iduladha Wednesday 27 May 2026 (17 May 2026). These were read from kemenag.go.id press releases mirrored by regional offices on 2026-10-21. No amendment of the 2026 SKB was found in a search on 2026-10-21.

## 2027

[Setneg, 15 September 2026](https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027): SKB 1205/2026, 3/2026, 2/2026, signed 15 September 2026, with 18 national dates (Isra Mikraj falls twice: 5 January and 26 December) and 8 collective leave dates. All dates match the dataset. Idulfitri (10-11 March) and Iduladha (17 May) remain subject to the 2027 isbat.

## Years without a decree

- **2028-2100** are projections, not decisions. See [METHODOLOGY.md](METHODOLOGY.md#holiday-projections).
- **1945-2021** are not yet curated. National holidays existed throughout this period (Keppres 251/1967 governed them from 1967 until Keppres 8/2024 replaced it), but each year needs its own decree evidence before records are added. An empty list does not mean there were no holidays.
- **1900-1944** predate the Republic of Indonesia; colonial-era holidays are out of scope.

## How the checks were made

The 2022 and 2024 signed PDFs are scanned images. Codex rendered the relevant pages with Poppler and read them visually; empty text extraction was not treated as evidence. Re-verification on 2026-10-21 read the government web pages listed above and compared every date with the dataset.

Each event keeps a `sourceId` pointing to a source in its year file. Indonesian names follow the source's terminology, with light punctuation normalisation. English names are project translations, not government-certified translations.

## Adding or correcting a year

1. Find the final SKB and every amendment, and any Keppres that adds a holiday (elections).
2. Add `data/official/YYYY.json` with every date, `sourceId`s pointing to `.go.id` sources, and `declared` counts copied from the decree text.
3. Run `npm run check`. The validator rejects wrong years, duplicates, non-government sources, count mismatches, and dates that do not fit their named category (fixed dates, Easter computus, HKO Imlek, ±2 days of the tabular Hijri target).
4. Add an entry to this ledger saying what was read and when.
