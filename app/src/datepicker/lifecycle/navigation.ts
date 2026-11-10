import type { PlainDate, YearMonth } from "../../types/date";
import { windowFor } from "../../utils/date/monthWindow";
import {
  compareDates,
  daysInMonth,
  monthsBetween,
} from "../../utils/date/plainDate";
import type { NavigateSource } from "../../types/internal";
import type { LifecycleContext } from "./context";

export function clampToLimits(
  context: LifecycleContext,
  date: PlainDate,
): PlainDate {
  const { core, managers } = context;
  const { minDate, maxDate } = core.options;
  const years = managers.validation.yearBounds();
  const first: PlainDate = { year: years.min, month: 1, day: 1 };
  const last: PlainDate = { year: years.max, month: 12, day: 31 };
  const low =
    minDate !== null && compareDates(minDate, first) > 0 ? minDate : first;
  const high =
    maxDate !== null && compareDates(maxDate, last) < 0 ? maxDate : last;
  if (compareDates(date, low) < 0) {
    return low;
  }
  return compareDates(date, high) > 0 ? high : date;
}

function dateIn(
  context: LifecycleContext,
  view: YearMonth,
  day: number,
): PlainDate {
  return clampToLimits(context, {
    year: view.year,
    month: view.month,
    day: Math.min(day, daysInMonth(view)),
  });
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
