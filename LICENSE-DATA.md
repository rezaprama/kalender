# Licensing of code and data

Kalender Indonesia contains material under several sets of rights. Each category below says who holds the rights and what the terms are.

| Category | What | Rights holder | Terms |
| --- | --- | --- | --- |
| Original code | Everything in this repository not listed below | Reza Prama Arviandi | [Apache-2.0](LICENSE) |
| Original dataset | The curation in `data/official/*.json` and the generated `/data/*.json` and API output: selection, classifications, verification metadata, English names, projections and calculated observances | Reza Prama Arviandi | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Indonesian government data | The holiday decisions themselves (SKB 3 Menteri, Keppres, Kemenag decisions) and their wording | Government of the Republic of Indonesia | Not licensed by this project. Each record cites its source |
| Hong Kong Observatory data | Chinese lunisolar month table in `src/calendars/chinese-hko-data.ts`, and Chinese dates computed from it | Government of the Hong Kong SAR | **Non-commercial use only**, under the HKO conditions in [third_party/hko/NOTICE.md](third_party/hko/NOTICE.md). Not Apache-2.0, not CC BY 4.0 |
| Third-party assets | Phosphor Icons (inline SVG) | Phosphor Icons | MIT, see [NOTICE](NOTICE) |

## Using the original dataset (CC BY 4.0)

You may share and adapt the original dataset for any purpose, including commercially, if you give credit, link to the license and indicate changes. Please credit:

> Kalender Indonesia by Reza Prama Arviandi, https://rezaprama.com, CC BY 4.0

On the web, use a normal HTML link: `<a href="https://rezaprama.com">Reza Prama Arviandi</a>`. The license does not extend to the government decisions the data describes, or to the HKO-derived Chinese calendar data.

## Chinese calendar data

API responses and pages that show Chinese lunisolar dates contain information derived from Hong Kong Observatory data. The HKO Disclaimer is displayed on the site's Sources page, is returned by `/api/v1/calendars`, and is reproduced in [third_party/hko/NOTICE.md](third_party/hko/NOTICE.md). Selling or exchanging that information for any benefit is prohibited by HKO's conditions. Commercial users must obtain HKO's written authorisation or use another source.

## No warranty

Records marked `official` are checked against the cited government sources (see [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)). Records marked `estimated` or `unverified` are not government decisions. Check the cited decree before relying on a date for legal or contractual purposes.
