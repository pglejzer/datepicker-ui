import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type { ClearEventData, ConfirmEventData } from "@/types/types";
import {
  cleanupDom,
  clickDate,
  clickSelector,
  flush,
  mountInput,
  selectedCell,
  surfaces,
} from "../../helpers/picker";

interface Fixture {
  picker: DatepickerUI;
  input: HTMLInputElement;
  cleared: ClearEventData[];
  confirms: ConfirmEventData[];
  close: ReturnType<typeof vi.fn>;
  fired: { input: number; change: number };
  order: string[];
}

const build = (options: DatepickerOptions = {}, created = true): Fixture => {
  const input = mountInput({ name: "when" });
  const picker = new DatepickerUI(input, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
    ui: { displayMode: "docked", ...options.ui },
  });
  if (created) picker.create();
  const cleared: ClearEventData[] = [];
  const confirms: ConfirmEventData[] = [];
  const close = vi.fn();
  const order: string[] = [];
  picker.on("clear", (data) => {
    cleared.push(data);
    order.push("clear");
  });
  picker.on("confirm", (data) => {
    confirms.push(data);
    order.push("confirm");
  });
  picker.on("close", () => {
    close();
    order.push("close");
  });
  const fired = { input: 0, change: 0 };
  input.addEventListener("input", () => {
    fired.input += 1;
  });
  input.addEventListener("change", () => {
    fired.change += 1;
  });
  return { picker, input, cleared, confirms, close, fired, order };
};

const openWith = async (
  options: DatepickerOptions = {},
  value?: string,
): Promise<Fixture> => {
  const fixture = build(options);
  if (value !== undefined) fixture.picker.setValue(value);
  fixture.picker.open();
  await flush();
  return fixture;
};

const hiddenValue = (): string | undefined =>
  document.querySelector<HTMLInputElement>(".dp-ui__form-value")?.value;

describe("clear()", () => {
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

  describe("on a closed picker", () => {
    it("empties the value, the input and the hidden field", () => {
      const { picker, input } = build();
      picker.setValue("2026-10-05");
      expect(input.value).not.toBe("");
      expect(hiddenValue()).toBe("2026-10-05");

      picker.clear();

      expect(picker.getValue()).toBeNull();
      expect(input.value).toBe("");
      expect(hiddenValue()).toBe("");
    });

    it("fires input and change once each and emits clear with the old value", () => {
      const { picker, cleared, confirms, close, fired } = build();
      picker.setValue("2026-10-05");

      picker.clear();

      expect(fired).toEqual({ input: 1, change: 1 });
      expect(cleared).toHaveLength(1);
      expect(cleared[0].previousValue).toMatchObject({ value: "2026-10-05" });
      expect(confirms).toHaveLength(0);
      expect(close).not.toHaveBeenCalled();
    });

    it("emits nothing when there is nothing to clear", () => {
      const { picker, cleared, fired } = build();

      picker.clear();

      expect(cleared).toHaveLength(0);
      expect(fired).toEqual({ input: 0, change: 0 });
    });

    it("clears a range and reports the previous range", () => {
      const { picker, cleared } = build({ calendar: { mode: "range" } });
      picker.setValue({ start: "2026-10-20", end: "2026-10-24" });

      picker.clear();

      expect(picker.getValue()).toBeNull();
      expect(cleared[0].previousValue).toMatchObject({
        start: { value: "2026-10-20" },
        end: { value: "2026-10-24" },
      });
    });

    it("skips the form field and the change events before create()", () => {
      const { picker, input, cleared, fired } = build({}, false);
      picker.setValue("2026-10-05");

      expect(() => {
        picker.clear();
      }).not.toThrow();

      expect(picker.getValue()).toBeNull();
      expect(input.value).toBe("");
      expect(fired).toEqual({ input: 0, change: 0 });
      expect(cleared).toHaveLength(1);
    });
  });

  describe("on an open picker", () => {
    it("stays open with an empty draft and does not confirm", async () => {
      const { picker, input, cleared, confirms, close } = await openWith(
        {},
        "2026-10-05",
      );
      expect(selectedCell()?.dataset.date).toBe("2026-10-05");

      picker.clear();
      await flush();

      expect(surfaces()).toHaveLength(1);
      expect(selectedCell()).toBeNull();
      expect(picker.getValue()).toBeNull();
      expect(input.value).toBe("");
      expect(cleared).toHaveLength(1);
      expect(confirms).toHaveLength(0);
      expect(close).not.toHaveBeenCalled();
    });

    it("clears a draft that was never committed", async () => {
      const { picker, cleared, fired } = await openWith();
      clickDate("2026-10-20");
      expect(selectedCell()?.dataset.date).toBe("2026-10-20");

      picker.clear();
      await flush();

      expect(selectedCell()).toBeNull();
      expect(cleared).toHaveLength(1);
      expect(cleared[0].previousValue).toMatchObject({ value: "2026-10-20" });
      expect(fired.change).toBe(1);
      expect(surfaces()).toHaveLength(1);
    });

    it("reports a null previous value for a range that has only its start", async () => {
      const { picker, cleared } = await openWith({
        calendar: { mode: "range" },
      });
      clickDate("2026-10-20");

      picker.clear();
      await flush();

      expect(cleared).toHaveLength(1);
      expect(cleared[0].previousValue).toBeNull();
      expect(selectedCell()).toBeNull();
    });

    it("emits nothing when the value and the draft are both empty", async () => {
      const { picker, cleared, fired } = await openWith();

      picker.clear();
      await flush();

      expect(cleared).toHaveLength(0);
      expect(fired).toEqual({ input: 0, change: 0 });
    });
  });

  describe("Clear button", () => {
    it("emits clear, then confirm with null, then close", async () => {
      const { picker, input, cleared, confirms, order } = await openWith(
        { ui: { clearButton: true } },
        "2026-10-05",
      );

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(order).toEqual(["clear", "confirm", "close"]);
      expect(cleared[0].previousValue).toMatchObject({ value: "2026-10-05" });
      expect(confirms).toEqual([{ value: null, autoCommit: false }]);
      expect(picker.getValue()).toBeNull();
      expect(input.value).toBe("");
      expect(surfaces()).toHaveLength(0);
    });

    it("still confirms and closes without a clear event when nothing was set", async () => {
      const { cleared, confirms, close } = await openWith({
        ui: { clearButton: true },
      });

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(cleared).toHaveLength(0);
      expect(confirms).toEqual([{ value: null, autoCommit: false }]);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("with clearInput false reports the draft and keeps the value", async () => {
      const { picker, input, cleared, confirms, close } = await openWith(
        { ui: { clearButton: { clearInput: false } } },
        "2026-10-05",
      );
      const text = input.value;

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(cleared).toHaveLength(1);
      expect(cleared[0].previousValue).toMatchObject({ value: "2026-10-05" });
      expect(picker.getValue()).toMatchObject({ value: "2026-10-05" });
      expect(input.value).toBe(text);
      expect(selectedCell()).toBeNull();
      expect(confirms).toHaveLength(0);
      expect(close).not.toHaveBeenCalled();
      expect(surfaces()).toHaveLength(1);
    });

    it("with clearInput false a second click has no draft left to report", async () => {
      const { cleared } = await openWith(
        { ui: { clearButton: { clearInput: false } } },
        "2026-10-05",
      );

      clickSelector(".dp-ui__text-button--clear");
      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(cleared).toHaveLength(1);
    });
  });

  describe("callbacks.onClear", () => {
    it("fires with the clear payload", () => {
      const onClear = vi.fn();
      const { picker } = build({ callbacks: { onClear } });
      picker.setValue("2026-10-05");

      picker.clear();

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onClear.mock.calls[0][0]).toMatchObject({
        previousValue: { value: "2026-10-05" },
      });
    });

    it("fires for the Clear button too", async () => {
      const onClear = vi.fn();
      await openWith(
        { ui: { clearButton: true }, callbacks: { onClear } },
        "2026-10-05",
      );

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });
});
