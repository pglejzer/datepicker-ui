import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import {
  cleanupDom,
  clickDate,
  flush,
  mountInput,
  surface,
} from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

interface Fixture {
  picker: DatepickerUI;
  onStart: ReturnType<typeof vi.fn>;
  onEnd: ReturnType<typeof vi.fn>;
  onDay: ReturnType<typeof vi.fn>;
}

const create = (
  ui: DatepickerOptions["ui"] = { inline: { enabled: true } },
  mode: "range" | "single" = "range",
): Fixture => {
  const input = mountInput();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const picker = new DatepickerUI(input, {
    calendar: { locale: "en-US", mode },
    ui:
      ui.inline?.enabled === true
        ? { ...ui, inline: { enabled: true, container } }
        : ui,
  });
  picker.create();
  const onStart = vi.fn();
  const onEnd = vi.fn();
  const onDay = vi.fn();
  picker.on("range:start", onStart);
  picker.on("range:end", onEnd);
  picker.on("select:day", onDay);
  return { picker, onStart, onEnd, onDay };
};

const withRange = (): Fixture => {
  const fixture = create();
  fixture.picker.setValue({ start: "2026-10-10", end: "2026-10-15" });
  return fixture;
};

describe("DatepickerUI.setActiveEnd", () => {
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

  it("end with a later date sets the end and keeps the start", () => {
    const { picker, onStart, onEnd } = withRange();
    picker.setActiveEnd("end");

    clickDate("2026-10-20");

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0][0]).toMatchObject({
      start: { value: "2026-10-10" },
      end: { value: "2026-10-20" },
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it("end with an earlier date starts a new range", () => {
    const { picker, onStart, onEnd } = withRange();
    picker.setActiveEnd("end");

    clickDate("2026-10-05");

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toMatchObject({
      value: { value: "2026-10-05" },
    });
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("start restarts the range at the picked date", () => {
    const { picker, onStart } = withRange();
    picker.setActiveEnd("start");

    clickDate("2026-10-12");

    expect(onStart.mock.calls[0][0]).toMatchObject({
      value: { value: "2026-10-12" },
    });
  });

  it("without setActiveEnd a pick starts a new range", () => {
    const { onStart, onEnd } = withRange();

    clickDate("2026-10-20");

    expect(onStart.mock.calls[0][0]).toMatchObject({
      value: { value: "2026-10-20" },
    });
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("moves the active end after each pick", () => {
    const { picker, onStart, onEnd } = withRange();
    picker.setActiveEnd("end");
    clickDate("2026-10-20");
    expect(onEnd).toHaveBeenCalledTimes(1);

    clickDate("2026-10-25");
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toMatchObject({
      value: { value: "2026-10-25" },
    });
    expect(onEnd).toHaveBeenCalledTimes(1);

    picker.setActiveEnd("end");
    clickDate("2026-10-28");
    expect(onEnd).toHaveBeenCalledTimes(2);
    expect(onEnd.mock.calls[1][0]).toMatchObject({
      start: { value: "2026-10-25" },
      end: { value: "2026-10-28" },
    });
  });

  it("is ignored in single mode and the day still selects", () => {
    const { picker, onDay } = create({ inline: { enabled: true } }, "single");

    expect(() => {
      picker.setActiveEnd("end");
    }).not.toThrow();
    clickDate("2026-10-20");

    expect(onDay).toHaveBeenCalledTimes(1);
  });

  it("ignores other values and calls after destroy", async () => {
    const { picker, onStart, onEnd } = withRange();

    expect(() => {
      picker.setActiveEnd("middle" as never);
    }).not.toThrow();
    clickDate("2026-10-20");
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();

    picker.destroy();
    await flush();
    expect(() => {
      picker.setActiveEnd("end");
    }).not.toThrow();
  });

  it("open() on a docked picker resets the active end to start", async () => {
    const { picker, onStart, onEnd } = create({ displayMode: "docked" });
    picker.setValue({ start: "2026-10-10", end: "2026-10-15" });
    picker.setActiveEnd("end");

    picker.open();
    await flush();
    expect(surface()).not.toBeNull();
    clickDate("2026-10-20");

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toMatchObject({
      value: { value: "2026-10-20" },
    });
    expect(onEnd).not.toHaveBeenCalled();
  });
});
