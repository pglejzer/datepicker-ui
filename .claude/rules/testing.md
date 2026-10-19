---
paths:
  - "app/tests/**/*.ts"
  - "app/vitest.config.ts"
---

# Testing rules

Applies when working in `app/tests/` and `app/vitest.config.ts`. Pairs with
`.claude/rules/architecture.md`.

- **Vitest on jsdom**, no globals - import `describe` / `it` / `expect` / `vi` from `vitest`.
  10s timeout. A spec that needs a DOM-free environment (SSR checks) uses the
  `// @vitest-environment node` docblock. CSS imports need no mock; SVG imports load as strings
  through `vite-plugin-svg-text.ts`.
- **`tests/setup.ts`** loads jest-dom matchers and polyfills what jsdom lacks: `<dialog>`
  (`showModal` sets `open` + `data-test-modal`), the Popover API (`showPopover` sets
  `data-test-popover-open` and a style makes open popovers `display: block !important`, because
  jsdom 30 hides `[popover]` through its UA stylesheet and then refuses focus), `Element.animate`,
  pointer capture, `matchMedia`, `ResizeObserver`, `crypto.randomUUID`, rAF, `Touch` /
  `TouchEvent`, `scrollIntoView`, `scrollTo`. Don't re-polyfill these inside a spec.
- **Helpers** in `tests/helpers/`: `picker.ts` (`mountInput`, `cleanupDom`, `flush`, `surface`,
  `surfaces`, `selectedCell`, `clickDate`, `clickSelector`, `clickConfirm`, `clickCancel`) and
  `viewport.ts` (`setViewportWidth`, for `auto` mode below / above 600 px). Reuse them; add shared
  helpers there.
- `tsconfig.json` has `types: []`: use `globalThis`, not Node's `global`, in tests.
- **Mirror the source tree** under `tests/unit/`: `src/managers/DisplayManager.ts` ->
  `tests/unit/managers/DisplayManager.test.ts` (64 spec files today, `tests/ssr-safety.test.ts`
  and `tests/unit/a11y/semantics.test.ts` included). Edge-case-heavy suites use `.edge.test.ts`. Import
  with the `@/` alias (`@/` -> `app/src/`).
- **Test through the public surface and the manager contract.** Drive behavior through
  `DatepickerUI` or the manager constructors and assert on emitted events / DOM / state, not
  private internals. Pure modules (`MonthModel`, `GridKeyboard`, `utils/date/*`,
  `popoverLayout`, option resolution) get direct input -> output assertions.
- **Dates must be deterministic:** freeze "today" with `vi.useFakeTimers()` +
  `vi.setSystemTime(...)`; build dates as `PlainDate` (`{ year, month 1-12, day }`) or
  `new Date(year, monthIndex, day)` and ISO strings for `setValue`; never depend on the machine's
  current date or time zone.
- **Cover meaningful branches:** `ui.format` variants, leap years and month ends, week start
  (monday / sunday / auto with a locale), min / max / disabled / enabled dates, docked vs modal
  vs inline, typed input valid / invalid / unavailable, SSR guards, destroy/cleanup, keyboard,
  ARIA states.
- **Never weaken an assertion just to make a failing test pass.** If behavior legitimately
  changed, assert the new correct attribute/class/event that proves the same behavior.
- Tests may use type assertions, `extends` and empty functions for jsdom polyfills and mocks
  (ESLint relaxes those rules in `tests/`); the strict TypeScript rules apply to `app/src`.
- Coverage (v8) is collected from `src/**/*.ts` excluding `.d.ts`, `src/types/`, `src/styles/`.
- Subagents never run Vitest, not even a focused spec (HARD RULES in `CLAUDE.md`). List the focused
  commands; the main agent runs them and the full `npm test` once, at the end. No git.
