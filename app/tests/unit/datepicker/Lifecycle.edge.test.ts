import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import {
  cleanupDom,
  clickConfirm,
  clickDate,
  flush,
  mountInput,
  surface,
  surfaces,
} from "../../helpers/picker";

const PUBLIC_EVENTS = [
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
] as const;

interface CountingEmitter {
  listenerCount(event: string): number;
}

const isCountingEmitter = (value: unknown): value is CountingEmitter =>
  typeof value === "object" &&
  value !== null &&
  "listenerCount" in value &&
  typeof value.listenerCount === "function";

const findPublicEmitter = (root: object): CountingEmitter => {
  const seen = new WeakSet();
  const candidates: CountingEmitter[] = [];
  const walk = (node: object, depth: number): void => {
    if (seen.has(node) || depth > 3) {
      return;
    }
    seen.add(node);
    if (isCountingEmitter(node)) {
      candidates.push(node);
    }
    for (const value of Object.values(node) as unknown[]) {
      if (typeof value === "object" && value !== null) {
        walk(value, depth + 1);
      }
    }
  };
  walk(root, 0);
  const found = candidates.find((c) => c.listenerCount("confirm") > 0);
  if (!found) {
    throw new Error("Public event emitter not reachable from the instance");
  }
  return found;
};

const firePointer = (
  target: EventTarget,
  type: string,
  x: number,
  y: number,
): void => {
  const init = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
  };
  target.dispatchEvent(
    typeof PointerEvent === "undefined"
      ? new MouseEvent(type, init)
      : new PointerEvent(type, init),
  );
};

describe("Lifecycle edge cases", () => {
  let windowErrors: ErrorEvent[];
  const onWindowError = (event: ErrorEvent): void => {
    windowErrors.push(event);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    windowErrors = [];
    window.addEventListener("error", onWindowError);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    window.removeEventListener("error", onWindowError);
    cleanupDom();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const create = (
    options: ConstructorParameters<typeof DatepickerUI>[1] = {},
  ): DatepickerUI => {
    const p = new DatepickerUI(mountInput(), {
      ...options,
      ui: { displayMode: "docked", ...options.ui },
    });
    p.create();
    return p;
  };

  it("open() twice leaves exactly one surface", async () => {
    const p = create();
    p.open();
    p.open();
    await flush();
    p.open();
    await flush();

    expect(surfaces()).toHaveLength(1);
  });

  it("close() during the enter motion does not throw and removes the one surface", async () => {
    const p = create();
    p.open();

    expect(() => {
      p.close();
    }).not.toThrow();
    await flush();

    expect(surfaces()).toHaveLength(0);
    expect(windowErrors).toHaveLength(0);
  });

  it("close() twice emits close once", async () => {
    const p = create();
    const close = vi.fn();
    p.on("close", close);
    p.open();
    await flush();

    p.close();
    p.close();
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(surfaces()).toHaveLength(0);
  });

  it("destroy() while open removes the surface and every public listener", async () => {
    const p = create();
    for (const event of PUBLIC_EVENTS) {
      p.on(event, () => undefined);
    }
    const emitter = findPublicEmitter(p);
    p.open();
    await flush();
    expect(surfaces()).toHaveLength(1);

    p.destroy();
    await flush();

    expect(surfaces()).toHaveLength(0);
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
    for (const event of PUBLIC_EVENTS) {
      expect(emitter.listenerCount(event)).toBe(0);
    }
    expect(p.isDestroyed).toBe(true);
    expect(windowErrors).toHaveLength(0);
  });

  it("destroy() while a modal is open also removes the dialog", async () => {
    const p = create({ ui: { displayMode: "modal" } });
    p.open();
    await flush();
    expect(document.querySelector("dialog.dp-ui__dialog")).not.toBeNull();

    p.destroy();
    await flush();

    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
  });

  it("destroy() mid-drag, then pointerup on document, does not throw", async () => {
    const p = create({ ui: { swipe: true } });
    p.open();
    await flush();
    const pager = document.querySelector<HTMLElement>(".dp-ui__pager");
    expect(pager).not.toBeNull();
    if (!pager) {
      return;
    }

    firePointer(pager, "pointerdown", 200, 100);
    firePointer(pager, "pointermove", 160, 100);
    firePointer(pager, "pointermove", 120, 100);

    p.destroy();

    expect(() => {
      firePointer(document, "pointermove", 100, 100);
      firePointer(document, "pointerup", 100, 100);
    }).not.toThrow();
    await flush();

    expect(windowErrors).toHaveLength(0);
    expect(surfaces()).toHaveLength(0);
  });

  it("setOptions({ ui: { theme } }) while open re-themes the surface and emits update once", async () => {
    const p = create();
    const update = vi.fn();
    p.on("update", update);
    p.open();
    await flush();
    expect(surface()).toHaveAttribute("data-theme", "basic");

    p.setOptions({ ui: { theme: "m2" } });
    await flush();

    expect(surfaces()).toHaveLength(1);
    expect(surface()).toHaveAttribute("data-theme", "m2");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("setOptions changing displayMode while open leaves one surface", async () => {
    const p = create();
    p.open();
    await flush();

    p.setOptions({ ui: { displayMode: "modal" } });
    await flush();

    expect(document.querySelectorAll("dialog.dp-ui__dialog")).toHaveLength(1);
    expect(surfaces()).toHaveLength(1);
  });

  it("setOptions({ calendar: { mode } }) while open resets the value and keeps one surface", async () => {
    const input = mountInput();
    const p = new DatepickerUI(input, {
      ui: { displayMode: "docked" },
      calendar: { locale: "en-US" },
    });
    p.create();
    p.setValue("2026-10-05");
    p.open();
    await flush();
    expect(input.value).not.toBe("");

    expect(() => {
      p.setOptions({ calendar: { mode: "range" } });
    }).not.toThrow();
    await flush();

    expect(p.getValue()).toBeNull();
    expect(input.value).toBe("");
    expect(surfaces()).toHaveLength(1);
    expect(document.querySelectorAll(".dp-ui__container")).toHaveLength(1);
    expect(surface()).toHaveClass("dp-ui__container--range");
    expect(windowErrors).toHaveLength(0);
  });

  it("setOptions({ calendar: { mode } }) also clears the hidden form value", async () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const p = new DatepickerUI(mountInput({ name: "when" }, form), {
      ui: { displayMode: "docked" },
    });
    p.create();
    p.setValue("2026-10-05");
    const hidden = form.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(hidden?.value).toBe("2026-10-05");

    p.setOptions({ calendar: { mode: "multiple" } });
    await flush();

    expect(hidden?.value).toBe("");
  });

  it("range: select:day emits range:start, then range:end with the right payloads", async () => {
    const p = create({ calendar: { mode: "range", locale: "en-US" } });
    const log: string[] = [];
    const days: { value: string; selected: boolean }[] = [];
    let start = "";
    let end: { start: string; end: string } | null = null;
    p.on("select:day", (data) => {
      log.push("select:day");
      days.push({ value: data.value.value, selected: data.selected });
    });
    p.on("range:start", (data) => {
      log.push("range:start");
      start = data.value.value;
    });
    p.on("range:end", (data) => {
      log.push("range:end");
      end = { start: data.start.value, end: data.end.value };
    });
    p.open();
    await flush();

    clickDate("2026-10-20");
    clickDate("2026-10-28");
    await flush();

    expect(log).toEqual([
      "select:day",
      "range:start",
      "select:day",
      "range:end",
    ]);
    expect(days).toEqual([
      { value: "2026-10-20", selected: true },
      { value: "2026-10-28", selected: true },
    ]);
    expect(start).toBe("2026-10-20");
    expect(end).toEqual({ start: "2026-10-20", end: "2026-10-28" });
  });

  it("multiple: clicking a selected date emits select:day with selected false", async () => {
    const p = create({ calendar: { mode: "multiple" } });
    const selected: boolean[] = [];
    p.on("select:day", (data) => selected.push(data.selected));
    p.open();
    await flush();

    clickDate("2026-10-20");
    clickDate("2026-10-20");

    expect(selected).toEqual([true, false]);
  });

  it("range: confirm with only a start does nothing", async () => {
    const p = create({ calendar: { mode: "range" } });
    const confirm = vi.fn();
    p.on("confirm", confirm);
    p.open();
    await flush();

    clickDate("2026-10-20");
    document
      .querySelector<HTMLElement>(
        ".dp-ui__text-button--confirm, .dp-ui__text-button--save",
      )
      ?.click();
    await flush();

    expect(confirm).not.toHaveBeenCalled();
    expect(p.getValue()).toBeNull();
  });

  it("callbacks bound before setOptions fire once, not twice, afterwards", async () => {
    const onConfirm = vi.fn();
    const p = create({ callbacks: { onConfirm } });
    p.setOptions({ ui: { theme: "m2" } });
    p.open();
    await flush();
    clickDate("2026-10-20");
    clickConfirm();
    await flush();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("never calls console.log, console.warn or console.error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const p = create();
    p.open();
    p.open();
    await flush();
    clickDate("2026-10-20");
    clickConfirm();
    await flush();
    p.open();
    p.close();
    await flush();
    p.setValue("2026-03-04");
    p.setOptions({ ui: { theme: "m2" } });
    p.open();
    await flush();
    p.destroy();
    await flush();

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
