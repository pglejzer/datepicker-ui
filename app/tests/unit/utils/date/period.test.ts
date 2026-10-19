import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePattern } from "@/utils/date/format";
import {
  formatPeriod,
  normalizePeriod,
  parsePeriod,
  periodHint,
  parsePeriodISO,
  periodISO,
} from "@/utils/date/period";

const OCT_17 = { year: 2026, month: 10, day: 17 };
const OCT_1 = { year: 2026, month: 10, day: 1 };
const JAN_1 = { year: 2026, month: 1, day: 1 };

const dotted = resolvePattern("dd.MM.yyyy", "en-US");
const american = resolvePattern("MM/dd/yyyy", "en-US");
const shortYear = resolvePattern("MM/dd/yy", "en-US");
const european = resolvePattern("dd/MM/yyyy", "en-US");

describe("period helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("normalizePeriod", () => {
    it("keeps the day, snaps to the first of the month or the year", () => {
      expect(normalizePeriod(OCT_17, "day")).toEqual(OCT_17);
      expect(normalizePeriod(OCT_17, "month")).toEqual(OCT_1);
      expect(normalizePeriod(OCT_17, "year")).toEqual(JAN_1);
    });
  });

  describe("periodISO", () => {
    it("truncates the ISO date to the precision", () => {
      expect(periodISO(OCT_17, "day")).toBe("2026-10-17");
      expect(periodISO(OCT_17, "month")).toBe("2026-10");
      expect(periodISO(OCT_17, "year")).toBe("2026");
    });

    it("pads single-digit months", () => {
      expect(periodISO({ year: 2026, month: 3, day: 9 }, "month")).toBe(
        "2026-03",
      );
    });
  });

  describe("parsePeriodISO", () => {
    it("reads YYYY-MM at month precision", () => {
      expect(parsePeriodISO("2026-10", "month")).toEqual(OCT_1);
    });

    it("normalizes a full ISO date at month and year precision", () => {
      expect(parsePeriodISO("2026-10-17", "month")).toEqual(OCT_1);
      expect(parsePeriodISO("2026-10-17", "year")).toEqual(JAN_1);
    });

    it("rejects a year-only string at month precision", () => {
      expect(parsePeriodISO("2026", "month")).toBeNull();
    });

    it("reads YYYY at year precision", () => {
      expect(parsePeriodISO("2026", "year")).toEqual(JAN_1);
    });

    it("rejects a month string at year precision and invalid months", () => {
      expect(parsePeriodISO("2026-10", "year")).toBeNull();
      expect(parsePeriodISO("2026-13", "month")).toBeNull();
      expect(parsePeriodISO("nope", "month")).toBeNull();
    });

    it("keeps the day precision strict", () => {
      expect(parsePeriodISO("2026-10-17", "day")).toEqual(OCT_17);
      expect(parsePeriodISO("2026-10", "day")).toBeNull();
    });
  });

  describe("formatPeriod", () => {
    it("drops the day and keeps the pattern separator at month precision", () => {
      expect(formatPeriod(OCT_17, dotted, "month")).toBe("10.2026");
      expect(formatPeriod(OCT_17, american, "month")).toBe("10/2026");
      expect(formatPeriod(OCT_17, european, "month")).toBe("10/2026");
    });

    it("keeps the pattern's two-digit year", () => {
      expect(formatPeriod(OCT_17, shortYear, "month")).toBe("10/26");
    });

    it("formats only the year at year precision", () => {
      expect(formatPeriod(OCT_17, dotted, "year")).toBe("2026");
      expect(formatPeriod(OCT_17, american, "year")).toBe("2026");
    });

    it("formats the whole date at day precision", () => {
      expect(formatPeriod(OCT_17, american, "day")).toBe("10/17/2026");
    });
  });

  describe("periodHint", () => {
    it("shows the whole pattern at day precision", () => {
      expect(periodHint(american, "day")).toBe("mm/dd/yyyy");
      expect(periodHint(dotted, "day")).toBe("dd.mm.yyyy");
      expect(periodHint(shortYear, "day")).toBe("mm/dd/yy");
    });

    it("drops the day at month precision and keeps the order and separator", () => {
      expect(periodHint(american, "month")).toBe("mm/yyyy");
      expect(periodHint(dotted, "month")).toBe("mm.yyyy");
      expect(periodHint(shortYear, "month")).toBe("mm/yy");
      expect(
        periodHint(resolvePattern("yyyy-MM", "en-US", "month"), "month"),
      ).toBe("yyyy-mm");
    });

    it("shows only the year at year precision", () => {
      expect(periodHint(american, "year")).toBe("yyyy");
      expect(periodHint(dotted, "year")).toBe("yyyy");
      expect(periodHint(shortYear, "year")).toBe("yy");
    });

    it("uses the given letters at every precision", () => {
      const letters = { day: "dd", month: "mm", year: "rrrr" };
      expect(periodHint(dotted, "day", letters)).toBe("dd.mm.rrrr");
      expect(periodHint(dotted, "month", letters)).toBe("mm.rrrr");
      expect(periodHint(dotted, "year", letters)).toBe("rrrr");
    });
  });

  describe("short patterns", () => {
    const monthYear = resolvePattern("MM/yyyy", "en-US", "month");
    const yearMonth = resolvePattern("yyyy-MM", "en-US", "month");
    const yearOnly = resolvePattern("yyyy", "en-US", "year");
    const NOV_1 = { year: 2026, month: 11, day: 1 };

    it("formats MM/yyyy, yyyy-MM and yyyy", () => {
      expect(formatPeriod(OCT_1, monthYear, "month")).toBe("10/2026");
      expect(formatPeriod(OCT_1, yearMonth, "month")).toBe("2026-10");
      expect(formatPeriod(OCT_1, yearOnly, "year")).toBe("2026");
    });

    it("parses them back", () => {
      expect(parsePeriod("11/2026", monthYear, "month")).toEqual(NOV_1);
      expect(parsePeriod("2026-11", yearMonth, "month")).toEqual(NOV_1);
      expect(parsePeriod("2026", yearOnly, "year")).toEqual(JAN_1);
    });
  });

  describe("parsePeriod", () => {
    it("reads month and year at month precision", () => {
      expect(parsePeriod("10/2026", american, "month")).toEqual(OCT_1);
      expect(parsePeriod("10.2026", dotted, "month")).toEqual(OCT_1);
      expect(parsePeriod("10-2026", american, "month")).toEqual(OCT_1);
      expect(parsePeriod("10/26", shortYear, "month")).toEqual(OCT_1);
    });

    it("rejects a full date, an invalid month and stray text at month precision", () => {
      expect(parsePeriod("17/10/2026", american, "month")).toBeNull();
      expect(parsePeriod("13/2026", american, "month")).toBeNull();
      expect(parsePeriod("00/2026", american, "month")).toBeNull();
      expect(parsePeriod("2026", american, "month")).toBeNull();
      expect(parsePeriod("oct/2026", american, "month")).toBeNull();
      expect(parsePeriod("", american, "month")).toBeNull();
    });

    it("reads the year at year precision, including non-Latin digits", () => {
      expect(parsePeriod("2026", american, "year")).toEqual(JAN_1);
      expect(parsePeriod("٢٠٢٦", american, "year")).toEqual(JAN_1);
    });

    it("rejects more than one part at year precision", () => {
      expect(parsePeriod("10/2026", american, "year")).toBeNull();
    });

    it("keeps the day precision on the full pattern", () => {
      expect(parsePeriod("10/17/2026", american, "day")).toEqual(OCT_17);
      expect(parsePeriod("10/2026", american, "day")).toBeNull();
    });
  });
});
