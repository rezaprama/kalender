# Release and deployment

Public repository: [rezaprama/kalender](https://github.com/rezaprama/kalender). Production: <https://kalender.rezaprama.com>. Version 1.0.0 notes are in [CHANGELOG.md](../CHANGELOG.md).

## Before merging

Use a pull request into `main`. [CI](../.github/workflows/ci.yml) runs on every pull request and push to `main`:

```bash
npm ci
npm run check    # build, worker/client/browser types, Biome, unit/integration/docs tests
npm run smoke    # exact Wrangler bundle, including Chinese and Umm al-Qura routes
npx playwright install --with-deps --only-shell chromium
npm run e2e      # browser journeys and axe-core accessibility checks
```

Do not rewrite public history. Keep license exceptions, attribution and data provenance with each release. HKO-derived Chinese data, including estimated Imlek dates, is subject to the non-commercial terms in [LICENSE-DATA.md](../LICENSE-DATA.md).

## Production deployment

`wrangler.jsonc` declares Worker `kalender`, its Cloudflare account, static assets in `dist/`, and custom domain `kalender.rezaprama.com`.

Cloudflare Workers Builds is connected to `rezaprama/kalender` on the existing Worker:

- Production branch: `main`.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Root directory: repository root.

The GitHub app connection and build credentials are managed in Cloudflare. They are not committed to the repository. The application itself requires no runtime secrets. For a manual deployment with an existing Wrangler login:

```bash
npm run deploy
```

The default `kalender.rezaprama.workers.dev` hostname is also enabled. Canonical URLs point to the custom domain.

Pages send `Cache-Control: no-transform` to prevent CDN script injection. The Worker negotiates gzip itself because `no-transform` also disables CDN compression. Keep these together to preserve the no-tracking promise and compressed HTML.

## Verify the deployed version

```bash
curl -I https://kalender.rezaprama.com/2026
curl "https://kalender.rezaprama.com/api/v1/holidays?year=2026"
curl "https://kalender.rezaprama.com/api/v1/convert?calendar=islamic&year=1447&month=10&day=1&method=umalqura"
```

The last request should return `"date": "2026-03-20"`. It checks whether the deployed runtime supplies Umm al-Qura ICU data. If unavailable, the API returns 501; tabular Hijri remains available.

To run existing browser tests against production, set `E2E_BASE=https://kalender.rezaprama.com` before `npm run e2e`. Lighthouse scores should identify their URL, device profile and measurement time. Production performance varies with network and CPU conditions; a local score of 100 is not a production guarantee.

## Publish a version

After the pull request and production verification pass, create an annotated tag at the tested `main` commit, push that tag, and create a GitHub release using the matching changelog entry. Never move a published version tag. Keep source history intact.

## Maintain holiday data

[Holiday source monitor](../.github/workflows/monitor.yml) runs daily around **08:00 WIB**. GitHub scheduling can be delayed. It can also be started manually from Actions. Reports are retained for 30 days; identical findings do not repeatedly update the monitor issue.

- When a decree or amendment appears, verify every date, update `data/official/YYYY.json`, and record the evidence in [DATA_SOURCES.md](DATA_SOURCES.md).
- After each Idulfitri/Iduladha isbat, confirm the Kemenag decision before removing `subjectTo: "isbat"`.
- Submit a pull request. The monitor never turns an unverified article into official data automatically.
- Merge after CI. The connected Cloudflare build deploys site and API from the same source.
