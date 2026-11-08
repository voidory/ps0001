# PS0001 — LoopLab

The canonical application lives in **[`looplab/`](looplab/)**. Its own package manifest, lockfile, source, tests, compiler and Vite configuration belong together. The repository root is only the entry point for documentation, command shortcuts and GitHub Actions; do not build the old root scaffold.

## Run locally

Requires Node 22 and Python 3.12. From the repository root:

```sh
npm run setup
npm run dev
```

Or work directly in the application:

```sh
cd looplab
npm ci
npm run dev
```

Root commands delegate to `looplab/`; they do not install or compile a second application.

## Verify

```sh
npm run test:python
npm run build
npm run lint
npm test
cd looplab
npx playwright install --with-deps chromium
npm run test:e2e
```

Production output is **`looplab/dist/`**, not root `dist/`. The catalogue is generated during the build rather than committed. See [application instructions](looplab/README.md), [architecture](looplab/docs/ARCHITECTURE.md), [known limitations](looplab/docs/LIMITATIONS.md), and [reconciliation checks](looplab/docs/PAGES-SETUP.md).

## Publish with GitHub Pages

1. Open [Settings → Pages](https://github.com/voidory/ps0001/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. Do not select a branch/folder source.
3. Open [Actions → Verify and deploy LoopLab](https://github.com/voidory/ps0001/actions/workflows/pages.yml). A push to `main` starts it; **Run workflow** can also start it manually.
4. Wait for both **verify** and **deploy** to succeed. Use the URL shown on the deployment or the Pages settings screen.

The expected default project address is https://voidory.github.io/ps0001/ (unless a custom domain is configured). Source files being present does **not** mean the site is live.

The workflow installs `looplab/package-lock.json`, runs Python verification, builds, lints, runs unit/storage and Chromium browser tests, then uploads **only the contents of `looplab/dist/`**. It does not publish the `looplab/` source directory as the site. Vite uses a relative asset base, and a production browser test checks `/ps0001/` hosting.

Enabling Pages or approving the `github-pages` environment may require a repository administrator. If a run fails, inspect its failing step rather than switching to branch-based publishing.
