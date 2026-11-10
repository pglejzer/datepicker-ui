import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import { cleanupDom, flush, mountInput } from "../../helpers/picker";
import { setViewportSize } from "../../helpers/viewport";

const CONTAINER_HEIGHT = 624;

const popoverContainer = (): Element | null =>
  document.querySelector(".dp-ui__container[popover]");

const dialogContainer = (): Element | null =>
  document.querySelector("dialog.dp-ui__dialog .dp-ui__container");

const create = (options: DatepickerOptions = {}): DatepickerUI => {
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", mode: "range", ...options.calendar },
    ui: { displayMode: "auto", ...options.ui },
  });
  picker.create();
  return picker;
};

describe("auto display mode falls back to the dialog when docked does not fit", () => {
  const originalHeight = window.innerHeight;
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element): DOMRect {
        return this.classList.contains("dp-ui__container")
          ? new DOMRect(0, 0, 0, CONTAINER_HEIGHT)
          : new DOMRect();
      },
    );
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.restoreAllMocks();
    setViewportSize(originalWidth, originalHeight);
    vi.useRealTimers();
  });

  it("opens a dialog in a 1280 x 600 window and leaves no popover", async () => {
    setViewportSize(1280, 600);
    const picker = create();

    picker.open();
    await flush();

    expect(dialogContainer()).not.toBeNull();
    expect(popoverContainer()).toBeNull();
    expect(document.querySelector("[popover]")).toBeNull();
  });

  it("emits open once, with the modal mode", async () => {
    setViewportSize(1280, 600);
    const picker = create();
    const onOpen = vi.fn();
    picker.on("open", onOpen);

    picker.open();
    await flush();

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ mode: "modal" });
  });

  it("emits navigate with the open source once", async () => {
    setViewportSize(1280, 600);
    const picker = create();
    const onNavigate = vi.fn();
    picker.on("navigate", onNavigate);

    picker.open();
    await flush();

    const opened = onNavigate.mock.calls.filter(
      ([data]) => (data as { source: string }).source === "open",
    );
    expect(opened).toHaveLength(1);
  });

  it("stays docked in a 1280 x 900 window", async () => {
    setViewportSize(1280, 900);
    const picker = create();
    const onOpen = vi.fn();
    picker.on("open", onOpen);

    picker.open();
    await flush();

    expect(popoverContainer()).not.toBeNull();
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
    expect(onOpen).toHaveBeenCalledWith({ mode: "docked" });
  });

  it("a forced docked mode stays docked at 600 px", async () => {
    setViewportSize(1280, 600);
    const picker = create({ ui: { displayMode: "docked" } });
    const onOpen = vi.fn();
    picker.on("open", onOpen);

    picker.open();
    await flush();

    expect(popoverContainer()).not.toBeNull();
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
    expect(onOpen).toHaveBeenCalledWith({ mode: "docked" });
  });

  it("closes cleanly after the fallback", async () => {
    setViewportSize(1280, 600);
    const picker = create();
    const onClose = vi.fn();
    picker.on("close", onClose);

    picker.open();
    await flush();
    picker.close();
    await flush();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
    expect(document.querySelector(".dp-ui__container")).toBeNull();
  });

  it("checks again on the next open", async () => {
    setViewportSize(1280, 600);
    const picker = create();
    picker.open();
    await flush();
    expect(dialogContainer()).not.toBeNull();
    picker.close();
    await flush();

    setViewportSize(1280, 900);
    picker.open();
    await flush();
    expect(popoverContainer()).not.toBeNull();
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
    picker.close();
    await flush();

    setViewportSize(1280, 600);
    picker.open();
    await flush();
    expect(dialogContainer()).not.toBeNull();
    expect(popoverContainer()).toBeNull();
  });

  it("opens a dialog when the field leaves room on neither side", async () => {
    setViewportSize(1280, 936);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element): DOMRect {
        if (this.classList.contains("dp-ui__container")) {
          return new DOMRect(0, 0, 0, 831);
        }
        return this instanceof HTMLInputElement
          ? new DOMRect(0, 449, 200, 38)
          : new DOMRect();
      },
    );
    const picker = create();

    picker.open();
    await flush();

    expect(dialogContainer()).not.toBeNull();
    expect(popoverContainer()).toBeNull();
  });

  it("works for a single picker too", async () => {
    setViewportSize(1280, 600);
    const picker = create({ calendar: { mode: "single" } });

    picker.open();
    await flush();

    expect(dialogContainer()).not.toBeNull();
    expect(popoverContainer()).toBeNull();
  });
});
