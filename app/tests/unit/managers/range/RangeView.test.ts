import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type { RangeEndEventData, RangeStartEventData } from "@/types/types";
import {
  clickDate,
  clickSelector,
  cleanupDom,
  flush,
  mountInput,
  surface,
} from "../../../helpers/picker";
import { setViewportWidth } from "../../../helpers/viewport";

const RANGE_SEP = " – ";

const open = async (
  options: DatepickerOptions = {},
  setup?: (p: DatepickerUI) => void,
): Promise<DatepickerUI> => {
  const p = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", ...options.calendar, mode: "range" },
    ui: { displayMode: "docked", ...options.ui },
  });
  p.create();
  setup?.(p);
  p.open();
  await flush();
  return p;
};

const cell = (iso: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`td.dp-ui__date[data-date="${iso}"]`);

const cells = (selector: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));

const headline = (): string | null | undefined =>
  document.querySelector(".dp-ui__headline")?.textContent;

const captions = (): string[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      ".dp-ui__month-list caption.dp-ui__month-subhead",
    ),
  ).map((caption) => caption.textContent);

const confirmButtons = (): HTMLButtonElement[] =>
  cells(
    ".dp-ui__text-button--confirm, .dp-ui__text-button--save",
  ) as HTMLButtonElement[];

const press = (target: Element, key: string): void => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

describe("RangeView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    setViewportWidth(1024);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  describe("structure", () => {
    it("adds --range to the container and renders the weekday bar", async () => {
      await open();
      expect(surface()).toHaveClass("dp-ui__container--range");
      const bar = document.querySelector(".dp-ui__weekdays-bar");
      expect(bar).toHaveAttribute("aria-hidden", "true");
      expect(bar?.querySelectorAll("span.dp-ui__weekday")).toHaveLength(7);
      expect(
        document.querySelector(".dp-ui__range .dp-ui__month-list"),
      ).not.toBeNull();
    });

    it("renders month tables without outside days or week numbers", async () => {
      await open({ ui: { weekNumbers: true, outsideDays: true } });
      expect(
        document.querySelectorAll(".dp-ui__month-list table").length,
      ).toBeGreaterThan(1);
      expect(document.querySelector(".dp-ui__date--outside-month")).toBeNull();
      expect(
        document.querySelector(
          ".dp-ui__month-list .dp-ui__week-number, .dp-ui__month-list th.dp-ui__week-number",
        ),
      ).toBeNull();
    });

    it("shows an empty headline as Start - End", async () => {
      await open();
      expect(headline()).toBe(`Start${RANGE_SEP}End`);
    });
  });

  describe("several months", () => {
    beforeEach(() => {
      setViewportWidth(1280);
    });

    it("docked: a two month row instead of the vertical list", async () => {
      await open({ calendar: { months: 2 } });

      expect(document.querySelector(".dp-ui__month-list")).toBeNull();
      expect(surface()).toHaveClass("dp-ui__container--multi-month");
      const row = document.querySelector(
        ".dp-ui__range .dp-ui__navigation--months",
      );
      expect(row).not.toBeNull();
      expect(
        row?.querySelector(".dp-ui__icon-button--prev-month"),
      ).not.toBeNull();
      expect(
        row?.querySelector(".dp-ui__icon-button--next-month"),
      ).not.toBeNull();
      expect(
        document.querySelectorAll(
          ".dp-ui__page:not([inert]) .dp-ui__months table",
        ),
      ).toHaveLength(2);
    });

    it("docked: marks a range across the month boundary", async () => {
      await open({ calendar: { months: 2 } });

      clickDate("2026-10-30");
      clickDate("2026-11-02");
      await flush();

      expect(cell("2026-10-30")).toHaveClass("dp-ui__date--range-start");
      expect(cell("2026-10-31")).toHaveClass("dp-ui__date--in-range");
      expect(cell("2026-11-01")).toHaveClass("dp-ui__date--in-range");
      expect(cell("2026-11-02")).toHaveClass("dp-ui__date--range-end");
      expect(cells(".dp-ui__date--in-range")).toHaveLength(2);
      expect(headline()).toBe(`Oct 30${RANGE_SEP}Nov 2`);
    });

    it("docked: the row arrows page two months", async () => {
      await open({ calendar: { months: 2 } });

      clickSelector(
        ".dp-ui__navigation--months .dp-ui__icon-button--next-month",
      );
      await flush();

      const heads = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".dp-ui__page:not([inert]) caption.dp-ui__month-subhead",
        ),
      ).map((caption) => caption.textContent);
      expect(heads).toEqual(["December 2026", "January 2027"]);
    });

    it("docked: one month keeps the vertical list on a narrow window", async () => {
      setViewportWidth(700);
      await open({ calendar: { months: 2 } });

      expect(document.querySelector(".dp-ui__month-list")).not.toBeNull();
      expect(document.querySelector(".dp-ui__navigation--months")).toBeNull();
      expect(surface()).not.toHaveClass("dp-ui__container--multi-month");
    });

    it("modal: keeps the vertical list", async () => {
      await open({ calendar: { months: 2 }, ui: { displayMode: "modal" } });

      expect(surface()).toHaveClass("dp-ui__container--modal");
      expect(document.querySelector(".dp-ui__month-list")).not.toBeNull();
      expect(document.querySelector(".dp-ui__navigation--months")).toBeNull();
      expect(surface()).not.toHaveClass("dp-ui__container--multi-month");
    });
  });

  describe("initial month", () => {
    it("renders today's month when there is no value", async () => {
      await open();
      expect(captions().some((text) => text.includes("October"))).toBe(true);
      expect(
        document.querySelector(
          '.dp-ui__month-list td.dp-ui__date[data-date="2026-10-17"]',
        ),
      ).not.toBeNull();
    });

    it("renders the start month when a value is set", async () => {
      await open({}, (p) => {
        p.setValue({ start: "2026-03-10", end: "2026-03-14" });
      });
      expect(captions().some((text) => text.includes("March"))).toBe(true);
      const start = document.querySelector(
        '.dp-ui__month-list td.dp-ui__date[data-date="2026-03-10"]',
      );
      expect(start).toHaveClass("dp-ui__date--range-start");
    });
  });

  describe("selection", () => {
    it("marks start, end and seven in-range cells for Oct 20 - Oct 28", async () => {
      await open();
      clickDate("2026-10-20");
      clickDate("2026-10-28");
      await flush();

      expect(cell("2026-10-20")).toHaveClass("dp-ui__date--range-start");
      expect(cell("2026-10-28")).toHaveClass("dp-ui__date--range-end");
      expect(cells(".dp-ui__date--in-range")).toHaveLength(7);
      expect(cell("2026-10-24")).toHaveClass("dp-ui__date--in-range");
      expect(headline()).toBe(`Oct 20${RANGE_SEP}Oct 28`);
    });

    it("shows the start only while the end is missing", async () => {
      await open();
      clickDate("2026-10-20");
      await flush();
      expect(cell("2026-10-20")).toHaveClass("dp-ui__date--selected");
      expect(document.querySelector(".dp-ui__date--range-start")).toBeNull();
      expect(document.querySelector(".dp-ui__date--range-end")).toBeNull();
      expect(headline()).toBe(`Oct 20${RANGE_SEP}End`);
    });

    it("a third click starts a new range", async () => {
      await open();
      clickDate("2026-10-20");
      clickDate("2026-10-28");
      clickDate("2026-10-05");
      await flush();

      expect(cell("2026-10-05")).toHaveClass("dp-ui__date--selected");
      expect(cell("2026-10-20")).not.toHaveClass("dp-ui__date--selected");
      expect(document.querySelector(".dp-ui__date--range-start")).toBeNull();
      expect(document.querySelector(".dp-ui__date--range-end")).toBeNull();
      expect(document.querySelector(".dp-ui__date--in-range")).toBeNull();
      expect(headline()).toBe(`Oct 5${RANGE_SEP}End`);
    });

    it("emits range:start and range:end", async () => {
      const p = await open();
      const onStart = vi.fn<(data: RangeStartEventData) => void>();
      const onEnd = vi.fn<(data: RangeEndEventData) => void>();
      p.on("range:start", onStart);
      p.on("range:end", onEnd);

      clickDate("2026-10-20");
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0]?.[0].value.value).toBe("2026-10-20");
      expect(onEnd).not.toHaveBeenCalled();

      clickDate("2026-10-28");
      expect(onEnd).toHaveBeenCalledTimes(1);
      const data = onEnd.mock.calls[0]?.[0];
      expect(data.start.value).toBe("2026-10-20");
      expect(data.end.value).toBe("2026-10-28");
    });

    it("keeps Confirm disabled until the end is set (docked)", async () => {
      await open();
      expect(confirmButtons().length).toBeGreaterThan(0);
      for (const button of confirmButtons()) {
        expect(button).toBeDisabled();
      }

      clickDate("2026-10-20");
      for (const button of confirmButtons()) {
        expect(button).toBeDisabled();
      }

      clickDate("2026-10-28");
      for (const button of confirmButtons()) {
        expect(button).toBeEnabled();
      }
    });
  });

  describe("keyboard", () => {
    it("ArrowUp from the first rendered week renders and focuses the previous month", async () => {
      await open();
      const first = document.querySelector<HTMLElement>(
        ".dp-ui__month-list td.dp-ui__date[data-date]",
      );
      const iso = first?.dataset.date ?? "";
      expect(iso).not.toBe("");
      const [year, month, day] = iso.split("-").map(Number) as [
        number,
        number,
        number,
      ];
      const previous = new Date(year, month - 1, day - 7);
      const previousIso = `${String(previous.getFullYear())}-${String(
        previous.getMonth() + 1,
      ).padStart(2, "0")}-${String(previous.getDate()).padStart(2, "0")}`;
      const before = captions().length;
      expect(cell(previousIso)).toBeNull();

      first?.focus();
      press(first!, "ArrowUp");
      await flush();

      expect(captions().length).toBeGreaterThan(before);
      expect(cell(previousIso)).not.toBeNull();
      expect(document.activeElement).toHaveAttribute("data-date", previousIso);
    });
  });

  describe("mouse drag on the month list", () => {
    it("scrolls the list and the click after the drag selects nothing", async () => {
      const onStart = vi.fn();
      await open({}, (p) => {
        p.on("range:start", onStart);
      });
      const list = document.querySelector<HTMLElement>(".dp-ui__month-list")!;
      Object.defineProperty(list, "scrollHeight", { value: 5000 });
      Object.defineProperty(list, "clientHeight", { value: 568 });
      Object.defineProperty(list, "scrollTop", { value: 300, writable: true });
      const day = cell("2026-10-17")!;

      const fire = (type: string, clientY: number): void => {
        const event = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientY,
          button: 0,
        });
        Object.defineProperty(event, "pointerId", { value: 1 });
        Object.defineProperty(event, "pointerType", { value: "mouse" });
        day.dispatchEvent(event);
      };

      fire("pointerdown", 400);
      fire("pointermove", 300);
      fire("pointerup", 300);
      expect(list.scrollTop).toBe(400);

      day.click();
      expect(onStart).not.toHaveBeenCalled();
      expect(day).not.toHaveClass("dp-ui__date--range-start");
    });
  });

  describe("fullscreen (modal below 600 px)", () => {
    const openFullscreen = (): Promise<DatepickerUI> => {
      setViewportWidth(400);
      return open({ ui: { displayMode: "modal" } });
    };

    it("renders the top bar with close and save and --fullscreen", async () => {
      await openFullscreen();
      expect(surface()).toHaveClass("dp-ui__container--fullscreen");
      const bar = document.querySelector(".dp-ui__top-bar");
      expect(bar).not.toBeNull();
      expect(bar?.querySelector(".dp-ui__icon-button--close")).not.toBeNull();
      expect(bar?.querySelector(".dp-ui__text-button--save")).not.toBeNull();
    });

    it("disables Save until the end is set", async () => {
      await openFullscreen();
      const save = (): HTMLButtonElement =>
        document.querySelector<HTMLButtonElement>(".dp-ui__text-button--save")!;
      expect(save()).toBeDisabled();
      clickDate("2026-10-20");
      expect(save()).toBeDisabled();
      clickDate("2026-10-28");
      expect(save()).toBeEnabled();
    });

    it("the switch button shows the input panel and swaps --fullscreen for --input", async () => {
      await openFullscreen();
      clickSelector(".dp-ui__icon-button--switch-view");
      await flush();

      const panel = document.querySelector(".dp-ui__input-panel");
      expect(panel).not.toBeNull();
      expect(
        panel?.querySelectorAll("input.dp-ui__text-field-input"),
      ).toHaveLength(2);
      expect(surface()).not.toHaveClass("dp-ui__container--fullscreen");
      expect(surface()).toHaveClass("dp-ui__container--input");
    });
  });

  describe("presets", () => {
    const today = (): Date => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };

    const LAST_7_DAYS = {
      label: "Last 7 days",
      value: () => {
        const end = today();
        return {
          start: new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6),
          end,
        };
      },
    };
    const EARLY_OCTOBER = {
      label: "Early October",
      value: { start: "2026-10-01", end: "2026-10-07" },
    };
    const NEXT_MONTH = {
      label: "Next month",
      value: { start: "2026-11-01", end: "2026-11-05" },
    };

    const presetsOf = (presets = [LAST_7_DAYS, EARLY_OCTOBER]) => ({
      calendar: { range: { presets } },
    });

    const presetButton = (label: string): HTMLButtonElement => {
      const found = cells(".dp-ui__presets button.dp-ui__preset").find(
        (button) => button.textContent === label,
      );
      if (!(found instanceof HTMLButtonElement)) {
        throw new Error(`No preset ${label}`);
      }
      return found;
    };

    it("renders nothing when no presets are configured", async () => {
      await open();
      expect(document.querySelector(".dp-ui__presets")).toBeNull();
      expect(surface()).not.toHaveClass("dp-ui__container--presets");
    });

    it("docked on a wide window: a column of preset buttons", async () => {
      setViewportWidth(1280);
      await open(presetsOf());

      expect(surface()).toHaveClass("dp-ui__container--presets");
      const group = document.querySelector(".dp-ui__presets");
      expect(group).toHaveAttribute("role", "group");
      expect(group).toHaveAttribute("aria-label", "Presets");
      const buttons = cells(".dp-ui__presets button.dp-ui__preset");
      expect(buttons.map((button) => button.textContent)).toEqual([
        "Last 7 days",
        "Early October",
      ]);
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    });

    it("modal: a row, so no --presets modifier", async () => {
      setViewportWidth(1280);
      await open({ ...presetsOf(), ui: { displayMode: "modal" } });

      expect(surface()).toHaveClass("dp-ui__container--modal");
      expect(surface()).not.toHaveClass("dp-ui__container--presets");
      expect(document.querySelectorAll(".dp-ui__preset")).toHaveLength(2);
    });

    it("docked on a narrow window: a row, so no --presets modifier", async () => {
      setViewportWidth(500);
      await open({ ...presetsOf(), ui: { displayMode: "docked" } });

      expect(surface()).not.toHaveClass("dp-ui__container--presets");
      expect(document.querySelectorAll(".dp-ui__preset")).toHaveLength(2);
    });

    it("a click sets the draft like a finished range and emits range:end only", async () => {
      setViewportWidth(1280);
      const p = await open(presetsOf());
      const onEnd = vi.fn<(data: RangeEndEventData) => void>();
      const onStart = vi.fn<(data: RangeStartEventData) => void>();
      const onDay = vi.fn();
      p.on("range:end", onEnd);
      p.on("range:start", onStart);
      p.on("select:day", onDay);

      presetButton("Last 7 days").click();
      await flush();

      expect(cell("2026-10-11")).toHaveClass("dp-ui__date--range-start");
      expect(cell("2026-10-17")).toHaveClass("dp-ui__date--range-end");
      expect(cells(".dp-ui__date--in-range")).toHaveLength(5);
      expect(headline()).toBe(`Oct 11${RANGE_SEP}Oct 17`);
      expect(presetButton("Last 7 days")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(presetButton("Early October")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(onEnd).toHaveBeenCalledTimes(1);
      const data = onEnd.mock.calls[0]?.[0];
      expect(data.start.value).toBe("2026-10-11");
      expect(data.end.value).toBe("2026-10-17");
      expect(onDay).not.toHaveBeenCalled();
      expect(onStart).not.toHaveBeenCalled();
      for (const button of confirmButtons()) {
        expect(button).toBeEnabled();
      }
    });

    it("pressed follows the draft when a day is picked afterwards", async () => {
      setViewportWidth(1280);
      await open(presetsOf());
      presetButton("Last 7 days").click();
      await flush();

      clickDate("2026-10-03");
      await flush();

      expect(presetButton("Last 7 days")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("disables a preset the limits refuse and ignores its click", async () => {
      setViewportWidth(1280);
      const p = await open({
        calendar: {
          maxDate: "2026-10-31",
          range: { presets: [EARLY_OCTOBER, NEXT_MONTH] },
        },
      });
      const onEnd = vi.fn();
      p.on("range:end", onEnd);

      expect(presetButton("Next month")).toBeDisabled();
      expect(presetButton("Early October")).toBeEnabled();

      presetButton("Next month").click();
      await flush();
      expect(onEnd).not.toHaveBeenCalled();
      expect(document.querySelector(".dp-ui__date--range-start")).toBeNull();
    });

    it("disables a preset whose value throws and keeps the picker working", async () => {
      const queued: (() => void)[] = [];
      vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
        queued.push(cb);
      });
      setViewportWidth(1280);
      await open(
        presetsOf([
          {
            label: "Broken",
            value: () => {
              throw new Error("boom");
            },
          },
          EARLY_OCTOBER,
        ]),
      );

      expect(presetButton("Broken")).toBeDisabled();
      expect(presetButton("Early October")).toBeEnabled();
      clickDate("2026-10-20");
      expect(cell("2026-10-20")).toHaveClass("dp-ui__date--selected");
      vi.restoreAllMocks();
    });

    it("closeOnSelect: a click confirms and closes", async () => {
      setViewportWidth(1280);
      const p = await open({
        ...presetsOf(),
        behavior: { closeOnSelect: true },
      });
      const onConfirm = vi.fn();
      const onClose = vi.fn();
      p.on("confirm", onConfirm);
      p.on("close", onClose);

      presetButton("Early October").click();
      await flush();

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(surface()).toBeNull();
      expect(p.getValue()).toMatchObject({
        start: { value: "2026-10-01" },
        end: { value: "2026-10-07" },
      });
    });

    it("hides the presets in the input view and shows them again", async () => {
      setViewportWidth(1280);
      await open(presetsOf());

      clickSelector(".dp-ui__icon-button--switch-view");
      await flush();
      expect(document.querySelector(".dp-ui__input-panel")).not.toBeNull();
      expect(document.querySelector(".dp-ui__presets")).not.toBeVisible();

      clickSelector(".dp-ui__icon-button--switch-view");
      await flush();
      expect(document.querySelector(".dp-ui__presets")).toBeVisible();
    });
  });

  describe("not fullscreen", () => {
    it("range modal at 1024 px has no top bar and uses Confirm", async () => {
      await open({ ui: { displayMode: "modal" } });
      expect(surface()).toHaveClass("dp-ui__container--range");
      expect(surface()).not.toHaveClass("dp-ui__container--fullscreen");
      expect(document.querySelector(".dp-ui__top-bar")).toBeNull();
      expect(
        document.querySelector(".dp-ui__text-button--confirm"),
      ).toBeDisabled();
    });
  });
});
