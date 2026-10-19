# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-19

### Added

- Three surfaces: a docked popover, a modal dialog and an inline calendar (`ui.inline`). `ui.displayMode: "auto"` picks docked or modal from the viewport size
- A range picker in a modal opens full screen on small windows. `ui.fullscreen` sets the width limit, or `false` turns it off
- In a range picker, dragging the month list with the mouse scrolls it and settles on a month when released. The wheel and touch still scroll freely
- Selection modes through `calendar.mode`: `single`, `range` and `multiple`. `calendar.multiple.max` caps the number of days
- Range length limits with `calendar.range.minLength` and `calendar.range.maxLength`, and ready-made ranges with `calendar.range.presets`
- Month and year pickers with `calendar.precision`, where the value is `YYYY-MM` or `YYYY`
- Several months side by side with `calendar.months`. `calendar.pageBy` sets whether the arrows move one month or a whole view
- Typed input with a switch between the calendar and the text field, controlled by `ui.viewSwitch` and `ui.initialView`. `ui.mask` formats typed digits to `ui.format`
- `ui.endInput` turns a range into two page inputs, Start and End
- Disabled days through `calendar.minDate`, `calendar.maxDate`, `calendar.disabledDates`, `calendar.enabledDates`, `calendar.disabledWeekdays` and `calendar.isDateDisabled`
- `calendar.decorateDate` adds a class, a badge or an accessible label to a day, and `calendar.renderDate` puts content such as a price inside the day cell
- `calendar.validate` marks the field invalid with your own message and never blocks a pick or a commit
- The `error` event carries a `code`, and for unavailable dates a `reason` such as `min`, `max`, `disabled` or `weekday`
- `ui.startView` opens the picker on the day, month or year panel. Grid options: `ui.fixedWeeks`, `ui.outsideDays`, `ui.weekNumbers`, `ui.todayButton`, `ui.clearButton` and `ui.footer`
- Themes `basic`, `m3-green`, `crane`, `crane-straight`, `m2`, `glassmorphic`, `pastel`, `ai`, `cyberpunk` and `blueprint`, set with `ui.theme`
- `ui.colorScheme` accepts `light`, `dark` and `auto`. `auto` checks the background behind the input, then the page `color-scheme`, then the OS
- `calendar.locale` drives `Intl` month and weekday names, the headline and the input format, and `calendar.weekStart` sets the first day. Numbers show in the locale's digits, and right-to-left layouts are supported
- The day grid follows the WAI-ARIA date picker pattern with full keyboard support, and a live region announces month and selection changes
- With `prefers-reduced-motion: reduce`, slides and resizes give way to short fades
- An input with a `name` submits ISO values through a hidden input. The visible input gets `input` and `change` events on commit, and a form reset restores the initial value
- Methods `create`, `open`, `close`, `destroy`, `getValue`, `setValue`, `setOptions` and `setActiveEnd`, plus `on`, `once` and `off`, where `on` and `once` return an unsubscribe function
- Static methods `DatepickerUI.getById`, `DatepickerUI.getAllInstances` and `DatepickerUI.destroyAll`
- Events `open`, `close`, `cancel`, `confirm`, `update`, `error`, `select:day`, `select:month`, `select:year`, `navigate`, `range:start` and `range:end`, each with a matching `callbacks.on*` option
- A second entry, `@pglejzer/datepicker-ui/kit`, exports the surface hosts, surface-mode rules, color-scheme detection and date text helpers for companion packages
- No runtime dependencies, and the package imports safely during server rendering
- ESM, CommonJS, TypeScript declarations and a UMD build for CDNs
