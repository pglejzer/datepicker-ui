import DatepickerUI from "../../src/index";
import type { DatepickerOptions } from "../../src/index";
import { DialogHost, applyTheme, createTextButton } from "../../src/kit";

const INPUT =
  "w-full max-w-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors";
const BUTTON =
  "px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium";
const SELECT =
  "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";
const OUTPUT = "font-mono text-sm text-gray-700 dark:text-gray-300 break-all";
const LABEL = "grid gap-1 text-sm text-gray-700 dark:text-gray-300";
const CHECK =
  "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300";

const TARGET = "#dp-companion";
const CONTAINER = "#dp-companion-container";
const FULLSCREEN_HEIGHT = "640px";

export interface CompanionDemo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly pickers: readonly { target: string; options?: DatepickerOptions }[];
  readonly fixedScheme?: boolean;
  readonly code?: string;
}

const isoInDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(date.getFullYear())}-${month}-${day}`;
};

const pageScheme = (): "light" | "dark" =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const select = (name: string, values: readonly string[], chosen: string) =>
  `<select data-companion="${name}" class="${SELECT}">${values
    .map(
      (value) =>
        `<option value="${value}"${value === chosen ? " selected" : ""}>${value}</option>`,
    )
    .join("")}</select>`;

const action = (name: string, label: string): string =>
  `<button type="button" class="${BUTTON}" data-companion-action="${name}">${label}</button>`;

export const COMPANION_DEMOS: readonly CompanionDemo[] = [
  {
    id: "companion",
    title: "Companion hooks (1.1.0)",
    description:
      "An inline calendar with the ui.layout option, the ui.inline headline, navigation and announceSelection options, and the view and value API. The last button hosts an inline calendar in a kit DialogHost, the way datetimepicker-ui does. navigate, switch:view and clear land in the log.",
    html: `<div class="grid gap-6 justify-items-center w-full">
  <div class="flex flex-wrap gap-4 justify-center items-end">
    <label class="${LABEL}">ui.layout ${select("layout", ["docked", "modal", "fullscreen"], "modal")}</label>
    <label class="${LABEL}">ui.inline.navigation ${select("navigation", ["menus", "caption"], "menus")}</label>
    <label class="${LABEL}">calendar.mode ${select("mode", ["single", "range"], "single")}</label>
    <label class="${CHECK}"><input type="checkbox" data-companion="headline" checked /> headline</label>
    <label class="${CHECK}"><input type="checkbox" data-companion="announceSelection" checked /> announceSelection</label>
  </div>
  <div class="flex flex-wrap gap-2 justify-center">
    ${action("input", 'setView("input")')}
    ${action("calendar", 'setView("calendar")')}
    ${action("goto", "goTo(+90 days)")}
    ${action("clear", "clear()")}
    ${action("range", "getVisibleRange()")}
    ${action("dialog", "Open in kit DialogHost")}
  </div>
  <input id="dp-companion" class="${INPUT}" placeholder="Select date..." />
  <div id="dp-companion-container" class="flex w-full min-w-0 justify-center"></div>
  <output id="companion-output" class="${OUTPUT}"></output>
</div>`,
    pickers: [
      {
        target: TARGET,
        options: {
          ui: {
            layout: "modal",
            inline: { enabled: true, container: CONTAINER },
          },
        },
      },
    ],
    code: `const picker = new DatepickerUI("#dp-companion", {
  ui: {
    layout: "modal", // "auto" | "docked" | "modal" | "fullscreen"
    inline: {
      enabled: true,
      container: "#dp-companion-container",
      headline: true,
      navigation: "menus", // or "caption"
      announceSelection: true,
    },
  },
});
picker.create();
picker.on("switch:view", ({ view }) => console.log(view));
picker.on("navigate", ({ source, from, to }) => console.log(source, from.value, to.value));
picker.setView("input");
picker.goTo("2027-01-15");
picker.clear();
picker.getVisibleRange();

// A companion surface from the kit
import { DialogHost, applyTheme, createTextButton } from "@pglejzer/datepicker-ui/kit";
const host = new DialogHost({ parent: document.body, label: "Pick a date", labelledBy: "title-id", allowPageScroll: false, onCancel: close });
applyTheme(host.root, { theme: "basic", colorScheme: "light" });
new DatepickerUI(input, { ui: { inline: { enabled: true, container: slot, headline: false } } }).create();
void host.open();`,
  },
];

const show = (text: string): void => {
  const output = document.getElementById("companion-output");
  if (output) output.textContent = text;
};

const readSelect = (name: string): string =>
  document.querySelector<HTMLSelectElement>(`select[data-companion="${name}"]`)
    ?.value ?? "";

const readCheck = (name: string): boolean =>
  document.querySelector<HTMLInputElement>(`input[data-companion="${name}"]`)
    ?.checked ?? true;

const layoutValue = (): "docked" | "modal" | "fullscreen" => {
  const value = readSelect("layout");
  if (value === "docked" || value === "fullscreen") return value;
  return "modal";
};

const applyControls = (picker: DatepickerUI): void => {
  const layout = layoutValue();
  const container = document.querySelector<HTMLElement>(CONTAINER);
  if (container) {
    container.style.blockSize =
      layout === "fullscreen" ? FULLSCREEN_HEIGHT : "";
  }
  picker.setOptions({
    calendar: { mode: readSelect("mode") === "range" ? "range" : "single" },
    ui: {
      layout,
      inline: {
        headline: readCheck("headline"),
        navigation:
          readSelect("navigation") === "caption" ? "caption" : "menus",
        announceSelection: readCheck("announceSelection"),
      },
    },
  });
};

const openInDialog = (): void => {
  const host = new DialogHost({
    parent: document.body,
    label: "Pick a date",
    labelledBy: "companion-dialog-title",
    allowPageScroll: false,
    onCancel: () => {
      close();
    },
  });
  applyTheme(host.root, { theme: "basic", colorScheme: pageScheme() });
  const title = document.createElement("h2");
  title.id = "companion-dialog-title";
  title.className = "px-6 pt-6 text-lg font-medium";
  title.textContent = "Pick a date";
  const field = document.createElement("input");
  field.className = `${INPUT} mx-6 my-4`;
  field.placeholder = "Select date...";
  const slot = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "flex justify-end px-3 pb-3";
  const done = createTextButton("confirm", "Done");
  actions.append(done);
  host.body.append(title, field, slot, actions);
  const picker = new DatepickerUI(field, {
    ui: {
      colorScheme: pageScheme(),
      inline: { enabled: true, container: slot, headline: false },
    },
  });
  picker.on("navigate", ({ source, from, to }) => {
    show(`dialog · navigate ${source} ${from.value} – ${to.value}`);
  });
  picker.create();
  void host.open();
  let closing = false;
  function close(): void {
    if (closing) return;
    closing = true;
    void host.close().then(() => {
      picker.destroy();
      host.destroy();
    });
  }
  done.addEventListener("click", close);
};

const runAction = (picker: DatepickerUI, name: string): void => {
  if (name === "input" || name === "calendar") {
    picker.setView(name);
    show(`getView() → ${picker.getView()}`);
    return;
  }
  if (name === "goto") picker.goTo(isoInDays(90));
  if (name === "clear") picker.clear();
  if (name === "dialog") openInDialog();
  const range = picker.getVisibleRange();
  show(
    range === null
      ? "getVisibleRange() → null"
      : `getVisibleRange() → ${range.from.value} – ${range.to.value}`,
  );
};

export const initCompanion = (pickers: Map<string, DatepickerUI>): void => {
  const picker = pickers.get(TARGET);
  if (!picker) return;
  for (const control of document.querySelectorAll<HTMLElement>(
    "[data-companion]",
  )) {
    control.addEventListener("change", () => {
      applyControls(picker);
    });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-companion-action]",
  )) {
    button.addEventListener("click", () => {
      runAction(picker, button.dataset.companionAction ?? "");
    });
  }
};
