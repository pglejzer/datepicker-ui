import {
  ACTIVE_FIELD,
  PRESETS,
  PRESETS_CODE,
  column,
  field,
  inlineBox,
  inlineUi,
  isoInDays,
  labelled,
  row,
} from "./combinations-shared";
import type { CombinationDemo } from "./combinations-shared";

const docked = { displayMode: "docked" } as const;
const modal = { displayMode: "modal" } as const;
const range = { mode: "range" } as const;

const pair = (id: string): string =>
  row(
    labelled(`${id}-start`, "Start", ACTIVE_FIELD),
    labelled(`${id}-end`, "End", ACTIVE_FIELD),
  );

export const SURFACE_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-surfaces-single",
    title: "Single · docked, modal, inline",
    description: "The same single-date picker on each of the three surfaces.",
    html: row(
      field("cmb-surf-single-docked", "Docked"),
      field("cmb-surf-single-modal", "Modal"),
      inlineBox("cmb-surf-single-inline", "Inline"),
    ),
    pickers: [
      { target: "#cmb-surf-single-docked", options: { ui: docked } },
      { target: "#cmb-surf-single-modal", options: { ui: modal } },
      {
        target: "#cmb-surf-single-inline",
        options: { ui: { inline: inlineUi("cmb-surf-single-inline") } },
      },
    ],
  },
  {
    id: "cmb-surfaces-multiple",
    title: "Multiple · docked, modal, inline",
    description: "Multiple selection with a limit of 4 days, on each surface.",
    html: row(
      field("cmb-surf-multi-docked", "Docked"),
      field("cmb-surf-multi-modal", "Modal"),
      inlineBox("cmb-surf-multi-inline", "Inline"),
    ),
    pickers: [
      {
        target: "#cmb-surf-multi-docked",
        options: {
          calendar: { mode: "multiple", multiple: { max: 4 } },
          ui: docked,
        },
      },
      {
        target: "#cmb-surf-multi-modal",
        options: {
          calendar: { mode: "multiple", multiple: { max: 4 } },
          ui: modal,
        },
      },
      {
        target: "#cmb-surf-multi-inline",
        options: {
          calendar: { mode: "multiple", multiple: { max: 4 } },
          ui: { inline: inlineUi("cmb-surf-multi-inline") },
        },
      },
    ],
  },
  {
    id: "cmb-surfaces-range",
    title: "Range · docked, modal, inline",
    description:
      "A range picker on each surface. The modal goes full screen on a narrow window.",
    html: row(
      field("cmb-surf-range-docked", "Docked"),
      field("cmb-surf-range-modal", "Modal"),
      inlineBox("cmb-surf-range-inline", "Inline"),
    ),
    pickers: [
      {
        target: "#cmb-surf-range-docked",
        options: { calendar: range, ui: docked },
      },
      {
        target: "#cmb-surf-range-modal",
        options: { calendar: range, ui: modal },
      },
      {
        target: "#cmb-surf-range-inline",
        options: {
          calendar: range,
          ui: { inline: inlineUi("cmb-surf-range-inline") },
        },
      },
    ],
  },
  {
    id: "cmb-fullscreen",
    title: "Range modal · ui.fullscreen",
    description:
      "fullscreen: true (below 600 px, default), false (never), 1400 (full screen on most desktop windows), 840 (below 840 px).",
    html: row(
      field("cmb-full-true", "fullscreen: true"),
      field("cmb-full-false", "fullscreen: false"),
      field("cmb-full-1400", "fullscreen: 1400"),
      field("cmb-full-840", "fullscreen: 840"),
    ),
    pickers: [
      {
        target: "#cmb-full-true",
        options: { calendar: range, ui: { ...modal, fullscreen: true } },
      },
      {
        target: "#cmb-full-false",
        options: { calendar: range, ui: { ...modal, fullscreen: false } },
      },
      {
        target: "#cmb-full-1400",
        options: { calendar: range, ui: { ...modal, fullscreen: 1400 } },
      },
      {
        target: "#cmb-full-840",
        options: { calendar: range, ui: { ...modal, fullscreen: 840 } },
      },
    ],
  },
];

export const PRESET_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-presets-docked-months",
    title: "Presets · docked column and two months",
    description:
      "Presets beside two months, and presets with closeOnSelect (a preset commits and closes).",
    html: row(
      field("cmb-pre-two", "Presets + 2 months"),
      field("cmb-pre-close", "Presets + closeOnSelect"),
    ),
    pickers: [
      {
        target: "#cmb-pre-two",
        options: {
          calendar: { ...range, months: 2, range: { presets: PRESETS } },
          ui: docked,
        },
      },
      {
        target: "#cmb-pre-close",
        options: {
          calendar: { ...range, range: { presets: PRESETS } },
          ui: docked,
          behavior: { closeOnSelect: true },
        },
      },
    ],
    code: `${PRESETS_CODE}

new DatepickerUI("#cmb-pre-two", {
  calendar: { mode: "range", months: 2, range: { presets } },
  ui: { displayMode: "docked" },
}).create();

new DatepickerUI("#cmb-pre-close", {
  calendar: { mode: "range", range: { presets } },
  ui: { displayMode: "docked" },
  behavior: { closeOnSelect: true },
}).create();`,
  },
  {
    id: "cmb-presets-inline-modal",
    title: "Presets · inline and modal",
    description: "Presets inline (column or chips) and in a modal (chip row).",
    html: row(
      inlineBox("cmb-pre-inline", "Inline"),
      field("cmb-pre-modal", "Modal"),
    ),
    pickers: [
      {
        target: "#cmb-pre-inline",
        options: {
          calendar: { ...range, range: { presets: PRESETS } },
          ui: { inline: inlineUi("cmb-pre-inline") },
        },
      },
      {
        target: "#cmb-pre-modal",
        options: {
          calendar: { ...range, range: { presets: PRESETS } },
          ui: modal,
        },
      },
    ],
    code: `${PRESETS_CODE}

new DatepickerUI("#cmb-pre-inline", {
  calendar: { mode: "range", range: { presets } },
  ui: { inline: { enabled: true, container: "#cmb-pre-inline-box" } },
}).create();

new DatepickerUI("#cmb-pre-modal", {
  calendar: { mode: "range", range: { presets } },
  ui: { displayMode: "modal" },
}).create();`,
  },
  {
    id: "cmb-presets-limits-dark",
    title: "Presets · maxDate, length limits, dark",
    description:
      "With maxDate ten days ago most presets are disabled; with maxLength: 7 the longer presets are disabled; and presets in a dark scheme.",
    html: row(
      field("cmb-pre-max", "maxDate: 10 days ago"),
      field("cmb-pre-length", "maxLength: 7"),
      field("cmb-pre-dark", "Dark"),
    ),
    pickers: [
      {
        target: "#cmb-pre-max",
        options: {
          calendar: {
            ...range,
            maxDate: isoInDays(-10),
            range: { presets: PRESETS },
          },
        },
      },
      {
        target: "#cmb-pre-length",
        options: {
          calendar: { ...range, range: { maxLength: 7, presets: PRESETS } },
        },
      },
      {
        target: "#cmb-pre-dark",
        options: {
          calendar: { ...range, months: 2, range: { presets: PRESETS } },
          ui: { colorScheme: "dark" },
        },
      },
    ],
    fixedScheme: true,
    code: `${PRESETS_CODE}

new DatepickerUI("#cmb-pre-max", {
  calendar: { mode: "range", maxDate: "${isoInDays(-10)}", range: { presets } },
}).create();

new DatepickerUI("#cmb-pre-length", {
  calendar: { mode: "range", range: { maxLength: 7, presets } },
}).create();

new DatepickerUI("#cmb-pre-dark", {
  calendar: { mode: "range", months: 2, range: { presets } },
  ui: { colorScheme: "dark" },
}).create();`,
  },
];

export const SPLIT_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-split-surfaces",
    title: "Start / End fields · docked and modal",
    description:
      "ui.endInput with a docked popover and with a modal. Clicking a field opens the picker on that end.",
    html: column(pair("cmb-split-docked"), pair("cmb-split-modal")),
    pickers: [
      {
        target: "#cmb-split-docked-start",
        options: {
          calendar: range,
          ui: { ...docked, endInput: "#cmb-split-docked-end" },
        },
      },
      {
        target: "#cmb-split-modal-start",
        options: {
          calendar: range,
          ui: { ...modal, endInput: "#cmb-split-modal-end" },
        },
      },
    ],
  },
  {
    id: "cmb-split-mask-months",
    title: "Start / End fields · mask and two months",
    description:
      "Typed text masked to ui.format (digits only) in the pair, and a pair that opens two months.",
    html: column(pair("cmb-split-mask"), pair("cmb-split-two")),
    pickers: [
      {
        target: "#cmb-split-mask-start",
        options: {
          calendar: range,
          ui: { mask: true, endInput: "#cmb-split-mask-end" },
        },
      },
      {
        target: "#cmb-split-two-start",
        options: {
          calendar: { ...range, months: 2 },
          ui: { endInput: "#cmb-split-two-end" },
        },
      },
    ],
  },
  {
    id: "cmb-split-limits-presets",
    title: "Start / End fields · length limits and presets",
    description:
      "A pair limited to 3-7 days, and a pair with presets and closeOnSelect.",
    html: column(pair("cmb-split-limit"), pair("cmb-split-presets")),
    pickers: [
      {
        target: "#cmb-split-limit-start",
        options: {
          calendar: { ...range, range: { minLength: 3, maxLength: 7 } },
          ui: { endInput: "#cmb-split-limit-end" },
        },
      },
      {
        target: "#cmb-split-presets-start",
        options: {
          calendar: { ...range, range: { presets: PRESETS } },
          ui: { endInput: "#cmb-split-presets-end" },
          behavior: { closeOnSelect: true },
        },
      },
    ],
    code: `${PRESETS_CODE}

new DatepickerUI("#cmb-split-limit-start", {
  calendar: { mode: "range", range: { minLength: 3, maxLength: 7 } },
  ui: { endInput: "#cmb-split-limit-end" },
}).create();

new DatepickerUI("#cmb-split-presets-start", {
  calendar: { mode: "range", range: { presets } },
  ui: { endInput: "#cmb-split-presets-end" },
  behavior: { closeOnSelect: true },
}).create();`,
  },
  {
    id: "cmb-split-polish",
    title: "Start / End fields · Polish locale and format",
    description:
      'calendar.locale "pl-PL" with ui.format "dd.MM.yyyy" and the mask, two months, weeks starting Monday.',
    html: pair("cmb-split-pl"),
    pickers: [
      {
        target: "#cmb-split-pl-start",
        options: {
          calendar: {
            ...range,
            locale: "pl-PL",
            months: 2,
            weekStart: "monday",
          },
          ui: {
            format: "dd.MM.yyyy",
            mask: true,
            endInput: "#cmb-split-pl-end",
          },
        },
      },
    ],
  },
];
