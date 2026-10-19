import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type { ErrorEventData, PickerValue } from "@/types/types";
import {
  cleanupDom,
  clickConfirm,
  clickDate,
  clickSelector,
  flush,
  mountInput,
} from "../../helpers/picker";

type Validate = (value: PickerValue | null) => string | null | undefined;

const openPicker = async (
  validate: Validate,
  options: DatepickerOptions = {},
): Promise<{
  picker: DatepickerUI;
  input: HTMLInputElement;
  errors: ErrorEventData[];
}> => {
  const input = mountInput();
  const picker = new DatepickerUI(input, {
    ...options,
    ui: { displayMode: "docked", ...options.ui },
    calendar: { locale: "en-US", ...options.calendar, validate },
  });
  picker.create();
  const errors: ErrorEventData[] = [];
  picker.on("error", (data) => errors.push(data));
  picker.open();
  await flush();
  return { picker, input, errors };
};

const WEEKENDS_ONLY: Validate = (value) => {
  if (value === null || !("date" in value)) return undefined;
  const weekday = value.date.getDay();
  return weekday === 0 || weekday === 6 ? undefined : "Weekends only";
};

describe("calendar.validate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  it("commits a refused value and reports invalid-value", async () => {
    const { picker, input, errors } = await openPicker(WEEKENDS_ONLY);
    const confirm = vi.fn();
    picker.on("confirm", confirm);

    clickDate("2026-10-14");
    clickConfirm();
    await flush();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(picker.getValue()).toMatchObject({ value: "2026-10-14" });
    expect(errors).toEqual([
      { code: "invalid-value", message: "Weekends only" },
    ]);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.validationMessage).toBe("Weekends only");
  });

  it("leaves a value the validator accepts without an error", async () => {
    const { picker, input, errors } = await openPicker(WEEKENDS_ONLY);

    clickDate("2026-10-17");
    clickConfirm();
    await flush();

    expect(picker.getValue()).toMatchObject({ value: "2026-10-17" });
    expect(errors).toEqual([]);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input.validationMessage).toBe("");
  });

  it("clears the message when a later value passes (undefined)", async () => {
    const { picker, input } = await openPicker(WEEKENDS_ONLY);
    picker.setValue("2026-10-14");
    expect(input.validationMessage).toBe("Weekends only");

    picker.setValue("2026-10-18");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input.validationMessage).toBe("");
  });

  it("clears the message when the validator returns an empty string", async () => {
    let answer = "Bad";
    const { picker, input } = await openPicker(() => answer);
    picker.setValue("2026-10-14");
    expect(input.validationMessage).toBe("Bad");

    answer = "";
    picker.setValue("2026-10-15");

    expect(input.validationMessage).toBe("");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("receives the DateValue on commit", async () => {
    const validate = vi.fn<Validate>(() => undefined);
    await openPicker(validate);

    clickDate("2026-10-20");
    clickConfirm();
    await flush();

    const received = validate.mock.calls.at(-1)?.[0];
    expect(received).toMatchObject({
      value: "2026-10-20",
      formatted: "10/20/2026",
    });
  });

  it("receives null after Clear", async () => {
    const validate = vi.fn<Validate>(() => undefined);
    const { picker } = await openPicker(validate, {
      ui: { clearButton: true },
    });
    picker.setValue("2026-10-14");
    expect(validate).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "2026-10-14" }),
    );

    clickSelector(".dp-ui__text-button--clear");
    await flush();

    expect(validate).toHaveBeenLastCalledWith(null);
    expect(picker.getValue()).toBeNull();
  });

  it("runs on typed input", async () => {
    const { picker, input, errors } = await openPicker(WEEKENDS_ONLY);

    input.value = "10/14/2026";
    input.dispatchEvent(new FocusEvent("blur"));
    await flush();

    expect(picker.getValue()).toMatchObject({ value: "2026-10-14" });
    expect(errors.map((e) => e.code)).toEqual(["invalid-value"]);
    expect(input.validationMessage).toBe("Weekends only");
  });

  it("a throwing validate emits no error and the commit works", async () => {
    const queued: (() => void)[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      queued.push(cb);
    });
    const boom = new Error("boom");
    const { picker, input, errors } = await openPicker(() => {
      throw boom;
    });
    const confirm = vi.fn();
    picker.on("confirm", confirm);

    clickDate("2026-10-14");
    clickConfirm();
    await flush();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(picker.getValue()).toMatchObject({ value: "2026-10-14" });
    expect(errors).toEqual([]);
    expect(input).not.toHaveAttribute("aria-invalid");
    const rethrow = queued.find((cb) => {
      try {
        cb();
      } catch (error) {
        return error === boom;
      }
      return false;
    });
    expect(rethrow).toBeDefined();
  });
});
