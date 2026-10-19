import type DatepickerUI from "../../src/index";
import type { DatepickerOptions } from "../../src/index";

const INPUT =
  "w-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors";
const ACTIVE_FIELD =
  "[&.dp-ui\\_\\_input--active]:ring-2 [&.dp-ui\\_\\_input--active]:ring-violet-500 [&.dp-ui\\_\\_input--active]:border-violet-500";
const BUTTON =
  "px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium";
const OUTPUT = "font-mono text-sm text-gray-700 dark:text-gray-300 break-all";
const LABEL = "grid gap-1 text-sm text-gray-700 dark:text-gray-300";

export interface Stage5Demo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly pickers: readonly { target: string; options?: DatepickerOptions }[];
  readonly fixedScheme?: boolean;
  readonly code?: string;
}

const field = (id: string, placeholder = "Select date..."): string =>
  `<input id="${id}" class="${INPUT}" placeholder="${placeholder}" />`;

const isWeekend = (date: Date): boolean =>
  date.getDay() === 0 || date.getDay() === 6;

const isoInDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
};

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const PRESETS: NonNullable<
  NonNullable<DatepickerOptions["calendar"]>["range"]
>["presets"] = [
  { label: "Today", value: () => ({ start: new Date(), end: new Date() }) },
  {
    label: "Last 7 days",
    value: () => ({ start: daysAgo(6), end: new Date() }),
  },
  {
    label: "Last 30 days",
    value: () => ({ start: daysAgo(29), end: new Date() }),
  },
  {
    label: "This month",
    value: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
  {
    label: "Last month",
    value: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    },
  },
];

const price = (date: Date): string | null =>
  isWeekend(date) ? null : `$${String(80 + ((date.getDate() * 7) % 90))}`;

const toggleButtons = (
  attribute: string,
  values: readonly string[],
  label: (value: string) => string,
): string =>
  values
    .map(
      (value) =>
        `<button type="button" data-${attribute}="${value}" class="${BUTTON}">${label(value)}</button>`,
    )
    .join("");

export const STAGE5_DEMOS: readonly Stage5Demo[] = [
  {
    id: "months",
    title: "Two months",
    description:
      "calendar.months shows months side by side in a docked or inline picker. It falls back to one month when the window is narrow, and the modal always shows one month. pageBy decides whether the arrows move by the whole view or one month.",
    html: `<div class="grid gap-4 justify-items-center">
      <div class="flex flex-wrap gap-4 justify-center">${field("dp-months-single", "Single")}${field("dp-months-range", "Start – End")}</div>
      <div class="flex flex-wrap gap-2 justify-center">${toggleButtons("months", ["1", "2", "3"], (value) => `${value} month${value === "1" ? "" : "s"}`)}</div>
      <div class="flex flex-wrap gap-2 justify-center">${toggleButtons("pageby", ["view", "month"], (value) => `pageBy: ${value}`)}</div>
    </div>`,
    pickers: [
      {
        target: "#dp-months-single",
        options: {
          calendar: { months: 2 },
        },
      },
      {
        target: "#dp-months-range",
        options: {
          calendar: { mode: "range", months: 2 },
        },
      },
    ],
    code: `const picker = new DatepickerUI("#dp-months-single", {
  calendar: { months: 2 },
}).create();

picker.setOptions({ calendar: { months: 3 } });
picker.setOptions({ calendar: { pageBy: "month" } });

new DatepickerUI("#dp-months-range", {
  calendar: { mode: "range", months: 2 },
}).create();`,
  },
  {
    id: "split-fields",
    title: "Start / End fields",
    description:
      "Two inputs of the page: the picker is attached to the first, ui.endInput points at the second. The field being edited gets the class dp-ui__input--active.",
    html: `<div class="flex flex-wrap gap-4 justify-center">
      <label class="${LABEL}">Trip start<input id="trip-start" name="trip-start" class="${INPUT} ${ACTIVE_FIELD}" placeholder="Start date" /></label>
      <label class="${LABEL}">Trip end<input id="trip-end" name="trip-end" class="${INPUT} ${ACTIVE_FIELD}" placeholder="End date" /></label>
    </div>`,
    pickers: [
      {
        target: "#trip-start",
        options: {
          calendar: { mode: "range" },
          ui: { endInput: "#trip-end" },
        },
      },
    ],
    code: `new DatepickerUI("#trip-start", {
  calendar: { mode: "range" },
  ui: { endInput: "#trip-end" },
}).create();

// the library adds .dp-ui__input--active to the field being edited`,
  },
  {
    id: "presets",
    title: "Presets",
    description:
      "calendar.range.presets adds ready-made ranges: a column beside the calendar when docked and wide, a row of chips in a modal or a narrow window.",
    html: `<div class="flex flex-wrap gap-4 justify-center">${field("dp-presets-docked", "Docked")}${field("dp-presets-modal", "Modal")}</div>`,
    pickers: [
      {
        target: "#dp-presets-docked",
        options: {
          calendar: { mode: "range", range: { presets: PRESETS } },
          ui: { displayMode: "docked" },
        },
      },
      {
        target: "#dp-presets-modal",
        options: {
          calendar: { mode: "range", range: { presets: PRESETS } },
          ui: { displayMode: "modal" },
        },
      },
    ],
    code: `const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const presets = [
  { label: "Today", value: () => ({ start: new Date(), end: new Date() }) },
  { label: "Last 7 days", value: () => ({ start: daysAgo(6), end: new Date() }) },
  { label: "Last 30 days", value: () => ({ start: daysAgo(29), end: new Date() }) },
  {
    label: "This month",
    value: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
  {
    label: "Last month",
    value: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    },
  },
];

new DatepickerUI("#dp-presets-docked", {
  calendar: { mode: "range", range: { presets } },
  ui: { displayMode: "docked" },
}).create();

new DatepickerUI("#dp-presets-modal", {
  calendar: { mode: "range", range: { presets } },
  ui: { displayMode: "modal" },
}).create();`,
  },
  {
    id: "precision",
    title: "Month and year picker",
    description:
      'calendar.precision: "month" picks a month (docked), "year" picks a year (modal). The value is YYYY-MM or YYYY.',
    html: `<div class="grid gap-4 justify-items-center">
      <div class="flex flex-wrap gap-4 justify-center">${field("dp-precision-month", "Month (docked)")}${field("dp-precision-year", "Year (modal)")}</div>
      <output id="precision-output" class="${OUTPUT}"></output>
    </div>`,
    pickers: [
      {
        target: "#dp-precision-month",
        options: {
          calendar: { precision: "month" },
          ui: { displayMode: "docked" },
        },
      },
      {
        target: "#dp-precision-year",
        options: {
          calendar: { precision: "year" },
          ui: { displayMode: "modal" },
        },
      },
    ],
    code: `new DatepickerUI("#dp-precision-month", {
  calendar: { precision: "month" },
  ui: { displayMode: "docked" },
}).create();

const years = new DatepickerUI("#dp-precision-year", {
  calendar: { precision: "year" },
  ui: { displayMode: "modal" },
}).create();

years.on("confirm", () => console.log(years.getValue()?.value)); // "2026"`,
  },
  {
    id: "start-view",
    title: "Start view, fixed weeks, outside days",
    description:
      "ui.startView opens on the year list, ui.fixedWeeks always shows six rows, ui.outsideDays shows neighbouring days, selectable or inert with { selectable: false }.",
    html: `<div class="flex flex-wrap gap-4 justify-center">${field("dp-start-view", "startView: year")}${field("dp-fixed-weeks", "fixedWeeks")}${field("dp-outside", "outsideDays: true")}${field("dp-outside-inert", "outsideDays: not selectable")}</div>`,
    pickers: [
      {
        target: "#dp-start-view",
        options: { ui: { startView: "year" } },
      },
      {
        target: "#dp-fixed-weeks",
        options: { ui: { fixedWeeks: true } },
      },
      {
        target: "#dp-outside",
        options: { ui: { outsideDays: true } },
      },
      {
        target: "#dp-outside-inert",
        options: {
          ui: { outsideDays: { selectable: false } },
        },
      },
    ],
  },
  {
    id: "prices",
    title: "Prices per day",
    description:
      "calendar.renderDate returns a string (shown as text) or a Node under the day number. Here a price on weekdays, in a single and a range picker.",
    html: `<div class="flex flex-wrap gap-4 justify-center">${field("dp-prices-single", "Single")}${field("dp-prices-range", "Start – End")}</div>`,
    pickers: [
      {
        target: "#dp-prices-single",
        options: {
          calendar: { renderDate: price },
        },
      },
      {
        target: "#dp-prices-range",
        options: {
          calendar: { mode: "range", renderDate: price },
        },
      },
    ],
    code: `const price = (date) =>
  date.getDay() === 0 || date.getDay() === 6
    ? null
    : \`$\${80 + ((date.getDate() * 7) % 90)}\`;

new DatepickerUI("#dp-prices-single", {
  calendar: { renderDate: price },
}).create();

new DatepickerUI("#dp-prices-range", {
  calendar: { mode: "range", renderDate: price },
}).create();`,
  },
  {
    id: "validation",
    title: "Validation",
    description:
      "A typed date outside minDate / maxDate shows a message (for example Enter a date on or after ...). calendar.validate marks the field invalid with your own message without blocking the pick.",
    html: `<div class="grid gap-4 justify-items-center">
      <div class="flex flex-wrap gap-4 justify-center">${field("dp-validate-range", "Next 30 days")}${field("dp-validate-fn", "Weekends only")}</div>
      <output id="validation-output" class="${OUTPUT}"></output>
    </div>`,
    pickers: [
      {
        target: "#dp-validate-range",
        options: {
          calendar: { minDate: isoInDays(0), maxDate: isoInDays(30) },
        },
      },
      {
        target: "#dp-validate-fn",
        options: {
          calendar: {
            validate: (value) => {
              if (value === null || !("date" in value)) return null;
              return isWeekend(value.date) ? null : "Weekends only";
            },
          },
        },
      },
    ],
    code: `new DatepickerUI("#dp-validate-range", {
  calendar: { minDate: "today", maxDate: "${isoInDays(30)}" },
}).create();

new DatepickerUI("#dp-validate-fn", {
  calendar: {
    validate: (value) => {
      if (value === null || !("date" in value)) return null;
      const day = value.date.getDay();
      return day === 0 || day === 6 ? null : "Weekends only";
    },
  },
}).create();`,
  },
];

const isPageBy = (value: string): value is "view" | "month" =>
  value === "view" || value === "month";

const showOutput = (id: string, prefix: string, text: string): void => {
  const target = document.getElementById(id);
  if (target) target.textContent = `${prefix}: ${text}`;
};

const describeValue = (picker: DatepickerUI): string => {
  const value = picker.getValue();
  if (value === null) return "empty";
  return "value" in value && typeof value.value === "string"
    ? value.value
    : JSON.stringify(value);
};

const bindOutputs = (pickers: Map<string, DatepickerUI>): void => {
  const precision = [
    ["#dp-precision-month", "month"],
    ["#dp-precision-year", "year"],
  ] as const;
  for (const [target, name] of precision) {
    const picker = pickers.get(target);
    if (!picker) continue;
    const update = (): void => {
      showOutput("precision-output", name, describeValue(picker));
    };
    picker.on("confirm", update);
    picker.on("update", update);
  }
  for (const target of ["#dp-validate-range", "#dp-validate-fn"]) {
    const picker = pickers.get(target);
    if (!picker) continue;
    picker.on("error", (data) => {
      showOutput("validation-output", target, data.message);
    });
    picker.on("confirm", () => {
      showOutput("validation-output", target, "valid");
    });
  }
};

const MONTH_TARGETS = ["#dp-months-single", "#dp-months-range"];

const bindToggles = (pickers: Map<string, DatepickerUI>): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-months]",
  )) {
    button.addEventListener("click", () => {
      const months = Number(button.dataset.months);
      for (const target of MONTH_TARGETS) {
        pickers.get(target)?.setOptions({ calendar: { months } });
      }
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-pageby]",
  )) {
    button.addEventListener("click", () => {
      const pageBy = button.dataset.pageby ?? "";
      if (!isPageBy(pageBy)) return;
      for (const target of MONTH_TARGETS) {
        pickers.get(target)?.setOptions({ calendar: { pageBy } });
      }
    });
  }
};

export const initStage5 = (pickers: Map<string, DatepickerUI>): void => {
  bindToggles(pickers);
  bindOutputs(pickers);
};
