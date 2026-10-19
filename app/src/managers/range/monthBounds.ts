import type { CoreState } from "@/datepicker/CoreState";
import type { YearMonth } from "@/types/date";
import type { DateRules } from "@/types/internal";
import { monthsBetween } from "@/utils/date/plainDate";
import { anchorDate } from "@/utils/selection/model";

export interface MonthBounds {
  readonly first: YearMonth;
  readonly last: YearMonth;
}

export const monthOf = (date: YearMonth): YearMonth => ({
  year: date.year,
  month: date.month,
});

export const anchorMonth = (core: CoreState): YearMonth => {
  const anchor = anchorDate(core.draft);
  return anchor === null ? core.view : monthOf(anchor);
};

export const monthBounds = (core: CoreState, rules: DateRules): MonthBounds => {
  const { minDate, maxDate } = core.options;
  const years = rules.yearBounds();
  const lowest: YearMonth = { year: years.min, month: 1 };
  const highest: YearMonth = { year: years.max, month: 12 };
  const raiseFirst = minDate !== null && monthsBetween(lowest, minDate) > 0;
  const lowerLast = maxDate !== null && monthsBetween(maxDate, highest) > 0;
  return {
    first: raiseFirst ? monthOf(minDate) : lowest,
    last: lowerLast ? monthOf(maxDate) : highest,
  };
};

export const clampMonth = (view: YearMonth, bounds: MonthBounds): YearMonth => {
  if (monthsBetween(bounds.first, view) < 0) return bounds.first;
  if (monthsBetween(view, bounds.last) < 0) return bounds.last;
  return view;
};
