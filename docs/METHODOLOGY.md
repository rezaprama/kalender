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

Two conventions are available through ICU:

- `civil`: the arithmetic (tabular) Islamic calendar, 30-year cycle with leap years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29 and epoch Friday 16 July 622 (Julian). Tests check every day of 1900-2100 against the published `fixed-from-islamic` formula of Reingold and Dershowitz, *Calendrical Calculations*.
- `umalqura`: the Saudi Umm al-Qura calendar as tabulated in ICU.

Neither reproduces Indonesian practice. Kemenag fixes 1 Ramadan, 1 Syawal and 1 Zulhijah through the sidang isbat, using MABIMS visibility criteria (moon altitude at least 3°, elongation at least 6.4°) together with rukyat. Measured against the 31 decreed Islamic holiday dates of 2022-2027: `civil` matches 21 exactly and is otherwise off by one day in either direction; `umalqura` matches 17 and is otherwise always one day early. The site therefore labels every Hijri conversion "tabular" and every projected Islamic holiday "±1 day". A calculated Hijri date is never shown as a Kemenag decision.

## Chinese calendar

Conversions for 1900-12-22 to 2100-12-31 come from the Hong Kong Observatory Gregorian-Lunar Calendar Conversion Tables for 1901-2100 (one text file per year, e.g. [T2027e.txt](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2027e.txt)), retrieved on 2026-10-21. They are stored as 2,475 month starts: one 29/30-day bit per month plus the indices of the 73 leap months. A checksum test (FNV-1a `f468db94`) ties the embedded table to the extraction. Dates from 1900-01-01 to 1900-12-21 fall outside the HKO tables and use ICU, reported as `source: "icu"`.

ICU's own astronomical `chinese` calendar was rejected. It disagrees with HKO on 447 days in 13 lunar years between 1900 and 2100, when a new moon falls close to midnight Beijing time. Four of those disagreements move Chinese New Year (1954, 1955, 2027, 2030). For 2027, HKO and the Indonesian SKB both give 6 February, while ICU gives 7 February.

The Indonesian Kongzili year is the lunar year plus 551 (SKB 2026: "Tahun Baru Imlek 2577 Kongzili"). Cultural festivals derived from this calendar are observances, not public holidays.

## Javanese pasaran

Pasaran follows the unbroken five-day cycle Legi, Pahing, Pon, Wage, Kliwon, anchored on Friday Legi, 17 August 1945 (Proclamation). The civil date changes at midnight. Traditionally the Javanese day begins at sunset, so an event after sunset can be reckoned with the next pasaran; the site states this rather than guessing an hour.
