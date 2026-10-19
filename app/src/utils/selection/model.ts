import type { PlainDate } from "@/types/date";
import type { CalendarMode, RangeRole, Selection } from "@/types/selection";
import { compareDates, isSameDay } from "@/utils/date/plainDate";

export function sortedUnique(dates: readonly PlainDate[]): PlainDate[] {
  const sorted = [...dates].sort(compareDates);
  return sorted.filter(
    (date, index) => index === 0 || compareDates(sorted[index - 1], date) !== 0,
  );
}

export function emptySelection(mode: CalendarMode): Selection {
  switch (mode) {
    case "single":
      return { mode, date: null };
    case "range":
      return { mode, start: null, end: null };
    default:
      return { mode, dates: [] };
  }
}

export function selectedDates(s: Selection): readonly PlainDate[] {
  switch (s.mode) {
    case "single":
      return s.date ? [s.date] : [];
    case "range":
      return [s.start, s.end].filter((date) => date !== null);
    default:
      return s.dates;
  }
}

export function isEmptySelection(s: Selection): boolean {
  return selectedDates(s).length === 0;
}

export function isCompleteSelection(s: Selection): boolean {
  if (s.mode !== "range") {
    return true;
  }
  return (s.start === null) === (s.end === null);
}

function sameEnd(a: PlainDate | null, b: PlainDate | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return compareDates(a, b) === 0;
}

export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.mode !== b.mode) {
    return false;
  }
  const left = selectedDates(a);
  const right = selectedDates(b);
  if (left.length !== right.length) {
    return false;
  }
  if (a.mode === "range" && b.mode === "range") {
    return sameEnd(a.start, b.start) && sameEnd(a.end, b.end);
  }
  return left.every((date, index) => compareDates(date, right[index]) === 0);
}

export function isDateSelected(s: Selection, date: PlainDate): boolean {
  return selectedDates(s).some((selected) => isSameDay(selected, date));
}

export function rangeRole(s: Selection, date: PlainDate): RangeRole | null {
  if (s.mode !== "range" || s.start === null || s.end === null) {
    return null;
  }
  if (compareDates(s.start, s.end) >= 0) {
    return null;
  }
  if (isSameDay(s.start, date)) {
    return "start";
  }
  if (isSameDay(s.end, date)) {
    return "end";
  }
  const inside =
    compareDates(date, s.start) > 0 && compareDates(date, s.end) < 0;
  return inside ? "in-range" : null;
}

export function anchorDate(s: Selection): PlainDate | null {
  return selectedDates(s).at(0) ?? null;
}
