import { afterEach, describe, expect, it } from "vitest";
import {
  formatFullDate,
  formatHeadline,
  formatMonthRange,
  formatMonthYear,
  formatNumber,
  formatPeriodLabel,
  formatShortDate,
  formatShortRange,
  isLocaleTag,
  monthNames,
  numericOrder,
  resolveLocale,
  resolveWeekStart,
  weekdayNames,
} from "@/utils/date/intl";

describe("intl helpers", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("lang");
  });

  describe("formatMonthRange", () => {
    it("shares the year inside one year", () => {
      expect(
        formatMonthRange(
          { year: 2026, month: 10 },
          { year: 2026, month: 11 },
          "en-US",
        ),
      ).toMatch(/^October\s*[–-]\s*November 2026$/);
    });

    it("keeps both years across a year boundary", () => {
      expect(
        formatMonthRange(
          { year: 2026, month: 12 },
          { year: 2027, month: 1 },
          "en-US",
        ),
      ).toMatch(/^December 2026\s*[–-]\s*January 2027$/);
    });

    it("is the plain month and year for a single month", () => {
      const month = { year: 2026, month: 10 };

      expect(formatMonthRange(month, month, "en-US")).toBe(
        formatMonthYear(month, "en-US"),
      );
      expect(formatMonthRange(month, month, "en-US")).toBe("October 2026");
    });
  });

  it("formats numbers in the locale's digits without grouping", () => {
    expect(formatNumber(17, "ar-EG")).toBe("١٧");
    expect(formatNumber(2026, "ar-EG")).toBe("٢٠٢٦");
    expect(formatNumber(17, "ar-EG-u-nu-latn")).toBe("17");
    expect(formatNumber(2026, "en-US")).toBe("2026");
  });

  it("lists month names per locale", () => {
    expect(monthNames("en-US", "long")[9]).toBe("October");
    expect(monthNames("pl-PL", "long")[9]).toBe("październik");
    expect(monthNames("en-US", "short")).toHaveLength(12);
  });

  it("lists weekday names starting at Sunday", () => {
    expect(weekdayNames("en-US", "narrow")).toEqual([
      "S",
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
    ]);
    expect(weekdayNames("en-US", "long")[0]).toBe("Sunday");
    expect(new Set(weekdayNames("zh-CN", "narrow")).size).toBe(7);
  });

  it("formats headline, full date and month-year", () => {
    expect(formatHeadline({ year: 2026, month: 10, day: 17 }, "en-US")).toBe(
      "Sat, Oct 17",
    );
    expect(formatFullDate({ year: 2026, month: 10, day: 17 }, "en-US")).toBe(
      "Saturday, October 17, 2026",
    );
    expect(formatMonthYear({ year: 2026, month: 10 }, "en-US")).toBe(
      "October 2026",
    );
  });

  it("labels a period per precision", () => {
    const date = { year: 2026, month: 10, day: 17 };
    expect(formatPeriodLabel(date, "day", "en-US", "headline")).toBe(
      "Sat, Oct 17",
    );
    expect(formatPeriodLabel(date, "day", "en-US", "long")).toBe(
      "Saturday, October 17, 2026",
    );
    expect(formatPeriodLabel(date, "month", "en-US", "headline")).toBe(
      "October 2026",
    );
    expect(formatPeriodLabel(date, "month", "en-US", "long")).toBe(
      "October 2026",
    );
    expect(formatPeriodLabel(date, "year", "en-US", "headline")).toBe("2026");
    expect(formatPeriodLabel(date, "year", "ar-EG", "long")).toBe("٢٠٢٦");
  });

  describe("resolveWeekStart", () => {
    it("auto follows the locale", () => {
      expect(resolveWeekStart("en-US", "auto")).toBe(0);
      expect(resolveWeekStart("pl-PL", "auto")).toBe(1);
      expect(resolveWeekStart("ar-EG", "auto")).toBe(6);
      expect(resolveWeekStart("dv-MV", "auto")).toBe(5);
    });

    it("explicit option wins", () => {
      expect(resolveWeekStart("en-US", "monday")).toBe(1);
      expect(resolveWeekStart("pl-PL", "sunday")).toBe(0);
      expect(resolveWeekStart("en-US", "saturday")).toBe(6);
    });

    it("falls back to the region table without getWeekInfo", () => {
      const proto = Intl.Locale.prototype as object;
      const original = Object.getOwnPropertyDescriptor(proto, "getWeekInfo");
      Object.defineProperty(proto, "getWeekInfo", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      try {
        expect(resolveWeekStart("en-US", "auto")).toBe(0);
        expect(resolveWeekStart("de-DE", "auto")).toBe(1);
        expect(resolveWeekStart("ar-EG", "auto")).toBe(6);
      } finally {
        if (original) Object.defineProperty(proto, "getWeekInfo", original);
        else Reflect.deleteProperty(proto, "getWeekInfo");
      }
    });
  });

  it("derives numeric field order from the locale", () => {
    expect(numericOrder("en-US")).toEqual(["month", "day", "year"]);
    expect(numericOrder("pl-PL")).toEqual(["day", "month", "year"]);
    expect(numericOrder("ja-JP")).toEqual(["year", "month", "day"]);
  });

  describe("isLocaleTag", () => {
    it.each(["en-US", "pl", "zh-Hant-TW"])("accepts %s", (tag) => {
      expect(isLocaleTag(tag)).toBe(true);
    });

    it.each(["en_US", "", "not a locale", "x"])("rejects %j", (tag) => {
      expect(isLocaleTag(tag)).toBe(false);
    });
  });

  describe("resolveLocale", () => {
    it("ignores an invalid explicit locale", () => {
      document.documentElement.lang = "pl-PL";
      expect(resolveLocale("en_US")).toBe("pl-PL");
    });

    it("trims the explicit locale and ignores a blank one", () => {
      document.documentElement.lang = "pl-PL";
      expect(resolveLocale(" de-DE ")).toBe("de-DE");
      expect(resolveLocale("   ")).toBe("pl-PL");
    });

    it("skips an invalid document lang", () => {
      document.documentElement.lang = "xx_YY";
      expect(resolveLocale()).not.toBe("xx_YY");
      expect(isLocaleTag(resolveLocale())).toBe(true);
    });

    it("prefers the explicit locale", () => {
      document.documentElement.lang = "pl-PL";
      expect(resolveLocale("de-DE")).toBe("de-DE");
    });

    it("falls back to document lang", () => {
      document.documentElement.lang = "pl-PL";
      expect(resolveLocale()).toBe("pl-PL");
    });

    it("always returns a non-empty locale", () => {
      expect(resolveLocale().length).toBeGreaterThan(0);
    });
  });

  describe("short dates", () => {
    const oct20 = { year: 2026, month: 10, day: 20 };
    const oct28 = { year: 2026, month: 10, day: 28 };

    it("formatShortDate writes month and day", () => {
      expect(formatShortDate(oct20, "en-US")).toBe("Oct 20");
    });

    it("formatShortRange collapses a shared month", () => {
      expect(formatShortRange(oct20, oct28, "en-US")).toMatch(
        /^Oct 20\s?–\s?28$/u,
      );
    });

    it("formatShortRange keeps both months when they differ", () => {
      const nov2 = { year: 2026, month: 11, day: 2 };
      expect(formatShortRange(oct20, nov2, "en-US")).toMatch(
        /^Oct 20\s?–\s?Nov 2$/u,
      );
    });
  });
});
