import {
  column,
  field,
  inlineBox,
  inlineUi,
  isoInDays,
  isWeekend,
  output,
  row,
} from "./combinations-shared";
import type { CombinationDemo } from "./combinations-shared";

const range = { mode: "range" } as const;

const NIGHT = 24 * 60 * 60 * 1000;

export const RULE_OUTPUTS: ReadonlyMap<string, string> = new Map([
  ["#cmb-val-single", "cmb-out-validate"],
  ["#cmb-val-range", "cmb-out-validate"],
  ["#cmb-val-multi", "cmb-out-validate"],
  ["#cmb-rule-min", "cmb-out-rules"],
  ["#cmb-rule-weekdays", "cmb-out-rules"],
  ["#cmb-rule-fn", "cmb-out-rules"],
  ["#cmb-rule-lists", "cmb-out-rules"],
  ["#cmb-rule-minlen", "cmb-out-lengths"],
  ["#cmb-rule-maxlen", "cmb-out-lengths"],
  ["#cmb-rule-multi", "cmb-out-lengths"],
]);

export const RULE_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-validate-modes",
    title: "calendar.validate · single, range, multiple",
    description:
      "Weekdays only for a single date, at most 7 nights for a range, at most 3 days for multiple. A message marks the field invalid and shows below as code and message; it never blocks the pick.",
    html: column(
      row(
        field("cmb-val-single", "Weekdays only"),
        field("cmb-val-range", "Max 7 nights"),
        field("cmb-val-multi", "Max 3 days"),
      ),
      output("cmb-out-validate"),
    ),
    pickers: [
      {
        target: "#cmb-val-single",
        options: {
          calendar: {
            validate: (value) => {
              if (value === null || !("date" in value)) return null;
              return isWeekend(value.date) ? "Weekdays only" : null;
            },
          },
        },
      },
      {
        target: "#cmb-val-range",
        options: {
          calendar: {
            ...range,
            validate: (value) => {
              if (value === null || !("start" in value)) return null;
              const nights =
                (value.end.date.getTime() - value.start.date.getTime()) / NIGHT;
              return nights > 7 ? "Stay at most 7 nights" : null;
            },
          },
        },
      },
      {
        target: "#cmb-val-multi",
        options: {
          calendar: {
            mode: "multiple",
            validate: (value) => {
              if (value === null || !("length" in value)) return null;
              return value.length > 3 ? "Pick at most 3 days" : null;
            },
          },
        },
      },
    ],
    code: `new DatepickerUI("#cmb-val-single", {
  calendar: {
    validate: (value) => {
      if (value === null || !("date" in value)) return null;
      const day = value.date.getDay();
      return day === 0 || day === 6 ? "Weekdays only" : null;
    },
  },
}).create();

new DatepickerUI("#cmb-val-range", {
  calendar: {
    mode: "range",
    validate: (value) => {
      if (value === null || !("start" in value)) return null;
      const nights = (value.end.date - value.start.date) / 86400000;
      return nights > 7 ? "Stay at most 7 nights" : null;
    },
  },
}).create();

new DatepickerUI("#cmb-val-multi", {
  calendar: {
    mode: "multiple",
    validate: (value) =>
      Array.isArray(value) && value.length > 3 ? "Pick at most 3 days" : null,
  },
}).create();

picker.on("error", ({ code, message }) => console.log(code, message));`,
  },
  {
    id: "cmb-rules-days",
    title: "Day rules · minDate, weekdays, function, lists",
    description:
      'minDate: "today", disabledWeekdays (Sunday and Saturday), isDateDisabled (even days), and disabledDates / enabledDates. Type a blocked date to see the error.',
    html: column(
      row(
        field("cmb-rule-min", 'minDate: "today"'),
        field("cmb-rule-weekdays", "No weekends"),
        field("cmb-rule-fn", "Odd days only"),
        field("cmb-rule-lists", "disabled + enabled"),
      ),
      output("cmb-out-rules"),
    ),
    pickers: [
      {
        target: "#cmb-rule-min",
        options: { calendar: { minDate: "today" } },
      },
      {
        target: "#cmb-rule-weekdays",
        options: { calendar: { disabledWeekdays: [0, 6] } },
      },
      {
        target: "#cmb-rule-fn",
        options: {
          calendar: { isDateDisabled: (date) => date.getDate() % 2 === 0 },
        },
      },
      {
        target: "#cmb-rule-lists",
        options: {
          calendar: {
            enabledDates: [
              isoInDays(1),
              isoInDays(2),
              isoInDays(3),
              isoInDays(5),
            ],
            disabledDates: [isoInDays(2)],
          },
        },
      },
    ],
    code: `new DatepickerUI("#cmb-rule-min", { calendar: { minDate: "today" } }).create();
new DatepickerUI("#cmb-rule-weekdays", { calendar: { disabledWeekdays: [0, 6] } }).create();
new DatepickerUI("#cmb-rule-fn", {
  calendar: { isDateDisabled: (date) => date.getDate() % 2 === 0 },
}).create();
new DatepickerUI("#cmb-rule-lists", {
  calendar: {
    enabledDates: ["${isoInDays(1)}", "${isoInDays(2)}", "${isoInDays(3)}", "${isoInDays(5)}"],
    disabledDates: ["${isoInDays(2)}"],
  },
}).create();`,
  },
  {
    id: "cmb-rules-lengths",
    title: "Length limits · range and multiple",
    description:
      "range.minLength: 3, range.maxLength: 5 and multiple.max: 3. Type an invalid range or pick past the limit.",
    html: column(
      row(
        field("cmb-rule-minlen", "Min 3 days"),
        field("cmb-rule-maxlen", "Max 5 days"),
        field("cmb-rule-multi", "Max 3 dates"),
      ),
      output("cmb-out-lengths"),
    ),
    pickers: [
      {
        target: "#cmb-rule-minlen",
        options: {
          calendar: { ...range, range: { minLength: 3 } },
        },
      },
      {
        target: "#cmb-rule-maxlen",
        options: {
          calendar: { ...range, months: 2, range: { maxLength: 5 } },
        },
      },
      {
        target: "#cmb-rule-multi",
        options: {
          calendar: { mode: "multiple", multiple: { max: 3 } },
        },
      },
    ],
  },
];

export const BEHAVIOR_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-behavior-commit",
    title: "Behaviour · closeOnSelect and commitOnChange",
    description:
      "closeOnSelect commits and closes on a pick; commitOnChange writes the input on every change while the picker stays open; the third combines both with a range.",
    html: row(
      field("cmb-bh-close", "closeOnSelect"),
      field("cmb-bh-commit", "commitOnChange"),
      field("cmb-bh-range", "Range, closeOnSelect"),
    ),
    pickers: [
      {
        target: "#cmb-bh-close",
        options: { behavior: { closeOnSelect: true } },
      },
      {
        target: "#cmb-bh-commit",
        options: { behavior: { commitOnChange: true } },
      },
      {
        target: "#cmb-bh-range",
        options: {
          calendar: range,
          behavior: { closeOnSelect: true, commitOnChange: true },
        },
      },
    ],
  },
  {
    id: "cmb-behavior-footer",
    title: "Behaviour · Today, Clear and footer",
    description:
      "ui.todayButton and ui.clearButton in the footer (clearInput: false keeps the typed text), and an inline picker with ui.footer: true.",
    html: row(
      field("cmb-bh-today", "Today + Clear"),
      field("cmb-bh-keep", "Clear keeps text"),
      inlineBox("cmb-bh-footer", "Inline + footer"),
    ),
    pickers: [
      {
        target: "#cmb-bh-today",
        options: { ui: { todayButton: true, clearButton: true } },
      },
      {
        target: "#cmb-bh-keep",
        options: {
          ui: {
            todayButton: true,
            clearButton: { clearInput: false },
          },
        },
      },
      {
        target: "#cmb-bh-footer",
        options: {
          ui: {
            footer: true,
            todayButton: true,
            clearButton: true,
            inline: inlineUi("cmb-bh-footer"),
          },
        },
      },
    ],
  },
  {
    id: "cmb-behavior-motion",
    title: "Behaviour · animation and swipe off",
    description:
      "ui.animation: false removes motion; ui.swipe: false disables drag, wheel and swipe paging (arrows still work); both with two months.",
    html: row(
      field("cmb-bh-noanim", "animation: false"),
      field("cmb-bh-noswipe", "swipe: false"),
      field("cmb-bh-neither", "Both off, 2 months"),
    ),
    pickers: [
      {
        target: "#cmb-bh-noanim",
        options: { ui: { animation: false } },
      },
      {
        target: "#cmb-bh-noswipe",
        options: { ui: { swipe: false } },
      },
      {
        target: "#cmb-bh-neither",
        options: {
          calendar: { months: 2 },
          ui: { animation: false, swipe: false },
        },
      },
    ],
  },
  {
    id: "cmb-behavior-views",
    title: "Behaviour · view switch, mask, input view",
    description:
      'ui.viewSwitch: false hides the pencil in a modal; ui.mask with ui.format and a Polish locale; ui.initialView: "input" opens the text view of a modal, also for a range.',
    html: column(
      row(
        field("cmb-bh-noswitch", "viewSwitch: false"),
        field("cmb-bh-mask", "mask dd.MM.yyyy"),
      ),
      row(
        field("cmb-bh-input-single", "input view, single"),
        field("cmb-bh-input-range", "input view, range"),
      ),
    ),
    pickers: [
      {
        target: "#cmb-bh-noswitch",
        options: { ui: { displayMode: "modal", viewSwitch: false } },
      },
      {
        target: "#cmb-bh-mask",
        options: {
          calendar: { locale: "pl-PL" },
          ui: { mask: true, format: "dd.MM.yyyy" },
        },
      },
      {
        target: "#cmb-bh-input-single",
        options: { ui: { displayMode: "modal", initialView: "input" } },
      },
      {
        target: "#cmb-bh-input-range",
        options: {
          calendar: range,
          ui: { displayMode: "modal", initialView: "input" },
        },
      },
    ],
  },
];
