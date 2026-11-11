import { describe, expect, it } from "vitest";
import type { Weekday, YearMonth } from "@/types/date";
import type { MonthSpan } from "@/types/internal";
import type { Precision } from "@/types/selection";
import {
  dayGridShape,
  visibleRange,
  type DayGridShapeInput,
  type VisibleRangeInput,
} from "@/utils/date/visibleRange";
import { toISO } from "@/utils/date/plainDate";

const MONDAY: Weekday = 1;
const SUNDAY: Weekday = 0;
const OCT_2026: YearMonth = { year: 2026, month: 10 };

const range = (patch: Partial<VisibleRangeInput> = {}): [string, string] => {
  const { from, to } = visibleRange({
    view: OCT_2026,
    months: 1,
    precision: "day",
    weekStart: MONDAY,
    fixedWeeks: false,
    outsideDays: false,
    yearBounds: { min: 1926, max: 2046 },
    listSpan: null,
    ...patch,
  });
  return [toISO(from), toISO(to)];
};

describe("visibleRange", () => {
  it("covers the month only, without outside days", () => {
    expect(range()).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("ignores fixedWeeks while outside days are hidden", () => {
    expect(range({ fixedWeeks: true })).toEqual(["2026-10-01", "2026-10-31"]);
  });

  it("covers the five rendered weeks with outside days, Monday start", () => {
    expect(range({ outsideDays: true })).toEqual(["2026-09-28", "2026-11-01"]);
  });

  it("covers six weeks with outside days and fixedWeeks", () => {
    expect(range({ outsideDays: true, fixedWeeks: true })).toEqual([
      "2026-09-28",
      "2026-11-08",
    ]);
  });

  it("starts the five weeks on Sunday with a Sunday week start", () => {
    expect(range({ outsideDays: true, weekStart: SUNDAY })).toEqual([
      "2026-09-27",
      "2026-10-31",
    ]);
  });

  it("starts exactly on the first of a month that begins the week", () => {
    expect(
      range({
        view: { year: 2026, month: 6 },
        outsideDays: true,
        weekStart: MONDAY,
      }),
    ).toEqual(["2026-06-01", "2026-07-05"]);
  });

  it("ends on the last day of a leap February", () => {
    expect(range({ view: { year: 2028, month: 2 } })).toEqual([
      "2028-02-01",
      "2028-02-29",
    ]);
    expect(range({ view: { year: 2026, month: 2 } })).toEqual([
      "2026-02-01",
      "2026-02-28",
    ]);
  });

  it("spans every month shown and drops outside days for several months", () => {
    expect(range({ months: 2 })).toEqual(["2026-10-01", "2026-11-30"]);
    expect(range({ months: 2, outsideDays: true })).toEqual([
      "2026-10-01",
      "2026-11-30",
    ]);
  });

  it("crosses the year boundary", () => {
    expect(range({ view: { year: 2026, month: 12 }, months: 2 })).toEqual([
      "2026-12-01",
      "2027-01-31",
    ]);
  });

  it("covers the whole view year for month precision", () => {
    expect(range({ precision: "month" })).toEqual(["2026-01-01", "2026-12-31"]);
  });

  it("covers the year bounds for year precision", () => {
    const precision: Precision = "year";
    expect(range({ precision })).toEqual(["1926-01-01", "2046-12-31"]);
  });

  it("uses the rendered month list when there is one", () => {
    const listSpan: MonthSpan = {
      first: { year: 2026, month: 8 },
      last: { year: 2027, month: 7 },
    };
    expect(range({ listSpan })).toEqual(["2026-08-01", "2027-07-31"]);
    expect(range({ listSpan, outsideDays: true, months: 2 })).toEqual([
      "2026-08-01",
      "2027-07-31",
    ]);
  });
});

describe("dayGridShape", () => {
  const shape = (patch: Partial<DayGridShapeInput> = {}) =>
    dayGridShape({
      layout: "docked",
      inline: false,
      months: 1,
      outsideDays: false,
      fixedWeeks: false,
      ...patch,
    });

  it("shows nothing extra by default in the docked layout", () => {
    expect(shape()).toEqual({ outsideDays: false, fixedWeeks: false });
  });

  it("shows outside days docked with one month and forces six weeks", () => {
    expect(shape({ outsideDays: true })).toEqual({
      outsideDays: true,
      fixedWeeks: true,
    });
  });

  it("hides outside days when several months are shown", () => {
    expect(shape({ outsideDays: true, months: 2 })).toEqual({
      outsideDays: false,
      fixedWeeks: false,
    });
  });

  it("keeps fixedWeeks from the option", () => {
    expect(shape({ fixedWeeks: true })).toEqual({
      outsideDays: false,
      fixedWeeks: true,
    });
  });

  it("shows no outside days in the modal layout but fixes the weeks", () => {
    expect(shape({ layout: "modal", outsideDays: true })).toEqual({
      outsideDays: false,
      fixedWeeks: true,
    });
  });

  it("does not fix the weeks of an inline picker on its own", () => {
    expect(shape({ layout: "modal", inline: true })).toEqual({
      outsideDays: false,
      fixedWeeks: false,
    });
  });

  it("shows outside days for an inline picker with the docked layout", () => {
    expect(shape({ inline: true, outsideDays: true })).toEqual({
      outsideDays: true,
      fixedWeeks: true,
    });
  });
});
