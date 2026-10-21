# Release and deployment

Version: **1.0.0** (`package.json`). Release notes: [CHANGELOG.md](../CHANGELOG.md).

## Pre-release checklist

All of these run locally without credentials:

```bash
npm ci
npm run check    # build, typecheck, lint, 78 unit/integration/docs tests
npm run smoke    # wrangler dry-run bundle + smoke test of that exact bundle
npm run e2e      # Playwright journeys + axe-core WCAG 2.2 AA (needs Playwright Chromium)
npx tsx scripts/audit.ts
npx tsx scripts/monitor.ts   # needs internet; read-only
```

## 1. Publish the repository (owner action)

The local repository has no remote yet. Development happened on `feat/kalender-completion`.

```bash
git remote add origin https://github.com/rezaprama/kalender.git
git push -u origin main
git push -u origin feat/kalender-completion
```

Then open a pull request from `feat/kalender-completion` into `main`. CI (`.github/workflows/ci.yml`) runs check, smoke and e2e. Repository settings to review:

- Enable private vulnerability reporting (Security tab). `SECURITY.md` points to it.
- Optionally protect `main` and require the CI check.
- Issues must be enabled for the monitor workflow. It creates the `monitor` label itself.

## 2. Deploy to Cloudflare Workers (owner action)

`wrangler.jsonc` already declares the Worker `kalender`, account `8c6e301847c1759dfb870b149faa05be`, static assets in `dist/` and the custom domain `kalender.rezaprama.com`.

**Option A: Workers Builds (recommended, no secrets in GitHub).** In the Cloudflare dashboard go to Workers & Pages → Create → Import a repository, choose `rezaprama/kalender`, then set:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

Every push to `main` then builds and deploys. Pull requests get preview builds.

**Option B: from a terminal.** Run `npx wrangler login` once, then `npm run deploy`, which runs check and then `wrangler deploy`.

**Custom domain.** `routes: [{ pattern: "kalender.rezaprama.com", custom_domain: true }]` makes Cloudflare create the DNS record and certificate on first deploy, provided the `rezaprama.com` zone is in the same Cloudflare account. If the zone lives elsewhere, add the domain manually under Workers → kalender → Settings → Domains & Routes.

**Secrets and environment.** None. The Worker reads no secrets or environment variables. CI needs none: the monitor uses the built-in `GITHUB_TOKEN` with `issues: write` only.

`workers_dev: true` also serves the site at `kalender.<account>.workers.dev`. Canonical URLs point to `kalender.rezaprama.com`. Set it to `false` if the extra hostname is not wanted.

## 3. After deployment, verify

```bash
curl -sI https://kalender.rezaprama.com/2026 | grep -iE "content-security-policy|strict-transport|cache-control"
curl -s "https://kalender.rezaprama.com/api/v1/holidays?year=2026" | head -c 300
curl -s "https://kalender.rezaprama.com/api/v1/convert?calendar=islamic&year=1447&month=10&day=1&method=umalqura"
```

The last command checks that the Workers runtime has ICU calendar data. Expect `"date": "2026-03-20"`. If it returns error 501 instead, Umm al-Qura is unavailable but everything else still works: tabular Hijri does not use ICU.

Then run Lighthouse and PageSpeed Insights against the live URL. The 100 scores so far were measured on the local Node preview only.

## Yearly maintenance

- **September–October:** the monitor opens an issue when the next SKB appears. Add `data/official/YYYY.json` with sources and `declared` counts, then record the evidence in `docs/DATA_SOURCES.md`.
- **After each isbat** (Idulfitri, Iduladha): confirm the date and remove `subjectTo: "isbat"`. The monitor reminds you once the date has passed.
- **Before 2033:** nothing to do. The HKO table already includes the leap 11th month of 2033.
