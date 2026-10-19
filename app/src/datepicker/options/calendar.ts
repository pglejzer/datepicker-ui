import type { Weekday } from "../../types/date";
import type { DateDecoration, DatepickerOptions } from "../../types/options";
import type {
  CalendarMode,
  Precision,
  SelectionLimits,
} from "../../types/selection";
import type { PickerValue } from "../../types/types";
import { rethrowLater } from "../../utils/rethrow";
import {
  isLocaleTag,
  resolveLocale,
  resolveWeekStart,
} from "../../utils/date/intl";
import { DEFAULT_DATEPICKER_OPTIONS } from "./defaults";
import { resolveDate, resolveDateList } from "./dates";
import { CALENDAR_MODES, PAGE_BYS, PRECISIONS, WEEK_STARTS } from "./fields";
import { isFunction, isPositiveInteger, isValueFunction, pick } from "./pick";
import type { OptionIssue } from "./pick";
import { resolvePresets } from "./presets";
import type { ResolvedOptions } from "./types";

export type ResolvedCalendarOptions = Pick<
  ResolvedOptions,
  | "locale"
  | "weekStart"
  | "minDate"
  | "maxDate"
  | "disabledDates"
  | "enabledDates"
  | "mode"
  | "precision"
  | "months"
  | "pageBy"
  | "limits"
  | "presets"
  | "isDateDisabled"
  | "disabledWeekdays"
  | "decorateDate"
  | "renderDate"
  | "validate"
>;

function isWeekday(value: unknown): value is Weekday {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function checkLocale(value: string | undefined, issues: OptionIssue[]): void {
  const tag = value?.trim();
  if (tag && !isLocaleTag(tag)) {
    issues.push({ option: "calendar.locale", value });
  }
}

function resolveWeekdays(
  value: unknown,
  issues: OptionIssue[],
): readonly Weekday[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    issues.push({ option: "calendar.disabledWeekdays", value });
    return [];
  }
  const items: unknown[] = value;
  const weekdays: Weekday[] = [];
  for (const item of items) {
    if (!isWeekday(item)) {
      issues.push({ option: "calendar.disabledWeekdays", value: item });
    } else if (!weekdays.includes(item)) {
      weekdays.push(item);
    }
  }
  return weekdays;
}

function readDecoration(value: unknown): DateDecoration | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const className: unknown = Reflect.get(value, "className");
  const badge: unknown = Reflect.get(value, "badge");
  const label: unknown = Reflect.get(value, "label");
  return {
    ...(typeof className === "string" ? { className } : {}),
    ...(typeof badge === "boolean" ? { badge } : {}),
    ...(typeof label === "string" ? { label } : {}),
  };
}

function toContent(value: unknown): string | Node | null {
  if (typeof value === "string") return value;
  if (typeof Node !== "undefined" && value instanceof Node) return value;
  return null;
}

function wrapRenderDate(
  render: ((date: Date) => unknown) | null,
): ResolvedOptions["renderDate"] {
  if (render === null) return null;
  return (date) => {
    try {
      return toContent(render(date));
    } catch (error) {
      rethrowLater(error);
      return null;
    }
  };
}

function wrapValidate(
  validate: ((value: PickerValue | null) => unknown) | null,
): ResolvedOptions["validate"] {
  if (validate === null) return null;
  return (value) => {
    try {
      const message = validate(value);
      if (typeof message !== "string" || message.length === 0) return null;
      return message;
    } catch (error) {
      rethrowLater(error);
      return null;
    }
  };
}

function resolvePrecision(
  value: unknown,
  mode: CalendarMode,
  issues: OptionIssue[],
): Precision {
  const defaults = DEFAULT_DATEPICKER_OPTIONS.calendar;
  const precision = pick(
    value,
    PRECISIONS,
    defaults.precision,
    "calendar.precision",
    issues,
  );
  if (precision !== "day" && mode !== "single") {
    issues.push({ option: "calendar.precision", value });
    return defaults.precision;
  }
  return precision;
}

function resolveLimits(
  calendar: DatepickerOptions["calendar"],
  issues: OptionIssue[],
): SelectionLimits {
  const minLength = pick(
    calendar?.range?.minLength,
    isPositiveInteger,
    null,
    "calendar.range.minLength",
    issues,
  );
  const maxLength = pick(
    calendar?.range?.maxLength,
    isPositiveInteger,
    null,
    "calendar.range.maxLength",
    issues,
  );
  const multipleMax = pick(
    calendar?.multiple?.max,
    isPositiveInteger,
    null,
    "calendar.multiple.max",
    issues,
  );
  if (minLength !== null && maxLength !== null && minLength > maxLength) {
    issues.push({ option: "calendar.range", value: calendar?.range });
    return { minLength, maxLength: null, multipleMax };
  }
  return { minLength, maxLength, multipleMax };
}

export function resolveCalendarOptions(
  calendar: DatepickerOptions["calendar"],
  issues: OptionIssue[],
): ResolvedCalendarOptions {
  const defaults = DEFAULT_DATEPICKER_OPTIONS.calendar;
  checkLocale(calendar?.locale, issues);
  const locale = resolveLocale(calendar?.locale);
  const weekStart = pick(
    calendar?.weekStart,
    WEEK_STARTS,
    defaults.weekStart,
    "calendar.weekStart",
    issues,
  );
  const disabledFn = pick(
    calendar?.isDateDisabled,
    isFunction,
    null,
    "calendar.isDateDisabled",
    issues,
  );
  const decorateFn = pick(
    calendar?.decorateDate,
    isFunction,
    null,
    "calendar.decorateDate",
    issues,
  );
  const renderFn = pick(
    calendar?.renderDate,
    isFunction,
    null,
    "calendar.renderDate",
    issues,
  );
  const validateFn = pick(
    calendar?.validate,
    isValueFunction,
    null,
    "calendar.validate",
    issues,
  );
  const mode = pick(
    calendar?.mode,
    CALENDAR_MODES,
    defaults.mode,
    "calendar.mode",
    issues,
  );
  return {
    locale,
    weekStart: resolveWeekStart(locale, weekStart),
    minDate: resolveDate(calendar?.minDate, true, "calendar.minDate", issues),
    maxDate: resolveDate(calendar?.maxDate, true, "calendar.maxDate", issues),
    disabledDates:
      resolveDateList(
        calendar?.disabledDates,
        "calendar.disabledDates",
        issues,
      ) ?? [],
    enabledDates: resolveDateList(
      calendar?.enabledDates,
      "calendar.enabledDates",
      issues,
    ),
    mode,
    precision: resolvePrecision(calendar?.precision, mode, issues),
    months: pick(
      calendar?.months,
      isPositiveInteger,
      defaults.months,
      "calendar.months",
      issues,
    ),
    pageBy: pick(
      calendar?.pageBy,
      PAGE_BYS,
      defaults.pageBy,
      "calendar.pageBy",
      issues,
    ),
    limits: resolveLimits(calendar, issues),
    presets: resolvePresets(calendar?.range?.presets, issues),
    isDateDisabled:
      disabledFn === null ? null : (date) => Boolean(disabledFn(date)),
    disabledWeekdays: resolveWeekdays(calendar?.disabledWeekdays, issues),
    decorateDate:
      decorateFn === null ? null : (date) => readDecoration(decorateFn(date)),
    renderDate: wrapRenderDate(renderFn),
    validate: wrapValidate(validateFn),
  };
}
