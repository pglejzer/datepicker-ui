import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import {
  cleanupDom,
  clickSelector,
  flush,
  mountInput,
  surface,
} from "../../../helpers/picker";
import { setViewportWidth } from "../../../helpers/viewport";

const ACTIVE_PAGE = ".dp-ui__page:not([inert])";

const open = async (options: DatepickerOptions = {}): Promise<DatepickerUI> => {
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", months: 2, ...options.calendar },
    ui: { displayMode: "docked", ...options.ui },
  });
  picker.create();
  picker.open();
  await flush();
  return picker;
};

const activePage = (): HTMLElement => {
  const page = document.querySelector<HTMLElement>(ACTIVE_PAGE);
  if (!page) {
    throw new Error("No active page");
  }
  return page;
};

const captions = (): string[] =>
  Array.from(
    activePage().querySelectorAll<HTMLElement>(
      "table.dp-ui__month-grid caption.dp-ui__month-subhead",
    ),
  ).map((caption) => caption.textContent);

describe("CalendarView with several months", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    setViewportWidth(1280);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  it("renders two captioned grids per page and marks the container", async () => {
    await open();

    expect(surface()).toHaveClass("dp-ui__container--multi-month");
    expect(surface()?.style.getPropertyValue("--dp-ui-visible-months")).toBe(
      "2",
    );
    expect(activePage().querySelectorAll(".dp-ui__months")).toHaveLength(1);
    expect(
      activePage().querySelectorAll(".dp-ui__months > table.dp-ui__month-grid"),
    ).toHaveLength(2);
    expect(captions()).toEqual(["October 2026", "November 2026"]);
    expect(
      activePage().querySelector('td[data-date="2026-10-17"]'),
    ).not.toBeNull();
    expect(
      activePage().querySelector('td[data-date="2026-11-30"]'),
    ).not.toBeNull();
  });

  it("gives every grid its own weekday row", async () => {
    await open();

    for (const grid of activePage().querySelectorAll(
      "table.dp-ui__month-grid",
    )) {
      expect(grid.querySelectorAll("th.dp-ui__weekday")).toHaveLength(7);
    }
  });

  it("renders no outside days even with ui.outsideDays", async () => {
    await open({ ui: { outsideDays: true } });

    expect(
      activePage().querySelector(".dp-ui__date--outside-month"),
    ).toBeNull();
    const dates = Array.from(
      activePage().querySelectorAll<HTMLElement>("td.dp-ui__date[data-date]"),
    ).map((cell) => cell.dataset.date);
    expect(dates).toHaveLength(31 + 30);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("pages two months at a time and announces both months", async () => {
    await open();

    clickSelector(".dp-ui__icon-button--next-month");
    await flush();

    expect(captions()).toEqual(["December 2026", "January 2027"]);
    const live = document.querySelector(".dp-ui__live-region")?.textContent;
    expect(live).toContain("December 2026");
    expect(live).toContain("January 2027");
  });

  it("pages one month at a time with pageBy month", async () => {
    await open({ calendar: { pageBy: "month" } });

    clickSelector(".dp-ui__icon-button--next-month");
    await flush();

    expect(captions()).toEqual(["November 2026", "December 2026"]);
  });

  it("falls back to one month when the window is too narrow", async () => {
    setViewportWidth(700);
    await open();

    expect(surface()).not.toHaveClass("dp-ui__container--multi-month");
    expect(surface()?.style.getPropertyValue("--dp-ui-visible-months")).toBe(
      "",
    );
    expect(
      activePage().querySelectorAll("table.dp-ui__month-grid"),
    ).toHaveLength(1);
  });

  it("is one month in a modal even on a wide window", async () => {
    await open({ ui: { displayMode: "modal" } });

    expect(surface()).not.toHaveClass("dp-ui__container--multi-month");
    expect(
      activePage().querySelectorAll("table.dp-ui__month-grid"),
    ).toHaveLength(1);
  });

  it("clamps the first month so the max month stays the second one", async () => {
    await open({ calendar: { maxDate: "2026-12-31" } });

    clickSelector(".dp-ui__icon-button--next-month");
    await flush();

    expect(captions()).toEqual(["November 2026", "December 2026"]);
  });
});
