# Verification record — 8 November 2026

These are executed results from the rebuild, not inherited claims from earlier responses.

| Check | Result |
|---|---|
| Catalogue compilation | 2,770 approved; every displayed Python solution executed in a separate `python -I -S` process |
| Independent Python suite | 5 tests passed, including 1,000 extra deterministic draws for each non-P2 family |
| TypeScript strict typecheck | Passed |
| ESLint | Passed |
| Vitest domain/storage | 60 tests passed |
| Chromium production E2E | 11 tests passed |
| Mobile axe | No violations in tested light/dark practice views at 360px |
| Keyboard/200% text-size check | Passed automated navigation and no-page-overflow checks |
| Floating pool | All 270 P1/P2 renderings matched approved indices in TypeScript/Chromium |
| Root and /ps0001/ hosting | Passed production browser checks |
| Firefox/WebKit attempt | Blocked before browser launch by missing native GTK/WebKit dependencies; NOT passed |

The 11 Chromium tests cover reveal gating and answer syntax, exact draft reload and escaped scratchpad, no-feedback mock editing/finalisation, timer expiry/reload, export and staged import, corrupt import, writer takeover after lease expiry, mobile accessibility, keyboard/text enlargement, all floating items and subpath hosting.

Generated Python uses a two-second per-instance timeout, Python isolation flags and a 128 MiB POSIX address-space limit. It is trusted repository code only, never learner input. Full content hashes and chunk hashes are checked again on browser load. Node and browser engines independently check the approved numerical values. V1 does not claim human editorial approval of each individual question.

Initial test failures were repaired: duplicate unlabeled complementary landmarks, inaccessible formula scrolling, unrealistic instant tab-lease release expectation, and subpath test hosting. Dark-mode contrast tests wait for the colour transition to finish. Firefox/WebKit native dependency failures remain explicitly unresolved in this environment.
