import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  compareDates,
  createPlainDate,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  fromDate,
  fromISO,
  isoWeekNumber,
  isSameDay,
  isValidPlainDate,
  todayDate,
  toDate,
  toISO,
  toPlainDate,
} from "@/utils/date/plainDate";

describe("plainDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fromISO / toISO", () => {
    it("parses strict YYYY-MM-DD", () => {
      expect(fromISO("2026-10-17")).toEqual({ year: 2026, month: 10, day: 17 });
    });

    it("rejects impossible and non-strict strings", () => {
      expect(fromISO("2026-02-30")).toBeNull();
      expect(fromISO("2026-1-5")).toBeNull();
      expect(fromISO("2026-10-17T00:00Z")).toBeNull();
    });

    it("zero-pads a 4-digit year", () => {
      expect(toISO({ year: 5, month: 1, day: 2 })).toBe("0005-01-02");
    });
  });

  describe("validation", () => {
    it("validates leap days and month ends", () => {
      expect(isValidPlainDate(2024, 2, 29)).toBe(true);
      expect(isValidPlainDate(2026, 2, 29)).toBe(false);
      expect(isValidPlainDate(2026, 13, 1)).toBe(false);
      expect(createPlainDate(2026, 4, 31)).toBeNull();
      expect(createPlainDate(2026, 4, 30)).toEqual({
        year: 2026,
        month: 4,
        day: 30,
      });
    });
  });

  describe("Date conversion", () => {
    it("toDate returns local midnight", () => {
      const date = toDate({ year: 2026, month: 10, day: 17 });
      expect(date.getDate()).toBe(17);
      expect(date.getMonth()).toBe(9);
      expect(date.getHours()).toBe(0);
    });

    it("toDate keeps years below 100", () => {
      expect(toDate({ year: 50, month: 1, day: 1 }).getFullYear()).toBe(50);
    });

    it("fromDate reads local fields", () => {
      expect(fromDate(new Date(2026, 9, 17, 23, 59))).toEqual({
        year: 2026,
        month: 10,
        day: 17,
      });
    });

    it("§12.6 / §12.7 ISO keys follow the local calendar day, whatever the UTC offset", () => {
      for (const hours of [0, 0.5, 12, 23.5]) {
        const date = new Date(2026, 9, 17, Math.floor(hours), (hours % 1) * 60);
        expect(toISO(fromDate(date))).toBe("2026-10-17");
      }
      expect(toISO(fromDate(new Date(2026, 0, 1, 0, 0)))).toBe("2026-01-01");
      expect(toISO(fromDate(new Date(2026, 11, 31, 23, 59)))).toBe(
        "2026-12-31",
      );
    });

    it("§12.6 / §12.7 every day of a DST changeover month round-trips through ISO", () => {
      for (const month of [3, 10]) {
        for (let day = 1; day <= daysInMonth({ year: 2026, month }); day++) {
          const plain = { year: 2026, month, day };
          const iso = toISO(plain);
          expect(fromISO(iso)).toEqual(plain);
          expect(toISO(fromDate(toDate(plain)))).toBe(iso);
        }
      }
    });
  });

  describe("addDays", () => {
    it("crosses month, year and leap boundaries", () => {
      expect(addDays({ year: 2026, month: 3, day: 28 }, 1)).toEqual({
        year: 2026,
        month: 3,
        day: 29,
      });
      expect(addDays({ year: 2026, month: 3, day: 29 }, 1)).toEqual({
        year: 2026,
        month: 3,
        day: 30,
      });
      expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
        year: 2027,
        month: 1,
        day: 1,
      });
      expect(addDays({ year: 2024, month: 2, day: 28 }, 1)).toEqual({
        year: 2024,
        month: 2,
        day: 29,
      });
      expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
        year: 2026,
        month: 2,
        day: 28,
      });
    });
  });

  describe("addMonths / daysInMonth", () => {
    it("wraps years", () => {
      expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({
        year: 2027,
        month: 1,
      });
      expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({
        year: 2025,
        month: 12,
      });
    });

    it("knows month lengths", () => {
      expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
      expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
    });
  });

  describe("dayOfWeek", () => {
    it("returns 0 for Sunday .. 6 for Saturday", () => {
      expect(dayOfWeek({ year: 2026, month: 10, day: 17 })).toBe(6);
    });
  });

  describe("compare / isSameDay", () => {
    it("orders dates", () => {
      const a = { year: 2026, month: 10, day: 17 };
      const b = { year: 2026, month: 10, day: 18 };
      expect(compareDates(a, b)).toBeLessThan(0);
      expect(compareDates(b, a)).toBeGreaterThan(0);
      expect(compareDates(a, { ...a })).toBe(0);
    });

    it("handles nulls", () => {
      const a = { year: 2026, month: 10, day: 17 };
      expect(isSameDay(a, { ...a })).toBe(true);
      expect(isSameDay(a, null)).toBe(false);
      expect(isSameDay(null, null)).toBe(false);
    });
  });

  describe("today / toPlainDate", () => {
    it("resolves today from the frozen clock", () => {
      expect(todayDate()).toEqual({ year: 2026, month: 10, day: 17 });
      expect(toPlainDate("today")).toEqual({ year: 2026, month: 10, day: 17 });
    });

    it("accepts ISO strings only", () => {
      expect(toPlainDate("2026-10-17")?.day).toBe(17);
      expect(toPlainDate("17/10/2026")).toBeNull();
    });

    it("accepts a Date and rejects an invalid one", () => {
      expect(toPlainDate(new Date(2026, 9, 17, 15, 30))).toEqual({
        year: 2026,
        month: 10,
        day: 17,
      });
      expect(toPlainDate(new Date(Number.NaN))).toBeNull();
    });
  });

  describe("isoWeekNumber", () => {
    it("computes ISO weeks around year boundaries", () => {
      expect(isoWeekNumber({ year: 2026, month: 1, day: 1 })).toBe(1);
      expect(isoWeekNumber({ year: 2027, month: 1, day: 1 })).toBe(53);
      expect(isoWeekNumber({ year: 2026, month: 10, day: 17 })).toBe(42);
    });
  });

  describe("daysBetween", () => {
    it("counts days from a to b", () => {
      expect(
        daysBetween(
          { year: 2026, month: 10, day: 20 },
          { year: 2026, month: 11, day: 2 },
        ),
      ).toBe(13);
      expect(
        daysBetween(
          { year: 2026, month: 11, day: 2 },
          { year: 2026, month: 10, day: 20 },
        ),
      ).toBe(-13);
      expect(
        daysBetween(
          { year: 2026, month: 10, day: 20 },
          { year: 2026, month: 10, day: 20 },
        ),
      ).toBe(0);
    });

    it("is not thrown off by a DST change", () => {
      expect(
        daysBetween(
          { year: 2026, month: 3, day: 28 },
          { year: 2026, month: 3, day: 30 },
        ),
      ).toBe(2);
      expect(
        daysBetween(
          { year: 2026, month: 10, day: 24 },
          { year: 2026, month: 10, day: 26 },
        ),
      ).toBe(2);
    });

    it("spans leap days", () => {
      expect(
        daysBetween(
          { year: 2028, month: 2, day: 28 },
          { year: 2028, month: 3, day: 1 },
        ),
      ).toBe(2);
    });
  });
});
