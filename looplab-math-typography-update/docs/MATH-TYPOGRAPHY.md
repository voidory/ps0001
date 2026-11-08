# Mathematical rendering and typography update

## What was wrong

The application rendered the main supplied rule with KaTeX, but displayed the prompt, small checks, hints, trace headings and repair drills as ordinary React text. This exposed notation such as `u_12`, `A^19`, ASCII inequalities and Python-like tolerance expressions. A separate “Plain-text rule” disclosure also printed raw TeX. The old `throwOnError: false` option could show invalid TeX as source.

## What changed

- Shared mathematical rendering handles inline and display expressions, with HTML for visual output and MathML for assistive technology.
- All twelve question families have mathematical presentation equivalents of the original prompts, including matrices, full multi-digit indices and powers, absolute error tolerances and exact strict/inclusive inequalities.
- Small checks, hints, worked explanations, trace headings, scientific notation in trace cells, repair drills, active mocks and finalized mock reviews use the same presentation layer. Finalized mock reviews also show their supplied mathematical rule.
- The raw-TeX disclosure is removed. Invalid/unsupported mathematics produces an explicit report message, not a raw source fallback. KaTeX has trust disabled, expansion/size limits and strict parsing; general prose is escaped by React.
- DM Sans remains the calm, readable interface face. Self-hosted JetBrains Mono is used for code, scratchpads, exact answers and trace values. Programming ligatures are disabled so Python operators remain visibly literal. KaTeX's own mathematical fonts are preserved: mathematical layout relies on those metrics.
- Mobile equations retain readable sizing and scroll horizontally inside their own region rather than overflowing the page. A mobile hint explains scrolling and keyboard access.

## Data compatibility

This is a presentation-layer change. The catalogue compiler, question content, item IDs/hashes, grading logic, saved snapshots and storage format are unchanged. Existing attempts and drafts do not require migration. Python source, student scratchpads and exported `.py` files are never passed through mathematical conversion. Presentation equivalents must be updated alongside future template changes; regressions cover all current twelve families.

## Fresh local validation

Based on repository commit `107ca1bbc73944ddce78143b58ad32ce52c05985`:

- Production build and TypeScript compilation passed.
- ESLint passed.
- Five independent Python/compiler tests passed.
- Eighty unit/domain/storage/presentation tests passed, including strict KaTeX parsing of formulas and mathematical text across all 2,770 approved question renderings.
- Seventeen Chromium production browser tests passed, including all twelve families, mock/review screens, persisted questions, both themes, font loading, unchanged Python operators, 360px layouts, keyboard/zoom, automated accessibility and `/ps0001/` subpath hosting.
- Desktop matrix and mobile series screenshots were visually reviewed.

These are local results, not a claim of a completed GitHub push or deployment. Firefox/WebKit were not rerun. This session could read the public repository but could not authenticate a GitHub write.

## Install into the existing repository

Extract the update ZIP outside the repository. Copy/drag its `looplab` folder into the **root of `voidory/ps0001`**, replacing the matching files, preserving every other existing file. Do not place it inside the existing `looplab` folder (that would create `looplab/looplab`). Commit to `main`; the existing Pages workflow will rebuild and deploy after its checks pass.

A separate patch is also supplied for terminal users. From the repository root, apply with `git apply --check /path/to/looplab-math-typography.patch`, then `git apply /path/to/looplab-math-typography.patch`. Commit and push the resulting source changes. Use either the ZIP overlay or the patch, not both.
