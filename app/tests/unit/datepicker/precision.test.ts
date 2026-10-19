import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { CoreState } from "@/datepicker/CoreState";
import type { DatepickerOptions } from "@/types/options";
import type { DateValue, ErrorEventData } from "@/types/types";
import {
  cleanupDom,
  clickConfirm,
  flush,
  mountInput,
  surfaces,
} from "../../helpers/picker";

const create = (
  options: DatepickerOptions,
  attrs: Record<string, string> = {},
): { picker: DatepickerUI; input: HTMLInputElement } => {
  const input = mountInput(attrs);
  const picker = new DatepickerUI(input, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
  });
  picker.create();
  return { picker, input };
};

const open = async (picker: DatepickerUI): Promise<void> => {
  picker.open();
  await flush();
};

const panelOf = (picker: DatepickerUI): string =>
  (picker as unknown as { core: CoreState }).core.panel;

const valueOf = (picker: DatepickerUI): DateValue | null =>
  picker.getValue() as DateValue | null;

const hiddenValue = (): string | undefined =>
  document.querySelector<HTMLInputElement>("input.dp-ui__form-value")?.value;

const monthItems = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(".dp-ui__month-selection-item"),
];

const yearItems = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(".dp-ui__year-selection-item"),
];

const yearItem = (year: number): HTMLElement => {
  const found = yearItems().find((item) => item.textContent === String(year));
  if (!found) throw new Error(`no year ${String(year)}`);
  return found;
};

const typeAndBlur = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new FocusEvent("blur"));
};

describe("calendar.precision", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("month precision, docked", () => {
    const options: DatepickerOptions = {
      calendar: { precision: "month" },
      ui: { displayMode: "docked" },
    };

    it("opens on the month grid and hides the month navigation group", async () => {
      const { picker } = create(options);
      await open(picker);

      expect(panelOf(picker)).toBe("month-grid");
      expect(
        document.querySelector('[data-panel="month-grid"]'),
      ).not.toBeNull();
      expect(monthItems()).toHaveLength(12);
      expect(
        document.querySelector(".dp-ui__navigation-group--month"),
      ).toHaveAttribute("hidden");
      expect(
        document.querySelector(".dp-ui__header--docked"),
      ).not.toHaveAttribute("hidden");
    });

    it("marks the current month and has no selection before a pick", async () => {
      const { picker } = create(options);
      await open(picker);

      const items = monthItems();
      expect(items[9]).toHaveClass("dp-ui__month-selection-item--current");
      expect(document.querySelector('[aria-selected="true"]')).toBeNull();
    });

    it("picking October commits 2026-10 to the value, the input and the form", async () => {
      const { picker, input } = create(
        { ...options, behavior: { closeOnSelect: true } },
        { name: "period" },
      );
      const confirmed = vi.fn();
      picker.on("confirm", confirmed);
      await open(picker);

      monthItems()[9]?.click();
      await flush();

      const value = valueOf(picker);
      expect(value?.value).toBe("2026-10");
      expect(value?.formatted).toBe("10/2026");
      expect(value?.date.getFullYear()).toBe(2026);
      expect(value?.date.getMonth()).toBe(9);
      expect(value?.date.getDate()).toBe(1);
      expect(input.value).toBe("10/2026");
      expect(hiddenValue()).toBe("2026-10");
      expect(confirmed).toHaveBeenCalledTimes(1);
      expect(surfaces()).toHaveLength(0);
    });

    it("a second pick in the open grid moves the selection and commits it", async () => {
      const { picker } = create(options);
      await open(picker);

      monthItems()[4]?.focus();
      monthItems()[4]?.click();
      await flush();
      expect(monthItems()[4]).toHaveClass(
        "dp-ui__month-selection-item--selected",
      );

      monthItems()[6]?.focus();
      monthItems()[6]?.click();
      await flush();

      const selected = monthItems().filter((item) =>
        item.classList.contains("dp-ui__month-selection-item--selected"),
      );
      expect(selected).toEqual([monthItems()[6]]);
      expect(monthItems()[6]).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(monthItems()[6]);

      clickConfirm();
      await flush();
      expect(valueOf(picker)?.value).toBe("2026-07");
    });

    it("marks the committed month as selected on the next open", async () => {
      const { picker } = create(options);
      picker.setValue("2026-03");
      await open(picker);

      const selected = document.querySelector(
        ".dp-ui__month-selection-item--selected",
      );
      expect(selected).toBe(monthItems()[2]);
    });

    it("next year shows the following year in the grid", async () => {
      const { picker } = create(options);
      await open(picker);
      expect(monthItems()[0]).toHaveAttribute("aria-label", "January 2026");

      const next = document.querySelector<HTMLElement>(
        ".dp-ui__icon-button--next-year",
      );
      next?.focus();
      next?.click();
      await flush();

      expect(monthItems()[0]).toHaveAttribute("aria-label", "January 2027");
      expect(
        document.querySelector(".dp-ui__menu-button--year"),
      ).toHaveTextContent("2027");
    });

    it("a disabled month cannot be picked", async () => {
      const { picker } = create({
        ...options,
        calendar: { precision: "month", minDate: "2026-10-15" },
        behavior: { closeOnSelect: true },
      });
      await open(picker);

      const items = monthItems();
      expect(items[8]).toHaveAttribute("aria-disabled", "true");
      expect(items[9]).not.toHaveAttribute("aria-disabled");
      items[8]?.click();
      await flush();

      expect(picker.getValue()).toBeNull();
      expect(surfaces()).toHaveLength(1);
    });
  });

  describe("month precision, typed input and value API", () => {
    const options: DatepickerOptions = {
      calendar: { precision: "month" },
      ui: { displayMode: "docked" },
    };

    it("parses typed month text on blur", () => {
      const { picker, input } = create(options, { name: "period" });

      typeAndBlur(input, "11/2026");

      expect(valueOf(picker)?.value).toBe("2026-11");
      expect(input.value).toBe("11/2026");
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(hiddenValue()).toBe("2026-11");
    });

    it("rejects a full date typed at month precision", () => {
      const { picker, input } = create(options);
      const errors: ErrorEventData[] = [];
      picker.on("error", (data) => errors.push(data));

      typeAndBlur(input, "17/10/2026");

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(errors[0]?.code).toBe("invalid-date");
      expect(picker.getValue()).toBeNull();
    });

    it("reports a typed month before minDate with a month-formatted message", () => {
      const { picker, input } = create({
        calendar: { precision: "month", minDate: "2026-10-15" },
      });
      const errors: ErrorEventData[] = [];
      picker.on("error", (data) => errors.push(data));

      typeAndBlur(input, "09/2026");

      expect(errors[0]?.code).toBe("unavailable-date");
      expect(errors[0]?.message).toBe("Enter a date on or after 10/2026");
      expect(picker.getValue()).toBeNull();
    });

    it("accepts the month of minDate when typed", () => {
      const { picker, input } = create({
        calendar: { precision: "month", minDate: "2026-10-15" },
      });

      typeAndBlur(input, "10/2026");

      expect(valueOf(picker)?.value).toBe("2026-10");
    });

    it("setValue takes a period string, a full ISO date or a Date", () => {
      const { picker, input } = create(options, { name: "period" });

      picker.setValue("2026-10");
      expect(valueOf(picker)?.value).toBe("2026-10");
      expect(input.value).toBe("10/2026");
      expect(hiddenValue()).toBe("2026-10");

      picker.setValue("2027-02-17");
      expect(valueOf(picker)?.value).toBe("2027-02");

      picker.setValue(new Date(2026, 9, 17));
      expect(valueOf(picker)?.value).toBe("2026-10");
      expect(valueOf(picker)?.date.getDate()).toBe(1);
      expect(input.value).toBe("10/2026");
      expect(hiddenValue()).toBe("2026-10");
    });

    it("setValue rejects a year-only string", () => {
      const { picker } = create(options);
      const errors: ErrorEventData[] = [];
      picker.on("error", (data) => errors.push(data));
      picker.setValue("2026-10");

      picker.setValue("2026");

      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe("invalid-date");
      expect(valueOf(picker)?.value).toBe("2026-10");
    });

    it("reads an initial input value on create", () => {
      const { picker, input } = create(options, {
        name: "period",
        value: "10/2026",
      });

      expect(valueOf(picker)?.value).toBe("2026-10");
      expect(input.value).toBe("10/2026");
      expect(hiddenValue()).toBe("2026-10");
    });

    it("picks a month with ui.format yyyy-MM", async () => {
      const { picker, input } = create({
        calendar: { precision: "month" },
        ui: { displayMode: "docked", format: "yyyy-MM" },
        behavior: { closeOnSelect: true },
      });
      await open(picker);

      monthItems()[9]?.click();
      await flush();

      expect(input.value).toBe("2026-10");
      expect(valueOf(picker)?.value).toBe("2026-10");
    });

    it("parses typed text with ui.format yyyy-MM", () => {
      const { picker, input } = create({
        calendar: { precision: "month" },
        ui: { displayMode: "docked", format: "yyyy-MM" },
      });

      typeAndBlur(input, "2026-11");

      expect(valueOf(picker)?.value).toBe("2026-11");
      expect(input).not.toHaveAttribute("aria-invalid");
    });

    it("formats with ui.format MM/yyyy", () => {
      const { picker, input } = create({
        calendar: { precision: "month" },
        ui: { displayMode: "docked", format: "MM/yyyy" },
      });

      picker.setValue("2026-10");

      expect(input.value).toBe("10/2026");
    });

    it("formats with the custom ui.format", () => {
      const { picker, input } = create({
        ...options,
        ui: { displayMode: "docked", format: "dd.MM.yyyy" },
      });

      picker.setValue("2026-10");

      expect(input.value).toBe("10.2026");
    });
  });

  describe("year precision", () => {
    it("modal: picking 2030 and confirming commits 2030", async () => {
      const { picker, input } = create(
        {
          calendar: { precision: "year" },
          ui: { displayMode: "modal" },
        },
        { name: "period" },
      );
      await open(picker);
      expect(panelOf(picker)).toBe("year-grid");
      expect(
        document.querySelector(".dp-ui__header--modal .dp-ui__supporting-text"),
      ).toHaveTextContent("Select year");
      expect(document.querySelector("dialog")).toHaveAttribute(
        "aria-label",
        "Select year",
      );

      yearItem(2030).click();
      clickConfirm();
      await flush();

      const value = valueOf(picker);
      expect(value?.value).toBe("2030");
      expect(value?.formatted).toBe("2030");
      expect(value?.date.getFullYear()).toBe(2030);
      expect(value?.date.getMonth()).toBe(0);
      expect(input.value).toBe("2030");
      expect(hiddenValue()).toBe("2030");
    });

    it("modal: the picked year is highlighted and a second pick moves it", async () => {
      const { picker } = create({
        calendar: { precision: "year" },
        ui: { displayMode: "modal" },
      });
      await open(picker);

      yearItem(1935).focus();
      yearItem(1935).click();
      await flush();
      expect(yearItem(1935)).toHaveClass(
        "dp-ui__year-selection-item--selected",
      );
      expect(yearItem(1935)).toHaveAttribute("aria-selected", "true");

      yearItem(1940).focus();
      yearItem(1940).click();
      await flush();
      expect(yearItem(1940)).toHaveClass(
        "dp-ui__year-selection-item--selected",
      );
      expect(yearItem(1935)).not.toHaveClass(
        "dp-ui__year-selection-item--selected",
      );
      expect(document.activeElement).toBe(yearItem(1940));
    });

    it("docked: hides the header and opens on the year grid", async () => {
      const { picker } = create({
        calendar: { precision: "year" },
        ui: { displayMode: "docked" },
        behavior: { closeOnSelect: true },
      });
      await open(picker);

      expect(panelOf(picker)).toBe("year-grid");
      expect(document.querySelector(".dp-ui__header--docked")).toHaveAttribute(
        "hidden",
      );

      yearItem(2028).click();
      await flush();

      expect(valueOf(picker)?.value).toBe("2028");
    });

    it("setValue takes a year string and typed text parses a year", () => {
      const { picker, input } = create({
        calendar: { precision: "year" },
        ui: { displayMode: "docked" },
      });

      picker.setValue("2030");
      expect(valueOf(picker)?.value).toBe("2030");
      expect(input.value).toBe("2030");

      typeAndBlur(input, "2031");
      expect(valueOf(picker)?.value).toBe("2031");
    });

    it("never offers the input view", async () => {
      const { picker } = create({
        calendar: { precision: "year" },
        ui: { displayMode: "modal", initialView: "input" },
      });
      await open(picker);

      expect(panelOf(picker)).toBe("year-grid");
      expect(document.querySelector(".dp-ui__input-panel")).toBeNull();
    });
  });

  describe("modal month precision", () => {
    it("shows the year navigation row and commits the picked month", async () => {
      const { picker } = create({
        calendar: { precision: "month" },
        ui: { displayMode: "modal" },
      });
      await open(picker);

      expect(panelOf(picker)).toBe("month-grid");
      const row = document.querySelector(".dp-ui__navigation--month-grid");
      expect(row).not.toBeNull();
      expect(
        row?.querySelector(".dp-ui__menu-button--year-grid"),
      ).not.toBeNull();
      expect(
        row?.querySelector(".dp-ui__icon-button--prev-year"),
      ).not.toBeNull();
      expect(
        row?.querySelector(".dp-ui__icon-button--next-year"),
      ).not.toBeNull();

      monthItems()[9]?.click();
      clickConfirm();
      await flush();

      expect(valueOf(picker)?.value).toBe("2026-10");
    });
  });
});

describe("ui.startView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  it("docked year opens the year menu", async () => {
    const { picker } = create({
      ui: { displayMode: "docked", startView: "year" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("year-menu");
    expect(document.querySelector('[data-panel="year-menu"]')).not.toBeNull();
  });

  it("docked month opens the month menu", async () => {
    const { picker } = create({
      ui: { displayMode: "docked", startView: "month" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("month-menu");
    expect(document.querySelector('[data-panel="month-menu"]')).not.toBeNull();
  });

  it("modal month opens the month grid and a pick shows that month's days", async () => {
    const { picker } = create({
      ui: { displayMode: "modal", startView: "month" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("month-grid");
    expect(monthItems()).toHaveLength(12);

    monthItems()[2]?.click();
    await flush();

    expect(panelOf(picker)).toBe("days");
    expect(
      document.querySelector('td.dp-ui__date[data-date="2026-03-15"]'),
    ).not.toBeNull();
    expect((picker as unknown as { core: CoreState }).core.view).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it("modal year opens the year grid", async () => {
    const { picker } = create({
      ui: { displayMode: "modal", startView: "year" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("year-grid");
    expect(yearItems().length).toBeGreaterThan(0);
  });

  it("initialView input wins over startView", async () => {
    const { picker } = create({
      ui: { displayMode: "modal", startView: "year", initialView: "input" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("input");
    expect(document.querySelector(".dp-ui__input-panel")).not.toBeNull();
  });

  it("is ignored in range mode", async () => {
    const { picker } = create({
      calendar: { mode: "range" },
      ui: { displayMode: "docked", startView: "year" },
    });
    await open(picker);

    expect(panelOf(picker)).toBe("days");
  });

  it("opens on the start view again on every open", async () => {
    const { picker } = create({
      ui: { displayMode: "docked", startView: "month" },
    });
    await open(picker);
    expect(panelOf(picker)).toBe("month-menu");

    picker.close();
    await flush();
    await open(picker);

    expect(panelOf(picker)).toBe("month-menu");
  });
});
