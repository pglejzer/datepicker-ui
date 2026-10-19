import type { CoreState } from "@/datepicker/CoreState";
import type { DateRules } from "@/types/internal";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { DatepickerEventMap, UnavailableReason } from "@/types/types";
import type { PlainDate, YearMonth } from "@/types/date";
import type { Selection } from "@/types/selection";
import type { EventEmitter } from "@/utils/EventEmitter";
import {
  compareDates,
  createPlainDate,
  dayOfWeek,
  daysInMonth,
  todayDate,
  toDate,
  toISO,
} from "@/utils/date/plainDate";
import { rethrowLater } from "@/utils/rethrow";
import { createSelectionGuard } from "@/utils/selection/constraints";
import { sameSelection } from "@/utils/selection/model";

interface DateLists {
  readonly source: ResolvedOptions;
  readonly disabled: ReadonlySet<string>;
  readonly enabled: ReadonlySet<string> | null;
  readonly callbackResults: Map<string, boolean>;
  guardDraft: Selection | null;
  guard: ((date: PlainDate) => boolean) | null;
}

function monthIndex(view: YearMonth): number {
  return view.year * 12 + view.month - 1;
}

export class ValidationManager implements DateRules {
  private lists: DateLists | null = null;

  constructor(
    private readonly core: CoreState,
    private readonly emitter: EventEmitter<DatepickerEventMap>,
  ) {}

  isDisabled(date: PlainDate): boolean {
    return this.unavailableReason(date) !== null;
  }

  unavailableReason(date: PlainDate): UnavailableReason | null {
    switch (this.core.options.precision) {
      case "day":
        return this.dayReason(date);
      case "month":
        return this.monthReason(date);
      case "year":
        return this.yearReason(date.year);
    }
  }

  isSelectable(date: PlainDate, draft: Selection): boolean {
    return !this.isDisabled(date) && !this.guardFor(draft)(date);
  }

  isMonthDisabled(view: YearMonth): boolean {
    const length = daysInMonth(view);
    const first = createPlainDate(view.year, view.month, 1);
    const last = createPlainDate(view.year, view.month, length);
    if (first === null || last === null) return true;
    const { minDate, maxDate } = this.core.options;
    const bounds = this.yearBounds();
    if (view.year < bounds.min || view.year > bounds.max) return true;
    if (minDate !== null && compareDates(last, minDate) < 0) return true;
    if (maxDate !== null && compareDates(first, maxDate) > 0) return true;
    for (let day = 1; day <= length; day += 1) {
      const reason = this.dayReason({
        year: view.year,
        month: view.month,
        day,
      });
      if (reason === null) {
        return false;
      }
    }
    return true;
  }

  yearBounds(): { readonly min: number; readonly max: number } {
    const { minDate, maxDate, yearRange } = this.core.options;
    const today = todayDate();
    const rangeMin = today.year - yearRange.before;
    const rangeMax = today.year + yearRange.after;
    return {
      min: minDate === null ? rangeMin : Math.max(rangeMin, minDate.year),
      max: maxDate === null ? rangeMax : Math.min(rangeMax, maxDate.year),
    };
  }

  clampView(view: YearMonth): YearMonth {
    const { minDate, maxDate } = this.core.options;
    const bounds = this.yearBounds();
    let low = bounds.min * 12;
    let high = bounds.max * 12 + 11;
    if (minDate !== null) low = Math.max(low, monthIndex(minDate));
    if (maxDate !== null) high = Math.min(high, monthIndex(maxDate));
    const extra = this.core.layout.months - 1;
    if (extra > 0) high = Math.max(low, high - extra);
    const index = Math.min(Math.max(monthIndex(view), low), high);
    const year = Math.floor(index / 12);
    return { year, month: index - year * 12 + 1 };
  }

  destroy(): void {
    this.lists = null;
  }

  private monthReason(view: YearMonth): UnavailableReason | null {
    if (!this.isMonthDisabled(view)) return null;
    const { minDate, maxDate } = this.core.options;
    const bounds = this.yearBounds();
    const index = monthIndex(view);
    let low = bounds.min * 12;
    let high = bounds.max * 12 + 11;
    if (minDate !== null) low = Math.max(low, monthIndex(minDate));
    if (maxDate !== null) high = Math.min(high, monthIndex(maxDate));
    if (index < low) return "min";
    return index > high ? "max" : "disabled";
  }

  private yearReason(year: number): UnavailableReason | null {
    const bounds = this.yearBounds();
    if (year < bounds.min) return "min";
    return year > bounds.max ? "max" : null;
  }

  private dayReason(date: PlainDate): UnavailableReason | null {
    const { minDate, maxDate } = this.core.options;
    const bounds = this.yearBounds();
    if (minDate !== null && compareDates(date, minDate) < 0) return "min";
    if (date.year < bounds.min) return "min";
    if (maxDate !== null && compareDates(date, maxDate) > 0) return "max";
    if (date.year > bounds.max) return "max";
    const lists = this.getLists();
    const iso = toISO(date);
    if (lists.disabled.has(iso)) return "disabled";
    if (lists.enabled !== null && !lists.enabled.has(iso)) return "disabled";
    if (lists.source.disabledWeekdays.includes(dayOfWeek(date))) {
      return "weekday";
    }
    return this.isCallbackDisabled(date, lists) ? "disabled" : null;
  }

  private isCallbackDisabled(date: PlainDate, lists: DateLists): boolean {
    const { isDateDisabled } = lists.source;
    if (isDateDisabled === null) return false;
    const iso = toISO(date);
    const cached = lists.callbackResults.get(iso);
    if (cached !== undefined) return cached;
    let result = false;
    try {
      result = isDateDisabled(toDate(date));
    } catch (error) {
      rethrowLater(error);
    }
    lists.callbackResults.set(iso, result);
    return result;
  }

  private guardFor(draft: Selection): (date: PlainDate) => boolean {
    const lists = this.getLists();
    const cached = lists.guardDraft;
    if (
      lists.guard !== null &&
      cached !== null &&
      sameSelection(cached, draft)
    ) {
      return lists.guard;
    }
    const { maxDate, limits } = lists.source;
    const lastYear = this.yearBounds().max;
    let lastDay: PlainDate = { year: lastYear, month: 12, day: 31 };
    if (maxDate !== null && compareDates(maxDate, lastDay) < 0) {
      lastDay = maxDate;
    }
    const guard = createSelectionGuard(
      draft,
      limits,
      (day) => this.isDisabled(day),
      lastDay,
    );
    lists.guardDraft = draft;
    lists.guard = guard;
    return guard;
  }

  private getLists(): DateLists {
    const source = this.core.options;
    if (this.lists?.source === source) return this.lists;
    const lists: DateLists = {
      source,
      disabled: new Set(source.disabledDates.map(toISO)),
      enabled:
        source.enabledDates === null
          ? null
          : new Set(source.enabledDates.map(toISO)),
      callbackResults: new Map(),
      guardDraft: null,
      guard: null,
    };
    this.lists = lists;
    return lists;
  }
}
