# Historical holiday evidence

Checked on 21 October 2026. The datasets describe national holidays and nationally announced collective leave, after amendments. Local holidays, school calendars, religious observances without national holiday status, and employer-specific arrangements are outside this dataset.

| Year | National holiday dates | Collective leave dates | Final evidence |
| --- | ---: | ---: | --- |
| 2022 | 16 | 4 | SKB 678/2022, 2/2022, 2/2022, dated 7 July 2022 |
| 2023 | 16 | 11 | SKB 624/2023, 2/2023, 2/2023, dated 16 June 2023 |
| 2024 | 19 | 10 | SKB 236/2024, 1/2024, 2/2024, plus Keppres 10/2024 and 33/2024 |

Counts are civil dates, not table rows. A two-day Idulfitri entry becomes two events. Holidays on weekends remain national holidays.

## 2022

The [signed second amendment from JDIH Kemnaker](https://jdih.kemnaker.go.id/asset/data_puu/2022SKB_Libnas.pdf), page 3, explicitly moves Iduladha from Saturday 9 July to Sunday **10 July 2022**. Page 4 restates all national holidays and four collective leave dates: 29 April and 4, 5, 6 May. The [JDIH regulation record](https://jdih.kemnaker.go.id/peraturan/detail/2200/keputusan-bersama-menteri-agama-menteri-ketenagakerjaan-dan-menteri-pendayagunaan-aparatur-negara-dan-reformasi-birokrasi-republik-indonesia-nomor-2-tahun-2022) confirms adoption on 7 July 2022.

The [7 April government announcement](https://setkab.go.id/inilah-skb-3-menteri-perubahan-hari-libur-nasional-dan-cuti-bersama-tahun-2022/) records the earlier addition of four collective leave days. Its 9 July entry is superseded by the second amendment. Copying that earlier announcement alone would produce an incorrect final calendar.

## 2023

The [21 June Setkab announcement](https://setkab.go.id/pemerintah-terbitkan-skb-perubahan-libur-nasional-dan-cuti-bersama-2023-2/) reproduces the full national holiday and collective leave lists following the second amendment. The [JDIH announcement](https://jdih.kemenkoinfra.go.id/skb-3-menteri-perubahan-kedua-terkait-hari-libur-nasional-dan-cuti-bersama-tahun-2023) gives its adoption date, 16 June 2023.

The [29 March amendment announcement](https://setkab.go.id/pemerintah-terbitkan-skb-perubahan-libur-nasional-dan-cuti-bersama-2023/) replaces the original Idulfitri collective leave dates of 21, 24, 25, 26 April with **19, 20, 21, 24, 25 April**. Therefore, 26 April is not retained. The second amendment adds **28 and 30 June** as Iduladha collective leave. Final total: 16 national holiday dates and 11 collective leave dates.

## 2024

The [signed amendment hosted by JDIH Kemenko PMK](https://jdih.kemenkopmk.go.id/download/document/SKB%20Perubahan%20tentang%20Hari%20Libur%20Nasional%20dan%20Cuti%20Bersama%202024), adopted on 26 February 2024, supplies all 17 recurring national holiday dates and 10 collective leave dates. The appendix on pages 4-5 was inspected visually. It uses Wafat Yesus Kristus, Kebangkitan Yesus Kristus (Paskah), Kenaikan Yesus Kristus, and Kelahiran Yesus Kristus. Dates did not change from the original September 2023 SKB.

Two additional national holidays sit outside that annual SKB:

- **14 February 2024**, general election polling day: [Keppres 10/2024, adopted 6 February 2024](https://peraturan.bpk.go.id/Details/277337/keppres-no-10-tahun-2024). The [Setkab announcement](https://setkab.go.id/presiden-tetapkan-hari-pemilu-14-februari-2024-sebagai-hari-libur-nasional/) confirms the date and national scope.
- **27 November 2024**, regional election polling day: [Keppres 33/2024, adopted 21 November 2024](https://peraturan.bpk.go.id/Details/308159/keppres-no-33-tahun-2024). The declaration is nationwide, despite the elections choosing regional heads.

Thus the complete national total is **19**, even though the annual SKB states 17. Omitting standalone presidential decrees would miss both election holidays.

## Verification and naming

The signed 2022 and 2024 PDFs were first classified locally with `@firecrawl/pdf-inspector` 1.11.2. Both were scanned. Relevant decree and appendix pages were rendered with Poppler and visually read; empty text extraction was not treated as evidence. Temporary PDF and PNG files are not repository data.

Each event retains a `sourceId` pointing to a government source in its year file. Indonesian labels preserve the relevant source's terminology, with light punctuation normalization. English labels are project translations, not government-certified translations. `official` means supported by a government declaration for the stated date and type; it does not promise every employee receives the day off. Collective leave implementation follows applicable agency or employer rules.

Earlier and later years need their own evidence. These verified years must not be extrapolated into historical legal claims or future government declarations.
