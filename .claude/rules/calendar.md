---
paths:
  - "app/src/managers/calendar/**/*.ts"
  - "app/src/managers/swipe/**/*.ts"
  - "app/src/managers/pickers/**/*.ts"
  - "app/src/managers/renderers/**/*.ts"
---

# Calendar subsystem rules

Applies in `app/src/managers/calendar/`, `swipe/`, `pickers/` and `renderers/`. Pairs with
`.claude/rules/architecture.md`.

- **Keep data and DOM apart:**
  - Data, no DOM: `MonthModel` (`buildMonth`: a month as cells with date, state flags, week
    number), `GridKeyboard` (`nextFocusDate`: key -> next focus date), `swipe/resolveDragCommit`,
    `utils/popoverLayout` and `utils/date/*`. Never query or create DOM nodes here - they are
    unit-tested as input -> output.
  - DOM: `GridRenderer` (`renderMonthGrid` / `updateMonthGrid`) is the **only** place that builds
    the day grid DOM. `view/*` builds the header, pages, panels and live region; `pickers/*` the
    month / year menus and year grid; `renderers/` the surface hosts (`PopoverHost`,
    `DialogHost`, `InlineHost`), the docked / modal headers, footer buttons and positioning.
  - Orchestration: `CalendarView.createCalendarView` composes `view/*` (`commands`, `keyboard`,
    `monthPages`, `panelSwitcher`) and reacts to `core.events`; `MonthPager` (with `dragGesture`,
    `wheelGesture`, `pageStrip`, `slideAnimator`) pages months. User intent goes back through
    `PickerActions`, never straight to state.
- Cross-layer changes route **through the orchestrator** (`CalendarView`, `DisplayManager`), not
  sideways.
- **Dates:** use `PlainDate` / `YearMonth` (`types/date.ts`) with **1-based months** (`month`
  1-12) in state, events and the DOM model; helpers in `utils/date/plainDate.ts`. Compare by day
  (`compareDates`, `isSameDay`). Never `new Date("YYYY-MM-DD")` (UTC parsing); `Date` objects only
  at the API boundary (`fromDate` / `toDate`). Day cells carry `data-date` as ISO (`toISO` /
  `fromISO`).
- `calendar.minDate` / `maxDate` / `disabledDates` / `enabledDates` decide selectability through
  `ValidationManager` (`DateRules`) - don't reimplement the check here. Disabled days get
  `dp-ui__date--disabled` and must not select.
- `calendar.weekStart: 'auto'` reads the first day from `calendar.locale` (Intl). Keep the grid,
  the weekday row and week numbers (`ui.weekNumbers`) in sync when changing the start day.
  Other-month days render only with `ui.outsideDays` (`dp-ui__date--outside-month`).
- Month names, weekday names and headlines come from `Intl` (`utils/date/intl.ts`); day, week and
  year numbers go through `formatNumber` (the locale's digits; `-u-nu-latn` gives Latin).
- Gesture thresholds come from `GESTURE`, durations from `TIMINGS` and curves from `EASING`
  (`app/src/constants/timings.ts`, surfaced to CSS as `--dp-ui-motion-*` by
  `utils/motion.applyMotionVariables`) - never hardcode a timeout, duration or threshold. Gate
  JS-driven motion on `motionMode(ui.animation)` (`full` / `reduced` = fades only / `none`);
  `ui.swipe` turns drag / wheel paging off.
- `ui.yearRange` (`before` / `after`) bounds navigation through `ValidationManager.yearBounds` /
  `clampView` and the year menu / grid.
- Stage 5:
  - **Months shown.** Render from `core.layout.months`, the months actually shown, decided by
    `session.syncLayout`. Never render from `options.months`.
  - **Several months.** A page is `div.dp-ui__months` with N grids. Each grid has a visible
    caption and its own weekday row, and there are no outside days.
  - **Paging.** The month arrows and pager commits call `actions.page`. The year arrows keep
    `navigate(±12)`.
  - **Range.** Range days sit behind `range/rangeDays.ts`: `monthList` for one month, `monthRow`
    for several.
  - **Home panel.** Use `homePanel(precision)`, never the literal `"days"`. The home panel never
    sets `--menu-open`.
  - **Option grids.** The month grid and the year grid share `pickers/optionGrid.ts`.
  - **Day content.** `GridContext.content` (`renderDate`) is written as text, or as a Node. It is
    never HTML.
  - **Outside days.** `outsideSelectable: false` makes outside cells inert.
  - **Mouse drag on the range month list.** `range/dragScroll.ts` (`"y"`) scrolls by increments
    (never an absolute offset: `extendNearEdges` prepends months under the drag) and snaps to a
    month on release; `extendNearEdges` waits while a smooth snap runs. Wheel and touch stay free.
- Docked positioning: anchor positioning first (`anchorPositioning`), `fallbackPositioner` +
  `positionTracking` otherwise, and also when the anchored popover would stick out sideways
  (`overflowsInline`; the fallback keeps it inside the window); both set `data-positioning` and
  `data-placement`. The popover
  can still overflow the viewport when neither side fits.
- SSR-safe: guard DOM access (`isNode` / `isDocument`); nothing at module top level.
- Structural/logic changes here are `calendar-engine-dev`'s scope; a11y semantics flow through the
  `accessibility` concern; CSS through `styling-themes`; `CoreState` shape and new events through
  `core-architect`.
