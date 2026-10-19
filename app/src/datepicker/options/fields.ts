import { COMPACT_BREAKPOINT } from "../../constants/constants";
import type { DatepickerOptions } from "../../types/options";
import type { Precision } from "../../types/selection";
import { isFormatOption } from "../../utils/date/format";
import { DEFAULT_LABELS } from "./defaults";
import {
  isBoolean,
  isPluralLabel,
  isPositiveInteger,
  isString,
  oneOf,
  pick,
} from "./pick";
import type { Check, OptionIssue } from "./pick";
import type { ResolvedOptions } from "./types";

export function isFormatFor(precision: Precision): Check<string> {
  return (value) =>
    typeof value === "string" && isFormatOption(value, precision)
      ? value
      : undefined;
}

export const DISPLAY_MODES = oneOf(["auto", "docked", "modal"]);
export const COLOR_SCHEMES = oneOf(["auto", "light", "dark"]);
export const WEEK_STARTS = oneOf(["auto", "sunday", "monday", "saturday"]);
export const CALENDAR_MODES = oneOf(["single", "range", "multiple"]);
export const INITIAL_VIEWS = oneOf(["calendar", "input"]);
export const PRECISIONS = oneOf(["day", "month", "year"]);
export const PAGE_BYS = oneOf(["month", "view"]);
export const START_VIEWS = oneOf(["day", "month", "year"]);
export const THEMES = oneOf([
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
]);

function isLabelKey(key: string): key is keyof typeof DEFAULT_LABELS {
  return key in DEFAULT_LABELS;
}

export function resolveLabels(
  labels: DatepickerOptions["labels"],
  issues: OptionIssue[],
): ResolvedOptions["labels"] {
  const resolved = { ...DEFAULT_LABELS };
  for (const key of Object.keys(DEFAULT_LABELS)) {
    if (!isLabelKey(key) || key === "multipleSelected") continue;
    resolved[key] = pick(
      labels?.[key],
      isString,
      DEFAULT_LABELS[key],
      `labels.${key}`,
      issues,
    );
  }
  resolved.multipleSelected = pick(
    labels?.multipleSelected,
    isPluralLabel,
    DEFAULT_LABELS.multipleSelected,
    "labels.multipleSelected",
    issues,
  );
  return resolved;
}

export function resolveFullscreenBelow(
  value: unknown,
  issues: OptionIssue[],
): number {
  if (value === undefined || value === true) return COMPACT_BREAKPOINT;
  if (value === false) return 0;
  return pick(
    value,
    isPositiveInteger,
    COMPACT_BREAKPOINT,
    "ui.fullscreen",
    issues,
  );
}

export function resolveOutsideDays(
  value: unknown,
  issues: OptionIssue[],
): ResolvedOptions["outsideDays"] {
  if (value === undefined || value === false) return false;
  if (value === true) return { selectable: true };
  if (typeof value === "object" && value !== null) {
    return {
      selectable: pick(
        Reflect.get(value, "selectable"),
        isBoolean,
        true,
        "ui.outsideDays.selectable",
        issues,
      ),
    };
  }
  issues.push({ option: "ui.outsideDays", value });
  return false;
}

export function resolveClearButton(
  value: unknown,
  issues: OptionIssue[],
): ResolvedOptions["clearButton"] {
  if (value === undefined || value === false) return false;
  if (value === true) return { clearInput: true };
  if (typeof value === "object" && value !== null) {
    return {
      clearInput: pick(
        Reflect.get(value, "clearInput"),
        isBoolean,
        true,
        "ui.clearButton.clearInput",
        issues,
      ),
    };
  }
  issues.push({ option: "ui.clearButton", value });
  return false;
}
