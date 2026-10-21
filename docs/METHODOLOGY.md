# Calendar and holiday methodology

Every date in the project is a Gregorian civil date (`YYYY-MM-DD`), handled at UTC noon so no browser or server timezone can shift it. "Today" is computed in Asia/Jakarta (WIB). Other calendar systems are conversions of that civil date. They never feed back into the holiday dataset except through the documented projections below.

## Gregorian calendar

Range: 1900-01-01 to 2100-12-31 inclusive. Leap years follow the Gregorian century rule: 1900 and 2100 are common years, 2000 is a leap year. Tests check the weekday of every one of the 73,414 dates against Sakamoto's algorithm, which is implemented independently of `Date`.

## Holiday projections

Years with no SKB yet (currently 2028-2100) are `estimated`. They contain only what can be derived without guessing a government decision:

| Category | Method | Source id |
| --- | --- | --- |
| Tahun Baru Masehi, Hari Buruh, Hari Lahir Pancasila, Proklamasi, Natal | Fixed dates of the Keppres 8/2024 categories | `keppres-8-2024` |
| Wafat, Kebangkitan (Paskah), Kenaikan Yesus Kristus | Easter computus, -2 / 0 / +39 days | `calc-computus` |
| Tahun Baru Imlek | HKO lunar table (below) | `calc-chinese` |
| Isra Mikraj, Idulfitri (2 days), Iduladha, Tahun Baru Islam, Maulid | Tabular Hijri, marked ±1 day | `calc-hijri-civil` |

**Not projected:** Nyepi (Balinese Saka rules set by PHDI), Waisak (set by Buddhist councils), collective leave (a policy decision), and election days. They are listed in `missing`. A projection assumes Keppres 8/2024 remains in force. It is not a forecast of any future SKB.

## Christian holidays

Easter Sunday uses the Anonymous Gregorian algorithm (Meeus/Jones/Butcher). Good Friday is two days before and Ascension 39 days after. All official dates 2022-2027 match.

## Islamic calendar

Two conventions are offered:

- `civil` (default): the arithmetic (tabular) Islamic calendar, 30-year cycle with leap years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 and epoch Friday 16 July 622 (Julian). It is implemented directly from Reingold and Dershowitz, *Calendrical Calculations*, so it does not depend on the runtime having ICU calendar data. Tests check every day of 1900-2100 against ICU `islamic-civil`, an independent implementation.
- `umalqura`: the Saudi Umm al-Qura calendar from ICU. It is offered only after a runtime self-check (Saudi Eid al-Fitr 1447 = 20 March 2026). If ICU data is missing, the API reports the method as unavailable instead of returning a silently wrong date.

Neither reproduces Indonesian practice. Kemenag fixes 1 Ramadan, 1 Syawal and 1 Zulhijah through the sidang isbat, using MABIMS visibility criteria (moon altitude at least 3°, elongation at least 6.4°) together with rukyat. Measured against the 31 decreed Islamic holiday dates of 2022-2027: `civil` matches 21 exactly and is otherwise off by one day in either direction; `umalqura` matches 17 and is otherwise always one day early. The site therefore labels every Hijri conversion "tabular" and every projected Islamic holiday "±1 day". A calculated Hijri date is never shown as a Kemenag decision.

## Chinese calendar

Conversions for 1900-12-22 to 2100-12-31 come from the Hong Kong Observatory Gregorian-Lunar Calendar Conversion Tables for 1901-2100 (one text file per year, e.g. [T2027e.txt](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2027e.txt)), retrieved on 2026-10-21. They are stored as 2,475 month starts: one 29/30-day bit per month plus the indices of the 73 leap months. A checksum test (FNV-1a `f468db94`) ties the embedded table to the extraction. Dates from 1900-01-01 to 1900-12-21 fall outside the HKO tables and are not supported: the API returns `chinese: null` for them.

ICU's own astronomical `chinese` calendar was rejected. It disagrees with HKO on 447 days in 13 lunar years between 1900 and 2100, when a new moon falls close to midnight Beijing time. With Node 22's ICU 77.1, three of those disagreements move Chinese New Year (1954, 2027, 2030); HKO's own 1954 and 2030 tables were rechecked on 2026-10-21. For 2027, HKO and the Indonesian SKB both give 6 February, while ICU gives 7 February.

Rights in the HKO data belong to the Government of the Hong Kong SAR. The table lives in `src/calendars/chinese-hko-data.ts` and is used non-commercially under the HKO conditions; see [third_party/hko/NOTICE.md](../third_party/hko/NOTICE.md).

The Indonesian Kongzili year is the lunar year plus 551 (SKB 2026: "Tahun Baru Imlek 2577 Kongzili"). Cultural festivals derived from this calendar are observances, not public holidays.

## Javanese calendar

**Pasaran and weton.** Pasaran follows the unbroken five-day cycle Legi, Pahing, Pon, Wage, Kliwon, anchored on Friday Legi, 17 August 1945 (Proclamation). Weton is weekday + pasaran (a 35-day cycle). Neptu values follow Primbon Betaljemur Adammakna: Minggu 5, Senin 4, Selasa 3, Rabu 7, Kamis 8, Jumat 6, Sabtu 9; Legi 5, Pahing 9, Pon 7, Wage 4, Kliwon 8. The site reports the numbers only. It makes no claims about character, compatibility or auspicious days.

**Date and year.** The Sultan Agung calendar is arithmetic: 12 months (Sura 30, Sapar 29, Mulud 30, Bakda Mulud 29, Jumadilawal 30, Jumadilakir 29, Rejeb 30, Ruwah 29, Pasa 30, Sawal 29, Sela 30, Besar 29/30), a year of 354 or 355 days, and an 8-year windu (Alip, Ehe, Jimawal, Je, Dal, Be, Wawu, Jimakir) of 2,835 days, with wuntu (355-day) years Ehe, Dal and Jimakir.

**Kurup.** Every 120 years one day is dropped so the calendar keeps pace with the moon. The era is named after the weton of 1 Sura Alip:

| Kurup | Javanese years | 1 Sura Alip |
| --- | --- | --- |
| Aboge (Arba'iyah) | 1749-1866 | Rabu Wage |
| Asapon (Salasiyah) | 1867-1986 | Selasa Pon |

Anchor: 1 Sura 1867 Alip = Tuesday 24 March 1936 (Selasa Pon), also 1 Muharram 1355 in the tabular Hijri calendar. Aboge communities (for example in Banyumas, Purbalingga and Cilacap) still count one day later. The default `kraton` convention uses the kurup in force at each date: Aboge before 24 March 1936, Asapon after. `aboge` applies Aboge throughout.

Asapon ends with Jimakir 1986 J. No successor kurup has been fixed by the courts, so dates from 1 Sura 1987 J (2052) onwards are continued Asapon arithmetic and flagged `projected`.

**Validation.** The 1 Sura weton of every year 1867-1986 J matches the windu table (Selasa Pon, Sabtu Pahing, Kamis Pahing, Senin Legi, Jumat Kliwon, Rabu Kliwon, Minggu Wage, Kamis Pon). Kraton Yogyakarta observed 1 Sura Be 1960 on 17 June 2026; the arithmetic gives the same day. Kurup and windu tables: [Kalender Jawa, Wikipedia bahasa Indonesia](https://id.wikipedia.org/wiki/Kalender_Jawa) and its references (retrieved 2026-10-21).

The civil date changes at midnight. Traditionally the Javanese day begins at sunset, so an event after sunset belongs to the next Javanese day; the site states this rather than guessing an hour. Wuku (the 30-week pawukon) is not implemented.

## Observances

Calculated observances are shown, and served by `/api/v1/observances`, separately from public holidays:

- Islamic (tabular, ±1 day): Asyura (10 Muharam), Nisfu Syakban (15 Syakban), Awal Ramadan (1 Ramadan), Nuzulul Quran (17 Ramadan), Hari Arafah (9 Zulhijah).
- Chinese (HKO): Malam Tahun Baru Imlek, Cap Go Meh (1/15), Peh Cun (5/5), Sembahyang Rebutan (7/15), Festival Kue Bulan (8/15). Leap months are excluded.
- Javanese: 1 Sura (kraton convention).

Solar-term festivals (Qingming, Dongzhi) need solar longitudes and are not included.

## Not implemented

- A MABIMS visibility predictor (moon altitude/elongation at sunset) for projecting Kemenag decisions. It would need a validated lunar ephemeris plus a record of past isbat results, and would still be uncertain on borderline evenings. Projections therefore stay tabular and labelled ±1 day.
- Balinese Saka (Nyepi) and Buddhist (Waisak) date rules.
