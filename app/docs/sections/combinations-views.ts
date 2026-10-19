import {
  column,
  field,
  inlineBox,
  inlineUi,
  isoInDays,
  isWeekend,
  price,
  row,
} from "./combinations-shared";
import type { CombinationDemo } from "./combinations-shared";

const docked = { displayMode: "docked" } as const;
const modal = { displayMode: "modal" } as const;
const range = { mode: "range" } as const;

const dot = (date: Date): HTMLElement | null => {
  if (date.getDate() % 5 !== 0) return null;
  const span = document.createElement("span");
  span.style.cssText =
    "display:block;width:6px;height:6px;border-radius:50%;background:#7c3aed;margin:0 auto";
  return span;
};

const everyThird = (date: Date): { badge: true } | undefined =>
  date.getDate() % 3 === 0 ? { badge: true } : undefined;

const PRICE_CODE = `const price = (date) =>
  date.getDay() === 0 || date.getDay() === 6
    ? null
    : \`$\${80 + ((date.getDate() * 7) % 90)}\`;`;

export const PRECISION_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-precision-month",
    title: "Month precision · docked, modal, inline",
    description:
      'calendar.precision: "month" on every surface. The value is YYYY-MM.',
    html: row(
      field("cmb-pm-docked", "Docked"),
      field("cmb-pm-modal", "Modal"),
      inlineBox("cmb-pm-inline", "Inline"),
    ),
    pickers: [
      {
        target: "#cmb-pm-docked",
        options: { calendar: { precision: "month" }, ui: docked },
      },
      {
        target: "#cmb-pm-modal",
        options: { calendar: { precision: "month" }, ui: modal },
      },
      {
        target: "#cmb-pm-inline",
        options: {
          calendar: { precision: "month" },
          ui: { inline: inlineUi("cmb-pm-inline") },
        },
      },
    ],
  },
  {
    id: "cmb-precision-month-bounds",
    title: "Month precision · minDate and maxDate",
    description:
      "Months outside minDate / maxDate (here six months back to six months ahead) are disabled.",
    html: row(
      field("cmb-pmb-docked", "Docked, +-6 months"),
      field("cmb-pmb-modal", "Modal, +-6 months"),
    ),
    pickers: [
      {
        target: "#cmb-pmb-docked",
        options: {
          calendar: {
            precision: "month",
            minDate: isoInDays(-180),
            maxDate: isoInDays(180),
          },
          ui: docked,
        },
      },
      {
        target: "#cmb-pmb-modal",
        options: {
          calendar: {
            precision: "month",
            minDate: isoInDays(-180),
            maxDate: isoInDays(180),
          },
          ui: modal,
        },
      },
    ],
  },
  {
    id: "cmb-precision-month-locale",
    title: "Month precision · locales and formats",
    description:
      "Month names from Intl in pl-PL, de-DE and ar-EG, and typed formats MM/yyyy and yyyy-MM.",
    html: column(
      row(
        field("cmb-pml-pl", "pl-PL"),
        field("cmb-pml-de", "de-DE"),
        field("cmb-pml-ar", "ar-EG"),
      ),
      row(
        field("cmb-pml-slash", "format MM/yyyy"),
        field("cmb-pml-iso", "format yyyy-MM"),
      ),
    ),
    pickers: [
      {
        target: "#cmb-pml-pl",
        options: {
          calendar: { precision: "month", locale: "pl-PL" },
        },
      },
      {
        target: "#cmb-pml-de",
        options: {
          calendar: { precision: "month", locale: "de-DE" },
        },
      },
      {
        target: "#cmb-pml-ar",
        options: {
          calendar: { precision: "month", locale: "ar-EG" },
        },
      },
      {
        target: "#cmb-pml-slash",
        options: {
          calendar: { precision: "month" },
          ui: { format: "MM/yyyy" },
        },
      },
      {
        target: "#cmb-pml-iso",
        options: {
          calendar: { precision: "month" },
          ui: { format: "yyyy-MM" },
        },
      },
    ],
  },
  {
    id: "cmb-precision-year",
    title: "Year precision · docked, modal, yearRange",
    description:
      'calendar.precision: "year" docked and modal, and with ui.yearRange limiting the years to 10 back and 5 ahead.',
    html: row(
      field("cmb-py-docked", "Docked"),
      field("cmb-py-modal", "Modal"),
      field("cmb-py-range", "yearRange 10 / 5"),
    ),
    pickers: [
      {
        target: "#cmb-py-docked",
        options: { calendar: { precision: "year" }, ui: docked },
      },
      {
        target: "#cmb-py-modal",
        options: { calendar: { precision: "year" }, ui: modal },
      },
      {
        target: "#cmb-py-range",
        options: {
          calendar: { precision: "year" },
          ui: { yearRange: { before: 10, after: 5 } },
        },
      },
    ],
  },
];

export const VIEW_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-startview",
    title: "Start view · month and year, docked and modal",
    description:
      'ui.startView "month" or "year" decides the first panel; the modal shows a grid, the popover a list.',
    html: column(
      row(
        field("cmb-sv-month-docked", "month, docked"),
        field("cmb-sv-month-modal", "month, modal"),
      ),
      row(
        field("cmb-sv-year-docked", "year, docked"),
        field("cmb-sv-year-modal", "year, modal"),
      ),
    ),
    pickers: [
      {
        target: "#cmb-sv-month-docked",
        options: { ui: { ...docked, startView: "month" } },
      },
      {
        target: "#cmb-sv-month-modal",
        options: { ui: { ...modal, startView: "month" } },
      },
      {
        target: "#cmb-sv-year-docked",
        options: { ui: { ...docked, startView: "year" } },
      },
      {
        target: "#cmb-sv-year-modal",
        options: { ui: { ...modal, startView: "year" } },
      },
    ],
  },
  {
    id: "cmb-startview-input",
    title: "Start view · initialView input wins",
    description:
      'With ui.initialView: "input" in a single modal the text view opens even though ui.startView is "year".',
    html: row(
      field("cmb-svi-modal", "input + startView: year"),
      inlineBox("cmb-svi-inline", "inline, startView: month"),
    ),
    pickers: [
      {
        target: "#cmb-svi-modal",
        options: { ui: { ...modal, initialView: "input", startView: "year" } },
      },
      {
        target: "#cmb-svi-inline",
        options: {
          ui: { startView: "month", inline: inlineUi("cmb-svi-inline") },
        },
      },
    ],
  },
  {
    id: "cmb-outside-matrix",
    title: "Outside days · fixed weeks and week start",
    description:
      "outsideDays true or inert, crossed with fixedWeeks and a Monday or Sunday week start.",
    html: column(
      row(
        field("cmb-od-a", "true, Monday"),
        field("cmb-od-b", "true, Sunday"),
        field("cmb-od-c", "inert, Monday"),
      ),
      row(
        field("cmb-od-d", "inert + fixed, Sunday"),
        field("cmb-od-e", "fixed, Monday"),
        field("cmb-od-f", "range, true + fixed"),
      ),
    ),
    pickers: [
      {
        target: "#cmb-od-a",
        options: {
          calendar: { weekStart: "monday" },
          ui: { outsideDays: true },
        },
      },
      {
        target: "#cmb-od-b",
        options: {
          calendar: { weekStart: "sunday" },
          ui: { outsideDays: true },
        },
      },
      {
        target: "#cmb-od-c",
        options: {
          calendar: { weekStart: "monday" },
          ui: { outsideDays: { selectable: false } },
        },
      },
      {
        target: "#cmb-od-d",
        options: {
          calendar: { weekStart: "sunday" },
          ui: {
            outsideDays: { selectable: false },
            fixedWeeks: true,
          },
        },
      },
      {
        target: "#cmb-od-e",
        options: {
          calendar: { weekStart: "monday" },
          ui: { fixedWeeks: true },
        },
      },
      {
        target: "#cmb-od-f",
        options: {
          calendar: { ...range },
          ui: { outsideDays: true, fixedWeeks: true },
        },
      },
    ],
  },
];

export const CONTENT_DEMOS: readonly CombinationDemo[] = [
  {
    id: "cmb-render-prices",
    title: "Day content · prices in a range with two months",
    description:
      "renderDate prices on weekdays in a range picker with two months, and with ui.weekNumbers.",
    html: row(
      field("cmb-rd-range", "Range, 2 months"),
      field("cmb-rd-weeks", "Range, week numbers"),
    ),
    pickers: [
      {
        target: "#cmb-rd-range",
        options: {
          calendar: { ...range, months: 2, renderDate: price },
        },
      },
      {
        target: "#cmb-rd-weeks",
        options: {
          calendar: { ...range, renderDate: price },
          ui: { weekNumbers: true },
        },
      },
    ],
    code: `${PRICE_CODE}

new DatepickerUI("#cmb-rd-range", {
  calendar: { mode: "range", months: 2, renderDate: price },
}).create();

new DatepickerUI("#cmb-rd-weeks", {
  calendar: { mode: "range", renderDate: price },
  ui: { weekNumbers: true },
}).create();`,
  },
  {
    id: "cmb-render-node",
    title: "Day content · a DOM node and badges",
    description:
      "renderDate returns a Node (a purple dot on every fifth day); the second picker adds decorateDate badges on every third day; the third combines both with week numbers.",
    html: row(
      field("cmb-rn-node", "Node"),
      field("cmb-rn-badge", "Badges"),
      field("cmb-rn-both", "Node + badges + weeks"),
    ),
    pickers: [
      {
        target: "#cmb-rn-node",
        options: { calendar: { renderDate: dot } },
      },
      {
        target: "#cmb-rn-badge",
        options: { calendar: { decorateDate: everyThird } },
      },
      {
        target: "#cmb-rn-both",
        options: {
          calendar: {
            renderDate: dot,
            decorateDate: everyThird,
            mode: "multiple",
          },
          ui: { weekNumbers: true },
        },
      },
    ],
    code: `const dot = (date) => {
  if (date.getDate() % 5 !== 0) return null;
  const span = document.createElement("span");
  span.style.cssText =
    "display:block;width:6px;height:6px;border-radius:50%;background:#7c3aed;margin:0 auto";
  return span;
};
const everyThird = (date) =>
  date.getDate() % 3 === 0 ? { badge: true } : undefined;

new DatepickerUI("#cmb-rn-node", { calendar: { renderDate: dot } }).create();
new DatepickerUI("#cmb-rn-badge", { calendar: { decorateDate: everyThird } }).create();
new DatepickerUI("#cmb-rn-both", {
  calendar: { mode: "multiple", renderDate: dot, decorateDate: everyThird },
  ui: { weekNumbers: true },
}).create();`,
  },
  {
    id: "cmb-render-weekend",
    title: "Day content · weekend marker and disabled weekends",
    description:
      "decorateDate with a className on weekends, and weekends disabled with isDateDisabled next to prices.",
    html: row(
      field("cmb-rw-class", "Weekend class"),
      field("cmb-rw-disabled", "No weekends + prices"),
    ),
    pickers: [
      {
        target: "#cmb-rw-class",
        options: {
          calendar: {
            decorateDate: (date) =>
              isWeekend(date)
                ? { className: "is-weekend", label: "Weekend" }
                : undefined,
          },
        },
      },
      {
        target: "#cmb-rw-disabled",
        options: {
          calendar: { isDateDisabled: isWeekend, renderDate: price },
        },
      },
    ],
    code: `${PRICE_CODE}
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

new DatepickerUI("#cmb-rw-class", {
  calendar: {
    decorateDate: (date) =>
      isWeekend(date) ? { className: "is-weekend", label: "Weekend" } : undefined,
  },
}).create();

new DatepickerUI("#cmb-rw-disabled", {
  calendar: { isDateDisabled: isWeekend, renderDate: price },
}).create();`,
  },
];
