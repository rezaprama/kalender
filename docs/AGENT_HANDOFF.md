# Maintenance checkpoint

Date: 21 October 2026 (WIB).

- Public repository: <https://github.com/rezaprama/kalender>.
- Initial release pull request: <https://github.com/rezaprama/kalender/pull/1>.
- Initial release merged to `main` as `8e2ba41`; both the release-branch and main CI runs passed.
- Production Worker: `kalender`, <https://kalender.rezaprama.com>.
- Cloudflare Workers Builds is connected to `rezaprama/kalender`, production branch `main`, build `npm run build`, deploy `npx wrangler deploy`.
- Non-production Git builds use Cloudflare's beta `npx wrangler preview`. `wrangler.jsonc` explicitly includes `previews: {}`; assets and production routes remain at the top level. The Worker has no stateful data bindings or secrets to duplicate.
- Release notes: [CHANGELOG.md](../CHANGELOG.md). Deployment and maintenance: [RELEASE.md](RELEASE.md).

## Verified baseline

- GitHub CI passed on the released branch and `main`: build, worker/client/browser typechecking, lint, 81 unit/integration/documentation tests, 11 bundle smoke checks and 37 browser tests.
- Local dependency audit found zero vulnerabilities. Common secret patterns were checked in all 159 historical blobs; no findings. `internal/` is ignored and untracked.
- Production had 38 successful route/API checks and 37 browser tests, including Umm al-Qura on the Workers runtime.
- Reported production Lighthouse: accessibility, best practices and SEO 100; performance mobile 92-100 and desktop 98-100. These are measurements, not a guarantee.

Daily source monitoring was dispatched successfully in GitHub Actions. Two Setkab feeds were unreachable and are tracked in [issue #6](https://github.com/rezaprama/kalender/issues/6); Kemenko PMK and the cited source pages were checked. The final CI run is the authority for each released commit.

## Data and licensing boundaries

- Gregorian calendar: 1900-2100. Official holiday archive: 2022-2027.
- Earlier holiday archives remain uncurated; future estimates are partial. Nyepi, Waisak and collective leave are not guessed. Future Islamic decrees remain subject to isbat.
- Code: Apache-2.0. Original data curation: CC BY 4.0. Government decisions retain their own rights.
- HKO-derived Chinese data is isolated and subject to non-commercial conditions; see [LICENSE-DATA.md](../LICENSE-DATA.md) and [HKO notice](../third_party/hko/NOTICE.md).
- Javanese dates after 2052 are projections. Hijri tabular conversion is not an isbat ruling. Umm al-Qura requires the runtime self-check.

## Operational details

- Static assets bypass the Worker. HTML pages and API requests use one shared generated dataset.
- HTML carries `no-transform` to prevent CDN script injection; Worker applies gzip itself.
- Source monitoring runs daily around 08:00 WIB. Unchanged action findings do not repeatedly notify. Curators verify decrees before changing official data.
- `wrangler dev` works locally after the official Windows VC++ x64 runtime installation. No runtime credentials are stored in the project.
- Public history is preserved. The original brief still exists in the first commit and was checked before publication.

## Documentation and attribution policy

- Both READMEs have a visual introduction, desktop/mobile calendar captures, routes for visitors and developers, runnable API examples, embed instructions, and explicit data/license boundaries.
- Owner requested no further Claude contributor attribution. `.claude/settings.json` disables commit/PR/session-link attribution. `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md` require human authorship and preserve legal notices.
- `npm run hooks:install` enables the checked-in commit-message hook in each clone; already installed in this checkout. The required CI job checks every new commit's author, committer, and attribution trailers, including intermediate PR commits. Existing history and `v1.0.0` remain intact.
- GitHub's contributors API returned only `rezaprama` during this change. Eleven old commits still contain Claude co-author trailers; removing them would rewrite published history and is outside the chosen prevention approach.
- Local `npm run check` passes with 83 tests, including attribution policy and executable documentation examples. The pull request CI remains the authority for the merged version.
- During this change, Cloudflare's first Preview build timed out before initialization. Later builds used legacy `npx wrangler versions upload` and failed the Worker identity check. **Previews Base** and existing branch Previews have separate build configurations. Both the base and this branch's **Settings → Builds → Preview command** were explicitly set to `npx wrangler preview`. Retry from the branch Preview's own build page.
