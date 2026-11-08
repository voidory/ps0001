# LoopLab

A browser-local trainer for short numerical Python implementation questions. Read a supplied mathematical rule, write and run Python in your own environment, then submit its numerical answer. No code execution, accounts, telemetry, backend, runtime AI or external font/CDN dependency.

## Run

Requires Node 22 and Python 3.10+ (POSIX recommended for the verifier's memory limit).

```sh
npm ci
npm run dev
```

## Verify and build

```sh
npm run test:python
npm run build
npm run lint
npm test
npx playwright install --with-deps chromium
npm run test:e2e
```

`npm run build` compiles the original catalogue, independently verifies arithmetic and executes every displayed Python solution, type-checks TypeScript and emits `dist/`. `public/catalogue/manifest.json` records counts and SHA-256 hashes. The generated catalogue and dist are build products, not private source PDFs. To test all three engines:

```sh
npx playwright install --with-deps chromium firefox webkit
LOOPLAB_ALL_BROWSERS=1 npm run test:e2e
```

The browser suite uses a small static server that serves the production bundle at both `/` and `/ps0001/`. `LOOPLAB_CHROMIUM=/absolute/path/to/chrome` is an optional executable override for constrained environments.

## Included

- Twelve original template families, 2,770 verified renderings, exact BigInt integer grading.
- Three difficulty bands, manual topic selection and transparent coverage/weak-area practice.
- Three progressive hints, explicit solution reveal, actual executable Python and compact state traces.
- Four supplemental repair patterns; saved question history and conservative first-try evidence labels.
- Four-question paper-shaped and mixed-transfer mocks; absolute optional expiry, navigation, flags, no pre-finalisation grading UI and frozen results.
- Practice/holdout group isolation; P2 has ten tolerance groups and only two holdout groups. Exposed-content reuse is labelled rehearsal.
- IndexedDB transactions, one-writer lease, idempotent commands, immutable snapshots, drafts and staged JSON replace-restore.
- Local fonts and KaTeX, light/dark modes, 360px layouts, keyboard navigation and accessible math alternatives.

## GitHub Pages

In repository **Settings → Pages**, choose **GitHub Actions** as the source. `.github/workflows/` verifies the code, uploads the production bundle and deploys `dist/` after a successful main-branch run. The Vite relative base supports the repository subpath. No deployment has been claimed merely because source was pushed; inspect the Actions run and Pages environment.

## Actual validation

See `docs/VERIFICATION.md` for executed test results and `docs/LIMITATIONS.md` for remaining scope and acceptance gaps. A numerical answer is not proof of Python proficiency, independent authorship or exam readiness. Static assets contain answers; this is not a secure examination system.
