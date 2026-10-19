import type { DatepickerOptions } from "../../src/index";

export const INPUT =
  "w-64 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors";
export const ACTIVE_FIELD =
  "[&.dp-ui\\_\\_input--active]:ring-2 [&.dp-ui\\_\\_input--active]:ring-violet-500 [&.dp-ui\\_\\_input--active]:border-violet-500";
export const OUTPUT =
  "font-mono text-sm text-gray-700 dark:text-gray-300 break-all";
export const LABEL = "grid gap-1 text-sm text-gray-700 dark:text-gray-300";

export interface CombinationDemo {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly html: string;
  readonly pickers: readonly { target: string; options?: DatepickerOptions }[];
  readonly fixedScheme?: boolean;
  readonly code?: string;
}

export type RangePresets = NonNullable<
  NonNullable<DatepickerOptions["calendar"]>["range"]
>["presets"];

export const field = (id: string, placeholder = "Select date..."): string =>
  `<input id="${id}" name="${id}" class="${INPUT}" placeholder="${placeholder}" />`;

export const labelled = (id: string, text: string, extra = ""): string =>
  `<label class="${LABEL}">${text}<input id="${id}" name="${id}" class="${INPUT} ${extra}" placeholder="${text}" /></label>`;

export const row = (...items: string[]): string =>
  `<div class="flex flex-wrap gap-4 justify-center">${items.join("")}</div>`;

export const column = (...items: string[]): string =>
  `<div class="grid gap-4 justify-items-center">${items.join("")}</div>`;

export const inlineBox = (id: string, placeholder?: string): string =>
  column(field(id, placeholder), `<div id="${id}-box"></div>`);

export const inlineUi = (id: string): { enabled: true; container: string } => ({
  enabled: true,
  container: `#${id}-box`,
});

export const output = (id: string): string =>
  `<output id="${id}" class="${OUTPUT}"></output>`;

export const isWeekend = (date: Date): boolean =>
  date.getDay() === 0 || date.getDay() === 6;

export const isoInDays = (days: number): string => {
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

export const PRESETS: RangePresets = [
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
];

export const PRESETS_CODE = `const daysAgo = (days) => {
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
];`;

export const price = (date: Date): string | null =>
  isWeekend(date) ? null : `$${String(80 + ((date.getDate() * 7) % 90))}`;
