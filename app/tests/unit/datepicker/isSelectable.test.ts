import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import { cleanupDom, flush, mountInput } from "../../helpers/picker";

const EVENTS = [
  "open",
  "close",
  "cancel",
  "confirm",
  "update",
  "error",
  "select:day",
  "select:month",
  "select:year",
  "navigate",
  "range:start",
  "range:end",
  "switch:view",
  "clear",
] as const;

const make = (calendar: DatepickerOptions["calendar"] = {}): DatepickerUI => {
  const picker = new DatepickerUI(mountInput(), {
    calendar: { locale: "en-US", ...calendar },
  });
  picker.create();
  return picker;
};

describe("isSelectable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("single", () => {
    it("accepts an open day as a string or a Date", () => {
      const picker = make();
      expect(picker.isSelectable("2026-10-15")).toBe(true);
      expect(picker.isSelectable(new Date(2026, 9, 15))).toBe(true);
    });

    it("includes the minDate and maxDate edges and rejects the days outside", () => {
      const picker = make({ minDate: "2026-10-10", maxDate: "2026-10-25" });
      expect(picker.isSelectable("2026-10-09")).toBe(false);
      expect(picker.isSelectable("2026-10-10")).toBe(true);
      expect(picker.isSelectable("2026-10-25")).toBe(true);
      expect(picker.isSelectable("2026-10-26")).toBe(false);
    });

    it("rejects disabledDates", () => {
      const picker = make({ disabledDates: ["2026-10-14"] });
      expect(picker.isSelectable("2026-10-14")).toBe(false);
      expect(picker.isSelectable("2026-10-15")).toBe(true);
    });

    it("allows only enabledDates when they are set", () => {
      const picker = make({ enabledDates: ["2026-10-15"] });
      expect(picker.isSelectable("2026-10-15")).toBe(true);
      expect(picker.isSelectable("2026-10-16")).toBe(false);
    });

    it("rejects disabledWeekdays", () => {
      const picker = make({ disabledWeekdays: [0, 6] });
      expect(picker.isSelectable("2026-10-24")).toBe(false);
      expect(picker.isSelectable(new Date(2026, 9, 25))).toBe(false);
      expect(picker.isSelectable("2026-10-23")).toBe(true);
    });

    it("rejects what isDateDisabled disables", () => {
      const picker = make({ isDateDisabled: (date) => date.getDate() === 13 });
      expect(picker.isSelectable("2026-10-13")).toBe(false);
      expect(picker.isSelectable("2026-10-12")).toBe(true);
    });

    it("rejects days outside ui.yearRange", () => {
      const picker = make();
      expect(picker.isSelectable("2100-01-01")).toBe(false);
      expect(picker.isSelectable("1800-01-01")).toBe(false);
    });

    it("rejects an array in single mode", () => {
      const picker = make();
      expect(picker.isSelectable(["2026-10-15"])).toBe(false);
    });
  });

  describe("range", () => {
    const limited = (): DatepickerUI =>
      make({
        mode: "range",
        range: { minLength: 2, maxLength: 5 },
        disabledDates: ["2026-10-30"],
      });

    it("accepts a range within the length limits", () => {
      const picker = limited();
      expect(
        picker.isSelectable({ start: "2026-10-20", end: "2026-10-24" }),
      ).toBe(true);
      expect(
        picker.isSelectable({
          start: new Date(2026, 9, 20),
          end: new Date(2026, 9, 21),
        }),
      ).toBe(true);
    });

    it("rejects a range that is too long or too short", () => {
      const picker = limited();
      expect(
        picker.isSelectable({ start: "2026-10-20", end: "2026-10-26" }),
      ).toBe(false);
      expect(
        picker.isSelectable({ start: "2026-10-20", end: "2026-10-20" }),
      ).toBe(false);
    });

    it("rejects a range that spans a disabled day", () => {
      const picker = limited();
      expect(
        picker.isSelectable({ start: "2026-10-28", end: "2026-11-01" }),
      ).toBe(false);
    });

    it("rejects a range that ends before it starts", () => {
      const picker = limited();
      expect(
        picker.isSelectable({ start: "2026-10-24", end: "2026-10-20" }),
      ).toBe(false);
    });

    it("checks a single string as one day", () => {
      const picker = limited();
      expect(picker.isSelectable("2026-10-30")).toBe(false);
      expect(picker.isSelectable("2026-10-29")).toBe(true);
    });

    it("rejects an object that is not a range", () => {
      const picker = limited();
      expect(picker.isSelectable(["2026-10-20", "2026-10-21"])).toBe(false);
    });
  });

  describe("multiple", () => {
    const capped = (): DatepickerUI =>
      make({
        mode: "multiple",
        multiple: { max: 2 },
        disabledDates: ["2026-10-30"],
      });

    it("accepts up to multiple.max dates", () => {
      const picker = capped();
      expect(picker.isSelectable(["2026-10-20", "2026-10-21"])).toBe(true);
    });

    it("rejects more than multiple.max dates", () => {
      const picker = capped();
      expect(
        picker.isSelectable(["2026-10-20", "2026-10-21", "2026-10-22"]),
      ).toBe(false);
    });

    it("rejects a list holding a disabled date", () => {
      const picker = capped();
      expect(picker.isSelectable(["2026-10-20", "2026-10-30"])).toBe(false);
    });

    it("rejects an empty list and an unreadable item", () => {
      const picker = capped();
      expect(picker.isSelectable([])).toBe(false);
      expect(picker.isSelectable(["2026-10-20", "garbage"])).toBe(false);
    });
  });

  describe("precision", () => {
    it("rejects a month that is disabled as a whole", () => {
      const picker = make({
        precision: "month",
        isDateDisabled: (date) => date.getMonth() === 10,
      });
      expect(picker.isSelectable("2026-11")).toBe(false);
      expect(picker.isSelectable("2026-12")).toBe(true);
    });

    it("rejects a month before minDate", () => {
      const picker = make({ precision: "month", minDate: "2026-12-01" });
      expect(picker.isSelectable("2026-11")).toBe(false);
      expect(picker.isSelectable("2026-12")).toBe(true);
    });
  });

  describe("unreadable input", () => {
    it("gives false for garbage and an empty string", () => {
      const picker = make();
      expect(picker.isSelectable("garbage")).toBe(false);
      expect(picker.isSelectable("")).toBe(false);
      expect(picker.isSelectable("2026-02-30")).toBe(false);
    });
  });

  describe("side effects", () => {
    it("emits no event, even for unreadable input", async () => {
      const picker = make({ mode: "range", disabledDates: ["2026-10-22"] });
      const handler = vi.fn();
      for (const event of EVENTS) {
        picker.on(event, handler);
      }

      picker.isSelectable("garbage");
      picker.isSelectable("2026-10-22");
      picker.isSelectable({ start: "2026-10-20", end: "2026-10-24" });
      await flush();

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not change the value or the input", () => {
      const input = mountInput();
      const picker = new DatepickerUI(input, {
        calendar: { locale: "en-US" },
      });
      picker.create();
      picker.setValue("2026-10-05");
      const text = input.value;

      picker.isSelectable("2026-10-20");

      expect(input.value).toBe(text);
      expect(picker.getValue()).toMatchObject({ value: "2026-10-05" });
    });
  });
});
