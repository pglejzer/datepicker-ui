# /verify — scenarios

How to run: SKILL.md → "Running a scenario". Notation:
- `S` = the open surface: `:is(.dp-ui__container--docked:popover-open, .dp-ui__dialog[open] .dp-ui__container)`
  (never an inline picker). `__dp` resolves a leading `S`.
- `DO` = call in both phases (compare `→ EXPECT` only in after). `CHECK` = after phase only.
  `KEY` = real key press. `SHOT <name> root=<sel> ignore=<sel>` = screenshot + fingerprint (both phases).
- `<iso>` = the `iso` returned by the step that picked the day; `<today>` = today as `YYYY-MM-DD`.
  The demo starts on the current month, so never hard-code a date that depends on today.
- `pick(n)` clicks the n-th selectable day **visible** in the surface (negative n counts from the end);
  `pick(n, '#container')` does it in an inline picker.
- `state()` keys: `open`, `mode` (docked / modal / inline), `range`, `presets` (column layout),
  `multiMonth`, `inputView`, `fullscreen`, `menuOpen`, `display`, `size`, `headline`, `captions`
  (visible month labels), `selected`, `rangeStart`, `rangeEnd`, `inRange` (count), `pressedPreset`,
  `confirmDisabled`, `focusInSurface`, `focusedDate`, `active`, `inputValue`, `inputInvalid`,
  `formValue`, `placement`, `positioning`, `theme`, `scheme`. Empty values are left out.
- Default `ui.format` on the demo is `auto` with `en-US`: values look like `MM/DD/YYYY`, a range
  joins two of them with ` – `.
- A scenario opens each picker once. Scenarios with the same viewport may share one page load;
  navigate fresh for a viewport change or a probe.
- Expectations encode the library's real behaviour as read from the code, not the demo's prose.
- Shots use `ignore=.dp-ui__visually-hidden`.

## Library demo — common header

`page: lib` · `path: /` · ready: `DO ready('#dp-default')` · `vp: d` unless stated.

## @smoke

### lib/smoke-docked
1. DO `open('#dp-docked')` → EXPECT `ok: true`, `mode: 'docked'`, `focusInSurface: true`, `focusedDate: <today>`
2. SHOT `open` root=`S`
3. DO `pick(9)` → EXPECT `ok: true`; CHECK `state()` → EXPECT `selected: [<iso>]`
4. DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()` → EXPECT `closed: true`
5. CHECK `state('#dp-docked')` → EXPECT `inputValue` = `<iso>` as `MM/DD/YYYY`, `active: input#dp-docked…`

### lib/smoke-range
1. DO `open('#dp-range-docked')` → EXPECT `ok: true`, `range: true`, `confirmDisabled: true`
2. SHOT `open` root=`S`
3. DO `pick(3)` (→ `<a>`); DO `pick(8)` (→ `<b>`) → CHECK `state()` → EXPECT `rangeStart: <a>`, `rangeEnd: <b>`, `inRange: 4`, `confirmDisabled: false`
4. SHOT `picked` root=`S`
5. DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()` → EXPECT `closed: true`
6. CHECK `value('#dp-range-docked')` → EXPECT `<a> – <b>` as `MM/DD/YYYY – MM/DD/YYYY`

## @single

### lib/single-keys
1. DO `focus('#dp-docked')` → EXPECT `ok: true`
2. KEY `Alt+ArrowDown`; CHECK `state()` → EXPECT `open: true`, `focusedDate` = the selected date when `#dp-docked` has a value (an earlier scenario on the same page load), else `<today>`
3. KEY `ArrowRight`; CHECK `state()` → EXPECT `focusedDate` = step 2's date + 1 day (`<next>`)
4. KEY `Enter`; CHECK `state()` → EXPECT `selected: [<next>]`, `open: true`
5. KEY `Escape`; DO `waitClosed()` → EXPECT `closed: true`
6. CHECK `state('#dp-docked')` → EXPECT `active: input#dp-docked…`, `inputValue` unchanged from before step 2 (Escape cancels the draft)

### lib/single-paging
1. DO `open('#dp-docked')` → EXPECT `ok: true`, `captions: [<current month short>, <year>]`
2. DO `click('S .dp-ui__icon-button--next-month')`; CHECK `state()` → EXPECT `captions` = the next month
3. SHOT `next` root=`S`
4. DO `click('S .dp-ui__icon-button--prev-month')`; CHECK `state()` → EXPECT `captions` = the current month again
5. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`

### lib/single-modal
1. DO `open('#dp-modal')` → EXPECT `ok: true`, `mode: 'modal'`, `captions: ['<Month> <year>']`
2. SHOT `open` root=`S`
3. DO `pick(0)`; DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()` → EXPECT `closed: true`
4. CHECK `value('#dp-modal')` → EXPECT `<iso>` as `MM/DD/YYYY`

## @menus

### lib/menus-docked
1. DO `open('#dp-docked')` → EXPECT `ok: true`
2. DO `click('S .dp-ui__menu-button--month')`; CHECK `state()` → EXPECT `menuOpen: true`
3. SHOT `month-menu` root=`S`
4. DO `click('S .dp-ui__menu-item:not(.dp-ui__menu-item--selected)')`; CHECK `state()` → EXPECT `menuOpen: false`, `captions[0]` = the chosen month
5. DO `click('S .dp-ui__menu-button--year')`; CHECK `state()` → EXPECT `menuOpen: true`
6. SHOT `year-menu` root=`S`
7. DO `click('S .dp-ui__text-button--cancel')`; DO `waitClosed()` → EXPECT `closed: true`

### lib/menus-year-grid
1. DO `open('#dp-modal')` → EXPECT `ok: true`
2. DO `click('S .dp-ui__menu-button--year-grid')`; DO `settle()`
3. SHOT `year-grid` root=`S`
4. DO `click('S .dp-ui__year-selection-item:first-child')`; DO `settle()`
5. SHOT `after-year` root=`S`
6. DO `click('S .dp-ui__text-button--cancel')`; DO `waitClosed()` → EXPECT `closed: true`

## @multiple

### lib/multiple
1. DO `open('#dp-multiple-docked')` → EXPECT `ok: true`
2. DO `pick(2)`; DO `pick(5)`; DO `pick(8)`; CHECK `state()` → EXPECT `selected` has 3 dates
3. SHOT `three` root=`S`
4. DO `pick(5)` (same day again); CHECK `state()` → EXPECT `selected` has 2 dates
5. DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()` → EXPECT `closed: true`
6. CHECK `value('#dp-multiple-docked')` → EXPECT two `MM/DD/YYYY` dates

## @range

### lib/range-modal
1. DO `open('#dp-range-modal')` → EXPECT `ok: true`, `mode: 'modal'`, `range: true`, `fullscreen: false`
2. DO `pick(3)`; DO `pick(8)`; CHECK `state()` → EXPECT `rangeStart`, `rangeEnd` set, `confirmDisabled: false`, `headline` = `<Mon d> – <Mon d>`
3. SHOT `picked` root=`S`
4. DO `click('S .dp-ui__icon-button--switch-view')`; DO `settle()`; CHECK `state()` → EXPECT `inputView: true`
5. SHOT `input-view` root=`S`
6. DO `click('S .dp-ui__text-button--cancel')`; DO `waitClosed()` → EXPECT `closed: true`
7. CHECK `value('#dp-range-modal')` → EXPECT unchanged from before step 1

### lib/range-fullscreen
- vp: m
1. DO `open('#dp-range-modal')` → EXPECT `ok: true`, `mode: 'modal'`, `fullscreen: true`
2. SHOT `open` root=`S`
3. DO `click('S .dp-ui__icon-button--close')`; DO `waitClosed()` → EXPECT `closed: true`

### lib/range-inline
1. DO `pick(2, '#range-inline-container')`; DO `pick(6, '#range-inline-container')`
2. CHECK `state('#dp-range-inline', '#range-inline-container')` → EXPECT `mode: 'inline'`, `rangeStart`, `rangeEnd` set
3. SHOT `picked` root=`#range-inline-container`

## @presets

### lib/presets-column
1. DO `openStable('#cmb-pre-two')` → EXPECT `ok: true`, `stable: true` (one layout from the first frame; a second entry in `layouts` is a layout jump on open)
2. CHECK `state()` → EXPECT `presets: true`, `multiMonth: true`, `display: 'grid'`
3. DO `click('S .dp-ui__preset:nth-child(2)')`; CHECK `state()` → EXPECT `pressedPreset` set, `rangeStart`, `rangeEnd` set
4. SHOT `preset` root=`S`
5. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`

### lib/presets-modal
1. DO `open('#dp-presets-modal')` → EXPECT `ok: true`, `mode: 'modal'`, `presets` absent (chip row in a dialog)
2. DO `click('S .dp-ui__preset:nth-child(2)')`; CHECK `state()` → EXPECT `pressedPreset: 'Last 7 days'`, `rangeEnd: <today>`, `inRange: 5`
3. SHOT `preset` root=`S`
4. DO `click('S .dp-ui__text-button--cancel')`; DO `waitClosed()` → EXPECT `closed: true`

## @months

### lib/months-docked
1. DO `openStable('#cmb-months-range')` → EXPECT `stable: true`
2. DO `outside()`; DO `waitClosed()`
3. DO `open('#dp-months-single')` → EXPECT `multiMonth: true`, `captions` = this month and the next
4. SHOT `open` root=`S`
5. DO `click('S .dp-ui__icon-button--next-month')`; CHECK `state()` → EXPECT `captions` moved by the paging step
6. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`

## @input

### lib/input-view
1. DO `open('#dp-input-view')` → EXPECT `ok: true`, `inputView: true`
2. SHOT `open` root=`S`
3. DO `type('S .dp-ui__text-field-input', '10/15/2026', { keepFocus: true })`
4. DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()` → EXPECT `closed: true`
5. CHECK `value('#dp-input-view')` → EXPECT `value: '10/15/2026'`

### lib/input-typed
1. DO `type('#dp-default', '10/20/2026')`; CHECK `state('#dp-default')` → EXPECT `inputInvalid` absent or `'false'`
2. DO `type('#dp-default', 'not a date')`; CHECK `state('#dp-default')` → EXPECT `inputInvalid: 'true'`
3. DO `type('#dp-default', '')`

## @rules

### lib/rules-disabled
1. DO `open('#dp-disabled-days')` → EXPECT `ok: true`
2. DO `disabledDays()` → EXPECT `disabled` > 0, `disabled` < `total`
3. SHOT `open` root=`S`
4. DO `click('S td.dp-ui__date--disabled:not(.dp-ui__date--outside-month)')`; CHECK `state()` → EXPECT `selected` empty
5. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`

## @form

### lib/form
1. CHECK `state('#dp-form')` → EXPECT `inputValue: '17/10/2026'`, `formValue: '2026-10-17'`
2. DO `open('#dp-form')`; DO `pick(0)`; DO `click('S .dp-ui__text-button--confirm')`; DO `waitClosed()`
3. CHECK `state('#dp-form')` → EXPECT `formValue: <iso>`, `inputValue` = `<iso>` as `DD/MM/YYYY`

## @keyboard

### lib/keyboard-return-focus
1. DO `open('#dp-modal')` → EXPECT `focusInSurface: true`
2. Record `focusin` targets, then KEY `Tab` (×4); CHECK → EXPECT the order Cancel → OK → the pencil (`dp-ui__icon-button--switch-view`), `focusInSurface: true` after the 4th Tab. After OK the native `<dialog>` hands focus to the browser UI for one Tab (`active` reads `body`), never to the page
3. KEY `Escape`; DO `waitClosed()` → EXPECT `closed: true`
4. CHECK `state('#dp-modal')` → EXPECT `active: input#dp-modal…`

## @docked

### lib/docked-positioning
1. DO `open('#dp-docked')` → EXPECT `placement: 'bottom'`, `positioning: 'anchor'`
2. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`
3. DO `open('#dp-scroll')` → EXPECT `ok: true`, `mode: 'docked'`
4. SHOT `scroll-box` root=`S`
5. DO `outside()`; DO `waitClosed()` → EXPECT `closed: true`
6. DO `openStable('#dp-docked')` → EXPECT `stable: true`
7. DO `outside()`; DO `waitClosed()`

## @modal

### lib/modal-mobile
- vp: m
1. DO `open('#dp-default')` → EXPECT `mode: 'modal'` (auto picks modal below 600 px)
2. SHOT `open` root=`S`
3. DO `click('S .dp-ui__text-button--cancel')`; DO `waitClosed()` → EXPECT `closed: true`

### lib/modal-rtl
1. DO `open('#dp-rtl')` → EXPECT `ok: true`; CHECK `count('S.dp-ui__container--rtl')` → EXPECT `count: 1`
2. SHOT `open` root=`S`
3. DO `outside()`; DO `waitClosed()`

## @inline

### lib/inline
1. CHECK `state(null, '#inline-container')` → EXPECT `mode: 'inline'`
2. DO `pick(5, '#inline-container')`; CHECK `state('#dp-inline', '#inline-container')` → EXPECT `selected: [<iso>]`
3. SHOT `picked` root=`#inline-container`

## @api

### lib/api-probe
Navigate fresh (probes live on the page).
1. DO `probe('probe-a', { ui: { displayMode: 'docked' } })` → EXPECT `ok: true`
2. DO `call('probe-a', 'open')`; DO `waitOpen()` → EXPECT `open: true`; CHECK `log('probe-a')` → EXPECT `log` contains `open`
3. DO `call('probe-a', 'setValue', '2026-10-05')`; CHECK `call('probe-a', 'getValue')` → EXPECT `result.value: '2026-10-05'`
4. DO `call('probe-a', 'close')`; DO `waitClosed()` → EXPECT `closed: true`; CHECK `log('probe-a')` → EXPECT contains `close`
5. DO `call('probe-a', 'setOptions', { calendar: { mode: 'range' } })`; DO `call('probe-a', 'open')`; DO `waitOpen()` → EXPECT `range: true`
6. DO `outside()`; DO `waitClosed()`; DO `call('probe-a', 'destroy')` → CHECK `errors()` → EXPECT none

## @themes

### lib/themes
Navigate fresh. For each theme in `basic`, `m3-green`, `crane`, `crane-straight`, `m2`,
`glassmorphic`, `pastel`, `ai`, `cyberpunk`, `blueprint` (quick profile: `basic` and the themes the
task changed):
1. DO `probe('t-<X>', { ui: { theme: '<X>', displayMode: 'docked' } })`; DO `call('t-<X>', 'open')`; DO `waitOpen()` → EXPECT `theme: '<X>'`
2. SHOT `<X>` root=`S`
3. DO `outside()`; DO `waitClosed()`
`basic` and `blueprint` also run once with `colorScheme: 'dark'` (shot `<X>-dark`).

## @theme:<X>

### lib/theme-<X>
`lib/themes` for `<X>` only, plus a range probe
(`{ ui: { theme: '<X>', displayMode: 'docked' }, calendar: { mode: 'range' } }`, `pick(3)`, `pick(8)`, shot `<X>-range`).

## Theme variants (style rule)

### lib/variants-<tag>
Run the first scenario of `<tag>` again on a probe for `m3-green`, `cyberpunk` and `blueprint`
dark (same options as the demo picker the scenario uses, plus `ui.theme` / `ui.colorScheme`). SHOT
each state the scenario shoots, name suffixed with the theme.
