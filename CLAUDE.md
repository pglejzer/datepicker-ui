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
as `@pglejzer/datepicker-ui` with a stable API. The version lives in the root `package.json`,
release history in `CHANGELOG.md` and user docs in `README.md`; don't copy them here.

- **Surfaces:** docked popover, modal dialog (full screen for a range picker on small windows)
  and inline. Any surface can take the docked, modal or full-screen look (`ui.layout`).
- **Selection:** single, range (presets, two page fields with `ui.endInput`) and multiple, plus
  month / year pickers (`calendar.precision`).
- **Input:** typed dates with an opt-in mask, and a calendar / input view switch.
- **Calendar:** several months side by side, drag / wheel paging, disabled-date rules, per-day
  decoration and content.
- **Themes:** `basic` light / dark plus nine more, with `ui.colorScheme: "auto"` detection.
- **Kit:** the second entry `@pglejzer/datepicker-ui/kit` (`app/src/kit.ts`) serves companion
  packages such as `@pglejzer/datetimepicker-ui`: surface hosts, layout and theme helpers, date
  text helpers and the generic `Pager<K>`. Everything it exports is public API.

**Sister project.** `timepicker-ui` ([GitHub](https://github.com/pglejzer/timepicker-ui), npm
`timepicker-ui`) uses the same architecture and is the reference. Read it on GitHub; a local
clone is optional. Its 5.0 API (renamed options, `setOptions()`, removed legacy
names) is the target for this library, so new work here must not reintroduce what timepicker 5.0
removes — see `.claude/rules/architecture.md` §6.

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

- A forced `ui.displayMode: "docked"` popover is not capped. When neither side of the input has
  room, it opens on the side with more room and overflows. (`auto` opens the dialog in that case.)
  Don't fix it with a capped height that scrolls: no visible scrollbar on a surface
  (`architecture.md` §7). The JS fallback (browsers without CSS anchor positioning) still caps
  the height with a visible scrollbar in that case. That breaks the rule and is open.

## Where things live

All work happens in `app/`. This is a map: explore the code for detail. Each area's rules load
from `.claude/rules/` when you touch its files; `architecture.md` (composition, contracts,
events, options, display modes, naming target, working agreement) loads every session, and
`code-style.md` holds the TypeScript conventions for `app/src`, `app/tests` and `app/docs`.

| Path | What | Rules |
|---|---|---|
| `app/src/datepicker/` | `DatepickerUI`, `CoreState`, `Managers`, `Lifecycle` (`lifecycle/*`), options (`options/*`) | `architecture.md` |
| `app/src/managers/*.ts`, `managers/input/` | the six managers; the page fields of `ui.endInput` | `architecture.md`, `accessibility.md` |
| `app/src/managers/{calendar,swipe,pickers,range,renderers}/` | day grid, paging, menus, range view, surface hosts | `calendar.md`, `dom.md` |
| `app/src/utils/`, `types/`, `typings/`, `constants/` | shared helpers, public and internal types, `timings.ts` | `architecture.md` |
| `app/src/index*.ts`, `app/src/kit.ts` | the public entries: the package and `./kit` | `build-release.md` |
| `app/src/styles/` | SCSS: tokens, components, one file per theme | `styling.md`, `dom.md` |
| `app/tests/` | Vitest specs mirroring `src/` | `testing.md` |
| `app/docs/` | the maintainer's demo page (Vite; Tailwind CDN and Prism on purpose) | `dom.md` |
| `app/*.config.*`, `app/tsconfig*.json`, root `package.json` | build, lint and format configs; the published manifest | `build-release.md` |
| `dist/` | generated output, never edit | `build-release.md` |
| `docs/superpowers/` | local specs and plans (gitignored, not in clones) | - |

## Subagents & rules

Scoped subagents live in `.claude/agents/`, rule files in `.claude/rules/` (see the table above).
CLAUDE.md wins on any conflict.

### Orchestration directive (mandatory)

When a task touches code under one of the scopes below, delegate it to the matching
subagent (Agent tool) - each agent carries its area's contract - unless it is one of the
exceptions listed after the routing. Routing is by path:

- `app/src/datepicker/`, `app/src/utils/`, `app/src/types/`, `app/src/typings/`,
  `app/src/constants/`, `app/src/index*.ts`, `app/src/kit.ts`, managers directly in
  `app/src/managers/` → `core-architect`
- `app/src/managers/input/` → `core-architect` (it serves `InputManager`)
- `app/src/managers/calendar/`, `app/src/managers/swipe/`, `app/src/managers/pickers/`,
  `app/src/managers/renderers/`, `app/src/managers/range/` → `calendar-engine-dev`
- `app/src/styles/` → `styling-themes`
- `app/tests/`, `app/vitest.config.ts` → `test-engineer`
- build and tool configs (`tsdown.config.ts`, `vite.config.ts`, `vite-plugin-svg-text.ts`,
  `eslint.config.js`, Prettier, `tsconfig*.json`, `.husky/`), `package.json`, `app/package.json`,
  `dist/`, `.github/workflows/publish.yml`, version bump / changelog / release → `build-release`

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

### Custom skills

Gated flows (audit read-only → user approval → apply → verify) in `.claude/skills/`. They
propose and never run git or publish.

- `/release` → `build-release`: version bump, README, CHANGELOG.
- `/a11y` → `accessibility`: audit and fix library accessibility.
- `/verify` → main agent only: before / after browser check of the demo.

## Public API

The source of truth is the code: methods in `app/src/datepicker/DatepickerUI.ts`, events and
payloads in `app/src/types/types.ts`, options with JSDoc in `app/src/types/options.ts`. The
README documents them for users.

```typescript
const picker = new DatepickerUI(selectorOrElement, options?);
picker.create(); picker.open(); picker.close(); picker.destroy({ keepInputValue? });
picker.getValue(); picker.setValue(value);   // shape follows calendar.mode; null clears
picker.setOptions(options);                  // runtime update, emits update
picker.setActiveEnd(end);                    // range: which end the next pick sets
picker.setView(view); picker.getView();      // "calendar" | "input"
picker.goTo(date); picker.getVisibleRange(); // show a month; the shown days
picker.isSelectable(value); picker.clear();
picker.getElement();                         // the .dp-ui host
picker.on(event, handler); picker.once(event, handler); picker.off(event, handler?);
picker.instanceId; picker.options; picker.isInitialized; picker.isDestroyed;
DatepickerUI.getById(id); DatepickerUI.getAllInstances(); DatepickerUI.destroyAll();

// Events: open, close, cancel, confirm, update, error, select:day, select:month,
//         select:year, navigate, range:start, range:end, switch:view, clear
// Options: calendar, ui, labels, behavior, callbacks (callbacks.on* mirror the events)
```
