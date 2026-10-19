import { describe, expect, it } from "vitest";
import { buildMonth } from "@/managers/calendar/MonthModel";
import type { Weekday } from "@/types/date";

describe("buildMonth", () => {
  it("starts October 2026 on Sep 27 (not in month) with 5 weeks for a Sunday start", () => {
    const model = buildMonth({ year: 2026, month: 10 }, 0, false);
    const first = model.weeks[0][0];

    expect(model.weeks).toHaveLength(5);
    expect(first.date).toEqual({ year: 2026, month: 9, day: 27 });
    expect(first.inMonth).toBe(false);
    expect(model.weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("pads to 6 weeks ending on Nov 7 with fixedWeeks", () => {
    const model = buildMonth({ year: 2026, month: 10 }, 0, true);
    const lastWeek = model.weeks[model.weeks.length - 1];
    const last = lastWeek[lastWeek.length - 1];

    expect(model.weeks).toHaveLength(6);
    expect(last.date).toEqual({ year: 2026, month: 11, day: 7 });
    expect(last.inMonth).toBe(false);
  });

  it("starts on Sep 28 for a Monday start", () => {
    const model = buildMonth({ year: 2026, month: 10 }, 1, false);

    expect(model.weeks[0][0]?.date).toEqual({
      year: 2026,
      month: 9,
      day: 28,
    });
  });

  it("uses 4 weeks for February 2026 with a Sunday start", () => {
    const model = buildMonth({ year: 2026, month: 2 }, 0, false);

    expect(model.weeks).toHaveLength(4);
    expect(model.weeks[0][0]?.inMonth).toBe(true);
  });

  it("numbers rows by the ISO week of their Thursday", () => {
    const model = buildMonth({ year: 2026, month: 10 }, 1, false);

    expect(model.weekNumbers).toEqual([40, 41, 42, 43, 44]);
  });

  it("echoes the requested view", () => {
    expect(buildMonth({ year: 2026, month: 10 }, 0, false).view).toEqual({
      year: 2026,
      month: 10,
    });
  });

  describe.each([0, 1, 6] as Weekday[])("weekStart %d", (weekStart) => {
    it("lists every day of every month in 2026-2027 exactly once", () => {
      for (const year of [2026, 2027]) {
        for (let month = 1; month <= 12; month += 1) {
          const model = buildMonth({ year, month }, weekStart, false);
          const days = model.weeks
            .flat()
            .filter((cell) => cell.inMonth)
            .map((cell) => cell.date);
          const expected = new Date(year, month, 0).getDate();

          expect(days).toHaveLength(expected);
          expect(days.map((date) => date.day)).toEqual(
            Array.from({ length: expected }, (_, i) => i + 1),
          );
          expect(
            days.every((date) => date.year === year && date.month === month),
          ).toBe(true);
        }
      }
    });
  });
});
