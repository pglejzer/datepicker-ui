import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoreState } from "@/datepicker/CoreState";
import type { DatepickerOptions } from "@/types/options";
import type { PlainDate } from "@/types/date";
import type { Selection } from "@/types/selection";
import type { DatepickerEventMap } from "@/types/types";
import { resolveOptions } from "@/datepicker/options/resolve";
import { ValidationManager } from "@/managers/ValidationManager";
import { EventEmitter } from "@/utils/EventEmitter";
import { oct } from "../../helpers/selection";

const createManager = (
  options?: DatepickerOptions,
  months = 1,
): ValidationManager => {
  const core = {
    options: resolveOptions(options),
    layout: { months, presets: "none" },
  } as unknown as CoreState;
  return new ValidationManager(core, new EventEmitter<DatepickerEventMap>());
};

describe("ValidationManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 15));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("enables today and disables yesterday when minDate is the current Date", () => {
    const rules = createManager({ calendar: { minDate: new Date() } });
    expect(rules.isDisabled({ year: 2026, month: 10, day: 17 })).toBe(false);
    expect(rules.isDisabled({ year: 2026, month: 10, day: 16 })).toBe(true);
  });

  it("§12.8 enables today and disables yesterday when minDate is 'today'", () => {
    const rules = createManager({ calendar: { minDate: "today" } });
    expect(rules.isDisabled({ year: 2026, month: 10, day: 17 })).toBe(false);
    expect(rules.isDisabled({ year: 2026, month: 10, day: 16 })).toBe(true);
  });

  it("disables days after maxDate", () => {
    const rules = createManager({ calendar: { maxDate: "2026-10-20" } });
    expect(rules.isDisabled({ year: 2026, month: 10, day: 20 })).toBe(false);
    expect(rules.isDisabled({ year: 2026, month: 10, day: 21 })).toBe(true);
  });

  it("disables days that are not in enabledDates", () => {
    const rules = createManager({ calendar: { enabledDates: ["2026-10-01"] } });
    expect(rules.isDisabled({ year: 2026, month: 10, day: 1 })).toBe(false);
    expect(rules.isDisabled({ year: 2026, month: 10, day: 2 })).toBe(true);
  });

  it("disables days listed in disabledDates", () => {
    const rules = createManager({
      calendar: { disabledDates: ["2026-10-20"] },
    });
    expect(rules.isDisabled({ year: 2026, month: 10, day: 20 })).toBe(true);
    expect(rules.isDisabled({ year: 2026, month: 10, day: 21 })).toBe(false);
  });

  it("disables days outside the year bounds", () => {
    const rules = createManager();
    expect(rules.isDisabled({ year: 1925, month: 12, day: 31 })).toBe(true);
    expect(rules.isDisabled({ year: 2047, month: 1, day: 1 })).toBe(true);
    expect(rules.isDisabled({ year: 2046, month: 12, day: 31 })).toBe(false);
  });

  it("derives default yearBounds from today and the year range", () => {
    expect(createManager().yearBounds()).toEqual({ min: 1926, max: 2046 });
  });

  it("narrows yearBounds with minDate and maxDate", () => {
    const rules = createManager({
      calendar: { minDate: "2020-05-05", maxDate: "2030-01-01" },
    });
    expect(rules.yearBounds()).toEqual({ min: 2020, max: 2030 });
  });

  it("reports a month as disabled when every day is before minDate", () => {
    const rules = createManager({ calendar: { minDate: "2026-10-01" } });
    expect(rules.isMonthDisabled({ year: 2026, month: 9 })).toBe(true);
    expect(rules.isMonthDisabled({ year: 2026, month: 10 })).toBe(false);
  });

  it("reports a month as disabled when every day is after maxDate", () => {
    const rules = createManager({ calendar: { maxDate: "2026-10-20" } });
    expect(rules.isMonthDisabled({ year: 2026, month: 11 })).toBe(true);
  });

  it("keeps a month enabled when a single day remains available", () => {
    const rules = createManager({ calendar: { enabledDates: ["2026-11-15"] } });
    expect(rules.isMonthDisabled({ year: 2026, month: 11 })).toBe(false);
    expect(rules.isMonthDisabled({ year: 2026, month: 12 })).toBe(true);
  });

  it("clamps a far-future view to the last allowed month", () => {
    const rules = createManager();
    expect(rules.clampView({ year: 3000, month: 1 })).toEqual({
      year: 2046,
      month: 12,
    });
  });

  it("clamps a past view to the first allowed month and keeps valid views", () => {
    const rules = createManager({ calendar: { minDate: "2026-03-10" } });
    expect(rules.clampView({ year: 2020, month: 6 })).toEqual({
      year: 2026,
      month: 3,
    });
    expect(rules.clampView({ year: 2026, month: 7 })).toEqual({
      year: 2026,
      month: 7,
    });
  });

  describe("clampView with several months", () => {
    const options: DatepickerOptions = { calendar: { maxDate: "2026-12-31" } };

    it("keeps the last allowed month visible as the second month", () => {
      const rules = createManager(options, 2);

      expect(rules.clampView({ year: 2026, month: 12 })).toEqual({
        year: 2026,
        month: 11,
      });
      expect(rules.clampView({ year: 2027, month: 6 })).toEqual({
        year: 2026,
        month: 11,
      });
      expect(rules.clampView({ year: 2026, month: 10 })).toEqual({
        year: 2026,
        month: 10,
      });
    });

    it("leaves a single month view at the max month", () => {
      const rules = createManager(options, 1);

      expect(rules.clampView({ year: 2026, month: 12 })).toEqual({
        year: 2026,
        month: 12,
      });
    });

    it("never pushes the first month below the min bound", () => {
      const rules = createManager(
        { calendar: { minDate: "2026-12-01", maxDate: "2026-12-31" } },
        3,
      );

      expect(rules.clampView({ year: 2026, month: 12 })).toEqual({
        year: 2026,
        month: 12,
      });
      expect(rules.clampView({ year: 2026, month: 5 })).toEqual({
        year: 2026,
        month: 12,
      });
    });
  });

  describe("disabledWeekdays and isDateDisabled", () => {
    it("disables the listed weekdays (0 = Sunday)", () => {
      const rules = createManager({ calendar: { disabledWeekdays: [0, 6] } });
      expect(rules.isDisabled(oct(17))).toBe(true);
      expect(rules.isDisabled(oct(18))).toBe(true);
      expect(rules.isDisabled(oct(16))).toBe(false);
      expect(rules.isDisabled(oct(19))).toBe(false);
    });

    it("passes a Date at local midnight to isDateDisabled", () => {
      const isDateDisabled = vi.fn<(date: Date) => boolean>(() => false);
      const rules = createManager({ calendar: { isDateDisabled } });
      rules.isDisabled(oct(20));
      const received = isDateDisabled.mock.calls[0]?.[0];
      expect(received).toBeInstanceOf(Date);
      expect(received.getHours()).toBe(0);
      expect(received.getMinutes()).toBe(0);
      expect(received.getFullYear()).toBe(2026);
      expect(received.getMonth()).toBe(9);
      expect(received.getDate()).toBe(20);
    });

    it("uses the function result and calls it once per day for the same options", () => {
      const isDateDisabled = vi.fn((date: Date) => date.getDate() === 20);
      const rules = createManager({ calendar: { isDateDisabled } });
      expect(rules.isDisabled(oct(20))).toBe(true);
      expect(rules.isDisabled(oct(20))).toBe(true);
      expect(rules.isDisabled(oct(21))).toBe(false);
      expect(rules.isDisabled(oct(21))).toBe(false);
      expect(isDateDisabled).toHaveBeenCalledTimes(2);
    });

    it("resets the cache when the options change", () => {
      const first = vi.fn<(date: Date) => boolean>(() => false);
      const second = vi.fn<(date: Date) => boolean>(() => true);
      const core = {
        options: resolveOptions({ calendar: { isDateDisabled: first } }),
      };
      const rules = new ValidationManager(
        core as unknown as CoreState,
        new EventEmitter<DatepickerEventMap>(),
      );
      expect(rules.isDisabled(oct(20))).toBe(false);

      core.options = resolveOptions({ calendar: { isDateDisabled: second } });

      expect(rules.isDisabled(oct(20))).toBe(true);
      expect(second).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledTimes(1);
    });

    it("treats a throwing isDateDisabled as enabled and rethrows asynchronously", () => {
      const queued: (() => void)[] = [];
      vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
        queued.push(cb);
      });
      const boom = new Error("boom");
      const rules = createManager({
        calendar: {
          isDateDisabled: () => {
            throw boom;
          },
        },
      });

      expect(rules.isDisabled(oct(20))).toBe(false);
      expect(rules.isDisabled(oct(20))).toBe(false);

      expect(queued).toHaveLength(1);
      expect(() => {
        queued[0]?.();
      }).toThrow(boom);
    });

    it("reports a month as disabled when isDateDisabled blocks every day", () => {
      const rules = createManager({
        calendar: { isDateDisabled: (date) => date.getMonth() === 10 },
      });
      expect(rules.isMonthDisabled({ year: 2026, month: 11 })).toBe(true);
      expect(rules.isMonthDisabled({ year: 2026, month: 10 })).toBe(false);
    });
  });

  describe("unavailableReason", () => {
    it("returns null for an available day", () => {
      expect(createManager().unavailableReason(oct(20))).toBeNull();
    });

    it("returns min before minDate and max after maxDate", () => {
      const rules = createManager({
        calendar: { minDate: "2026-10-10", maxDate: "2026-10-25" },
      });
      expect(rules.unavailableReason(oct(9))).toBe("min");
      expect(rules.unavailableReason(oct(10))).toBeNull();
      expect(rules.unavailableReason(oct(25))).toBeNull();
      expect(rules.unavailableReason(oct(26))).toBe("max");
    });

    it("returns min / max for days outside the year range", () => {
      const rules = createManager({
        ui: { yearRange: { before: 1, after: 1 } },
      });
      const at = (year: number, month: number, day: number) =>
        rules.unavailableReason({ year, month, day });
      expect(at(2024, 12, 31)).toBe("min");
      expect(at(2025, 1, 1)).toBeNull();
      expect(at(2027, 12, 31)).toBeNull();
      expect(at(2028, 1, 1)).toBe("max");
    });

    it("returns disabled for disabledDates, enabledDates and isDateDisabled", () => {
      expect(
        createManager({
          calendar: { disabledDates: ["2026-10-20"] },
        }).unavailableReason(oct(20)),
      ).toBe("disabled");
      expect(
        createManager({
          calendar: { enabledDates: ["2026-10-01"] },
        }).unavailableReason(oct(2)),
      ).toBe("disabled");
      expect(
        createManager({
          calendar: { isDateDisabled: (date) => date.getDate() === 21 },
        }).unavailableReason(oct(21)),
      ).toBe("disabled");
    });

    it("returns weekday for a disabled weekday", () => {
      const rules = createManager({ calendar: { disabledWeekdays: [0, 6] } });
      expect(rules.unavailableReason(oct(17))).toBe("weekday");
      expect(rules.unavailableReason(oct(16))).toBeNull();
    });

    it("prefers min over disabled and disabled over weekday", () => {
      const rules = createManager({
        calendar: {
          minDate: "2026-10-18",
          disabledDates: ["2026-10-17", "2026-10-24"],
          disabledWeekdays: [6],
        },
      });
      expect(rules.unavailableReason(oct(17))).toBe("min");
      expect(rules.unavailableReason(oct(24))).toBe("disabled");
    });
  });

  describe("unavailableReason at month precision", () => {
    const month = (year: number, m: number): PlainDate => ({
      year,
      month: m,
      day: 1,
    });

    it("keeps the month of minDate available and reports earlier months as min", () => {
      const rules = createManager({
        calendar: { precision: "month", minDate: "2026-10-15" },
      });
      expect(rules.unavailableReason(month(2026, 10))).toBeNull();
      expect(rules.unavailableReason(month(2026, 9))).toBe("min");
      expect(rules.isDisabled(month(2026, 9))).toBe(true);
    });

    it("keeps the month of maxDate available and reports later months as max", () => {
      const rules = createManager({
        calendar: { precision: "month", maxDate: "2026-10-15" },
      });
      expect(rules.unavailableReason(month(2026, 10))).toBeNull();
      expect(rules.unavailableReason(month(2026, 11))).toBe("max");
    });

    it("reports a month without any enabled day as disabled", () => {
      const rules = createManager({
        calendar: { precision: "month", enabledDates: ["2026-11-15"] },
      });
      expect(rules.unavailableReason(month(2026, 11))).toBeNull();
      expect(rules.unavailableReason(month(2026, 12))).toBe("disabled");
    });

    it("ignores the day of the checked date", () => {
      const rules = createManager({
        calendar: { precision: "month", minDate: "2026-10-15" },
      });
      expect(
        rules.unavailableReason({ year: 2026, month: 10, day: 1 }),
      ).toBeNull();
      expect(
        rules.unavailableReason({ year: 2026, month: 10, day: 31 }),
      ).toBeNull();
    });
  });

  describe("unavailableReason at year precision", () => {
    const year = (y: number): PlainDate => ({ year: y, month: 1, day: 1 });

    it("reports years outside the year range", () => {
      const rules = createManager({
        calendar: { precision: "year" },
        ui: { yearRange: { before: 100, after: 20 } },
      });
      expect(rules.unavailableReason(year(1900))).toBe("min");
      expect(rules.unavailableReason(year(1926))).toBeNull();
      expect(rules.unavailableReason(year(2026))).toBeNull();
      expect(rules.unavailableReason(year(2046))).toBeNull();
      expect(rules.unavailableReason(year(2100))).toBe("max");
    });

    it("narrows the years with minDate and maxDate", () => {
      const rules = createManager({
        calendar: {
          precision: "year",
          minDate: "2020-05-05",
          maxDate: "2030-01-01",
        },
      });
      expect(rules.unavailableReason(year(2019))).toBe("min");
      expect(rules.unavailableReason(year(2020))).toBeNull();
      expect(rules.unavailableReason(year(2030))).toBeNull();
      expect(rules.unavailableReason(year(2031))).toBe("max");
    });
  });

  describe("isSelectable", () => {
    const rangeDraft = (start: PlainDate | null): Selection => ({
      mode: "range",
      start,
      end: null,
    });

    it("blocks dates past range.maxLength and allows the rest", () => {
      const rules = createManager({
        calendar: { mode: "range", range: { maxLength: 3 } },
      });
      const draft = rangeDraft(oct(20));
      expect(rules.isSelectable(oct(23), draft)).toBe(false);
      expect(rules.isSelectable(oct(22), draft)).toBe(true);
      expect(rules.isSelectable(oct(19), draft)).toBe(true);
    });

    it("blocks every date after the first disabled day following the start", () => {
      const rules = createManager({
        calendar: { mode: "range", disabledDates: ["2026-10-24"] },
      });
      const draft = rangeDraft(oct(20));
      expect(rules.isSelectable(oct(23), draft)).toBe(true);
      expect(rules.isSelectable(oct(24), draft)).toBe(false);
      expect(rules.isSelectable(oct(25), draft)).toBe(false);
      expect(rules.isSelectable(oct(19), draft)).toBe(true);
    });

    it("blocks dates past maxDate while the end is chosen", () => {
      const rules = createManager({
        calendar: { mode: "range", maxDate: "2026-10-25" },
      });
      const draft = rangeDraft(oct(20));
      expect(rules.isSelectable(oct(25), draft)).toBe(true);
      expect(rules.isSelectable(oct(26), draft)).toBe(false);
    });

    it("never selects a disabled date and ignores the guard without a start", () => {
      const rules = createManager({
        calendar: { mode: "range", disabledDates: ["2026-10-24"] },
      });
      expect(rules.isSelectable(oct(24), rangeDraft(null))).toBe(false);
      expect(rules.isSelectable(oct(25), rangeDraft(null))).toBe(true);
    });

    it("single mode only checks isDisabled", () => {
      const rules = createManager({
        calendar: { disabledDates: ["2026-10-24"] },
      });
      const draft: Selection = { mode: "single", date: null };
      expect(rules.isSelectable(oct(24), draft)).toBe(false);
      expect(rules.isSelectable(oct(25), draft)).toBe(true);
    });
  });

  it("destroy does not break later checks", () => {
    const rules = createManager({
      calendar: { disabledDates: ["2026-10-20"] },
    });
    rules.destroy();
    expect(rules.isDisabled({ year: 2026, month: 10, day: 20 })).toBe(true);
  });
});
