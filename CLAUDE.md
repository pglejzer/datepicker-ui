# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## HARD RULES — local only, subagents only write code

These bind the main session, every subagent (`.claude/agents/*`, `general-purpose`, `Explore`,
workflow agents, any `Agent`/`Task` dispatch) and every skill. They override any agent or skill
text that says otherwise.

1. **Local only.** Never run anything that publishes, deploys or changes remote state:
   `npm publish` / `unpublish` / `deprecate` / `dist-tag` / `version` / `login` / `adduser` /
   `token` / `owner` / `access`, `vercel` (any deploy), `git push` or remote tags, `gh` write
   operations (`release`, `pr create`, `pr merge`, ...). Releases are proposed; the user runs them.
   Local work in the main session is fine: `npm pack`, builds, dev servers, tests.
2. **Subagents only read and edit files.** A subagent never runs: git of any kind, builds
   (`build`, `build:*`, `tsdown`, `sass`, `vite build`), lint / ESLint / Prettier, tests /
   Vitest (not even one focused spec), typecheck / `tsc`, dev servers (`npm run dev`),
   `check:package` (publint / attw), browsers or browser MCP, tooling
   audits (axe, Lighthouse), spec review or code review. It reports which commands, specs and
   demo sections the main agent should run. A subagent's claim that it ran any of these is
   untrusted — ignore it. Project agents (`.claude/agents/`) have no Bash tool at all; files they
   create with Write come out LF and the main agent converts them to CRLF at the end.
3. **Verification and review belong to the main agent, once, at the end** — never per task,
   never inside a subagent: focused or full Vitest, lint, typecheck, builds, browser checks, and any spec
   or code review (do not dispatch review subagents). This includes plugin workflows (maister,
   superpowers): their test-runner / verifier / reviewer subagents are not used here — the main
   agent does that work itself.
4. **Dispatch contract.** Every subagent prompt starts with: "Read `CLAUDE.md` in the repo root
   first and obey its HARD RULES." and names the `.claude/rules/*.md` file(s) for the area it edits.
5. **End-of-task browser check, only where a change can break something.** When a task
   changed library behavior or styles in `app/src/`, the main agent checks it in the demo
   (`npm run dev`, `http://localhost:8006`) after the owning agents have reported and before
   handing back to the user: open the affected demo sections, click through what changed, look
   at console errors, and say what was checked in the report. Skip it for `.claude/` or docs
   work and copy / typo / comment edits, and when the user says so.
6. **Git — read-only, and only in the main agent.** Subagents never run git of any kind (not
   even `status` / `diff`). The main agent may read (`status`, `diff`, `log`, `show`,
   `ls-files`, `rev-parse`, `diff --no-index`) but never mutates the
   repository — `add`, `commit`, `push`, `checkout`, `switch`, `branch`, `merge`, `rebase`,
   `reset`, `restore`, `stash`, `tag`, `clean`, `cherry-pick`, `worktree`, `rm`, `mv` — unless
   the user explicitly asks for that one operation; an earlier approval never covers later runs.
   The default end state of any task or plan: files edited, nothing staged, nothing committed,
   user informed — the user commits manually.
7. **Packages are the user's job.** Never run `npm install` / `npm ci` / `npm uninstall` /
   `npm update` / `npm audit fix` (in any folder) and never
   edit `dependencies` / `devDependencies`. When `node_modules` is missing or a package is
   needed, propose the exact command and wait for the user to run it (supply-chain risk:
   install scripts and transitive dependencies run with your privileges).

## What This Is

`datepicker-ui` — a zero-dependency, framework-agnostic, SSR-safe date picker written in
TypeScript, inspired by Material Design 3 and the companion of `timepicker-ui`. Published to npm
as `@pglejzer/datepicker-ui` (version `1.0.0`, stable API). Stage 1 of
the rewrite is done (`docs/superpowers/specs/2026-10-17-datepicker-rewrite-design.md`, plans in
`docs/superpowers/plans/`): single date, docked / modal / inline, typed input, month / year
selection, month paging, light / dark `basic` theme. Stage 2 added range (docked, dialog,
full-screen below 600 px, inline), multiple dates, the calendar / input view switch, the opt-in
input mask, `isDateDisabled`, `disabledWeekdays` and `decorateDate`. Stage 3 added every theme
(m3-green, the timepicker-ui themes, blueprint), `ui.colorScheme: "auto"` detection and
`ui.fullscreen`. Stage 4 added the published README, tests for the remaining gaps and the
`calendar.locale` / `ui.format` validation, and made the calendar ↔ input switch overlap like M3.
Stage 5 (`docs/superpowers/plans/2026-10-17-stage-5-months-presets-fields-precision.md`, all
opt-in) added:
- several months side by side (`calendar.months`, `calendar.pageBy`; docked / inline only);
- range presets (`calendar.range.presets`) and two Start / End fields (`ui.endInput`);
- month / year pickers (`calendar.precision`) and `ui.startView`;
- `ui.fixedWeeks`, and inert outside days (`ui.outsideDays: { selectable: false }`);
- per-day content (`calendar.renderDate`) and field validation (`calendar.validate`);
- `error` reasons for unavailable dates.

Hooks for companion packages (2026-10-19; see §12a of
`docs/superpowers/specs/2026-10-19-datetimepicker-design.md`):
- `setActiveEnd(end)` lets a parent choose which end of a range the next pick sets, without
  `ui.endInput`.
- The second entry `@pglejzer/datepicker-ui/kit` (`app/src/kit.ts`) re-exports the surface hosts,
  `resolveSurfaceMode` / `isFullscreenRange`, the color-scheme detection and the date text helpers.
  Everything it exports is public API.

**Sister project.** `timepicker-ui` (`C:\Users\pglejzer\Desktop\timepicker-ui`) uses the same
architecture and is the reference. Its 5.0 API (renamed options, `setOptions()`, removed legacy
names) is the target for this library, so new work here must not reintroduce what timepicker 5.0
removes — see `.claude/rules/architecture.md` §6.

## Repository Layout

```
app/                    ← ALL source, build, demo and test work happens here
  src/
    datepicker/         ← DatepickerUI, CoreState, Managers, Lifecycle
      lifecycle/        ← Lifecycle internals: session, actions, value, navigation, options,
                          instance, callbacks, triggers, host, context
      options/          ← option defaults, merge, resolve (-> ResolvedOptions), validation helpers
    managers/           ← ValidationManager, ThemeManager, DisplayManager, InputManager,
                          TriggerManager, FormManager (see .claude/rules/architecture.md §2)
      calendar/         ← MonthModel, GridKeyboard, GridRenderer, CalendarView + view/* modules
      swipe/            ← MonthPager + drag / wheel gesture, page strip, slide animator
      pickers/          ← month menu, year menu, year grid, date input panel + text field
      range/            ← RangeView, vertical month list, range grid context, month bounds
      renderers/        ← surface hosts (PopoverHost, DialogHost, InlineHost), docked / modal /
                          range shells, container transform + ghost snapshot, anchor / fallback
                          positioning,
                          outside-pointer
    utils/              ← EventEmitter, date/* (PlainDate, parse, format, Intl, mask),
                          selection/* (Selection model, pick, constraints, text, value, headline),
                          surface, dom, motion, popoverLayout, scrollLock, ripple, taskQueue,
                          accessibility, node
    types/              ← options.ts (option groups + JSDoc), types.ts (public events, DateValue),
                          internal.ts (InternalEventMap, PickerActions), date.ts, images.d.ts
    typings/            ← svg.d.ts
    constants/          ← timings.ts (TIMINGS, GESTURE, EASING), constants.ts, icons.ts (SVG imports)
    styles/             ← SCSS: index.scss, main.scss, base/, components/, themes/
  assets/               ← SVG icons (imported as text)
  docs/                 ← local demo page (index.html + index.ts + styles), served by Vite;
                          uses the Tailwind CDN and Prism on purpose (maintainer's playground)
  tests/                ← Vitest: setup.ts, helpers/, ssr-safety.test.ts, unit/** mirroring src
  .husky/pre-commit     ← runs lint-staged (LF line endings, see .gitattributes)
  tsdown.config.ts      ← JS build (ESM + CJS + .d.ts, and UMD → ../dist/)
  vite.config.ts        ← demo dev server (root: docs, port 8006) and demo build (→ dist-demo/)
  vitest.config.ts      ← test config (jsdom, setup, coverage)
  vite-plugin-svg-text.ts ← loads .svg imports as markup strings (Vite + Vitest)
  eslint.config.js      ← ESLint flat config (typescript-eslint strict, type-aware)
  .prettierrc.json      ← Prettier (defaults + CRLF)
  tsconfig.json         ← src, tests, docs (no Node types)
  tsconfig.node.json    ← config files (Node types)
docs/superpowers/       ← rewrite spec (specs/) and stage plans (plans/)
package.json            ← the published manifest (@pglejzer/datepicker-ui)
dist/                   ← generated output (esm/, cjs/, umd/, css/), never edit
.github/workflows/      ← ci.yml (lint, format, typecheck, test, build, package check), CodeQL
```

## Commands

**All commands run from the `app/` directory.** Node version: `.nvmrc` (24). `node_modules` and
`package-lock.json` are not committed — when `node_modules` is missing, ask the user to run
`npm install` (HARD RULES §7).

```bash
cd app

# Dev server (demo from app/docs on http://localhost:8006)
npm run dev
npm run build:demo                      # static demo → app/dist-demo/
npm run preview                         # serve the built demo

# Build
npm run build                           # build:js → build:css (full production build)
npm run build:js                        # tsdown: ESM + CJS + .d.ts + UMD
npm run build:css                       # sass: index.css, main.css, themes/*.css
npm run check:package                   # publint + are-the-types-wrong on the root package

# Quality
npm run lint                            # ESLint (lint:fix to autofix)
npm run format:check                    # Prettier (format to write)
npm run typecheck                       # tsc for src/tests/docs and for config files

# Test
npm test                                # all tests (Vitest, single run)
npm run test:watch                      # watch mode
npm run test:coverage                   # with v8 coverage
npx vitest run tests/ssr-safety.test.ts # single file
npx vitest run -t "should render"       # single test by name
```

A `pre-commit` hook (husky, installed by `npm install` through `prepare`) runs lint-staged:
ESLint `--fix` and Prettier on staged files.

### Current state — known gaps

Agents must not assume these work; fixing them is a separate task the user starts.

- A docked popover can still overflow when neither side has room for it: it opens on the side
  with more room (`position-try-order: most-height` or the JS fallback), and `auto` switches to
  modal below 480 px height, but a forced `docked` on a tiny window is not capped.

## Architecture

Composition (DatepickerUI / CoreState / Managers / Lifecycle), the manager contract and the
managers, the two event buses, the option groups, display modes, the timepicker 5.0 naming
target and the working agreement are in `.claude/rules/architecture.md`, which loads in every
session. The sections below cover what that file does not.

### Build pipeline

1. **tsdown** (`app/tsdown.config.ts`, `build:js`) — three builds into folders of `../dist/`, all
   minified, target ES2022. SVG files are loaded as text.
   - `src/index.ts` and `src/kit.ts` → `dist/esm/` (`index.js`, `kit.js` + `.d.ts`) and
     `dist/cjs/` (`index.cjs`, `kit.cjs` + `.d.cts`). Code used by both entries goes to one
     `shared` file per folder (`shared.js` / `.d.ts`, `shared.cjs` / `.d.cts`): a fixed name
     with no hash (`hash: false`, `codeSplitting` group).
   - `src/index.umd.ts` → `dist/umd/index.js` (global `DatepickerUI`, used by `unpkg` /
     `jsdelivr`).
   - `src/kit.ts` → `dist/umd/kit.js` (global `DatepickerUIKit`).
   - The first build cleans `esm/`, `cjs/`, `umd/` and loose files in the `dist/` root. It
     leaves `dist/css/` alone.
2. **sass** (`build:css`) — `index.css`, `main.css` and every file in `src/styles/themes/` →
   `dist/css/themes/`, compressed, no source maps. A new theme file is picked up automatically;
   only its `exports` subpath in the root `package.json` has to be added.
3. **Vite** (`app/vite.config.ts`) — only the demo (`npm run dev`, `build:demo`), never the
   library build.
4. **publint + attw** (`check:package`) — validate the root `package.json` and the types each
   `exports` condition resolves to. Run it after `build`.

### CSS and theming

- Block `dp-ui`, BEM elements `dp-ui__*` (`dp-ui__container`, `dp-ui__date`,
  `dp-ui__text-button--confirm`), modifiers `--*` (`dp-ui__date--selected`,
  `dp-ui__container--docked|modal|inline`). Exact contract: Contract C2 in
  `docs/superpowers/plans/2026-10-17-stage-1-foundation.md`; detail in `.claude/rules/styling.md`.
- SCSS source: `app/src/styles/` — tokens in `base/_tokens.scss` (`--dp-ui-sys-*` M3 roles with
  `light-dark()`, component tokens `--dp-ui-*`), component rules in `components/`, one standalone
  file per theme in `themes/`. `main.scss` is the core; `index.scss` = core + every theme (as in
  timepicker-ui), so `ui.theme` works with the default `index.css`.
- `data-color-scheme` is always written on the host and surface root: `ui.colorScheme` `light` /
  `dark`, or for `auto` the result of `utils/colorScheme.detectColorScheme` (the background
  behind the input, then the page's `color-scheme`, then the OS); inline pickers re-detect when
  the page switches modes.
- No `@layer`: layered library CSS lost to unlayered page resets (Tailwind preflight). Base reset
  selectors use `:where()` so component rules win.
- Themes: `basic` (light + dark), `blueprint` (follows `colorScheme`), and one-version themes
  `m3-green`, `crane`, `crane-straight`, `m2`, `glassmorphic`, `pastel`, `ai`, `cyberpunk`.
  A theme only sets tokens under
  `:is(.dp-ui, .dp-ui__dialog, .dp-ui__container)[data-theme="…"]`; one-version themes pin
  `color-scheme`. The `--tp-*` → `--dp-ui-*` mapping is contract T2 in
  `docs/superpowers/plans/2026-10-17-stage-3-themes.md`.

### DOM structure

`DatepickerUI` accepts an `<input>` or an element that contains one. A bare `<input>` is wrapped
in a new `<div class="dp-ui">` host; otherwise its parent becomes the host. The surface root is
`.dp-ui__container` with `--docked`, `--modal` or `--inline`:

- docked: a `popover="manual"` element inside the host (`data-positioning`, `data-placement`,
  `--dp-ui-anchor-name`).
- modal: a `<dialog class="dp-ui__dialog">` opened with `showModal()`, appended to `ui.appendTo`
  or the host.
- inline: rendered into `ui.inline.container`, stays mounted.

Inside: header, `div.dp-ui__calendar` with the month pager (`dp-ui__pager--swipe|--dragging`),
weekday row, `table` days (`td.dp-ui__date[data-date]` ISO + `span.dp-ui__date-indicator`),
month / year menus (`dp-ui__container--menu-open`), the year grid
(`dp-ui__navigation--year-grid`), footer actions and a visually hidden live region. Built by
`managers/calendar/` and `managers/renderers/`.

Range (`calendar.mode: "range"`, `managers/range/`) adds `--range` (and `--fullscreen` for a
modal below 600 px): header `dp-ui__header--range` (full-screen top bar with
`dp-ui__icon-button--close` and `dp-ui__text-button--save`), `div.dp-ui__range` with the weekday
bar `dp-ui__weekdays-bar` and the vertical `dp-ui__month-list` (one table per month with a visible
`caption.dp-ui__month-subhead`). Day cells add `--range-start` / `--range-end` / `--in-range`,
decoration classes and `span.dp-ui__date-badge`. The input view (`dp-ui__icon-button--switch-view`,
single modal and every range) shows `div.dp-ui__input-panel` with `dp-ui__text-field` inputs
and sets `--input`; `--morphing` marks the container transform, during which an inert
`dp-ui__ghost` clone of the old view fades out inside the resizing container. Contract S4 in
`docs/superpowers/plans/2026-10-17-stage-2-selection-modes.md`.

Stage 5 additions (contract in the stage-5 plan):
- **Day content.** Day cells may hold `span.dp-ui__date-content` and get `--has-content`.
- **Inert outside days.** They are `--outside-month.--disabled`.
- **Month grid.** `div.dp-ui__month-selection` (modal adds the `dp-ui__navigation--month-grid`
  row). Month / year precision hide the docked header groups.
- **Several months.** The container gets `--multi-month` and an inline `--dp-ui-visible-months`.
  Pages are `div.dp-ui__months` with N captioned grids. A range row uses
  `dp-ui__navigation--months` instead of the vertical list.
- **Presets.** `div.dp-ui__presets[role=group]` > `button.dp-ui__preset[aria-pressed]`. They form
  a column with `--presets`, otherwise a chip row.
- **Split fields.** With `ui.endInput` the page input being edited gets `dp-ui__input--active`.

### Testing conventions

- Vitest (`app/vitest.config.ts`), jsdom environment, no globals: import `describe` / `it` /
  `expect` / `vi` from `vitest`. A spec that must run without a DOM uses the
  `// @vitest-environment node` docblock.
- CSS/SCSS imports need no mock (Vitest does not process CSS); SVG imports load as strings
  through `vite-plugin-svg-text.ts`, like in the real build
- `app/tests/setup.ts`: jest-dom matchers and polyfills for what jsdom lacks — `<dialog>`
  (`data-test-modal`), the Popover API (`data-test-popover-open` plus a style forcing open
  popovers to `display: block !important`, since jsdom 30 hides `[popover]` and then refuses
  focus), `Element.animate`, pointer capture, `matchMedia`, `ResizeObserver`, `crypto.randomUUID`,
  rAF via `setTimeout`, `Touch` / `TouchEvent`, `scrollIntoView`, `scrollTo`. Shared helpers in
  `tests/helpers/{picker,viewport}.ts`. ESLint relaxes `no-empty-function` in tests.
- Path alias: `@/` → `app/src/`
- New tests mirror the source tree under `tests/unit/` (`tests/unit/managers/DisplayManager.test.ts`
  tests `src/managers/DisplayManager.ts`; 64 files / 1098 tests today); edge-case-heavy suites use `.edge.test.ts`
- Coverage (v8) collected from `src/**/*.ts` excluding `.d.ts`, `types/`, `styles/`
- Test timeout: 10 seconds

### Timing constants

All animation / delay / gesture values are centralized in `app/src/constants/timings.ts`:
`TIMINGS` (durations), `GESTURE` (drag / flick thresholds) and `EASING` (curves). CSS reads them
as `--dp-ui-motion-*` (`utils/motion.ts`). Change these constants rather than hardcoding
timeouts.

## Subagents & rules

This repo ships scoped subagents in `.claude/agents/` and rule files in `.claude/rules/`:
`architecture.md` is always loaded (composition pattern, manager contract, event flow, options,
naming target, working agreement); `accessibility`, `build-release`, `calendar`, `styling`,
`testing` and `writing` (READMEs, changelog) load when matching files are touched.
CLAUDE.md wins on any conflict.

### Orchestration directive (mandatory)

When a task touches code under one of the scopes below, delegate it to the matching
subagent (Agent tool) - each agent carries its area's contract - unless it is one of the
exceptions listed after the routing. Routing is by path:

- `app/src/datepicker/`, `app/src/utils/`, `app/src/types/`, `app/src/typings/`,
  `app/src/constants/`, `app/src/index*.ts`, `app/src/kit.ts`, managers directly in
  `app/src/managers/` → `core-architect`
- `app/src/managers/calendar/`, `app/src/managers/swipe/`, `app/src/managers/pickers/`,
  `app/src/managers/renderers/` → `calendar-engine-dev`
- `app/src/styles/` → `styling-themes`
- `app/tests/`, `app/vitest.config.ts` → `test-engineer`
- build and tool configs (`tsdown.config.ts`, `vite.config.ts`, `vite-plugin-svg-text.ts`,
  `eslint.config.js`, Prettier, `tsconfig*.json`, `.husky/`), `package.json`, `app/package.json`,
  `dist/`, version bump / changelog / release → `build-release`

**Cross-cutting agent** (not pinned to one path — scoped by concern):
- `accessibility` — a11y of the library (`app/src`): ARIA, keyboard, focus, screen-reader,
  labels. Adds a11y semantics across managers/calendar/pickers/templates; flags deep structural
  or logic changes to the owning agent, and CSS contrast/focus-ring to `styling-themes`.

Rules for delegation:
- **One agent per scope.** A task spanning multiple scopes is split into per-scope
  subtasks and dispatched to each owner; the owning agent flags cross-scope needs
  rather than reaching over.
- **You stay the orchestrator.** Gather context, decide routing, hand the agent a
  precise brief, integrate its report, and run the final verification once, at the end.
  Outside the exceptions below, don't do the agent's in-scope edits yourself.
- **Exceptions (do it directly, no delegation):** read-only exploration; the user
  explicitly says to edit directly; small, contained edits - one file, roughly up to 30
  changed lines - where the area's rule file (it loads when you touch those files) carries
  the contract, since a cold agent start costs more than it saves; or work outside every
  scope above (e.g. `.claude/`, `app/docs/`, root configs).

### Custom skills (audit → approve → apply orchestrators)

These `.claude/skills/` skills drive the agents above through a gated flow (audit read-only →
user approval → apply → verify). They never run git/publish — they propose, the user executes.

- `/release` → `build-release` — cut a release (version bump, README, CHANGELOG.md).
- `/a11y` → `accessibility` — audit/fix library accessibility.
- `/verify` → main agent only — before/after browser check of the demo (Vite on 8205 / 8206,
  helpers on 8299, output in the gitignored `.verify/`); the end-of-task check of HARD RULES §5.

Shared working agreement baked into every agent (see `.claude/rules/architecture.md` §7):
CRLF line endings, git is the user's job (no commit/push), subagents never run anything (HARD
RULES; no per-task build/test/lint/servers/review — the main agent verifies once at the end,
incl. the browser check when §5 calls for it), local only, zero-dependency and SSR-safe. **Don't break a
theme's visual identity / Material Design 3** (no `font-weight: 700` or strikethrough as state
cues — MD3 uses state layers / tonal containers / opacity).

## Coding Conventions

ESLint (`app/eslint.config.js`) enforces the rules below in `app/src`; Prettier owns formatting
(its defaults: double quotes, trailing commas, 80 columns, plus CRLF) - don't hand-format.

- Facts agents need without opening configs: `app/tsconfig.json` has `target`/`lib` ES2022 +
  DOM (no ES2023+ APIs such as `findLast`, `toSorted`, `Object.groupBy`), `strict`,
  `verbatimModuleSyntax`, `isolatedModules`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `moduleResolution: bundler`, `types: []`, path alias `@/*` → `app/src/*` (same in Vitest);
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are off. ESLint: `app/eslint.config.js`
  = `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` (rules below); in `tests/`
  type assertions and `!` are allowed. SVG imports are markup strings. Don't spend a read on
  these files unless a task changes them.
- **Small, modular files - KISS, DRY, YAGNI.** One responsibility per file; 200-300 lines is fine,
  split anything past ~300 into a folder of focused modules (e.g. `datepicker/lifecycle/*`,
  `managers/swipe/{dragGesture,wheelGesture,MonthPager}.ts`), composed through constructors /
  plain functions, never `extends`. Declaration-only files (option types with JSDoc) may be
  longer. Before writing a helper, grep `app/src/utils/` for an existing one; shared logic goes
  to `utils/`, not copied. Prefer the simplest code that meets the spec - no speculative options,
  layers or abstractions (YAGNI): nothing the spec, plan or a caller doesn't need - no extra
  exports, attributes, hooks, options or fallbacks "just in case".
- Type-only imports use `import type` (`verbatimModuleSyntax`).
- Strict TypeScript in `app/src`: no `any`, no type assertions (`as X`; `as const` is fine), no
  non-null `!`, `unknown` only at real boundaries and narrowed right away. Existing violations
  are debt: don't add new ones, fix them when you are already changing that code.
- Composition only: no `extends`, no class hierarchies. Dependencies come in through the
  constructor.
- No nested ternaries.
- ESLint runs `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked`, so code written
  without running lint must already satisfy the rules agents trip over most:
  `no-unnecessary-condition` (no `??` / `?.` / `if (x)` on values whose type can't be
  null/undefined/falsy - fix the type or drop the check), `restrict-template-expressions` (only
  strings in template literals: `${String(n)}`), `prefer-nullish-coalescing`,
  `prefer-optional-chain`, `no-confusing-void-expression` (`() => { fn(); }`, not `() => fn()`, for
  void calls), `no-floating-promises` / `no-misused-promises` (`void promise`, no async listener
  callbacks), `restrict-plus-operands`, `no-unnecessary-type-parameters`, `no-extraneous-class`,
  `consistent-type-definitions` (`interface` for object shapes), `array-type` (`T[]` /
  `readonly T[]`), `consistent-indexed-object-style` (`Record`), `prefer-for-of`,
  `dot-notation`, `no-empty-function`, `only-throw-error`, `no-inferrable-types`.
- Default export only for `DatepickerUI` (the package default); everything else, managers
  included, uses named exports.
- **No new code comments** in `app/src` — let code self-document. The only acceptable comments
  are doc-comments on TypeScript options/public types (JSDoc in `types/options.ts` and
  `types/types.ts`). Leave existing comments alone unless they are clearly stale.

## Public API

```typescript
const picker = new DatepickerUI(selectorOrElement, options?);
picker.create();                          // initialize (and mount when inline)
picker.open();                            // open the picker
picker.close();                           // close it
picker.destroy({ keepInputValue? });      // clean up
picker.getValue();                        // PickerValue | null: DateValue { value: ISO, date, formatted },
                                          // range { start, end }, multiple DateValue[]
picker.setValue(value);                   // Date | string, { start, end } or an array (per calendar.mode), null
picker.setOptions(options);               // update options at runtime (emits update)
picker.setActiveEnd(end);                 // range: "start" | "end", which end the next pick sets
picker.getElement();                      // the .dp-ui host element
picker.on(event, handler);                // subscribe, returns an unsubscribe function
picker.once(event, handler);              // subscribe once, returns an unsubscribe function
picker.off(event, handler?);              // unsubscribe

// Events: open, close, cancel, confirm, update, error,
//         select:day, select:month, select:year, navigate, range:start, range:end
// Options: calendar, ui, labels, behavior, callbacks (callbacks.on* mirror the events)

// Read-only getters
picker.instanceId; picker.options; picker.isInitialized; picker.isDestroyed;

// Static methods
DatepickerUI.getById(id);                 // get instance by custom ID (behavior.id)
DatepickerUI.getAllInstances();           // all live instances
DatepickerUI.destroyAll();                // destroy all instances
```
