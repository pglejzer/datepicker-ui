import type { PlainDate, YearMonth } from "../../types/date";
import type {
  DateValue,
  NavigateSource,
  VisibleRange,
} from "../../types/types";
import { formatPeriod } from "../../utils/date/period";
import { monthsBetween, toDate, toISO } from "../../utils/date/plainDate";
import { dayGridShape, visibleRange } from "../../utils/date/visibleRange";
import type { DaySpan } from "../../utils/date/visibleRange";
import type { LifecycleContext } from "./context";

interface Reported {
  readonly view: YearMonth;
  readonly from: string;
  readonly to: string;
}

function directionOf(delta: number): -1 | 0 | 1 {
  if (delta < 0) {
    return -1;
  }
  return delta > 0 ? 1 : 0;
}

export class VisibleRangeTracker {
  private last: Reported | null = null;
  private live = false;

  constructor(
    private readonly context: LifecycleContext,
    private readonly isShown: () => boolean,
  ) {}

  current(): VisibleRange | null {
    if (!this.isShown()) {
      return null;
    }
    const { from, to } = this.compute();
    return { from: this.describe(from), to: this.describe(to) };
  }

  bind(signal: AbortSignal): void {
    this.context.core.events.on(
      "change:view",
      ({ source }) => {
        this.report(source);
      },
      signal,
    );
  }

  hold(source: NavigateSource, run: () => void): void {
    const live = this.live;
    this.live = false;
    try {
      run();
    } finally {
      this.live = live;
    }
    this.report(source);
  }

  pause(): void {
    this.live = false;
  }

  resume(source: NavigateSource): void {
    this.live = true;
    this.report(this.last === null ? "open" : source);
  }

  reset(): void {
    this.last = null;
    this.live = false;
  }

  renderedMonths(first: YearMonth, last: YearMonth): void {
    this.context.core.setListSpan({ first, last });
    this.report("scroll");
  }

  private report(source: NavigateSource): void {
    if (!this.live) {
      return;
    }
    const { core, emitter } = this.context;
    const { from, to } = this.compute();
    const next: Reported = {
      view: core.view,
      from: toISO(from),
      to: toISO(to),
    };
    const last = this.last;
    if (last?.from === next.from && last.to === next.to) {
      return;
    }
    this.last = next;
    const delta = last === null ? 0 : monthsBetween(last.view, next.view);
    emitter.emit("navigate", {
      year: next.view.year,
      month: next.view.month,
      direction: directionOf(delta),
      source,
      from: this.describe(from),
      to: this.describe(to),
    });
  }

  private compute(): DaySpan {
    const { core, managers } = this.context;
    const { options, layout } = core;
    const grid = dayGridShape({
      layout: core.calendarLayout,
      inline: core.mode === "inline",
      months: layout.months,
      outsideDays: options.mode !== "range" && options.outsideDays !== false,
      fixedWeeks: options.fixedWeeks,
    });
    return visibleRange({
      view: core.view,
      months: layout.months,
      precision: options.precision,
      weekStart: options.weekStart,
      fixedWeeks: grid.fixedWeeks,
      outsideDays: grid.outsideDays,
      yearBounds: managers.validation.yearBounds(),
      listSpan: core.listSpan,
    });
  }

  private describe(date: PlainDate): DateValue {
    return {
      value: toISO(date),
      date: toDate(date),
      formatted: formatPeriod(date, this.context.core.options.pattern, "day"),
    };
  }
}
