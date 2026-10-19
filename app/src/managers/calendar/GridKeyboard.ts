import type { PlainDate } from "@/types/date";
import { addDays, addMonths, daysInMonth } from "@/utils/date/plainDate";

const DAYS_IN_WEEK = 7;
const MONTHS_IN_YEAR = 12;

const shiftMonths = (date: PlainDate, months: number): PlainDate => {
  const view = addMonths(date, months);
  return {
    year: view.year,
    month: view.month,
    day: Math.min(date.day, daysInMonth(view)),
  };
};

export const nextFocusDate = (
  key: string,
  shift: boolean,
  focus: PlainDate,
  rtl: boolean,
): PlainDate | null => {
  const monthStep = shift ? MONTHS_IN_YEAR : 1;
  switch (key) {
    case "ArrowLeft":
      return addDays(focus, rtl ? 1 : -1);
    case "ArrowRight":
      return addDays(focus, rtl ? -1 : 1);
    case "ArrowUp":
      return addDays(focus, -DAYS_IN_WEEK);
    case "ArrowDown":
      return addDays(focus, DAYS_IN_WEEK);
    case "Home":
      return { year: focus.year, month: focus.month, day: 1 };
    case "End":
      return { ...focus, day: daysInMonth(focus) };
    case "PageUp":
      return shiftMonths(focus, -monthStep);
    case "PageDown":
      return shiftMonths(focus, monthStep);
    default:
      return null;
  }
};
