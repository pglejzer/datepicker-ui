import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import { cleanupDom, clickDate, flush, mountInput } from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

interface Fixture {
  picker: DatepickerUI;
  input: HTMLInputElement;
  onSelectDay: ReturnType<typeof vi.fn>;
  onRangeStart: ReturnType<typeof vi.fn>;
  onRangeEnd: ReturnType<typeof vi.fn>;
  onConfirm: ReturnType<typeof vi.fn>;
  onChange: ReturnType<typeof vi.fn>;
}

const create = async (
  options: DatepickerOptions,
  inline: boolean,
): Promise<Fixture> => {
  const input = mountInput();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const ui = options.ui ?? {};
  const picker = new DatepickerUI(input, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
    ui: {
      format: "yyyy-MM-dd",
      ...ui,
      ...(inline ? { inline: { enabled: true, container } } : {}),
    },
  });
  const onSelectDay = vi.fn();
  const onRangeStart = vi.fn();
  const onRangeEnd = vi.fn();
  const onConfirm = vi.fn();
  const onChange = vi.fn();
  picker.on("select:day", onSelectDay);
  picker.on("range:start", onRangeStart);
  picker.on("range:end", onRangeEnd);
  picker.on("confirm", onConfirm);
  input.addEventListener("change", onChange);
  picker.create();
  if (!inline) {
    picker.open();
  }
  await flush();
  picker.setView("input");
  await flush();
  return {
    picker,
    input,
    onSelectDay,
    onRangeStart,
    onRangeEnd,
    onConfirm,
    onChange,
  };
};

const field = (index: number): HTMLInputElement => {
  const element = Array.from(
    document.querySelectorAll<HTMLInputElement>(".dp-ui__text-field-input"),
  ).at(index);
  if (!element) {
    throw new Error(`No text field ${String(index)}`);
  }
  return element;
};

const type = (target: HTMLInputElement, text: string): void => {
  target.value = text;
  target.dispatchEvent(new Event("change"));
};

const enter = (target: HTMLElement): void => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
};

const inlineModal = (ui: NonNullable<DatepickerOptions["ui"]> = {}) => ({
  ui: { layout: "modal" as const, ...ui },
});

describe("typed dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
    setViewportWidth(1280);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("events (P66)", () => {
    it("emits select:day once for a typed single date and does not commit", async () => {
      const f = await create(inlineModal(), true);

      type(field(0), "2026-10-24");
      enter(field(0));

      expect(f.onSelectDay).toHaveBeenCalledTimes(1);
      expect(f.onSelectDay.mock.calls[0][0]).toMatchObject({
        selected: true,
        value: { value: "2026-10-24" },
      });
      expect(f.onConfirm).not.toHaveBeenCalled();
      expect(f.picker.getValue()).toBeNull();
    });

    it("emits nothing for an invalid, disabled or emptied field", async () => {
      const f = await create(
        { ...inlineModal(), calendar: { maxDate: "2026-10-22" } },
        true,
      );

      type(field(0), "2026-13-40");
      type(field(0), "2026-10-24");
      type(field(0), "");

      expect(f.onSelectDay).not.toHaveBeenCalled();
    });

    it("emits range:start, then range:end for typed range ends", async () => {
      const f = await create({ calendar: { mode: "range" } }, true);

      type(field(0), "2026-10-05");
      expect(f.onRangeStart).toHaveBeenCalledTimes(1);
      expect(f.onRangeStart.mock.calls[0][0]).toMatchObject({
        value: { value: "2026-10-05" },
      });

      type(field(1), "2026-10-09");
      expect(f.onRangeEnd).toHaveBeenCalledTimes(1);
      expect(f.onRangeEnd.mock.calls[0][0]).toMatchObject({
        start: { value: "2026-10-05" },
        end: { value: "2026-10-09" },
      });
    });

    it("commits a typed date on blur with commitOnChange", async () => {
      const f = await create(
        { ...inlineModal(), behavior: { commitOnChange: true } },
        true,
      );

      type(field(0), "2026-10-24");

      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: true }),
      );
      expect(f.picker.getValue()).toEqual(
        expect.objectContaining({ value: "2026-10-24" }),
      );
      expect(f.onChange).toHaveBeenCalled();
    });
  });

  describe("Enter (P65)", () => {
    it("does not commit an inline modal single without a footer", async () => {
      const f = await create(inlineModal(), true);

      type(field(0), "2026-10-24");
      enter(field(0));

      expect(f.onConfirm).not.toHaveBeenCalled();
      expect(f.onChange).not.toHaveBeenCalled();
      expect(f.input.value).toBe("");
    });

    it("confirms an inline modal single with ui.footer", async () => {
      const f = await create(inlineModal({ footer: true }), true);

      type(field(0), "2026-10-24");
      enter(field(0));

      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: false }),
      );
      expect(f.input.value).toBe("2026-10-24");
    });

    it("does not commit an inline range by default", async () => {
      const f = await create({ calendar: { mode: "range" } }, true);

      type(field(0), "2026-10-05");
      type(field(1), "2026-10-09");
      enter(field(1));

      expect(f.onRangeEnd).toHaveBeenCalledTimes(1);
      expect(f.onConfirm).not.toHaveBeenCalled();
    });

    it("does not commit a typed range start alone with commitOnChange", async () => {
      const f = await create(
        { calendar: { mode: "range" }, behavior: { commitOnChange: true } },
        true,
      );

      type(field(0), "2026-10-05");

      expect(f.onRangeStart).toHaveBeenCalledTimes(1);
      expect(f.onConfirm).not.toHaveBeenCalled();
    });

    it.each([
      ["closeOnSelect", { closeOnSelect: true }],
      ["commitOnChange", { commitOnChange: true }],
    ])("commits an inline range once with %s", async (_name, behavior) => {
      const f = await create({ calendar: { mode: "range" }, behavior }, true);

      type(field(0), "2026-10-05");
      type(field(1), "2026-10-09");
      enter(field(1));

      expect(f.onConfirm).toHaveBeenCalledTimes(1);
      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: true }),
      );
      expect(f.picker.getValue()).not.toBeNull();
    });

    it("confirms and closes a dialog single with its footer", async () => {
      const f = await create({ ui: { displayMode: "modal" } }, false);

      type(field(0), "2026-10-24");
      enter(field(0));
      await flush();

      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: false }),
      );
      expect(document.querySelector("dialog[open]")).toBeNull();
    });

    it("confirms and closes a dialog range with its footer", async () => {
      const f = await create(
        { calendar: { mode: "range" }, ui: { displayMode: "modal" } },
        false,
      );

      type(field(0), "2026-10-05");
      type(field(1), "2026-10-09");
      enter(field(1));
      await flush();

      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: false }),
      );
      expect(document.querySelector("dialog[open]")).toBeNull();
    });

    it("commits and closes a footerless dialog with closeOnSelect", async () => {
      const f = await create(
        {
          ui: { displayMode: "modal", footer: false },
          behavior: { closeOnSelect: true },
        },
        false,
      );

      type(field(0), "2026-10-24");
      enter(field(0));
      await flush();

      expect(f.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ autoCommit: true }),
      );
      expect(document.querySelector("dialog[open]")).toBeNull();
    });

    it("selects instead of confirming on Enter over the selected day inline", async () => {
      const f = await create(inlineModal(), true);
      f.picker.setView("calendar");
      await flush();

      clickDate("2026-10-24");
      const cell = document.querySelector<HTMLElement>(
        'td.dp-ui__date[data-date="2026-10-24"]',
      );
      if (!cell) {
        throw new Error("No cell for 2026-10-24");
      }
      enter(cell);

      expect(f.onConfirm).not.toHaveBeenCalled();
      expect(f.onChange).not.toHaveBeenCalled();
    });
  });
});
