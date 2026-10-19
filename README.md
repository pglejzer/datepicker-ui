# datepicker-ui

A date picker for web forms. Attach it to an `<input>` and users pick a date, a range or several dates on a Material Design 3 calendar.

[![npm version](https://badge.fury.io/js/@pglejzer%2Fdatepicker-ui.svg)](https://www.npmjs.com/package/@pglejzer/datepicker-ui)
[![downloads](https://img.shields.io/npm/dm/@pglejzer/datepicker-ui)](https://npmcharts.com/compare/@pglejzer/datepicker-ui?minimal=true)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://img.shields.io/npm/l/@pglejzer/datepicker-ui)
[![Coverage Status](https://coveralls.io/repos/github/pglejzer/datepicker-ui/badge.svg?branch=main)](https://coveralls.io/github/pglejzer/datepicker-ui?branch=main)
[![CI](https://github.com/pglejzer/datepicker-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/pglejzer/datepicker-ui/actions/workflows/ci.yml)
[![Socket Badge](https://badge.socket.dev/npm/package/@pglejzer/datepicker-ui/1.0.0)](https://badge.socket.dev/npm/package/@pglejzer/datepicker-ui/1.0.0)

[Live demo](https://timepicker-ui.vercel.app/datepicker) · [Documentation](https://timepicker-ui.vercel.app/datepicker/quick-start) · [Changelog](./CHANGELOG.md) · [timepicker-ui](https://timepicker-ui.vercel.app)

## Why datepicker-ui

- Zero dependencies.
- About 40 KB gzipped JavaScript.
- Material Design 3 look, with light and dark modes and ten themes.
- Plain JS API, so it works the same in React, Vue, Angular, Svelte or without a framework.
- Doesn't touch `window` or `document` on import, so it's safe in Next.js, Nuxt and other SSR setups.
- Keyboard and screen reader support ([accessibility](https://timepicker-ui.vercel.app/datepicker/docs/accessibility)).
- All texts, the screen-reader ones included, can be translated via `labels`. Month and day names come from `Intl` ([localization](https://timepicker-ui.vercel.app/datepicker/docs/localization)).

## Features

- [Single date, range and multiple dates](https://timepicker-ui.vercel.app/datepicker/docs/selection-modes), with [range limits](https://timepicker-ui.vercel.app/datepicker/examples/selection/range-limits)
- [Docked popover](https://timepicker-ui.vercel.app/datepicker/examples/basic/docked), [modal dialog](https://timepicker-ui.vercel.app/datepicker/examples/basic/modal) and [inline calendar](https://timepicker-ui.vercel.app/datepicker/examples/basic/inline), with a full-screen range picker on small screens ([display modes](https://timepicker-ui.vercel.app/datepicker/docs/display-modes))
- [Typed input](https://timepicker-ui.vercel.app/datepicker/docs/typed-input) with an opt-in mask, and a switch between the calendar and the input view
- [Several months side by side](https://timepicker-ui.vercel.app/datepicker/examples/features/several-months)
- [Range presets](https://timepicker-ui.vercel.app/datepicker/examples/selection/range-presets) and [two fields for a range](https://timepicker-ui.vercel.app/datepicker/examples/selection/two-fields)
- [Month and year pickers](https://timepicker-ui.vercel.app/datepicker/docs/precision)
- [Disabled dates](https://timepicker-ui.vercel.app/datepicker/docs/disabled-dates), [min and max](https://timepicker-ui.vercel.app/datepicker/examples/constraints/min-max) and [validation](https://timepicker-ui.vercel.app/datepicker/examples/constraints/validation) with your own rules
- [Per-day content](https://timepicker-ui.vercel.app/datepicker/examples/features/per-day-content) and [decorated dates](https://timepicker-ui.vercel.app/datepicker/examples/features/decorate-dates)
- [Ten themes](https://timepicker-ui.vercel.app/datepicker/docs/themes), [dark mode](https://timepicker-ui.vercel.app/datepicker/examples/themes/dark-mode) and [custom styling](https://timepicker-ui.vercel.app/datepicker/docs/styling)
- [Form integration](https://timepicker-ui.vercel.app/datepicker/examples/advanced/forms) through a hidden ISO value
- [TypeScript](https://timepicker-ui.vercel.app/datepicker/api/typescript) types included

## Installation

```bash
npm install @pglejzer/datepicker-ui
```

From a CDN, the UMD build exposes the class as the global `DatepickerUI`. More in the [installation guide](https://timepicker-ui.vercel.app/datepicker/installation).

## Quick start

```html
<input id="date" />
```

```js
import DatepickerUI from "@pglejzer/datepicker-ui";
import "@pglejzer/datepicker-ui/index.css";

const picker = new DatepickerUI("#date", {
  calendar: { minDate: "today" },
  ui: { theme: "m3-green" },
  callbacks: {
    onConfirm: ({ value }) => console.log(value),
  },
});

picker.create();
```

The first argument is a selector, an `<input>` or an element that contains an `<input>`. The options argument is optional. Step by step: [quick start](https://timepicker-ui.vercel.app/datepicker/quick-start) and [getting started example](https://timepicker-ui.vercel.app/datepicker/examples/basic/getting-started).

## API

```js
picker.create(); // set up the picker, mounts it when inline
picker.open();
picker.close();
picker.destroy({ keepInputValue: true });
picker.getValue(); // DateValue, { start, end }, DateValue[] or null, by calendar.mode
picker.setValue("2025-03-14"); // a Date or an ISO string; { start, end } or an array in other modes
picker.setOptions({ ui: { theme: "crane" } });
picker.setActiveEnd("end"); // range mode: the end the next pick sets
picker.getElement(); // the .dp-ui host element

const off = picker.on("confirm", ({ value }) => {}); // on() and once() return a function that removes the handler
off();
picker.on("cancel", ({ reason }) => {});
picker.on("open", ({ mode }) => {});
picker.on("close", () => {});
picker.on("update", ({ options }) => {});
picker.on("error", ({ code, message }) => {});
picker.on("select:day", ({ value, selected }) => {});
picker.on("select:month", ({ year, month }) => {});
picker.on("select:year", ({ year }) => {});
picker.on("navigate", ({ year, month, direction, source }) => {});
picker.on("range:start", ({ value }) => {});
picker.on("range:end", ({ start, end }) => {});
picker.once("confirm", handler);
picker.off("confirm", handler);

DatepickerUI.getById("my-id");
DatepickerUI.getAllInstances();
DatepickerUI.destroyAll();
```

Docs: [methods](https://timepicker-ui.vercel.app/datepicker/api/methods), [events](https://timepicker-ui.vercel.app/datepicker/api/events), [events example](https://timepicker-ui.vercel.app/datepicker/examples/advanced/events), [external API example](https://timepicker-ui.vercel.app/datepicker/examples/advanced/external-api)

## Options

Grouped by area into `calendar`, `ui`, `labels`, `behavior` and `callbacks`. Pass only what you need, the rest has defaults ([full list](https://timepicker-ui.vercel.app/datepicker/api/options)).

```typescript
new DatepickerUI(input, {
  calendar: {
    mode: "single" | "range" | "multiple",       // default "single"
    range: { minLength, maxLength, presets: [] },
    multiple: { max },
    months: 1,                  // months side by side, docked and inline
    precision: "day" | "month" | "year",         // default "day", single mode only
    locale: "en-GB",            // default: page locale
    minDate: "today", maxDate: "2026-12-31",
    disabledDates: [], enabledDates: [], disabledWeekdays: [0, 6],
    isDateDisabled: (date) => false,
    decorateDate: (date) => ({ className, badge, label }),
    renderDate: (date) => "$120",   // content under the day number
    validate: (value) => null,      // or a message to mark the field invalid
  },
  ui: {
    displayMode: "auto" | "docked" | "modal",    // default "auto"
    inline: { enabled: false, container: "#calendar" | element },
    format: "auto" | "dd.MM.yyyy",
    theme: "basic" | "m3-green" | "crane" | "blueprint" | ...,
    colorScheme: "auto" | "light" | "dark",      // default "auto"
    toggleButton: "#open" | element,
    endInput: "#end" | element, // second input of a range
    startView: "day" | "month" | "year",
    mask: false,
    cssClass: "",
  },
  labels: { title, confirm, cancel, today, clear, previousMonth, nextMonth, invalidDate, ... },
  behavior: { closeOnSelect: false, commitOnChange: false, returnFocus: true, id: "" },
  callbacks: { onOpen, onClose, onCancel, onConfirm, onUpdate, onError, onSelectDay, onSelectMonth, onSelectYear, onNavigate, onRangeStart, onRangeEnd },
});
```

An invalid value falls back to the default and emits an `error` event with code `invalid-option`. More on [layouts](https://timepicker-ui.vercel.app/datepicker/docs/layouts) and [changing options at runtime](https://timepicker-ui.vercel.app/datepicker/examples/advanced/set-options).

## Themes

[Preview all of them](https://timepicker-ui.vercel.app/datepicker/examples/themes/all-themes): `basic` (the default, light and dark), `blueprint` (follows `ui.colorScheme`), `m3-green`, `crane`, `crane-straight`, `m2`, `glassmorphic`, `pastel`, `ai` and `cyberpunk`.

`main.css` is required and already includes `basic`. The other themes are separate files:

```js
import "@pglejzer/datepicker-ui/main.css";
import "@pglejzer/datepicker-ui/theme-m2.css";

new DatepickerUI("#date", { ui: { theme: "m2" } });
```

Or import `@pglejzer/datepicker-ui/index.css` to get the core and every theme. Writing your own theme: [themes guide](https://timepicker-ui.vercel.app/datepicker/docs/themes), [custom theme example](https://timepicker-ui.vercel.app/datepicker/examples/themes/custom-theme), [CSS classes](https://timepicker-ui.vercel.app/datepicker/api/css-classes) and [CSS variables](https://timepicker-ui.vercel.app/datepicker/api/css-variables).

## Frameworks

React:

```tsx
import { useEffect, useRef } from "react";
import DatepickerUI from "@pglejzer/datepicker-ui";
import "@pglejzer/datepicker-ui/index.css";

function DateField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const picker = new DatepickerUI(ref.current);
    picker.create();
    return () => picker.destroy();
  }, []);
  return <input ref={ref} />;
}
```

The same pattern works in Vue, Svelte and Angular. See the [frameworks and SSR guide](https://timepicker-ui.vercel.app/datepicker/docs/frameworks).

## Kit

`@pglejzer/datepicker-ui/kit` is a second entry for packages built on top of the picker. It exports the popover, dialog and inline surfaces (`PopoverHost`, `DialogHost`, `InlineHost`), the rule that picks docked or modal (`resolveSurfaceMode`), color scheme detection and the date text helpers (`parseDate`, `formatDate`, `resolvePattern`, `maskDateText`). Like the main entry, it is safe to import during server rendering. See the [kit guide](https://timepicker-ui.vercel.app/datepicker/docs/kit).

```js
import { parseDate, resolvePattern } from "@pglejzer/datepicker-ui/kit";
```

## Need a time picker?

[timepicker-ui](https://timepicker-ui.vercel.app) is the companion time picker from the same author. It has no dependencies and uses the same theme names, so the two pickers match.

```bash
npm install timepicker-ui
```

The [date and time guide](https://timepicker-ui.vercel.app/datepicker/docs/with-timepicker) shows how to use both pickers in one form, and the [date and time example](https://timepicker-ui.vercel.app/datepicker/examples/advanced/date-and-time) shows it running.

## Development

See [`app/README.md`](./app/README.md).

## Contributing

Issues and PRs welcome on [GitHub](https://github.com/pglejzer/datepicker-ui/issues).

## License

MIT © [Piotr Glejzer](https://github.com/pglejzer)
