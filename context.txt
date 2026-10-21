# PROJECT CONTEXT & OPERATING PRINCIPLES

## A. Project identity

**Project:** Kalender Indonesia
**Repository:** https://github.com/rezaprama/kalender
**Local directory:** `F:\100 Github\kalender`
**Production domain:** https://kalender.rezaprama.com
**Hosting:** Cloudflare Pages
**Version control:** Git and GitHub
**Author:** Reza Prama Arviandi
**Author website:** https://rezaprama.com
**Languages:** Bahasa Indonesia (default) and English
**Coverage:** Gregorian years 1900–2100
**Project type:** Open-source web application, holiday dataset, developer API, and embeddable calendar infrastructure.

The project aims to become a trusted, comprehensive Indonesian calendar resource that combines everyday usability with rigorous engineering and verifiable public information.

## B. Development history

Initial development was conducted using OpenAI Codex. The previous session ended because its usage quota was exhausted, potentially leaving unfinished implementations and uncommitted changes.

Claude Code is responsible for continuing the existing work, not starting a replacement project.

Before implementing changes:

1. Inspect the local repository and Git history.
2. Read AGENTS.md, CLAUDE.md, README, and relevant documentation.
3. Identify completed, partial, broken, and missing features.
4. Examine uncommitted changes and preserve valuable work.
5. Evaluate the existing architecture and dependencies.
6. Run available tests and inspect failures.
7. Reconstruct unfinished work.
8. Continue implementation from the actual repository state.

Never overwrite functioning implementations without technical justification.

Maintain a durable development checkpoint in `docs/AGENT_HANDOFF.md`, including completed work, decisions, remaining tasks, test evidence, and the next actionable step.

Never report unverified work as complete.

## C. Product references and reverse engineering

Relevant Indonesian calendar references include:

https://tanggalans.com/

https://kalenderku.id/

Reverse-engineering reference:

https://github.com/morluto/rea

Study publicly observable functionality, interaction patterns, information architecture, and usability.

Use appropriate available design and development skills, including `design-taste-frontend`, `caveman`, and anti-AI-slop design guidance where installed.

Create an original implementation rather than copying protected website assets, source code, branding, or copyrighted content.

The objective is to substantially improve usefulness, reliability, developer accessibility, and overall user experience.

## D. Calendar correctness

Calendar calculations must be accurate throughout 1900–2100.

Use deterministic Gregorian date computation with comprehensive boundary testing.

Handle leap years, century rules, timezones, date serialization, month lengths, weekday calculations, and navigation correctly.

Treat 1900 and 2100 as common Gregorian years and 2000 as a leap year.

Do not confuse computational calendar coverage with verified historical holiday coverage.

Historical Indonesia includes periods when the modern Indonesian state and contemporary holiday regulations did not yet exist.

Do not retroactively assign modern holiday rules to earlier periods.

For future years, do not invent government declarations.

Religious calendar calculations, particularly Hijri conversions, must be clearly distinguished from official religious holiday determinations.

Potential traditional-calendar support includes:

* Javanese pasaran and weton.
* Hijri dates.
* Other culturally relevant calendar systems where reliable implementations and sources exist.

Provide explicit uncertainty disclosures wherever exact historical or official equivalence cannot be established.

## E. Government holiday data policy

Data integrity is the most important requirement.

Separate:

* National public holidays.
* Government-designated collective leave.
* Non-holiday commemorative dates.
* Religious and cultural observances.
* Verified historical records.
* Calculated or provisional future events.

Do not combine these into an ambiguous generic holiday flag.

Use official Indonesian government sources wherever possible, including:

* Kementerian Sekretariat Negara.
* Kementerian Koordinator Bidang Pembangunan Manusia dan Kebudayaan.
* Kementerian Agama.
* Kementerian Ketenagakerjaan.
* Kementerian PANRB.
* Relevant JDIH repositories.
* Signed SKB 3 Menteri documents.
* Relevant presidential and ministerial decisions.

Government reporting and signed legal documents should be cross-checked, including amendments and superseding decisions.

Use the official 2026 and 2027 holiday decisions as important validation fixtures, subject to any subsequently issued amendments.

Official records should preserve source URLs, document identifiers, legal classification, publication dates, verification information, and applicable conditions where available.

Missing evidence must remain missing rather than being fabricated.

Automated data updates should use monitoring, extraction, validation, comparison, testing, and reviewable pull requests.

Never silently publish uncertain extracted holiday information.

## F. Core website functionality

Prioritize:

* Current-date display.
* Monthly and yearly calendars.
* Navigation across 1900–2100.
* Date selection and deep linking.
* Official holiday details.
* Calendar search.
* Holiday filtering.
* National holiday listings.
* Collective leave information.
* Long-weekend exploration.
* Leave planning.
* Date difference calculations.
* Working-day calculations with explicit assumptions.
* Weton and traditional date information where reliable.
* Downloadable JSON, CSV, and ICS files.
* Printable layouts.
* Calendar sharing.
* Light and dark themes where appropriate.
* Indonesian and English interfaces.
* Accessible mobile interaction.

Prioritize a coherent, genuinely useful experience over feature quantity.

Collective leave and employment-related calculations must distinguish applicable government rules from assumptions about private-sector employment.

## G. API, datasets, and embeddable components

Provide developer-friendly access to:

* Calendar dates.
* Holidays by year.
* Holidays by type.
* Date details.
* Commemorative observances.
* Source provenance.
* Relevant calendar metadata.

Use versioned endpoints, typed schemas, predictable errors, documented examples, and appropriate caching.

Support easy website integration through an iframe, JavaScript widget, web component, or another practical embedding method.

Maintain consistency between API data and the website.

Prefer static datasets and lightweight endpoints when appropriate for Cloudflare hosting.

Avoid unnecessary databases or complex backend services.

## H. Design philosophy

The design should feel like a carefully crafted public utility.

Preferred characteristics:

* Minimalist.
* Modern.
* Functional.
* Editorially refined.
* Typography-driven.
* Readable.
* Responsive.
* Accessible.
* Appropriate for Indonesian users.
* Visually consistent.
* Fast and lightweight.

Avoid generic AI-generated aesthetics, excessive gradients, ornamental cards, glowing elements, oversized hero sections, pointless animations, unnecessary shadows, and verbose promotional copy.

The calendar itself must remain the primary visual element.

Provide clear visual differentiation among Sundays, public holidays, collective leave, commemorations, selected dates, and today.

Do not rely solely on color to communicate meaning.

Target WCAG 2.2 AA accessibility, using semantic HTML, keyboard support, appropriate focus management, screen-reader labels, and sufficient contrast.

## I. SEO and discoverability

Target outstanding Lighthouse and PageSpeed performance across mobile and desktop.

Implement:

* Semantic markup.
* Descriptive metadata.
* Canonical URLs.
* Sitemap and robots.txt.
* Hreflang.
* Responsive layouts.
* Meaningful internal linking.
* Appropriate structured data.
* Fast loading.
* Minimal JavaScript.
* Effective caching.
* Crawlable informational content.
* Clear official-source references.

Prioritize genuinely useful content.

Do not mass-index thousands of repetitive or weakly supported pages merely to increase search visibility.

Use short, meaningful URLs where practical.

AI-answer-engine discoverability should result from accurate, structured, accessible information rather than speculative optimization techniques.

## J. Open-source quality

Maintain professional repository standards:

* Clear README and English documentation.
* Installation instructions.
* Developer quick start.
* API documentation.
* Working integration examples.
* Contribution guidelines.
* Appropriate license.
* Changelog.
* Data methodology.
* Source attribution policy.
* Automated tests.
* CI workflows.
* Reproducible builds.
* Responsible dependency management.

Avoid unnecessary packages and unjustified architectural complexity.

The repository should be understandable and maintainable by independent contributors.

## K. Deployment

Preferred pipeline:

GitHub → Cloudflare Pages → kalender.rezaprama.com

Use the existing stack unless there is a strong reason to change it.

Provide reliable build configuration, preview deployments, production settings, security headers, cache configuration, and documentation.

Do not expose secrets.

Do not force-push or overwrite unrelated remote changes.

Do not report the site as deployed unless production deployment has been verified.

If credentials or external authorization are unavailable, complete locally testable work and document the exact remaining publishing steps.

## L. Author attribution

Credit Reza Prama Arviandi as project author and maintainer.

Use:

https://rezaprama.com

Include appropriate attribution in the website footer or About section, README, and documentation.

Use a normal crawlable HTML link to the author website without unnecessary nofollow attributes.

Attribution should be visible, tasteful, and consistent with responsible web practices.

Avoid hidden backlinks or manipulative SEO implementations.

## M. Engineering and execution standards

Act as a senior software engineer and critical technical reviewer.

Do not automatically agree with previous architecture or implementation choices.

Evaluate assumptions and identify weak technical decisions.

Preserve what works and correct what does not.

Prefer:

* Data correctness.
* Deterministic behavior.
* Strong typing.
* Modular architecture.
* Accessibility.
* Automated validation.
* Secure defaults.
* Maintainability.
* Performance.
* Low operating costs.

Test important calendar calculations independently.

Use credible evidence rather than assumptions.

Avoid reporting speculative benchmarks as actual measurements.

Implement changes rather than repeatedly discussing plans.

At significant checkpoints, record what has changed and what remains unfinished.

When working with Claude Code, continue executing actionable development tasks unless genuinely blocked by missing credentials, necessary approvals, or inaccessible dependencies.

The permanent priority order is:

**Correctness → Reliability → Accessibility → Usability → Maintainability → Performance → Discoverability → Visual polish.**

The ultimate objective is a production-ready, technically credible, open-source Indonesian calendar platform that users and developers can trust.

# MULTI-CALENDAR EXPANSION

## Product Direction

Kalender Indonesia should evolve into a unified Indonesian multi-calendar platform.

The four principal calendar systems are:

1. Gregorian / Masehi.
2. Islamic / Hijriah.
3. Chinese lunisolar / Tionghoa.
4. Javanese / Jawa.

These systems are culturally and practically relevant to Indonesian users.

The application should allow users to view corresponding dates across calendar systems without maintaining inconsistent or duplicated event databases.

## Canonical Date Architecture

Use ISO/Gregorian civil dates as the common internal representation for date-only records.

Implement independent conversion adapters:

* GregorianCalendar
* IslamicCalendar
* ChineseLunarCalendar
* JavaneseCalendar

These are conceptual module names. Adapt them to the existing repository architecture.

Use a shared conversion interface where technically appropriate.

Represent uncertainty and supported ranges explicitly.

Maintain source provenance separately from mathematical date conversion.

## Gregorian

Provide accurate Gregorian calendar functionality from 1900 through 2100, inclusive.

Gregorian calculations form the stable computational foundation.

## Islamic / Hijriah

Provide Hijri date conversion using a clearly identified and validated calculation method.

Investigate support for:

* Hijri years and months.
* Relevant Islamic observances.
* Ramadan dates.
* Eid-related dates.
* Hijri-to-Gregorian conversion.
* Gregorian-to-Hijri conversion.

Distinguish computed dates from Indonesian official determinations.

Where multiple Hijri conventions are supported, identify them explicitly.

Do not present a single mathematical conversion as universally authoritative.

## Chinese Lunisolar / Tionghoa

Implement validated Chinese lunisolar date conversion.

Investigate:

* Lunar month and day.
* Lunisolar year.
* Leap months.
* Chinese New Year.
* Relevant cultural festivals.
* Chinese zodiac year representations.

Clearly distinguish calendar calculations, cultural celebrations, and Indonesian government holidays.

Validate conversion results against authoritative or independently established references.

## Javanese / Jawa

Implement foundational Javanese calendar functionality:

* Seven-day weekday cycle.
* Five-day pasaran cycle.
* Weton.
* Neptu values where culturally relevant.
* Validated date correspondence.

Investigate a complete Javanese date system, including month and year representations.

Document conversion epochs, methodological assumptions, and differences in traditional conventions.

Do not treat culturally interpretive traditions as scientific predictions.

## User Experience

Keep the Gregorian calendar as the default view.

Support switching to other calendar modes.

Prioritize a practical interface in which users can view the Gregorian date together with corresponding Hijri, Chinese, or Javanese date information.

Avoid displaying all four full calendars simultaneously in the default interface.

Provide detailed information on demand.

## Public API

Design extensible calendar conversion endpoints.

Possible future API capabilities include:

* Gregorian date details.
* Hijri conversion.
* Chinese lunar conversion.
* Javanese date conversion.
* Weton.
* Holiday records.
* Cultural observances.
* Calendar system metadata.

Do not publish unsupported or unverified conversion results.

## Development Sequence

Phase 1: Recover and stabilize the existing Gregorian calendar.

Phase 2: Complete foundational Javanese pasaran and weton calculations.

Phase 3: Introduce validated Hijri conversion.

Phase 4: Introduce validated Chinese lunisolar conversion.

Phase 5: Expand full Javanese date conversion if reliable sources and algorithms are established.

Phase 6: Integrate calendar overlays, cross-calendar navigation, documentation, and public APIs.

This sequence is provisional and should be adjusted after inspecting existing implementations.

Each calendar module should have independent validation requirements and explicit supported date ranges.

Prioritize correctness and user utility over nominal feature completeness.

