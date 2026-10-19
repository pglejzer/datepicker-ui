import type { PlainDate } from "@/types/date";
import type { RangeEnd, Selection, SelectionLimits } from "@/types/selection";
import { compareDates } from "@/utils/date/plainDate";
import { sortedUnique } from "@/utils/selection/model";

function pickMultiple(
  dates: readonly PlainDate[],
  date: PlainDate,
  limits: SelectionLimits,
): readonly PlainDate[] | null {
  if (dates.some((selected) => compareDates(selected, date) === 0)) {
    return dates.filter((selected) => compareDates(selected, date) !== 0);
  }
  if (limits.multipleMax !== null && dates.length >= limits.multipleMax) {
    return null;
  }
  return sortedUnique([...dates, date]);
}

export function nextEnd(s: Selection): RangeEnd {
  return s.mode === "range" && s.start !== null && s.end === null
    ? "end"
    : "start";
}

export function draftForEnd(s: Selection, active: RangeEnd): Selection {
  if (s.mode !== "range") {
    return s;
  }
  if (active === "start") {
    return { mode: "range", start: null, end: null };
  }
  return { mode: "range", start: s.start, end: null };
}

export function pickDate(
  s: Selection,
  date: PlainDate,
  limits: SelectionLimits,
  active: RangeEnd,
): Selection {
  switch (s.mode) {
    case "single":
      return { mode: "single", date };
    case "range":
      if (
        active === "start" ||
        s.start === null ||
        compareDates(date, s.start) < 0
      ) {
        return { mode: "range", start: date, end: null };
      }
      return { mode: "range", start: s.start, end: date };
    default: {
      const next = pickMultiple(s.dates, date, limits);
      return next === null ? s : { mode: "multiple", dates: next };
    }
  }
}
