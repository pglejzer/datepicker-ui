---
paths:
  - "app/tsdown.config.ts"
  - "app/vite.config.ts"
  - "app/vite-plugin-svg-text.ts"
  - "app/eslint.config.js"
  - "app/.prettierrc.json"
  - "app/package.json"
  - "app/tsconfig*.json"
  - "package.json"
---

# Build & release rules

Applies to build/tool configs and the package manifests. Pairs with `.claude/rules/architecture.md`.

- **One tool per job:** `tsdown` -> ESM + CJS + `.d.ts` / `.d.cts` and the UMD bundle
  (minified, ES2022); `sass` CLI -> CSS (index, main, every theme file); Vite -> demo only, never
  the library build; Vitest -> tests. `build` = `build:js` -> `build:css`; `check:package`
  (publint + attw) validates the result.
- **SVG as text everywhere:** tsdown's text loader and `vite-plugin-svg-text.ts` (Vite + Vitest)
  must stay in sync - source imports SVG files as markup strings.
- **TypeScript stays `~6.0.x`** until typescript-eslint supports TS 7 (its peer range is
  `<6.1.0`). Check that range before bumping.
- **`dist/` is generated - never hand-edit it.** Change configs, not artifacts.
- **Root `package.json` is the public contract:** keep `type`, `exports` (`types` first in each
  condition, `./package.json` exported), `main`/`module`/`types`/`style`, `unpkg`/`jsdelivr`,
  `files` and `sideEffects` (`**/*.css`) accurate. A new theme needs its `exports` subpath.
  Editing `exports` / `sideEffects` / `version` is release-affecting - call it out.
- **Lint and format config:** ESLint rules mirror `CLAUDE.md` "Coding Conventions" - change both
  together. No `eslint-plugin-prettier` and no `linebreak-style`: Prettier formats, and line
  endings come from `.gitattributes` / `.editorconfig` / Prettier `endOfLine: crlf`.
  `app/.husky/*` must stay LF.
- **Versioning:** the **root `package.json` `version` is the source of truth**. `app/package.json`
  (`datepicker-ui-build`, 1.0.0) is the dev workspace - do NOT bump it to the public version.
  Pre-1.0: breaking changes go in a minor (`0.x.0`), fixes in a patch.
- No new runtime dependencies (zero-dependency promise); dev/build deps must be justified and
  installed by the user.
- Never run `npm publish` or git write ops - propose the version, tag (`vX.Y.Z`), and commit
  message; the user executes. Full release flow (README + CHANGELOG) is the `/release` skill /
  `build-release` agent.
