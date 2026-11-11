import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import { cleanupDom, flush, mountInput, surface } from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

const ACTIVE_PAGE = ".dp-ui__page:not([inert])";

const open = async (options: DatepickerOptions): Promise<DatepickerUI> => {
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", weekStart: "sunday", ...options.calendar },
  });
  picker.create();
  picker.open();
  await flush();
  return picker;
};

const rows = (): number =>
  document.querySelectorAll(`${ACTIVE_PAGE} table.dp-ui__month-grid tbody tr`)
    .length;

describe("ui.layout on the popover and the dialog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
    setViewportWidth(1280);
  });

  afterEach(() => {
    DatepickerUI.destroyAll();
    cleanupDom();
    vi.useRealTimers();
  });

  it('gives a dialog the docked look with "docked"', async () => {
    await open({ ui: { displayMode: "modal", layout: "docked" } });
    const dialog = document.querySelector(".dp-ui__dialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.querySelector(".dp-ui__header--docked")).not.toBeNull();
    expect(dialog?.querySelector(".dp-ui__menu-button--month")).not.toBeNull();
    expect(dialog?.querySelector(".dp-ui__calendar--modal")).toBeNull();
    expect(dialog?.querySelector(".dp-ui__header--modal")).toBeNull();
    expect(
      dialog?.querySelector(".dp-ui__icon-button--switch-view"),
    ).toBeNull();
    expect(rows()).toBe(5);
  });

  it("shows several months in a wide dialog with the docked look", async () => {
    await open({
      calendar: { months: 2 },
      ui: { displayMode: "modal", layout: "docked" },
    });
    expect(surface()).toHaveClass("dp-ui__container--multi-month");
  });

  it('gives the popover the modal look with "modal"', async () => {
    await open({ ui: { displayMode: "docked", layout: "modal" } });
    const root = surface();
    expect(root).toHaveClass("dp-ui__container--docked");
    expect(root?.querySelector(".dp-ui__calendar--modal")).not.toBeNull();
    expect(root?.querySelector(".dp-ui__header--modal")).not.toBeNull();
    expect(
      root?.querySelector(".dp-ui__icon-button--switch-view"),
    ).not.toBeNull();
    expect(rows()).toBe(6);
  });

  it('opens a range dialog full screen at every width with "fullscreen"', async () => {
    await open({
      calendar: { mode: "range" },
      ui: { displayMode: "modal", layout: "fullscreen" },
    });
    expect(surface()).toHaveClass("dp-ui__container--fullscreen");
  });

  it('keeps a small range dialog out of full screen with "docked"', async () => {
    setViewportWidth(400);
    await open({
      calendar: { mode: "range" },
      ui: { displayMode: "modal", layout: "docked" },
    });
    expect(surface()).not.toHaveClass("dp-ui__container--fullscreen");
    expect(document.querySelector(".dp-ui__calendar--modal")).toBeNull();
  });

  it("keeps the old looks with auto", async () => {
    await open({ ui: { displayMode: "modal" } });
    expect(document.querySelector(".dp-ui__calendar--modal")).not.toBeNull();
    DatepickerUI.destroyAll();
    cleanupDom();
    await open({ ui: { displayMode: "docked" } });
    expect(document.querySelector(".dp-ui__header--docked")).not.toBeNull();
  });

  it("remounts an open dialog when setOptions() changes ui.layout", async () => {
    const picker = await open({ ui: { displayMode: "modal" } });
    expect(document.querySelector(".dp-ui__header--modal")).not.toBeNull();
    picker.setOptions({ ui: { layout: "docked" } });
    await flush();
    expect(document.querySelector(".dp-ui__header--modal")).toBeNull();
    expect(document.querySelector(".dp-ui__header--docked")).not.toBeNull();
    expect(document.querySelectorAll(".dp-ui__container")).toHaveLength(1);
  });

  it("remounts an open popover when setOptions() changes ui.layout", async () => {
    const picker = await open({ ui: { displayMode: "docked" } });
    picker.setOptions({ ui: { layout: "modal" } });
    await flush();
    expect(surface()).toHaveClass("dp-ui__container--docked");
    expect(document.querySelector(".dp-ui__header--modal")).not.toBeNull();
  });
});
