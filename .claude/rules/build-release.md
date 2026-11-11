---
paths:
  - "app/tsdown.config.ts"
  - "app/src/index*.ts"
  - "app/src/kit.ts"
  - "app/vite.config.ts"
  - "app/vite-plugin-svg-text.ts"
  - "app/eslint.config.js"
  - "app/.prettierrc.json"
  - "app/package.json"
  - "app/tsconfig*.json"
  - "package.json"
  - ".github/workflows/publish.yml"
---

# Build & release rules

Applies to build/tool configs and the package manifests. Pairs with `.claude/rules/architecture.md`.

- **One tool per job.** `build` = `build:js` -> `build:css`. Vitest runs the tests.
  1. **tsdown** (`app/tsdown.config.ts`, `build:js`): three builds into folders of `../dist/`,
     all minified, target ES2022. SVG files are loaded as text.
     - `src/index.ts` and `src/kit.ts` -> `dist/esm/` (`index.js`, `kit.js` + `.d.ts`) and
       `dist/cjs/` (`index.cjs`, `kit.cjs` + `.d.cts`). Code used by both entries goes to one
       `shared` file per folder (`shared.js` / `.d.ts`, `shared.cjs` / `.d.cts`), with a fixed
       name and no hash (`hash: false`, `codeSplitting` group).
     - `src/index.umd.ts` -> `dist/umd/index.js` (global `DatepickerUI`, used by `unpkg` /
       `jsdelivr`). `src/kit.ts` -> `dist/umd/kit.js` (global `DatepickerUIKit`).
     - The first build cleans `esm/`, `cjs/`, `umd/` and loose files in the `dist/` root. It
       leaves `dist/css/` alone.
  2. **sass** (`build:css`): `index.css`, `main.css` and every file in `src/styles/themes/` ->
     `dist/css/themes/`, compressed, no source maps. A new theme file is picked up
     automatically. Only its `exports` subpath in the root `package.json` has to be added.
  3. **Vite** (`app/vite.config.ts`): the demo only (`npm run dev`, `build:demo`), never the
     library build.
  4. **publint + attw** (`check:package`): validate the root `package.json` and the types each
     `exports` condition resolves to. Run it after `build`. `attw --pack` packs the package
     into a temporary tarball.
- **SVG as text everywhere:** tsdown's text loader and `vite-plugin-svg-text.ts` (Vite + Vitest)
  must stay in sync - source imports SVG files as markup strings.
- **TypeScript stays `~6.0.x`** until typescript-eslint supports TS 7 (its peer range is
  `<6.1.0`). Check that range before bumping.
- **`dist/` is generated - never hand-edit it.** Change configs, not artifacts.
- **Root `package.json` is the public contract:** keep `type`, `exports` (`types` first in each
  condition, `./package.json` exported), `main`/`module`/`types`/`style`, `unpkg`/`jsdelivr`,
  `files` and `sideEffects` (`**/*.css`) accurate. A new theme needs its `exports` subpath.
  Editing `exports` / `sideEffects` / `version` is release-affecting - call it out.
- **Lint and format config:** ESLint rules mirror `.claude/rules/code-style.md` - change both
  together. No `eslint-plugin-prettier` and no `linebreak-style`: Prettier formats, and line
  endings come from `.gitattributes` / `.editorconfig` / Prettier `endOfLine: crlf`.
  `app/.husky/*` must stay LF.
- **Versioning:** the **root `package.json` `version` is the source of truth**. `app/package.json`
  (`datepicker-ui-build`) is the dev workspace - do NOT bump it to the public version.
  SemVer: breaking changes need a major, new features a minor, fixes a patch.
- No new runtime dependencies (zero-dependency promise); dev/build deps must be justified and
  installed by the user.
- Never run `npm publish` or git write ops - propose the version, tag (`vX.Y.Z`), and commit
  message; the user executes.
- **Publishing runs on GitHub** (`.github/workflows/publish.yml`, npm trusted publishing, no
  token). A published GitHub release whose tag equals `v` + the root `version` runs every check,
  builds and publishes; a version with a hyphen goes to the `next` dist-tag. A manual run is a
  dry run. The file name is part of the npm trusted-publisher setup - don't rename it. Full release flow (README + CHANGELOG) is the `/release` skill /
  `build-release` agent.
