# Repository reconciliation and Pages preparation

## Canonical layout

`looplab/` is the application root, including its lockfile. `.github/workflows/pages.yml` runs shell commands in that directory and uploads `looplab/dist` as the Pages artifact root. Root npm scripts are explicit delegates; old duplicate root scaffold configurations are retired. No application files need to move, and the public URL does not acquire a `/looplab/` segment.

`defaults.run.working-directory` only affects shell steps. All action input paths are therefore explicitly repository-relative: `looplab/package-lock.json`, `looplab/dist/`, `looplab/public/catalogue/manifest.json` and `looplab/playwright-report/`.

## Fresh checks on 8 November 2026

The uploaded application at source commit `2597de2f86bf0171fc2b62608d19a6ef98918aef` was cloned afresh, not recovered from the prior sandbox. The following actually ran:

- `npm ci --no-audit --no-fund`: succeeded using the uploaded lockfile.
- `npm run test:python`: five tests passed.
- `npm run build`: succeeded, including catalogue generation and TypeScript checks.
- `npm run lint`: passed.
- `npm test`: 60 tests passed (46 domain and 14 storage).
- `npm run test:e2e`: 11 Chromium tests passed, including `/ps0001/` hosting, both themes, mobile accessibility, mock expiry, persistence and backup handling.

These are local results on the uploaded code. They are not a claim that the GitHub Actions run or live Pages deployment has already succeeded. Firefox/WebKit are not newly certified here; existing application limitations remain in `LIMITATIONS.md`.

## Administrator step

In repository Settings → Pages, choose GitHub Actions as the publishing source. The workflow verifies before deployment, uses GitHub's Pages artifact and OIDC deployment, and exposes the actual deployment URL through the `github-pages` environment. It deliberately does not enable Pages automatically or assume administrative access.

Expected default URL: `https://voidory.github.io/ps0001/`, unless repository settings define a custom domain. Publish only the generated bundle; do not serve TypeScript source or a repository-folder listing.
