# architecture.md - datepicker-ui shared rules

The single source of truth every subagent reads before touching code. Pairs with
the root `CLAUDE.md` (HARD RULES, commands, area map, routing). When this file and `CLAUDE.md`
disagree, `CLAUDE.md` wins - flag the drift instead of silently following one.

`datepicker-ui` is a **zero-dependency, framework-agnostic, SSR-safe** date picker
(`@pglejzer/datepicker-ui`, stable API; the version is in the root `package.json`). Docked
(popover), modal and inline display, single, range and multiple selection, typed input (opt-in
mask), a calendar / input view switch, month / year selection, drag / wheel month paging, light
and dark `basic` theme plus m3-green, the timepicker-ui themes and blueprint, `colorScheme`
detection. It follows the architecture of its sister project
[`timepicker-ui`](https://github.com/pglejzer/timepicker-ui). **All source/build/test work
happens in `app/`.**

## 1. Composition pattern - DatepickerUI

`DatepickerUI` (public API, `app/src/datepicker/DatepickerUI.ts`) holds no business logic. It
composes three objects around one `CoreState`:

- **CoreState** - state bag: raw and `ResolvedOptions`, committed `value` and `draft` (both a
  `Selection` union - single / range / multiple, `types/selection.ts`, pure helpers in
  `utils/selection/*`; the public API converts at the edges with `toPickerValue` /
  `toSelection`), `view`
  (year + month), `focus`, `panel`, surface mode, the `input` and `host` elements. Every setter
  emits a typed event on `core.events` (`EventEmitter<InternalEventMap>`). Options resolve through
  `datepicker/options/*` (`defaults`, `merge`, `resolve`, `pick`, `dates`, `fields`, `types`);
  defaults live in `DEFAULT_DATEPICKER_OPTIONS` in `options/defaults.ts`.
- **Managers** - creates and owns the managers (§2) and wires their dependencies.
- **Kit** - `src/kit.ts` is a second public entry (`@pglejzer/datepicker-ui/kit`) for companion
  packages. It only re-exports existing modules:
  - surface hosts (with `labelledBy` and `setLabel`), surface-mode rules and `fitsViewport`;
  - color scheme and `applyTheme`;
  - the date text, range text and `Intl` week / name helpers;
  - `createTextButton` and the generic `Pager<K>`.

  Anything it re-exports must stay SSR-safe at import, and changing it is a public API change.
- **Lifecycle** - thin; implements `PickerActions` and delegates to `datepicker/lifecycle/*`:
  `session` (open / close, surface mounting), `actions` (select, navigate, confirm, cancel,
  today, clear), `value`, `navigation`, `options` (`setOptions`), `instance` (create / destroy),
  `callbacks` (the `callbacks.on*` bridge), `triggers`, `host` (wrapper element), `context`,
  `view` (`setView` / `getView` / `goTo`, `switch:view`), `visible` (`VisibleRangeTracker`, the
  only emitter of `navigate`).

Managers talk to `Lifecycle` only through `PickerActions` (`types/internal.ts`) and to each other
through `CoreState` and events. A module-level registry backs `getById()`, `getAllInstances()`,
`destroyAll()`.

## 2. Manager contract

Every manager is a named export in `app/src/managers/`, takes `(core)` or, when it emits public
events, `(core, emitter, deps)`, exposes `destroy()` where it owns resources, has a single
responsibility, and touches no DOM before it is asked to render or bind. Dependencies come
through the constructor; **no manager -> manager references** except what `Managers` wires.

| Manager | Responsibility |
|---|---|
| ValidationManager | `DateRules`: `isDisabled`, `isSelectable` (range length / first disabled day after the start, `multiple.max`), `isMonthDisabled`, `yearBounds`, `clampView` (min / max / disabled / enabled dates, `disabledWeekdays`, cached `isDateDisabled`, `ui.yearRange`) |
| ThemeManager | `data-theme`, `data-color-scheme`, `ui.cssClass`, RTL class on the host and surface root |
| DisplayManager | picks the surface (`resolveSurfaceMode`), mounts / unmounts a `SurfaceHost`, builds the calendar view (`RangeView` for range, full-screen via `isFullscreenRange`), updates on option change |
| InputManager | write / read the input value, parse typed text, `aria-invalid`, emits `error` |
| TriggerManager | open triggers: input pointer / keyboard, `ui.toggleButton`; `aria-expanded` and label on the toggle |
| FormManager | form integration: a hidden ISO-valued input next to the visible one, `change` dispatch on commit, restore on destroy |

Not managers but part of the same layer: `managers/calendar/` (month model, grid renderer, grid
keyboard, `CalendarView` composing `view/*`), `managers/swipe/` (generic `Pager<K>` + gesture modules),
`managers/pickers/` (month / year menus, year grid, date input panel), `managers/range/`
(`RangeView`, month list), `managers/renderers/` (surface hosts, shells, container transform).
See `.claude/rules/calendar.md`.

## 3. Event flow

Two buses, both `EventEmitter` (`app/src/utils/EventEmitter.ts`):

- **Internal** - `core.events`, `InternalEventMap` (`types/internal.ts`): `change:draft`,
  `change:view`, `change:focus`, `change:panel`, `change:value`, `change:options`,
  `change:active-end`. Views and
  managers react to state through these. Not public.
- **Public** - `EventEmitter<DatepickerEventMap>` (`types/types.ts`), exposed by `picker.on` /
  `once` / `off` (`on` and `once` return an unsubscribe function): `open`, `close`, `cancel`,
  `confirm`, `update`, `error`, `select:day` (`selected: false` when a multiple click removes a
  date), `select:month`, `select:year`, `navigate`, `range:start`, `range:end`, `switch:view`,
  `clear`. Payload types live in `types/types.ts` and are exported from `index.ts`.
  - `navigate` carries `from` / `to` (the shown days). It fires once per change of them, with
    the source `open`, `api`, `resize`, `scroll` or a user source. Only `VisibleRangeTracker`
    emits it.
  - `cancel` reasons are `button`, `escape`, `outside` and `toggle`.

`CallbackBridge` (`datepicker/lifecycle/callbacks.ts`) wires `callbacks.on*` options to the public
events. User callbacks go through the bridge - managers never call them directly. A new public
event gets a payload type, an entry in `DatepickerEventMap`, a matching `callbacks.on*` and a
bridge line. User functions in options (`isDateDisabled`, `decorateDate`) never break the
picker: a throw goes to `rethrowLater` and the date counts as enabled / undecorated.

## 4. Options structure

Grouped, typed with JSDoc in `app/src/types/options.ts`, defaults in
`DEFAULT_DATEPICKER_OPTIONS` (`datepicker/options/defaults.ts`), validated and normalized by
`resolveOptions` into `ResolvedOptions` (`options/types.ts`); `CoreState.setOptions()` merges a
patch into the raw options and re-resolves:

- `calendar` - locale, weekStart, minDate, maxDate, disabledDates, enabledDates, mode
  (`single` | `range` | `multiple`), defaultValue (read at `create()` when the input text is not
  a date; the shape of `setValue()`, resolved to a thunk so `"today"` is read at `create()`),
  range `{ minLength, maxLength, presets }`, multiple `{ max }`,
  isDateDisabled, disabledWeekdays, decorateDate, renderDate (per-day content), validate (field
  validity, never blocks: `invalid-value`), precision (`day` | `month` | `year`, single mode only;
  value `YYYY-MM` / `YYYY`), months (side by side, docked look), pageBy (`view` | `month`).
  Every date in a value (`setValue`, `isSelectable`, `goTo`, presets, defaultValue) may be
  `"today"` (`toSelection`)
- `ui` - displayMode (`auto` | `docked` | `modal`), layout (`auto` | `docked` | `modal` |
  `fullscreen`, the look on any surface, §5), inline `{ enabled, container, headline,
  navigation (`menus` | `caption`), announceSelection }` (the last three act on inline pickers
  only), format, theme,
  colorScheme, toggleButton, weekNumbers, outsideDays (`boolean | { selectable }`), fixedWeeks,
  yearRange, todayButton, clearButton, footer, animation, allowPageScroll, cssClass, appendTo,
  swipe, viewSwitch, initialView (`calendar` | `input`), startView (`day` | `month` | `year`),
  endInput (the page's second `<input>`, range), mask, fullscreen (`boolean | number`: below which window width a modal
  range picker goes full screen; `true` = 600, `false` = never). `colorScheme: "auto"` detects
  light / dark at open (`utils/colorScheme.ts`: background behind the input, page
  `color-scheme`, OS); inline pickers follow page changes
- `labels` - every visible and assistive string (title, buttons, month / year navigation,
  `invalidDate`, `unavailableDate`, `inRange`, ...); month and weekday names come from `Intl`
- `behavior` - closeOnSelect, closeOnCancel, commitOnChange, ignoreOutsideClick, returnFocus, id
- `callbacks` - onOpen, onClose, onCancel, onConfirm, onUpdate, onError, onSelectDay / Month /
  Year, onNavigate, onRangeStart, onRangeEnd, onSwitchView, onClear

A new option needs: the type with JSDoc in its group, a default, a `resolve` entry that validates
it (invalid values report an `error` event with code `invalid-option`), and a consumer. All
timing values live in `app/src/constants/timings.ts` (`TIMINGS`, `GESTURE`, `EASING`) - never
hardcode timeouts.

## 5. Display modes

`DisplayManager` picks the surface with `resolveSurfaceMode`: `ui.displayMode: 'auto'` uses modal
below 600 px wide (`COMPACT_BREAKPOINT`) or 480 px tall (`COMPACT_HEIGHT_BREAKPOINT`) and docked
otherwise; `docked` and `modal` force one. With `auto`, `DisplayManager.mount` also shows the
popover, calls `view.fit()` and checks `fitsViewport(root, input)`, all synchronously. If the
popover fits neither entirely below nor entirely above the input where it is now, it releases it
at once and `session.fallBackToModal()` mounts the dialog in the same task.

**Calendar layout.** `core.calendarLayout` (`docked` | `modal` | `fullscreen`, from
`calendarLayout()` in `utils/surface.ts`) is decided with the surface, from `ui.layout`:
- `auto`: docked and inline → `docked`; modal → `fullscreen` for a range picker below
  `ui.fullscreen`, else `modal`;
- `docked` → `docked` on every surface;
- `modal` → `modal`, with the same `ui.fullscreen` rule in a dialog;
- `fullscreen` → `fullscreen` for a range in a dialog (any width) or inline, else `modal`.

A changed `ui.layout` remounts a shown surface (`refreshSurface`).

The layout drives the look (`dp-ui__calendar--modal`), `supportsInputView`, `startPanel` and
`resolveViewLayout`. Inline chrome options are read through `inlineChrome(surface, inline)`.

Each surface is a `SurfaceHost` (`managers/renderers/`):

- **docked** - `PopoverHost`: `popover="manual"` inside the `.dp-ui` host, positioned by CSS anchor
  positioning with a JS fallback (`data-positioning="anchor|fallback"`, `data-placement`), no
  backdrop, outside-pointer close.
- **modal** - `DialogHost`: `<dialog>` opened with `showModal()`, appended to `ui.appendTo` or the
  host, native backdrop and focus containment.
- **inline** - `ui.inline.enabled`: `InlineHost` renders into `ui.inline.container`, mounted on
  `create()`, no open triggers, footer hidden unless `ui.footer` is set.

Inside every surface: the day grid (`calendar/`), the month / year menus and year grid
(`pickers/`) and the month pager (`swipe/`) for single and multiple selection. Range uses
`RangeView` (`managers/range/`) in every surface: a vertical month list (568 px high in the
popover, dialog and inline), and a full-screen dialog (shape 0, × and Save in a top bar,
Cancel/OK at the bottom) when the surface is modal below `ui.fullscreen` (600 px by default;
`isFullscreenRange` in `utils/surface.ts`; decided at open). The input view (two
text fields for range, one for single) replaces the calendar through a ~300 ms container
transform (`morphContainer`: the container resizes at once while a `dp-ui__ghost` snapshot of
the old view fades out in 75 ms and the new view fades in over the last 150 ms; leaving full
screen fades the scrim in, entering it keeps the scrim until covered). It exists for every range
picker and for single pickers whose layout is not `docked` (`supportsInputView`). It opens with
the pencil, `ui.initialView: "input"` or `setView("input")`.

View layout: `session.syncLayout(surface)` decides `core.layout` (`ViewLayout`: months shown,
presets `none` / `column` / `row`) with `resolveViewLayout` in `utils/surface.ts` at open, inline
mount, `setOptions()` and a window `resize` while open (`session.relayout` rebuilds the view only
when the layout changes; the surface mode and full screen stay decided at open), before
`clampView`. Several months only in docked /
inline (as many as fit the width; `core.view` is the first month shown, `windowFor` moves the
window); modal and full screen always get one month and a presets chip row. `homePanel(precision)`
is the calendar's home (`days`, `month-grid`, `year-grid`); `startPanel(startView, layout)` the
first panel. With `ui.endInput`, or after the public `setActiveEnd()` (both make
`core.followsActiveEnd` true), `core.activeEnd` (`start` / `end`) says which end the next pick sets.
Otherwise the end follows from the draft (`nextEnd`).

## 6. Naming target - timepicker-ui 5.0

`timepicker-ui` 5.0 removed the legacy names; the rewrite adopted the 5.0 names everywhere
(`setOptions`, `ui.appendTo`, `ui.inline.container`, `ui.allowPageScroll`,
`behavior.returnFocus`, no `hide` event, no `OptionTypes`). **Don't reintroduce the old style:**
`picker.update({ options, create })`, `OptionTypes`, a `hide` event, `ui.mobile`,
`ui.enableScrollbar`, `ui.appendModalSelector`, `ui.inline.containerId`,
`behavior.focusInputAfterClose`. When naming something new, check the sister repo on GitHub:
[`docs-app/lib/renamed-options.tsx`](https://github.com/pglejzer/timepicker-ui/blob/main/docs-app/lib/renamed-options.tsx)
and [`docs-app/lib/removed-in-v5.tsx`](https://github.com/pglejzer/timepicker-ui/blob/main/docs-app/lib/removed-in-v5.tsx).

## 7. Working agreement (applies to every agent)

- **CRLF line endings** on all new/edited files (library and `.claude/`). Edit keeps CRLF; Write
  creates LF, so list every file you created in your report - the main agent converts them.
- **Git is the user's job** (HARD RULES in `CLAUDE.md`). Subagents run no git at all; the
  main agent only reads (`status`, `diff`, `log`, `show`, ...) and never adds, commits,
  pushes, branches, merges, resets, stashes or checks out without the user's explicit
  approval for that one operation. End state: nothing staged, nothing committed.
- **Packages are the user's job.** Never `npm install` / `ci` / `uninstall` / `update`;
  propose the command and wait for the user to run it.
- **Subagents never run anything** (HARD RULES in `CLAUDE.md`): no build / test / lint /
  typecheck / dev server / browser / review, no git. Verify changes by reading code and
  reasoning about them; report what you changed and which commands, specs and demo sections
  the main agent should run. The main agent runs all verification once, at the very end
  (including the demo browser check when HARD RULES §5 calls for it); the user decides on
  commits.
- **Local only.** Never publish, deploy or push (`npm publish`, `vercel`, `git push`, ...).
- **Zero-dependency & SSR-safe.** No new runtime dependencies. No bare `window` / `document`
  access at module top level - guard with `isNode()` / `isDocument()` from `utils/node.ts`.
- **Strict TypeScript** in `app/src`: no `any`, no `as` assertions (`as const` is fine), no
  non-null `!`, `unknown` only at real boundaries and narrowed at once. Existing violations are
  debt: don't add new ones; fix them in code you are already changing.
- **Composition only.** No `extends`, no class hierarchies; dependencies through the
  constructor. Default export only for `DatepickerUI`; named exports everywhere else.
- **No nested ternaries.**
- **No new code comments.** Don't add inline/explanatory comments or banner comments in
  `app/src` - let the code self-document (clear names, small functions). The ONLY acceptable
  comments are doc-comments on TypeScript options/public types (JSDoc in `types/options.ts`
  and `types/types.ts`). Leave existing comments unless clearly stale, and don't strip the
  option/type docs.
- **Don't break a theme's visual identity / Material Design 3.** No `font-weight: 700` or
  strikethrough as state cues - MD3 uses state layers / tonal containers / opacity (see
  the `styling-themes` agent for detail).
- **No visible scrollbar on a picker surface** (owner rule, 2026-11-11). The docked popover and
  the dialog never show a scrollbar. A surface that does not fit gets fewer months, a shift into
  the window or, under `auto`, the dialog. It never gets a capped height that scrolls. Content
  that scrolls by design (the range month list, the preset chip row) hides its scrollbar with
  `scrollbar-width: none` plus `::-webkit-scrollbar`. Only the month and year menus, the year
  grid and the presets column keep the themed `thin-scrollbar`. A fix that makes a surface
  scroll is a regression, even when it makes the surface fit.
- Stay in your declared scope (see each agent's `description`). If a change needs to
  cross into another agent's territory, say so rather than reaching over.
