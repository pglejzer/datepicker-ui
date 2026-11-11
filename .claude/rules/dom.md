---
paths:
  - "app/src/managers/**/*.ts"
  - "app/src/datepicker/lifecycle/host.ts"
  - "app/src/styles/**/*.scss"
  - "app/tests/**/*.ts"
  - "app/docs/**/*.ts"
---

# DOM structure

What the library renders. Pairs with the class contract in `.claude/rules/styling.md`.

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
`dp-ui__ghost` clone of the old view fades out inside the resizing container.

Other parts:
- **Modal look.** A view in the modal or full-screen layout is
  `div.dp-ui__calendar.dp-ui__calendar--modal`. Modal-layout CSS keys on that class, and
  modal-surface CSS on `.dp-ui__container--modal > .dp-ui__calendar > …`, both with child
  combinators, so a calendar nested in another picker's surface is safe.
- **Caption row.** `div.dp-ui__navigation--caption` > `span.dp-ui__caption` plus the month
  arrows, in place of the docked header (docked look) or the year-grid button (modal look).
- **Day content.** Day cells may hold `span.dp-ui__date-content` and get `--has-content`.
  Inert outside days are `--outside-month.--disabled`.
- **Month grid.** `div.dp-ui__month-selection` (modal adds the `dp-ui__navigation--month-grid`
  row). Month / year precision hide the docked header groups.
- **Several months.** The container gets `--multi-month` and an inline `--dp-ui-visible-months`.
  Pages are `div.dp-ui__months` with N captioned grids. A range row uses
  `dp-ui__navigation--months` instead of the vertical list.
- **Presets.** `div.dp-ui__presets[role=group]` > `button.dp-ui__preset[aria-pressed]`, a column
  (`dp-ui__presets--column`) with `--presets`, otherwise a chip row.
- **Split fields.** With `ui.endInput` the page input being edited gets `dp-ui__input--active`.
- **Rebuilt views.** A pager or menu rebuilt by `setOptions()` gets `data-rebuilt` (no entry fade).
- **Fluid cells.** A `.dp-ui__container` that holds a calendar view (`> .dp-ui__calendar`) is an
  inline-size container. A kit host root with other content is not one. Day cells size from 36 to
  48 px (`--dp-ui-date-container-min-size` / `-max-size`).
