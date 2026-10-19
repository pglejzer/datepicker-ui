import type { PlainDate } from "@/types/date";
import type { Selection, SelectionLimits } from "@/types/selection";
import type { UnavailableReason } from "@/types/types";
import { addDays, compareDates, daysBetween } from "@/utils/date/plainDate";
import { isDateSelected } from "@/utils/selection/model";

type DisabledCheck = (date: PlainDate) => boolean;
type ReasonOf = (date: PlainDate) => UnavailableReason | null;

function lengthAllowed(
  start: PlainDate,
  end: PlainDate,
  limits: SelectionLimits,
): boolean {
  const length = daysBetween(start, end) + 1;
  if (limits.minLength !== null && length < limits.minLength) {
    return false;
  }
  return limits.maxLength === null || length <= limits.maxLength;
}

function firstDisabledAfter(
  start: PlainDate,
  limits: SelectionLimits,
  isDisabled: DisabledCheck,
  lastDay: PlainDate,
): PlainDate | null {
  let scanEnd = lastDay;
  if (limits.maxLength !== null) {
    const byLength = addDays(start, limits.maxLength - 1);
    scanEnd = compareDates(byLength, lastDay) < 0 ? byLength : lastDay;
  }
  for (
    let day = addDays(start, 1);
    compareDates(day, scanEnd) <= 0;
    day = addDays(day, 1)
  ) {
    if (isDisabled(day)) {
      return day;
    }
  }
  return null;
}

export function createSelectionGuard(
  draft: Selection,
  limits: SelectionLimits,
  isDisabled: DisabledCheck,
  lastDay: PlainDate,
): (date: PlainDate) => boolean {
  if (draft.mode === "multiple") {
    const { multipleMax } = limits;
    const { dates } = draft;
    return (date) =>
      multipleMax !== null &&
      dates.length >= multipleMax &&
      !isDateSelected(draft, date);
  }
  if (draft.mode !== "range" || draft.start === null || draft.end !== null) {
    return () => false;
  }
  const { start } = draft;
  let blocker: PlainDate | null = null;
  let scanned = false;
  return (date) => {
    if (compareDates(date, start) < 0) {
      return false;
    }
    if (
      compareDates(date, lastDay) > 0 ||
      !lengthAllowed(start, date, limits)
    ) {
      return true;
    }
    if (!scanned) {
      blocker = firstDisabledAfter(start, limits, isDisabled, lastDay);
      scanned = true;
    }
    return blocker !== null && compareDates(date, blocker) >= 0;
  };
}

function rangeIssue(
  start: PlainDate,
  end: PlainDate,
  limits: SelectionLimits,
  reasonOf: ReasonOf,
): UnavailableReason | null {
  if (!lengthAllowed(start, end, limits)) {
    return "range-length";
  }
  for (let day = start; compareDates(day, end) <= 0; day = addDays(day, 1)) {
    const reason = reasonOf(day);
    if (reason !== null) {
      return reason;
    }
  }
  return null;
}

function firstReason(
  dates: readonly PlainDate[],
  reasonOf: ReasonOf,
): UnavailableReason | null {
  for (const date of dates) {
    const reason = reasonOf(date);
    if (reason !== null) {
      return reason;
    }
  }
  return null;
}

export function selectionIssue(
  s: Selection,
  limits: SelectionLimits,
  reasonOf: ReasonOf,
): UnavailableReason | null {
  switch (s.mode) {
    case "single":
      return s.date === null ? null : reasonOf(s.date);
    case "range":
      if (s.start !== null && s.end !== null) {
        return rangeIssue(s.start, s.end, limits, reasonOf);
      }
      return s.start === null ? null : reasonOf(s.start);
    default:
      if (limits.multipleMax !== null && s.dates.length > limits.multipleMax) {
        return "multiple-max";
      }
      return firstReason(s.dates, reasonOf);
  }
}

export function isSelectionAllowed(
  s: Selection,
  limits: SelectionLimits,
  isDisabled: DisabledCheck,
): boolean {
  const issue = selectionIssue(s, limits, (date) =>
    isDisabled(date) ? "disabled" : null,
  );
  return issue === null;
}
