import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type { ErrorEventData } from "@/types/types";
import {
  cleanupDom,
  clickConfirm,
  clickDate,
  flush,
  mountInput,
  surface,
} from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

const ACTIVE = "dp-ui__input--active";

interface Fixture {
  picker: DatepickerUI;
  start: HTMLInputElement;
  end: HTMLInputElement;
  errors: ErrorEventData[];
}

const create = (
  options: DatepickerOptions = {},
  endSelector = "#end",
): Fixture => {
  const start = mountInput({ id: "start", name: "trip-start" });
  const end = mountInput({ id: "end", name: "trip-end" });
  const picker = new DatepickerUI(start, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar, mode: "range" },
    ui: { displayMode: "docked", ...options.ui, endInput: endSelector },
  });
  picker.create();
  const errors: ErrorEventData[] = [];
  picker.on("error", (data) => errors.push(data));
  return { picker, start, end, errors };
};

const hiddenInputs = (): HTMLInputElement[] =>
  Array.from(
    document.querySelectorAll<HTMLInputElement>(
      "input[type='hidden'].dp-ui__form-value",
    ),
  );

const type = (field: HTMLInputElement, text: string): void => {
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
};

const blur = (field: HTMLInputElement): void => {
  field.dispatchEvent(new FocusEvent("blur"));
};

const press = (field: HTMLInputElement, key: string): void => {
  field.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

const pointerDown = (target: Element): void => {
  target.dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true, composed: true }),
  );
};

const openFrom = async (field: HTMLInputElement): Promise<void> => {
  field.click();
  await flush();
};

describe("range as two fields (ui.endInput)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    setViewportWidth(1024);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("value", () => {
    it("setValue writes each date into its field", () => {
      const { picker, start, end } = create();

      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });

      expect(start.value).toBe("10/20/2026");
      expect(end.value).toBe("11/03/2026");
    });

    it("moves each name to a hidden ISO input after its field", () => {
      const { picker, start, end } = create();

      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });

      expect(start).not.toHaveAttribute("name");
      expect(end).not.toHaveAttribute("name");
      const hidden = hiddenInputs();
      expect(hidden.map((field) => field.name)).toEqual([
        "trip-start",
        "trip-end",
      ]);
      expect(hidden.map((field) => field.value)).toEqual([
        "2026-10-20",
        "2026-11-03",
      ]);
      expect(start.nextElementSibling).toBe(hidden[0]);
      expect(end.nextElementSibling).toBe(hidden[1]);
    });

    it("reads an initial pair from both fields", () => {
      const start = mountInput({ id: "start", value: "10/20/2026" });
      mountInput({ id: "end", value: "11/03/2026" });
      const picker = new DatepickerUI(start, {
        calendar: { locale: "en-US", mode: "range" },
        ui: { endInput: "#end" },
      });
      picker.create();

      expect(picker.getValue()).toMatchObject({
        start: { value: "2026-10-20" },
        end: { value: "2026-11-03" },
      });
    });

    it("ignores an initial pair that is reversed", () => {
      const start = mountInput({ id: "start", value: "11/03/2026" });
      mountInput({ id: "end", value: "10/20/2026" });
      const picker = new DatepickerUI(start, {
        calendar: { locale: "en-US", mode: "range" },
        ui: { endInput: "#end" },
      });
      picker.create();

      expect(picker.getValue()).toBeNull();
    });
  });

  describe("opening", () => {
    it("opens from the End field and marks it active", async () => {
      const { start, end } = create();

      await openFrom(end);

      expect(surface()).not.toBeNull();
      expect(end).toHaveClass(ACTIVE);
      expect(start).not.toHaveClass(ACTIVE);
    });

    it("opens from the Start field and marks it active", async () => {
      const { start, end } = create();

      await openFrom(start);

      expect(surface()).not.toBeNull();
      expect(start).toHaveClass(ACTIVE);
      expect(end).not.toHaveClass(ACTIVE);
    });

    it("opens from the End field with Alt+ArrowDown", async () => {
      const { end } = create();

      end.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await flush();

      expect(surface()).not.toBeNull();
      expect(end).toHaveClass(ACTIVE);
    });

    it("clicking the other field while open keeps it open without cancel", async () => {
      const { picker, start, end } = create();
      const onCancel = vi.fn();
      const onClose = vi.fn();
      picker.on("cancel", onCancel);
      picker.on("close", onClose);
      await openFrom(start);

      pointerDown(end);
      end.click();
      await flush();

      expect(onCancel).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(surface()).not.toBeNull();
      expect(end).toHaveClass(ACTIVE);
      expect(start).not.toHaveClass(ACTIVE);
    });

    it("a press outside both fields still cancels", async () => {
      const { picker, start } = create();
      const onCancel = vi.fn();
      picker.on("cancel", onCancel);
      await openFrom(start);

      pointerDown(document.body);
      await flush();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("removes the active class when it closes", async () => {
      const { start, end } = create();
      await openFrom(end);

      pointerDown(document.body);
      await flush();

      expect(surface()).toBeNull();
      expect(start).not.toHaveClass(ACTIVE);
      expect(end).not.toHaveClass(ACTIVE);
    });
  });

  describe("fields wrapped in labels", () => {
    it("clicks inside the popover don't switch the active end back to Start", async () => {
      const startLabel = document.createElement("label");
      const endLabel = document.createElement("label");
      document.body.append(startLabel, endLabel);
      const start = mountInput({ id: "start", name: "trip-start" }, startLabel);
      const end = mountInput({ id: "end", name: "trip-end" }, endLabel);
      const picker = new DatepickerUI(start, {
        calendar: { locale: "en-US", mode: "range" },
        ui: { displayMode: "docked", endInput: "#end" },
      });
      picker.create();
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);

      pointerDown(end);
      end.click();
      await flush();
      expect(startLabel.contains(surface())).toBe(true);

      clickDate("2026-10-20");
      start.click();
      expect(end).toHaveClass(ACTIVE);

      clickDate("2026-10-25");
      start.click();
      expect(start).toHaveClass(ACTIVE);
      clickConfirm();
      await flush();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(start.value).toBe("10/20/2026");
      expect(end.value).toBe("10/25/2026");
    });
  });

  describe("picking", () => {
    it("a pick on or after the start updates the end and moves to Start", async () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);
      await openFrom(end);

      clickDate("2026-10-28");
      expect(start).toHaveClass(ACTIVE);
      expect(end).not.toHaveClass(ACTIVE);

      clickConfirm();
      await flush();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(start.value).toBe("10/20/2026");
      expect(end.value).toBe("10/28/2026");
      expect(hiddenInputs().map((field) => field.value)).toEqual([
        "2026-10-20",
        "2026-10-28",
      ]);
    });

    it("a pick before the start from End restarts at the picked day", async () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });
      await openFrom(end);

      clickDate("2026-10-12");

      expect(end).toHaveClass(ACTIVE);
      expect(start).not.toHaveClass(ACTIVE);
    });

    it("picking the start from Start makes End active", async () => {
      const { start, end } = create();
      await openFrom(start);

      clickDate("2026-10-12");

      expect(end).toHaveClass(ACTIVE);
      expect(start).not.toHaveClass(ACTIVE);

      clickDate("2026-10-15");
      expect(start).toHaveClass(ACTIVE);
    });
  });

  describe("typing", () => {
    it("a start alone commits nothing and reports nothing", () => {
      const { picker, start, errors } = create();
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);

      type(start, "10/20/2026");
      blur(start);

      expect(onConfirm).not.toHaveBeenCalled();
      expect(errors).toEqual([]);
      expect(picker.getValue()).toBeNull();
      expect(start).not.toHaveAttribute("aria-invalid");
    });

    it("an end alone commits nothing and reports nothing", () => {
      const { picker, end, errors } = create();
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);

      type(end, "10/25/2026");
      blur(end);

      expect(onConfirm).not.toHaveBeenCalled();
      expect(errors).toEqual([]);
      expect(picker.getValue()).toBeNull();
    });

    it("a full pair commits on blur", () => {
      const { picker, start, end, errors } = create();
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);

      type(start, "10/20/2026");
      blur(start);
      type(end, "11/03/2026");
      blur(end);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(errors).toEqual([]);
      expect(picker.getValue()).toMatchObject({
        start: { value: "2026-10-20" },
        end: { value: "2026-11-03" },
      });
      expect(hiddenInputs().map((field) => field.value)).toEqual([
        "2026-10-20",
        "2026-11-03",
      ]);
    });

    it("Enter commits a full pair", () => {
      const { picker, start, end } = create();
      type(start, "10/20/2026");
      type(end, "11/03/2026");

      press(end, "Enter");

      expect(picker.getValue()).toMatchObject({
        start: { value: "2026-10-20" },
        end: { value: "2026-11-03" },
      });
    });

    it("emptying both fields clears the value", () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });

      type(start, "");
      type(end, "");
      blur(end);

      expect(picker.getValue()).toBeNull();
      expect(hiddenInputs().map((field) => field.value)).toEqual(["", ""]);
    });

    it("an unparseable start is invalid-date on the start field", () => {
      const { start, end, errors } = create();

      type(start, "nope");
      type(end, "11/03/2026");
      blur(end);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ code: "invalid-date", input: "nope" });
      expect(start).toHaveAttribute("aria-invalid", "true");
      expect(end).not.toHaveAttribute("aria-invalid");
    });

    it("a reversed pair is invalid-date on the End field", () => {
      const { picker, start, end, errors } = create();

      type(start, "10/25/2026");
      type(end, "10/20/2026");
      blur(end);

      expect(errors).toEqual([
        {
          code: "invalid-date",
          message: "End date must be on or after the start date",
          input: "10/20/2026",
        },
      ]);
      expect(end).toHaveAttribute("aria-invalid", "true");
      expect(end.validationMessage).toBe(
        "End date must be on or after the start date",
      );
      expect(start).not.toHaveAttribute("aria-invalid");
      expect(picker.getValue()).toBeNull();
    });

    it("an unavailable pair reports unavailable-date with its reason", () => {
      const { picker, start, end, errors } = create({
        calendar: { maxDate: "2026-10-31" },
      });

      type(start, "10/20/2026");
      type(end, "11/03/2026");
      blur(end);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: "unavailable-date",
        reason: "max",
      });
      expect(end).toHaveAttribute("aria-invalid", "true");
      expect(picker.getValue()).toBeNull();
    });

    it("a corrected pair clears the error", () => {
      const { picker, start, end } = create();
      type(start, "10/25/2026");
      type(end, "10/20/2026");
      blur(end);
      expect(end).toHaveAttribute("aria-invalid", "true");

      type(end, "10/28/2026");
      blur(end);

      expect(end).not.toHaveAttribute("aria-invalid");
      expect(picker.getValue()).toMatchObject({
        end: { value: "2026-10-28" },
      });
    });
  });

  describe("destroy", () => {
    it("restores the names and classes and removes the hidden inputs", async () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });
      await openFrom(end);

      picker.destroy();
      await flush();

      expect(start).toHaveAttribute("name", "trip-start");
      expect(end).toHaveAttribute("name", "trip-end");
      expect(hiddenInputs()).toHaveLength(0);
      expect(start).not.toHaveClass(ACTIVE);
      expect(end).not.toHaveClass(ACTIVE);
      expect(end).not.toHaveAttribute("aria-invalid");
    });

    it("empties both fields unless keepInputValue is set", () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });

      picker.destroy();

      expect(start.value).toBe("");
      expect(end.value).toBe("");
    });

    it("keepInputValue keeps both fields", () => {
      const { picker, start, end } = create();
      picker.setValue({ start: "2026-10-20", end: "2026-11-03" });

      picker.destroy({ keepInputValue: true });

      expect(start.value).toBe("10/20/2026");
      expect(end.value).toBe("11/03/2026");
    });

    it("stops listening to the End field", async () => {
      const { picker, end } = create();
      picker.destroy();
      await flush();

      end.click();
      await flush();

      expect(surface()).toBeNull();
    });
  });

  describe("invalid ui.endInput", () => {
    const createMissing = (): {
      picker: DatepickerUI;
      start: HTMLInputElement;
      end: HTMLInputElement;
      errors: ErrorEventData[];
    } => {
      const start = mountInput({ id: "start", name: "trip-start" });
      const end = mountInput({ id: "end", name: "trip-end" });
      const errors: ErrorEventData[] = [];
      const picker = new DatepickerUI(start, {
        calendar: { locale: "en-US", mode: "range" },
        ui: { displayMode: "docked", endInput: "#missing" },
        callbacks: {
          onError: (data) => errors.push(data),
        },
      });
      picker.create();
      return { picker, start, end, errors };
    };

    it("reports invalid-option for ui.endInput", () => {
      const { errors } = createMissing();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        code: "invalid-option",
        option: "ui.endInput",
      });
    });

    it("reports invalid-option when the target is not an input", () => {
      const start = mountInput({ id: "start" });
      const div = document.createElement("div");
      div.id = "end";
      document.body.appendChild(div);
      const errors: ErrorEventData[] = [];
      const picker = new DatepickerUI(start, {
        calendar: { mode: "range" },
        ui: { endInput: "#end" },
        callbacks: { onError: (data) => errors.push(data) },
      });
      picker.create();

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ option: "ui.endInput" });
    });

    it("keeps the one-field picker working and leaves the other input alone", async () => {
      const { picker, start, end } = createMissing();
      const onConfirm = vi.fn();
      picker.on("confirm", onConfirm);

      await openFrom(start);
      clickDate("2026-10-20");
      clickDate("2026-10-28");
      clickConfirm();
      await flush();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(start.value).toBe("10/20/2026 – 10/28/2026");
      expect(end.value).toBe("");
      expect(end).toHaveAttribute("name", "trip-end");
      expect(end).not.toHaveClass(ACTIVE);
      expect(hiddenInputs()).toHaveLength(1);
    });
  });
});
