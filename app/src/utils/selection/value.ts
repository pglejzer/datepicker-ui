import type { PlainDate } from "@/types/date";
import type { CalendarMode, Precision, Selection } from "@/types/selection";
import type { DateValue, PickerValue } from "@/types/types";
import { normalizePeriod, parsePeriodISO } from "@/utils/date/period";
import { compareDates, toPlainDate } from "@/utils/date/plainDate";
import {
  emptySelection,
  isEmptySelection,
  selectedDates,
  sortedUnique,
} from "@/utils/selection/model";

export function toPickerValue(
  s: Selection,
  describe: (date: PlainDate) => DateValue,
): PickerValue | null {
  if (isEmptySelection(s)) {
    return null;
  }
  switch (s.mode) {
    case "single":
      return s.date ? describe(s.date) : null;
    case "range":
      if (s.start === null || s.end === null) {
        return null;
      }
      return { start: describe(s.start), end: describe(s.end) };
    default:
      return selectedDates(s).map(describe);
  }
}

function resolveInput(value: unknown, precision: Precision): PlainDate | null {
  if (typeof value === "string") {
    return parsePeriodISO(value, precision);
  }
  if (value instanceof Date) {
    const date = toPlainDate(value);
    return date === null ? null : normalizePeriod(date, precision);
  }
  return null;
}

function toRange(value: object): Selection | null {
  if (!("start" in value && "end" in value)) {
    return null;
  }
  const start = resolveInput(value.start, "day");
  const end = resolveInput(value.end, "day");
  if (start === null || end === null || compareDates(start, end) > 0) {
    return null;
  }
  return { mode: "range", start, end };
}

function toMultiple(items: readonly unknown[]): Selection | null {
  const dates: PlainDate[] = [];
  for (const item of items) {
    const date = resolveInput(item, "day");
    if (date === null) {
      return null;
    }
    dates.push(date);
  }
  return { mode: "multiple", dates: sortedUnique(dates) };
}

export function toSelection(
  raw: unknown,
  mode: CalendarMode,
  precision: Precision,
): Selection | null {
  if (raw === null) {
    return emptySelection(mode);
  }
  if (mode === "multiple") {
    return Array.isArray(raw) ? toMultiple(raw) : null;
  }
  if (mode === "single") {
    const date = resolveInput(raw, precision);
    return date === null ? null : { mode, date };
  }
  const isPlainObject =
    typeof raw === "object" && !Array.isArray(raw) && !(raw instanceof Date);
  return isPlainObject ? toRange(raw) : null;
}
