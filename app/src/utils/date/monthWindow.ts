import type { YearMonth } from "../../types/date";
import type { PageBy } from "../../types/selection";
import { addMonths, monthsBetween } from "./plainDate";

export function windowFor(
  view: YearMonth,
  target: YearMonth,
  count: number,
  pageBy: PageBy,
): YearMonth {
  const offset = monthsBetween(view, target);
  if (offset >= 0 && offset < count) {
    return view;
  }
  if (pageBy === "month") {
    return offset < 0 ? target : addMonths(target, -(count - 1));
  }
  return addMonths(view, Math.floor(offset / count) * count);
}
