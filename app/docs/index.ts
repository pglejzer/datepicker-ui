import DatepickerUI from "../src/index";
import type {
  DatepickerEventMap,
  DatepickerOptions,
  ThemeName,
} from "../src/index";
import "../src/styles/index.scss";
import "./theme-custom.css";
import { STAGE5_DEMOS, initStage5 } from "./sections/stage5";
import { COMBINATION_DEMOS, initCombinations } from "./sections/combinations";

const EVENTS: readonly (keyof DatepickerEventMap)[] = [
  "open",
  "close",
  "cancel",
  "confirm",
  "update",
  "error",
  "select:day",
  "select:month",
  "select:year",
  "navigate",
  "range:start",
  "range:end",
];

const INPUT =
  "w-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors";
const BUTTON =
  "px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium";
const SELECT =
  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";
const THEMES: readonly ThemeName[] = [
  "basic",
  "m3-green",
  "crane",
  "crane-straight",
  "m2",
  "glassmorphic",
  "pastel",
  "ai",
  "cyberpunk",
  "blueprint",
];
const SCHEMES = ["auto", "light", "dark"] as const;
const THEMED_PICKERS = ["#dp-theme-single", "#dp-theme-range"];
const API_TARGET = "#dp-api";

const ICON =
  "cal material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-purple-600";

const isoInDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
};

interface Demo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly pickers: readonly { target: string; options?: DatepickerOptions }[];
  readonly fixedScheme?: boolean;
  readonly code?: string;
}

const isWeekend = (date: Date): boolean =>
  date.getDay() === 0 || date.getDay() === 6;

const field = (id: string, placeholder = "Select date..."): string =>
  `<input id="${id}" class="${INPUT}" placeholder="${placeholder}" />`;

const DEMOS: readonly Demo[] = [
  {
    id: "default",
    title: "Default (auto)",
    description:
      "Docked popover at 600 px and wider, modal dialog below. Resize under 600 px and open again.",
    html: field("dp-default"),
    pickers: [{ target: "#dp-default" }],
  },
  {
    id: "docked",
    title: "Docked",
    description:
      "Popover anchored to the field, flips up near the bottom edge.",
    html: field("dp-docked"),
    pickers: [
      { target: "#dp-docked", options: { ui: { displayMode: "docked" } } },
    ],
  },
  {
    id: "modal",
    title: "Modal",
    description: "Centered dialog with scrim, headline and year grid.",
    html: field("dp-modal"),
    pickers: [
      { target: "#dp-modal", options: { ui: { displayMode: "modal" } } },
    ],
  },
  {
    id: "inline",
    title: "Inline",
    description: "Always visible, no footer unless ui.footer is true.",
    html: `<div class="grid gap-4 justify-items-center">${field("dp-inline")}<div id="inline-container"></div></div>`,
    pickers: [
      {
        target: "#dp-inline",
        options: {
          ui: { inline: { enabled: true, container: "#inline-container" } },
        },
      },
    ],
  },
  {
    id: "form",
    title: "Form",
    description:
      "The value is submitted as ISO through a hidden input. Reset restores the initial value.",
    html: `<form id="demo-form" class="grid gap-3 justify-items-center">
      <input id="dp-form" name="departure" value="2026-10-17" required class="${INPUT}" />
      <div class="flex gap-2"><button type="submit" class="${BUTTON}">Submit</button><button type="reset" class="${BUTTON}">Reset</button></div>
      <output id="form-output" class="font-mono text-sm text-gray-700 dark:text-gray-300"></output>
    </form>`,
    pickers: [
      { target: "#dp-form", options: { ui: { format: "dd/MM/yyyy" } } },
    ],
  },
  {
    id: "polish",
    title: "Polish locale",
    description: "Month and weekday names, week start and format from Intl.",
    html: field("dp-polish", "Wybierz datę..."),
    pickers: [
      { target: "#dp-polish", options: { calendar: { locale: "pl-PL" } } },
    ],
  },
  {
    id: "rtl",
    title: "RTL (ar-EG)",
    description: "Right-to-left layout, arrows and swipe direction flipped.",
    html: `<div dir="rtl" lang="ar-EG">${field("dp-rtl", "اختر التاريخ")}</div>`,
    pickers: [
      { target: "#dp-rtl", options: { calendar: { locale: "ar-EG" } } },
    ],
  },
  {
    id: "dark",
    title: "Dark color scheme",
    description: 'ui.colorScheme: "dark" regardless of the page.',
    html: field("dp-dark"),
    pickers: [{ target: "#dp-dark", options: { ui: { colorScheme: "dark" } } }],
    fixedScheme: true,
  },
  {
    id: "limits",
    title: "Limits",
    description: "From today, up to 60 days ahead, two disabled days.",
    html: field("dp-limits"),
    pickers: [
      {
        target: "#dp-limits",
        options: {
          calendar: {
            minDate: "today",
            maxDate: isoInDays(60),
            disabledDates: [isoInDays(3), isoInDays(4)],
          },
        },
      },
    ],
  },
  {
    id: "extras",
    title: "Week numbers, outside days, Today and Clear",
    description: "Optional docked extras.",
    html: field("dp-extras"),
    pickers: [
      {
        target: "#dp-extras",
        options: {
          ui: {
            displayMode: "docked",
            weekNumbers: true,
            outsideDays: true,
            todayButton: true,
            clearButton: true,
          },
        },
      },
    ],
  },
  {
    id: "toggle",
    title: "Custom toggle, two pickers",
    description:
      "Both use the same .cal selector and each opens only its own picker. Clicking the field opens too, Tab does not.",
    html: `<div class="flex flex-wrap gap-4 justify-center">
      <div id="toggle-a" class="relative"><input class="${INPUT} pr-12" placeholder="Check-in" /><span class="${ICON}">calendar_today</span></div>
      <div id="toggle-b" class="relative"><input class="${INPUT} pr-12" placeholder="Check-out" /><span class="${ICON}">calendar_today</span></div>
    </div>`,
    pickers: [
      { target: "#toggle-a", options: { ui: { toggleButton: ".cal" } } },
      { target: "#toggle-b", options: { ui: { toggleButton: ".cal" } } },
    ],
  },
  {
    id: "containers",
    title: "Inside a page dialog and a scrolling box",
    description: "The popover stays inside the picker host in both.",
    html: `<div class="grid gap-4 justify-items-center">
      <button type="button" id="open-page-dialog" class="${BUTTON}">Open dialog</button>
      <dialog id="page-dialog" class="rounded-2xl p-6 backdrop:bg-black/40">
        <p class="mb-3 text-gray-700">Picker inside a modal dialog of the page.</p>
        ${field("dp-dialog")}
        <form method="dialog" class="mt-4"><button class="${BUTTON}">Close</button></form>
      </dialog>
      <div class="h-40 w-80 overflow-auto rounded-lg border border-dashed border-gray-400 p-3">
        <div class="h-48"></div>${field("dp-scroll")}<div class="h-48"></div>
      </div>
    </div>`,
    pickers: [
      { target: "#dp-dialog" },
      { target: "#dp-scroll", options: { ui: { displayMode: "docked" } } },
    ],
  },
  {
    id: "range-docked",
    title: "Range, docked",
    description:
      "Vertical month list in a 568 px popover. The pencil switches to two text fields.",
    html: field("dp-range-docked", "Start – End"),
    pickers: [
      {
        target: "#dp-range-docked",
        options: { calendar: { mode: "range" }, ui: { displayMode: "docked" } },
      },
    ],
  },
  {
    id: "range-modal",
    title: "Range, dialog",
    description:
      "Dialog from 600 px, full screen with × and Save below 600 px. ui.fullscreen moves that width (840) or turns it off (false).",
    html: `<div class="flex flex-wrap gap-4 justify-center">${field("dp-range-modal", "Default (600)")}${field("dp-range-modal-840", "fullscreen: 840")}${field("dp-range-modal-off", "fullscreen: false")}</div>`,
    pickers: [
      {
        target: "#dp-range-modal",
        options: { calendar: { mode: "range" }, ui: { displayMode: "modal" } },
      },
      {
        target: "#dp-range-modal-840",
        options: {
          calendar: { mode: "range" },
          ui: { displayMode: "modal", fullscreen: 840 },
        },
      },
      {
        target: "#dp-range-modal-off",
        options: {
          calendar: { mode: "range" },
          ui: { displayMode: "modal", fullscreen: false },
        },
      },
    ],
  },
  {
    id: "range-inline",
    title: "Range, inline",
    description: "Always visible range list.",
    html: `<div class="grid gap-4 justify-items-center">${field("dp-range-inline", "Start – End")}<div id="range-inline-container"></div></div>`,
    pickers: [
      {
        target: "#dp-range-inline",
        options: {
          calendar: { mode: "range" },
          ui: {
            inline: { enabled: true, container: "#range-inline-container" },
          },
        },
      },
    ],
  },
  {
    id: "range-limits",
    title: "Range with length limits",
    description:
      "3 to 14 days from today; days 10 and 11 from now are disabled, so a range cannot cross them.",
    html: field("dp-range-limits", "Start – End"),
    pickers: [
      {
        target: "#dp-range-limits",
        options: {
          calendar: {
            mode: "range",
            range: { minLength: 3, maxLength: 14 },
            minDate: "today",
            disabledDates: [isoInDays(10), isoInDays(11)],
          },
        },
      },
    ],
  },
  {
    id: "multiple",
    title: "Multiple dates",
    description:
      "Up to five dates; click a selected day again to remove it. The modal headline shows the count.",
    html: `<div class="flex flex-wrap gap-4 justify-center">${field("dp-multiple-docked", "Docked")}${field("dp-multiple-modal", "Modal")}</div>`,
    pickers: [
      {
        target: "#dp-multiple-docked",
        options: {
          calendar: { mode: "multiple", multiple: { max: 5 } },
          ui: { displayMode: "docked" },
        },
      },
      {
        target: "#dp-multiple-modal",
        options: {
          calendar: { mode: "multiple", multiple: { max: 5 } },
          ui: { displayMode: "modal" },
        },
      },
    ],
  },
  {
    id: "input-view",
    title: "Input view first",
    description:
      'Modal opening on the text field (ui.initialView: "input"); the calendar icon switches back.',
    html: field("dp-input-view"),
    pickers: [
      {
        target: "#dp-input-view",
        options: { ui: { displayMode: "modal", initialView: "input" } },
      },
    ],
  },
  {
    id: "disabled-days",
    title: "Disabled weekdays and a disable function",
    description:
      "Weekends off through disabledWeekdays, every 13th through isDateDisabled.",
    html: field("dp-disabled-days"),
    pickers: [
      {
        target: "#dp-disabled-days",
        options: {
          calendar: {
            disabledWeekdays: [0, 6],
            isDateDisabled: (date) => date.getDate() === 13,
          },
        },
      },
    ],
    code: `new DatepickerUI("#dp-disabled-days", {
  calendar: {
    disabledWeekdays: [0, 6],
    isDateDisabled: (date) => date.getDate() === 13,
  },
}).create();`,
  },
  {
    id: "decorate",
    title: "Decorated days",
    description:
      "decorateDate adds a badge on the 1st and 15th and a class on weekends.",
    html: field("dp-decorate"),
    pickers: [
      {
        target: "#dp-decorate",
        options: {
          calendar: {
            decorateDate: (date) => {
              if (date.getDate() === 1 || date.getDate() === 15) {
                return { badge: true, label: "Payday" };
              }
              return isWeekend(date)
                ? { className: "demo-weekend" }
                : undefined;
            },
          },
        },
      },
    ],
    code: `new DatepickerUI("#dp-decorate", {
  calendar: {
    decorateDate: (date) => {
      if (date.getDate() === 1 || date.getDate() === 15) {
        return { badge: true, label: "Payday" };
      }
      return isWeekend(date) ? { className: "demo-weekend" } : undefined;
    },
  },
}).create();`,
  },
  {
    id: "mask",
    title: "Input mask",
    description: "Type digits only: 17102026 becomes 17/10/2026.",
    html: field("dp-mask", "dd/mm/yyyy"),
    pickers: [
      {
        target: "#dp-mask",
        options: { ui: { mask: true, format: "dd/MM/yyyy" } },
      },
    ],
  },
  {
    id: "selection-form",
    title: "Range and multiple in a form",
    description:
      "Hidden inputs submit start/end and a comma-separated list. Reset restores the initial values.",
    html: `<form data-demo-form class="grid gap-3 justify-items-center">
      <input id="dp-form-range" name="stay" value="2026-10-20/2026-10-28" class="${INPUT}" />
      <input id="dp-form-multiple" name="days" value="2026-10-05,2026-10-20" class="${INPUT}" />
      <div class="flex gap-2"><button type="submit" class="${BUTTON}">Submit</button><button type="reset" class="${BUTTON}">Reset</button></div>
      <output class="font-mono text-sm text-gray-700 dark:text-gray-300"></output>
    </form>`,
    pickers: [
      { target: "#dp-form-range", options: { calendar: { mode: "range" } } },
      {
        target: "#dp-form-multiple",
        options: { calendar: { mode: "multiple" } },
      },
    ],
  },
  {
    id: "api",
    title: "API methods",
    description:
      "open(), setValue(), getValue() and destroy() on one instance; after destroy() the button creates a new one.",
    html: `<div class="grid gap-3 justify-items-center">
      ${field("dp-api")}
      <div class="flex flex-wrap gap-2 justify-center">
        <button type="button" data-api="open" class="${BUTTON}">open()</button>
        <button type="button" data-api="set" class="${BUTTON}">setValue(+7 days)</button>
        <button type="button" data-api="get" class="${BUTTON}">getValue()</button>
        <button type="button" data-api="clear" class="${BUTTON}">setValue(null)</button>
        <button type="button" data-api="lifecycle" class="${BUTTON}">destroy()</button>
      </div>
      <output id="api-output" class="font-mono text-sm text-gray-700 dark:text-gray-300 break-all"></output>
    </div>`,
    pickers: [{ target: API_TARGET }],
    code: `const picker = new DatepickerUI("${API_TARGET}");
picker.create();

picker.open();
picker.setValue("${isoInDays(7)}");
picker.getValue(); // { value, date, formatted } or null
picker.setValue(null);
picker.destroy();`,
  },
  {
    id: "themes",
    title: "Themes",
    description:
      "Every theme ships in index.css. auto reads the background behind the field, then the page color-scheme, then the system; m3-green and the timepicker themes have one version.",
    html: `<div class="grid gap-4 justify-items-center w-full rounded-xl p-6 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-sky-500">
      <div class="flex flex-wrap gap-3 justify-center">
        <select id="theme-select" class="${SELECT}">${THEMES.map((name) => `<option>${name}</option>`).join("")}</select>
        <select id="scheme-select" class="${SELECT}">${SCHEMES.map((name) => `<option>${name}</option>`).join("")}</select>
      </div>
      <div class="flex flex-wrap gap-4 justify-center">${field("dp-theme-single", "Single")}${field("dp-theme-range", "Start – End")}</div>
    </div>`,
    pickers: [
      {
        target: "#dp-theme-single",
        options: { ui: { displayMode: "docked" } },
      },
      { target: "#dp-theme-range", options: { calendar: { mode: "range" } } },
    ],
    fixedScheme: true,
  },
];

const renderSection = (demo: Demo): HTMLElement => {
  const section = document.createElement("section");
  section.id = demo.id;
  section.className =
    "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden";
  const code =
    demo.code ??
    demo.pickers
      .map((picker) =>
        picker.options
          ? `new DatepickerUI("${picker.target}", ${JSON.stringify(picker.options, null, 2)}).create();`
          : `new DatepickerUI("${picker.target}").create();`,
      )
      .join("\n\n");
  section.innerHTML = `
    <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 px-8 py-6">
      <h3 class="text-2xl font-bold text-gray-900 dark:text-white"></h3>
      <p class="text-gray-600 dark:text-gray-300 mt-2"></p>
    </div>
    <div class="p-8">
      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 mb-6 flex justify-center">${demo.html}</div>
      <pre><code class="language-javascript"></code></pre>
    </div>`;
  section.querySelector("h3")?.append(demo.title);
  section.querySelector("p")?.append(demo.description);
  section.querySelector("code")?.append(code);
  return section;
};

const logList = document.getElementById("event-log");

const log = (source: string, event: string, data: unknown): void => {
  if (!logList) return;
  const item = document.createElement("li");
  item.textContent = `${source} · ${event} ${JSON.stringify(data)}`;
  logList.prepend(item);
  while (logList.children.length > 50) logList.lastElementChild?.remove();
};

const pageScheme = (): "light" | "dark" =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const followPage = new Set<string>();
const pickers = new Map<string, DatepickerUI>();
const container = document.getElementById("demos");

const mount = (
  target: string,
  options: DatepickerOptions | undefined,
  fixedScheme: boolean,
): void => {
  const picker = new DatepickerUI(
    target,
    fixedScheme
      ? options
      : { ...options, ui: { ...options?.ui, colorScheme: pageScheme() } },
  );
  for (const event of EVENTS) {
    picker.on(event, (data) => {
      log(target, event, data);
    });
  }
  picker.create();
  pickers.set(target, picker);
  if (!fixedScheme) followPage.add(target);
};

for (const demo of [...DEMOS, ...STAGE5_DEMOS, ...COMBINATION_DEMOS]) {
  container?.append(renderSection(demo));
  for (const { target, options } of demo.pickers) {
    mount(target, options, demo.fixedScheme ?? false);
  }
}

initStage5(pickers);
initCombinations(pickers);

document.getElementById("dark-mode-toggle")?.addEventListener("click", () => {
  const dark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("darkMode", String(dark));
  for (const target of followPage) {
    pickers.get(target)?.setOptions({ ui: { colorScheme: pageScheme() } });
  }
});

const apiOutput = document.getElementById("api-output");
const showApi = (text: string): void => {
  if (apiOutput) apiOutput.textContent = text;
};
const API_ACTIONS = new Map<string, (picker: DatepickerUI) => void>([
  [
    "open",
    (picker) => {
      picker.open();
    },
  ],
  [
    "set",
    (picker) => {
      picker.setValue(isoInDays(7));
      showApi(JSON.stringify(picker.getValue()));
    },
  ],
  [
    "get",
    (picker) => {
      showApi(JSON.stringify(picker.getValue()));
    },
  ],
  [
    "clear",
    (picker) => {
      picker.setValue(null);
      showApi(JSON.stringify(picker.getValue()));
    },
  ],
]);

for (const button of document.querySelectorAll<HTMLButtonElement>(
  "button[data-api]",
)) {
  button.addEventListener("click", () => {
    const picker = pickers.get(API_TARGET);
    const action = button.dataset.api ?? "";
    if (action === "lifecycle") {
      if (picker && !picker.isDestroyed) {
        picker.destroy();
        button.textContent = "new DatepickerUI().create()";
        showApi("destroyed");
        return;
      }
      mount(API_TARGET, undefined, false);
      button.textContent = "destroy()";
      showApi("created");
      return;
    }
    if (!picker || picker.isDestroyed) {
      showApi("destroyed: create a new instance first");
      return;
    }
    API_ACTIONS.get(action)?.(picker);
  });
}

document.getElementById("clear-log")?.addEventListener("click", () => {
  logList?.replaceChildren();
});

const pageDialog = document.getElementById("page-dialog");
document.getElementById("open-page-dialog")?.addEventListener("click", () => {
  if (pageDialog instanceof HTMLDialogElement) pageDialog.showModal();
});

const form = document.getElementById("demo-form");
const output = document.getElementById("form-output");
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!(form instanceof HTMLFormElement) || !output) return;
  output.textContent = JSON.stringify(Object.fromEntries(new FormData(form)));
});

for (const selectionForm of document.querySelectorAll("form[data-demo-form]")) {
  selectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = selectionForm.querySelector("output");
    if (!(selectionForm instanceof HTMLFormElement) || !target) return;
    target.textContent = JSON.stringify(
      Object.fromEntries(new FormData(selectionForm)),
    );
  });
}

const themeSelect = document.getElementById("theme-select");
const schemeSelect = document.getElementById("scheme-select");
const applyTheme = (): void => {
  if (
    !(themeSelect instanceof HTMLSelectElement) ||
    !(schemeSelect instanceof HTMLSelectElement)
  ) {
    return;
  }
  const theme = THEMES.find((name) => name === themeSelect.value) ?? "basic";
  const colorScheme =
    SCHEMES.find((name) => name === schemeSelect.value) ?? "auto";
  for (const target of THEMED_PICKERS) {
    pickers.get(target)?.setOptions({ ui: { theme, colorScheme } });
  }
};
themeSelect?.addEventListener("change", applyTheme);
schemeSelect?.addEventListener("change", applyTheme);
