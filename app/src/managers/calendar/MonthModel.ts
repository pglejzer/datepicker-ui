import type { PlainDate, Weekday, YearMonth } from "@/types/date";
import {
  addDays,
  dayOfWeek,
  daysInMonth,
  isoWeekNumber,
} from "@/utils/date/plainDate";

export interface MonthCell {
  readonly date: PlainDate;
  readonly inMonth: boolean;
}

export interface MonthModel {
  readonly view: YearMonth;
  readonly weeks: readonly (readonly MonthCell[])[];
  readonly weekNumbers: readonly number[];
}

const DAYS_IN_WEEK = 7;
const FIXED_WEEK_COUNT = 6;
const THURSDAY = 4;

export const buildMonth = (
  view: YearMonth,
  weekStart: Weekday,
  fixedWeeks: boolean,
): MonthModel => {
  const first: PlainDate = { year: view.year, month: view.month, day: 1 };
  const leading = (dayOfWeek(first) - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const weekCount = fixedWeeks
    ? FIXED_WEEK_COUNT
    : Math.ceil((leading + daysInMonth(view)) / DAYS_IN_WEEK);
  const gridStart = addDays(first, -leading);
  const thursdayOffset = (THURSDAY - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK;

  const weeks: MonthCell[][] = [];
  const weekNumbers: number[] = [];

  for (let week = 0; week < weekCount; week++) {
    const rowStart = addDays(gridStart, week * DAYS_IN_WEEK);
    const row: MonthCell[] = [];
    for (let day = 0; day < DAYS_IN_WEEK; day++) {
      const date = addDays(rowStart, day);
      row.push({
        date,
        inMonth: date.year === view.year && date.month === view.month,
      });
    }
    weeks.push(row);
    weekNumbers.push(isoWeekNumber(addDays(rowStart, thursdayOffset)));
  }

  return { view, weeks, weekNumbers };
};
