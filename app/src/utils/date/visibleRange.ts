import type { PlainDate, Weekday, YearMonth } from "@/types/date";
import type { CalendarLayout, MonthSpan } from "@/types/internal";
import type { Precision } from "@/types/selection";
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysInMonth,
} from "@/utils/date/plainDate";

const DAYS_IN_WEEK = 7;
const FIXED_WEEK_COUNT = 6;

export interface DayGridShapeInput {
  readonly layout: CalendarLayout;
  readonly inline: boolean;
  readonly months: number;
  readonly outsideDays: boolean;
  readonly fixedWeeks: boolean;
}

export interface DayGridShape {
  readonly outsideDays: boolean;
  readonly fixedWeeks: boolean;
}

export interface VisibleRangeInput {
  readonly view: YearMonth;
  readonly months: number;
  readonly precision: Precision;
  readonly weekStart: Weekday;
  readonly fixedWeeks: boolean;
  readonly outsideDays: boolean;
  readonly yearBounds: { readonly min: number; readonly max: number };
  readonly listSpan: MonthSpan | null;
}

export interface DaySpan {
  readonly from: PlainDate;
  readonly to: PlainDate;
}

const spanOf = (first: YearMonth, last: YearMonth): DaySpan => ({
  from: { year: first.year, month: first.month, day: 1 },
  to: { year: last.year, month: last.month, day: daysInMonth(last) },
});

const gridSpan = (
  view: YearMonth,
  weekStart: Weekday,
  fixedWeeks: boolean,
): DaySpan => {
  const first: PlainDate = { year: view.year, month: view.month, day: 1 };
  const leading = (dayOfWeek(first) - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const weeks = fixedWeeks
    ? FIXED_WEEK_COUNT
    : Math.ceil((leading + daysInMonth(view)) / DAYS_IN_WEEK);
  const from = addDays(first, -leading);
  return { from, to: addDays(from, weeks * DAYS_IN_WEEK - 1) };
};

export const dayGridShape = (input: DayGridShapeInput): DayGridShape => {
  const outsideDays =
    input.layout === "docked" && input.months <= 1 && input.outsideDays;
  const fixedWeeks =
    (input.layout !== "docked" && !input.inline) ||
    outsideDays ||
    input.fixedWeeks;
  return { outsideDays, fixedWeeks };
};

export const visibleRange = (input: VisibleRangeInput): DaySpan => {
  const { view, listSpan, yearBounds } = input;
  if (listSpan !== null) {
    return spanOf(listSpan.first, listSpan.last);
  }
  if (input.precision === "year") {
    return spanOf(
      { year: yearBounds.min, month: 1 },
      { year: yearBounds.max, month: 12 },
    );
  }
  if (input.precision === "month") {
    return spanOf(
      { year: view.year, month: 1 },
      { year: view.year, month: 12 },
    );
  }
  if (input.months > 1) {
    return spanOf(view, addMonths(view, input.months - 1));
  }
  if (input.outsideDays) {
    return gridSpan(view, input.weekStart, input.fixedWeeks);
  }
  return spanOf(view, view);
};
