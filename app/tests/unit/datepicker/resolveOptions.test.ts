import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LABELS } from "@/datepicker/options/defaults";
import { mergeOptions } from "@/datepicker/options/merge";
import { resolveOptions } from "@/datepicker/options/resolve";

describe("resolveOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applies defaults", () => {
    const r = resolveOptions(undefined);
    expect(r.displayMode).toBe("auto");
    expect(r.behavior.returnFocus).toBe(true);
    expect(r.behavior.closeOnSelect).toBe(false);
    expect(r.theme).toBe("basic");
    expect(r.swipe).toBe(true);
    expect(r.footerExplicit).toBeNull();
  });

  it("resolves minDate 'today' and Date values to a plain date", () => {
    expect(resolveOptions({ calendar: { minDate: "today" } }).minDate).toEqual({
      year: 2026,
      month: 10,
      day: 17,
    });
    expect(
      resolveOptions({ calendar: { minDate: new Date(2026, 9, 17, 15, 30) } })
        .minDate,
    ).toEqual({ year: 2026, month: 10, day: 17 });
  });

  it("drops unparseable disabledDates and reports an issue", () => {
    const x = resolveOptions({
      calendar: {
        disabledDates: ["2026-10-20", new Date(2026, 9, 21), "nope"],
      },
    });
    expect(x.disabledDates).toHaveLength(2);
    expect(x.issues).toEqual([
      { option: "calendar.disabledDates", value: "nope" },
    ]);
  });

  it("derives weekStart from the locale", () => {
    expect(resolveOptions({ calendar: { locale: "pl-PL" } }).weekStart).toBe(1);
  });

  it("normalizes clearButton", () => {
    expect(resolveOptions({ ui: { clearButton: true } }).clearButton).toEqual({
      clearInput: true,
    });
    expect(
      resolveOptions({ ui: { clearButton: { clearInput: false } } })
        .clearButton,
    ).toEqual({ clearInput: false });
    expect(resolveOptions(undefined).clearButton).toBe(false);
  });

  it("keeps an explicit footer flag", () => {
    expect(resolveOptions({ ui: { footer: false } }).footerExplicit).toBe(
      false,
    );
    expect(resolveOptions({ ui: { footer: true } }).footerExplicit).toBe(true);
  });

  describe("ui.fullscreen", () => {
    it("defaults to 600", () => {
      const r = resolveOptions(undefined);
      expect(r.fullscreenBelow).toBe(600);
      expect(r.issues).toEqual([]);
    });

    it("true is 600 and false is 0", () => {
      expect(resolveOptions({ ui: { fullscreen: true } }).fullscreenBelow).toBe(
        600,
      );
      expect(
        resolveOptions({ ui: { fullscreen: false } }).fullscreenBelow,
      ).toBe(0);
    });

    it("keeps a positive integer", () => {
      const r = resolveOptions({ ui: { fullscreen: 840 } });
      expect(r.fullscreenBelow).toBe(840);
      expect(r.issues).toEqual([]);
    });

    it.each([-5, 1.5, "big"])("reports %s once and uses 600", (value) => {
      const r = resolveOptions({ ui: { fullscreen: value as never } });
      expect(r.fullscreenBelow).toBe(600);
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("ui.fullscreen");
    });
  });

  describe("calendar.months and calendar.pageBy", () => {
    it("defaults to one month paged by the view", () => {
      const r = resolveOptions(undefined);
      expect(r.months).toBe(1);
      expect(r.pageBy).toBe("view");
      expect(r.issues).toEqual([]);
    });

    it("keeps a positive integer and a valid pageBy", () => {
      const r = resolveOptions({ calendar: { months: 3, pageBy: "month" } });
      expect(r.months).toBe(3);
      expect(r.pageBy).toBe("month");
      expect(r.issues).toEqual([]);
    });

    it.each([0, -2, 1.5, "2"])("reports months %s once and uses 1", (value) => {
      const r = resolveOptions({ calendar: { months: value as never } });
      expect(r.months).toBe(1);
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("calendar.months");
    });

    it("reports an unknown pageBy once and uses view", () => {
      const r = resolveOptions({ calendar: { pageBy: "week" as never } });
      expect(r.pageBy).toBe("view");
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("calendar.pageBy");
    });
  });

  describe("calendar.locale", () => {
    afterEach(() => {
      document.documentElement.removeAttribute("lang");
    });

    it("keeps a valid BCP 47 tag without an issue", () => {
      const r = resolveOptions({ calendar: { locale: "pl-PL" } });
      expect(r.locale).toBe("pl-PL");
      expect(r.issues).toEqual([]);
    });

    it("reports an underscore tag once and falls back without throwing", () => {
      const r = resolveOptions({ calendar: { locale: "en_US" } });
      expect(r.issues).toEqual([{ option: "calendar.locale", value: "en_US" }]);
      expect(r.locale).toBe("en-US");
    });

    it("falls back to the page language for an invalid tag", () => {
      document.documentElement.lang = "de-DE";
      const r = resolveOptions({ calendar: { locale: "en_US" } });
      expect(r.issues).toHaveLength(1);
      expect(r.locale).toBe("de-DE");
    });

    it("treats a blank locale as unset without an issue", () => {
      document.documentElement.lang = "fr-FR";
      const r = resolveOptions({ calendar: { locale: "  " } });
      expect(r.issues).toEqual([]);
      expect(r.locale).toBe("fr-FR");
    });

    it("uses the page language when no locale is given", () => {
      document.documentElement.lang = "pl";
      expect(resolveOptions(undefined).locale).toBe("pl");
    });

    it("skips an invalid page language", () => {
      document.documentElement.lang = "xx_YY";
      const r = resolveOptions(undefined);
      expect(r.locale).toBe("en-US");
      expect(r.issues).toEqual([]);
    });

    it("an invalid tag still yields a usable week start", () => {
      const r = resolveOptions({ calendar: { locale: "en_US" } });
      expect(r.weekStart).toBe(0);
    });
  });

  describe("selection modes and view options", () => {
    it("applies the stage 2 defaults", () => {
      const r = resolveOptions(undefined);
      expect(r.mode).toBe("single");
      expect(r.limits).toEqual({
        minLength: null,
        maxLength: null,
        multipleMax: null,
      });
      expect(r.viewSwitch).toBe(true);
      expect(r.initialView).toBe("calendar");
      expect(r.mask).toBe(false);
      expect(r.disabledWeekdays).toEqual([]);
      expect(r.isDateDisabled).toBeNull();
      expect(r.decorateDate).toBeNull();
      expect(r.issues).toEqual([]);
    });

    it("accepts valid modes and limits", () => {
      const r = resolveOptions({
        calendar: {
          mode: "range",
          range: { minLength: 2, maxLength: 9 },
        },
      });
      expect(r.mode).toBe("range");
      expect(r.limits).toEqual({
        minLength: 2,
        maxLength: 9,
        multipleMax: null,
      });
      expect(
        resolveOptions({ calendar: { multiple: { max: 4 } } }).limits,
      ).toEqual({ minLength: null, maxLength: null, multipleMax: 4 });
    });

    it("reports minLength above maxLength once and drops maxLength", () => {
      const r = resolveOptions({
        calendar: { mode: "range", range: { minLength: 5, maxLength: 3 } },
      });
      expect(r.limits.minLength).toBe(5);
      expect(r.limits.maxLength).toBeNull();
      expect(
        r.issues.filter((i) => i.option === "calendar.range"),
      ).toHaveLength(1);
      expect(r.issues).toHaveLength(1);
    });

    it("keeps weekdays 0-6 and reports the rest", () => {
      const r = resolveOptions({
        calendar: { disabledWeekdays: [0, 6, 7, 1.5] },
      });
      expect(r.disabledWeekdays).toEqual([0, 6]);
      expect(r.issues.length).toBeGreaterThanOrEqual(1);
      expect(
        r.issues.every((i) => i.option.startsWith("calendar.disabledWeekdays")),
      ).toBe(true);
    });

    it("falls back to single for an unknown mode", () => {
      const r = resolveOptions({
        calendar: { mode: "week" as never },
      });
      expect(r.mode).toBe("single");
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("calendar.mode");
    });

    it("rejects a multiple max below 1", () => {
      const r = resolveOptions({ calendar: { multiple: { max: 0 } } });
      expect(r.limits.multipleMax).toBeNull();
      expect(r.issues).toHaveLength(1);
    });

    it("rejects non-integer range lengths", () => {
      const r = resolveOptions({
        calendar: { range: { minLength: 0, maxLength: 2.5 } },
      });
      expect(r.limits.minLength).toBeNull();
      expect(r.limits.maxLength).toBeNull();
      expect(r.issues).toHaveLength(2);
    });

    it("keeps function options and rejects non-functions", () => {
      const disabled = (date: Date) => date.getDay() === 3;
      const decorate = () => ({ badge: true });
      const ok = resolveOptions({
        calendar: { isDateDisabled: disabled, decorateDate: decorate },
      });
      expect(ok.isDateDisabled?.(new Date(2026, 9, 21))).toBe(true);
      expect(ok.isDateDisabled?.(new Date(2026, 9, 20))).toBe(false);
      expect(ok.decorateDate?.(new Date(2026, 9, 20))).toEqual({ badge: true });

      const bad = resolveOptions({
        calendar: {
          isDateDisabled: "x" as never,
          decorateDate: 5 as never,
        },
      });
      expect(bad.isDateDisabled).toBeNull();
      expect(bad.decorateDate).toBeNull();
      expect(bad.issues).toHaveLength(2);
    });

    describe("ui.outsideDays", () => {
      it("defaults to false", () => {
        expect(resolveOptions(undefined).outsideDays).toBe(false);
      });

      it("true and an empty object are selectable", () => {
        expect(
          resolveOptions({ ui: { outsideDays: true } }).outsideDays,
        ).toEqual({ selectable: true });
        const empty = resolveOptions({ ui: { outsideDays: {} } });
        expect(empty.outsideDays).toEqual({ selectable: true });
        expect(empty.issues).toEqual([]);
      });

      it("keeps selectable false", () => {
        const r = resolveOptions({
          ui: { outsideDays: { selectable: false } },
        });
        expect(r.outsideDays).toEqual({ selectable: false });
        expect(r.issues).toEqual([]);
      });

      it("false stays false", () => {
        expect(resolveOptions({ ui: { outsideDays: false } }).outsideDays).toBe(
          false,
        );
      });

      it("reports a string once and uses false", () => {
        const r = resolveOptions({ ui: { outsideDays: "yes" as never } });
        expect(r.outsideDays).toBe(false);
        expect(r.issues).toEqual([{ option: "ui.outsideDays", value: "yes" }]);
      });

      it("reports a non-boolean selectable and stays selectable", () => {
        const r = resolveOptions({
          ui: { outsideDays: { selectable: "no" as never } },
        });
        expect(r.outsideDays).toEqual({ selectable: true });
        expect(r.issues).toEqual([
          { option: "ui.outsideDays.selectable", value: "no" },
        ]);
      });
    });

    describe("ui.fixedWeeks, calendar.validate and calendar.renderDate", () => {
      it("applies the defaults", () => {
        const r = resolveOptions(undefined);
        expect(r.fixedWeeks).toBe(false);
        expect(r.validate).toBeNull();
        expect(r.renderDate).toBeNull();
      });

      it("accepts valid values", () => {
        const r = resolveOptions({
          ui: { fixedWeeks: true },
          calendar: {
            validate: () => "no",
            renderDate: () => "$1",
          },
        });
        expect(r.fixedWeeks).toBe(true);
        expect(r.validate?.(null)).toBe("no");
        expect(r.renderDate?.(new Date(2026, 9, 20))).toBe("$1");
        expect(r.issues).toEqual([]);
      });

      it("reports wrong types and falls back", () => {
        const r = resolveOptions({
          ui: { fixedWeeks: "yes" as never },
          calendar: {
            validate: "x" as never,
            renderDate: 5 as never,
          },
        });
        expect(r.fixedWeeks).toBe(false);
        expect(r.validate).toBeNull();
        expect(r.renderDate).toBeNull();
        expect(r.issues.map((i) => i.option).sort()).toEqual([
          "calendar.renderDate",
          "calendar.validate",
          "ui.fixedWeeks",
        ]);
      });

      it("validate maps undefined and an empty string to null", () => {
        const none = resolveOptions({
          calendar: { validate: () => undefined },
        });
        const empty = resolveOptions({ calendar: { validate: () => "" } });
        expect(none.validate?.(null)).toBeNull();
        expect(empty.validate?.(null)).toBeNull();
      });

      it("renderDate keeps strings and Nodes and drops other results", () => {
        const node = document.createElement("i");
        const render = (value: unknown) =>
          resolveOptions({ calendar: { renderDate: () => value as never } })
            .renderDate;
        const date = new Date(2026, 9, 20);
        expect(render("a")?.(date)).toBe("a");
        expect(render(node)?.(date)).toBe(node);
        expect(render(5)?.(date)).toBeNull();
        expect(render(undefined)?.(date)).toBeNull();
      });

      it("throwing validate and renderDate give null and rethrow later", () => {
        const queued: (() => void)[] = [];
        vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
          queued.push(cb);
        });
        const boom = new Error("boom");
        const throwing = () => {
          throw boom;
        };
        const r = resolveOptions({
          calendar: { validate: throwing, renderDate: throwing },
        });
        expect(r.validate?.(null)).toBeNull();
        expect(r.renderDate?.(new Date(2026, 9, 20))).toBeNull();
        expect(queued).toHaveLength(2);
        expect(() => {
          queued[0]?.();
        }).toThrow(boom);
        vi.restoreAllMocks();
      });
    });

    it("reads viewSwitch, initialView and mask", () => {
      const r = resolveOptions({
        ui: { viewSwitch: false, initialView: "input", mask: true },
      });
      expect(r.viewSwitch).toBe(false);
      expect(r.initialView).toBe("input");
      expect(r.mask).toBe(true);
    });

    describe("calendar.precision and ui.startView", () => {
      it("defaults to day for both", () => {
        const r = resolveOptions(undefined);
        expect(r.precision).toBe("day");
        expect(r.startView).toBe("day");
        expect(r.issues).toEqual([]);
      });

      it.each(["month", "year"] as const)("accepts %s in single mode", (p) => {
        const r = resolveOptions({ calendar: { precision: p } });
        expect(r.precision).toBe(p);
        expect(r.issues).toEqual([]);
      });

      it.each(["range", "multiple"] as const)(
        "reports month precision in %s mode once and uses day",
        (mode) => {
          const r = resolveOptions({ calendar: { mode, precision: "month" } });
          expect(r.mode).toBe(mode);
          expect(r.precision).toBe("day");
          expect(r.issues).toEqual([
            { option: "calendar.precision", value: "month" },
          ]);
        },
      );

      it("accepts day precision in range mode without an issue", () => {
        const r = resolveOptions({
          calendar: { mode: "range", precision: "day" },
        });
        expect(r.precision).toBe("day");
        expect(r.issues).toEqual([]);
      });

      it("reports an unknown precision and uses day", () => {
        const r = resolveOptions({
          calendar: { precision: "week" as never },
        });
        expect(r.precision).toBe("day");
        expect(r.issues).toHaveLength(1);
        expect(r.issues[0]?.option).toBe("calendar.precision");
      });

      it.each(["day", "month", "year"] as const)(
        "accepts startView %s",
        (v) => {
          const r = resolveOptions({ ui: { startView: v } });
          expect(r.startView).toBe(v);
          expect(r.issues).toEqual([]);
        },
      );

      it("reports an unknown startView and uses day", () => {
        const r = resolveOptions({ ui: { startView: "week" as never } });
        expect(r.startView).toBe("day");
        expect(r.issues).toEqual([{ option: "ui.startView", value: "week" }]);
      });
    });

    describe("short ui.format patterns", () => {
      it("accepts a month-year format at month precision", () => {
        const r = resolveOptions({
          calendar: { precision: "month" },
          ui: { format: "MM/yyyy" },
        });
        expect(r.issues).toEqual([]);
        expect(r.pattern.order).toEqual(["day", "month", "year"]);
      });

      it("reports a month-year format at day precision and falls back to auto", () => {
        const r = resolveOptions({
          calendar: { locale: "en-US" },
          ui: { format: "MM/yyyy" },
        });
        expect(r.issues).toEqual([{ option: "ui.format", value: "MM/yyyy" }]);
        expect(r.pattern.order).toEqual(["month", "day", "year"]);
      });
    });

    describe("calendar.range.presets and ui.endInput", () => {
      const range = { start: "2026-10-01", end: "2026-10-07" };

      it("defaults to no presets and no end input", () => {
        const r = resolveOptions(undefined);
        expect(r.presets).toEqual([]);
        expect(r.endInput).toBeNull();
        expect(r.issues).toEqual([]);
      });

      it("keeps a function value and wraps an object value", () => {
        const fn = vi.fn(() => range);
        const r = resolveOptions({
          calendar: {
            range: {
              presets: [
                { label: "Fn", value: fn },
                { label: "Obj", value: range },
              ],
            },
          },
        });
        expect(r.presets.map((p) => p.label)).toEqual(["Fn", "Obj"]);
        expect(r.presets[0]?.value()).toBe(range);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(r.presets[1]?.value()).toBe(range);
        expect(r.issues).toEqual([]);
      });

      it("skips items with a bad label or value and reports each", () => {
        const bad = [
          { label: "", value: range },
          { label: 3, value: range },
          { label: "No value" },
          { label: "String value", value: "2026-10-01" },
          null,
        ];
        const r = resolveOptions({
          calendar: {
            range: {
              presets: [{ label: "Ok", value: range }, ...bad] as never,
            },
          },
        });
        expect(r.presets.map((p) => p.label)).toEqual(["Ok"]);
        expect(r.issues).toHaveLength(bad.length);
        expect(
          r.issues.every((issue) => issue.option === "calendar.range.presets"),
        ).toBe(true);
      });

      it("reports a non-array value and uses no presets", () => {
        const r = resolveOptions({
          calendar: { range: { presets: "last week" as never } },
        });
        expect(r.presets).toEqual([]);
        expect(r.issues).toEqual([
          { option: "calendar.range.presets", value: "last week" },
        ]);
      });
    });

    it("accepts a plural multipleSelected label", () => {
      const label = { one: "x" };
      const r = resolveOptions({ labels: { multipleSelected: label } });
      expect(r.labels.multipleSelected).toEqual(label);
      expect(r.issues).toEqual([]);
    });

    it("rejects a numeric multipleSelected label and keeps the default", () => {
      const r = resolveOptions({
        labels: { multipleSelected: 3 as never },
      });
      expect(r.labels.multipleSelected).toBe("{count} selected");
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("labels.multipleSelected");
    });

    it("accepts custom hint letters", () => {
      const r = resolveOptions({ labels: { hintDay: "tt", hintYear: "rrrr" } });
      expect(r.labels.hintDay).toBe("tt");
      expect(r.labels.hintMonth).toBe("mm");
      expect(r.labels.hintYear).toBe("rrrr");
      expect(r.issues).toEqual([]);
    });

    it("rejects a non-string hintDay and keeps the default", () => {
      const r = resolveOptions({ labels: { hintDay: 5 as never } });
      expect(r.labels.hintDay).toBe("dd");
      expect(r.issues).toHaveLength(1);
      expect(r.issues[0]?.option).toBe("labels.hintDay");
    });
  });
});

describe("DEFAULT_LABELS", () => {
  it("matches the C5 contract exactly", () => {
    expect(DEFAULT_LABELS).toEqual({
      title: "Select date",
      monthTitle: "Select month",
      yearTitle: "Select year",
      noDate: "No date selected",
      confirm: "OK",
      cancel: "Cancel",
      today: "Today",
      clear: "Clear",
      openCalendar: "Choose date",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      previousYear: "Previous year",
      nextYear: "Next year",
      chooseMonth: "Choose month",
      chooseYear: "Choose year",
      weekNumber: "Week",
      invalidDate: "Enter a valid date",
      unavailableDate: "This date is not available",
      rangeTitle: "Select dates",
      rangeStart: "Start",
      rangeEnd: "End",
      multipleSelected: "{count} selected",
      save: "Save",
      close: "Close",
      switchToInput: "Switch to text input",
      switchToCalendar: "Switch to calendar",
      dateField: "Date",
      startDateField: "Start date",
      endDateField: "End date",
      invalidRange: "End date must be on or after the start date",
      beforeMinDate: "Enter a date on or after {date}",
      afterMaxDate: "Enter a date on or before {date}",
      presets: "Presets",
      pageUpKey: "Page Up",
      pageDownKey: "Page Down",
      shiftKey: "Shift",
      hintDay: "dd",
      hintMonth: "mm",
      hintYear: "yyyy",
    });
  });
});

describe("mergeOptions", () => {
  it("deep merges nested groups", () => {
    expect(
      mergeOptions(
        { ui: { inline: { enabled: true } } },
        { ui: { inline: { container: "#x" } } },
      ).ui?.inline,
    ).toEqual({ enabled: true, container: "#x" });
  });

  it("replaces arrays instead of concatenating", () => {
    const merged = mergeOptions(
      { calendar: { disabledDates: ["2026-10-01", "2026-10-02"] } },
      { calendar: { disabledDates: ["2026-10-05"] } },
    );
    expect(merged.calendar?.disabledDates).toEqual(["2026-10-05"]);
  });

  it("keeps untouched groups from the base", () => {
    const merged = mergeOptions(
      { ui: { theme: "m2" }, behavior: { closeOnSelect: true } },
      { ui: { swipe: false } },
    );
    expect(merged.ui).toEqual({ theme: "m2", swipe: false });
    expect(merged.behavior).toEqual({ closeOnSelect: true });
  });
});
