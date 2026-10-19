import type { PlainDate, YearMonth } from "../../types/date";
import { windowFor } from "../../utils/date/monthWindow";
import {
  compareDates,
  daysInMonth,
  monthsBetween,
} from "../../utils/date/plainDate";
import type { NavigateSource } from "../../types/internal";
import type { LifecycleContext } from "./context";

function dateIn(
  context: LifecycleContext,
  view: YearMonth,
  day: number,
): PlainDate {
  const candidate: PlainDate = {
    year: view.year,
    month: view.month,
    day: Math.min(day, daysInMonth(view)),
  };
  const { minDate, maxDate } = context.core.options;
  if (minDate !== null && compareDates(candidate, minDate) < 0) {
    return minDate;
  }
  if (maxDate !== null && compareDates(candidate, maxDate) > 0) {
    return maxDate;
  }
  return candidate;
}

export function showMonth(
  context: LifecycleContext,
  target: YearMonth,
  source: NavigateSource,
): YearMonth {
  const { core, managers } = context;
  const shown = managers.validation.clampView(target);
  const delta = monthsBetween(core.view, shown);
  if (delta !== 0) {
    core.setView(shown, delta, source);
    core.setFocus(dateIn(context, shown, core.focus.day));
  }
  return shown;
}

export function moveFocus(
  context: LifecycleContext,
  date: PlainDate,
  source: NavigateSource,
): void {
  const { core, managers } = context;
  const month: YearMonth = { year: date.year, month: date.month };
  const { months } = core.layout;
  const shown = managers.validation.clampView(
    windowFor(core.view, month, months, core.options.pageBy),
  );
  const offset = monthsBetween(shown, month);
  if (offset < 0 || offset >= months) {
    return;
  }
  const delta = monthsBetween(core.view, shown);
  if (delta !== 0) {
    core.setView(shown, delta, source);
  }
  core.setFocus(date);
}
