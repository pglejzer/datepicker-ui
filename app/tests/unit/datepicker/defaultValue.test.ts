import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import { cleanupDom, flush, mountInput } from "../../helpers/picker";

const FORMAT: DatepickerOptions = {
  calendar: { locale: "en-US" },
  ui: { format: "yyyy-MM-dd" },
};

const withFormat = (options: DatepickerOptions): DatepickerOptions => ({
  ...options,
  calendar: { ...FORMAT.calendar, ...options.calendar },
  ui: { ...FORMAT.ui, ...options.ui },
});

const create = (
  options: DatepickerOptions,
  attrs: Record<string, string> = {},
): { input: HTMLInputElement; picker: DatepickerUI } => {
  const input = mountInput(attrs);
  const picker = new DatepickerUI(input, withFormat(options));
  picker.create();
  return { input, picker };
};

const valueOf = (picker: DatepickerUI): unknown => {
  const value = picker.getValue();
  return value !== null && "value" in value ? value.value : value;
};

describe("calendar.defaultValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 10));
  });

  afterEach(() => {
    DatepickerUI.destroyAll();
    cleanupDom();
    vi.useRealTimers();
  });

  it("fills an empty input", () => {
    const { input, picker } = create({
      calendar: { defaultValue: "2026-03-14" },
    });
    expect(valueOf(picker)).toBe("2026-03-14");
    expect(input.value).toBe("2026-03-14");
  });

  it('reads "today" when create() runs', () => {
    const { input } = create({ calendar: { defaultValue: "today" } });
    expect(input.value).toBe("2026-11-09");
  });

  it("gives the current month at month precision", () => {
    const { picker } = create({
      calendar: { precision: "month", defaultValue: "today" },
      ui: { format: "yyyy-MM" },
    });
    expect(valueOf(picker)).toBe("2026-11");
  });

  it("loses to a date already in the input", () => {
    const { input, picker } = create(
      { calendar: { defaultValue: "today" } },
      { value: "2020-11-22" },
    );
    expect(valueOf(picker)).toBe("2020-11-22");
    expect(input.value).toBe("2020-11-22");
  });

  it("replaces input text that is not a date", () => {
    const { input } = create(
      { calendar: { defaultValue: "2026-03-14" } },
      { value: "soon" },
    );
    expect(input.value).toBe("2026-03-14");
  });

  it("loses to setValue() called before create()", () => {
    const input = mountInput();
    const picker = new DatepickerUI(
      input,
      withFormat({ calendar: { defaultValue: "today" } }),
    );
    picker.setValue("2026-01-02");
    picker.create();
    expect(valueOf(picker)).toBe("2026-01-02");
  });

  it("fires no confirm and no DOM events at create()", () => {
    const input = mountInput();
    const onChange = vi.fn();
    input.addEventListener("change", onChange);
    input.addEventListener("input", onChange);
    const picker = new DatepickerUI(
      input,
      withFormat({ calendar: { defaultValue: "today" } }),
    );
    const onConfirm = vi.fn();
    picker.on("confirm", onConfirm);
    picker.create();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fills both ui.endInput fields, and loses to typed fields", () => {
    const start = mountInput();
    const end = mountInput();
    const picker = new DatepickerUI(
      start,
      withFormat({
        calendar: {
          mode: "range",
          defaultValue: { start: "today", end: "2026-11-12" },
        },
        ui: { endInput: end },
      }),
    );
    picker.create();
    expect(start.value).toBe("2026-11-09");
    expect(end.value).toBe("2026-11-12");

    const typedStart = mountInput({ value: "2026-01-05" });
    const typedEnd = mountInput({ value: "2026-01-07" });
    const typed = new DatepickerUI(
      typedStart,
      withFormat({
        calendar: {
          mode: "range",
          defaultValue: { start: "today", end: "2026-11-12" },
        },
        ui: { endInput: typedEnd },
      }),
    );
    typed.create();
    expect(typed.getValue()).toMatchObject({
      start: { value: "2026-01-05" },
      end: { value: "2026-01-07" },
    });
  });

  it("is what a form reset restores", async () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const input = mountInput({ name: "date" }, form);
    const picker = new DatepickerUI(
      input,
      withFormat({ calendar: { defaultValue: "2026-03-14" } }),
    );
    picker.create();
    picker.setValue("2026-12-24");
    form.reset();
    await flush();
    expect(valueOf(picker)).toBe("2026-03-14");
    expect(input.value).toBe("2026-03-14");
  });

  it("is not applied again by setOptions()", () => {
    const { picker } = create({});
    picker.setOptions({ calendar: { defaultValue: "2026-03-14" } });
    expect(picker.getValue()).toBeNull();
  });
});

describe('"today" in the value API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 10));
  });

  afterEach(() => {
    DatepickerUI.destroyAll();
    cleanupDom();
    vi.useRealTimers();
  });

  it("setValue() accepts today", () => {
    const { input, picker } = create({});
    picker.setValue("today");
    expect(valueOf(picker)).toBe("2026-11-09");
    expect(input.value).toBe("2026-11-09");
  });

  it("isSelectable() checks today against the rules", () => {
    expect(create({}).picker.isSelectable("today")).toBe(true);
    expect(
      create({ calendar: { minDate: "2026-11-10" } }).picker.isSelectable(
        "today",
      ),
    ).toBe(false);
  });
});
