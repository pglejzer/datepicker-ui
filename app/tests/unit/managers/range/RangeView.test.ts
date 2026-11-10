import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { CalendarShell } from "@/managers/calendar/CalendarView";
import { createRangeView } from "@/managers/range/RangeView";
import type { DateRules } from "@/types/internal";
import type { DatepickerOptions } from "@/types/options";
import type { ViewLayout } from "@/utils/surface";
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

    it("marks the view element as modal only for a modal surface", async () => {
      await open({ ui: { displayMode: "modal" } });
      expect(surface()?.querySelector(".dp-ui__calendar")).toHaveClass(
        "dp-ui__calendar--modal",
      );
    });

    it("marks the view element as modal in full screen", async () => {
      setViewportWidth(500);
      await open({ ui: { displayMode: "modal" } });
      expect(surface()).toHaveClass("dp-ui__container--fullscreen");
      expect(surface()?.querySelector(".dp-ui__calendar")).toHaveClass(
        "dp-ui__calendar--modal",
      );
    });

    it("does not mark a docked view element", async () => {
      await open();
      expect(surface()?.querySelector(".dp-ui__calendar")).not.toHaveClass(
        "dp-ui__calendar--modal",
      );
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

    it("docked on a wide window: the group carries --column", async () => {
      setViewportWidth(1280);
      await open(presetsOf());

      expect(document.querySelector(".dp-ui__presets")).toHaveClass(
        "dp-ui__presets--column",
      );
    });

    it("a chip row does not carry --column (modal and narrow docked)", async () => {
      setViewportWidth(1280);
      await open({ ...presetsOf(), ui: { displayMode: "modal" } });
      expect(document.querySelector(".dp-ui__presets")).not.toHaveClass(
        "dp-ui__presets--column",
      );

      DatepickerUI.destroyAll();
      await flush();
      cleanupDom();

      setViewportWidth(500);
      await open({ ...presetsOf(), ui: { displayMode: "docked" } });
      expect(document.querySelector(".dp-ui__presets")).not.toHaveClass(
        "dp-ui__presets--column",
      );
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

    it("moves the presets to a row when the window narrows while open", async () => {
      setViewportWidth(1280);
      await open({ ...presetsOf(), ui: { displayMode: "docked" } });
      expect(surface()).toHaveClass("dp-ui__container--presets");

      setViewportWidth(353);
      await flush();

      expect(surface()).toHaveClass("dp-ui__container--docked");
      expect(surface()).not.toHaveClass("dp-ui__container--presets");
      expect(document.querySelectorAll(".dp-ui__preset")).toHaveLength(2);

      setViewportWidth(1280);
      await flush();

      expect(surface()).toHaveClass("dp-ui__container--presets");
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

  describe("inline chrome", () => {
    type InlineOptions = NonNullable<
      NonNullable<DatepickerOptions["ui"]>["inline"]
    >;

    const openInline = async (
      inline: InlineOptions = {},
      options: DatepickerOptions = {},
    ): Promise<{ picker: DatepickerUI; container: HTMLElement }> => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const picker = new DatepickerUI(mountInput(), {
        ...options,
        calendar: { locale: "en-US", ...options.calendar, mode: "range" },
        ui: { ...options.ui, inline: { enabled: true, container, ...inline } },
      });
      picker.create();
      await flush();
      return { picker, container };
    };

    const liveRegion = (): string | null | undefined =>
      document.querySelector(".dp-ui__live-region")?.textContent;

    it("renders the range header by default", async () => {
      const { container } = await openInline();
      expect(container.querySelector(".dp-ui__header--range")).not.toBeNull();
      expect(container.querySelector(".dp-ui__top-bar")).toBeNull();
    });

    it("renders no range header with headline: false", async () => {
      const { container } = await openInline({ headline: false });
      expect(container.querySelector(".dp-ui__header--range")).toBeNull();
      expect(container.querySelector(".dp-ui__headline")).toBeNull();
      expect(container.querySelector(".dp-ui__month-list")).not.toBeNull();
    });

    describe('layout: "fullscreen"', () => {
      it("marks the container and renders the top bar", async () => {
        const { container } = await openInline(
          {},
          { ui: { layout: "fullscreen" } },
        );
        const root = container.querySelector(".dp-ui__container");
        expect(root).toHaveClass("dp-ui__container--inline");
        expect(root).toHaveClass("dp-ui__container--range");
        expect(root).toHaveClass("dp-ui__container--fullscreen");
        const bar = container.querySelector(".dp-ui__top-bar");
        expect(bar?.querySelector(".dp-ui__icon-button--close")).not.toBeNull();
        expect(bar?.querySelector(".dp-ui__text-button--save")).not.toBeNull();
        expect(container.querySelector(".dp-ui__headline")).not.toBeNull();
      });

      it("keeps only the top bar with headline: false", async () => {
        const { container } = await openInline(
          { headline: false },
          { ui: { layout: "fullscreen" } },
        );
        const header = container.querySelector(".dp-ui__header--range");
        expect(header).not.toBeNull();
        expect(header?.children).toHaveLength(1);
        expect(header?.firstElementChild).toHaveClass("dp-ui__top-bar");
        expect(container.querySelector(".dp-ui__headline")).toBeNull();
        expect(
          container.querySelector(".dp-ui__icon-button--close"),
        ).not.toBeNull();
        expect(
          container.querySelector(".dp-ui__text-button--save"),
        ).not.toBeNull();
      });

      it("close emits cancel, resets the draft to the value and stays mounted", async () => {
        const { picker, container } = await openInline(
          {},
          { ui: { layout: "fullscreen" } },
        );
        picker.setValue({ start: "2026-10-01", end: "2026-10-07" });
        await flush();
        const onCancel = vi.fn();
        picker.on("cancel", onCancel);

        clickDate("2026-10-20");
        expect(cell("2026-10-20")).toHaveClass("dp-ui__date--selected");
        clickSelector(".dp-ui__icon-button--close");
        await flush();

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith({ reason: "button" });
        expect(container.querySelector(".dp-ui__container")).not.toBeNull();
        expect(cell("2026-10-20")).not.toHaveClass("dp-ui__date--selected");
        expect(cell("2026-10-01")).toHaveClass("dp-ui__date--range-start");
        expect(cell("2026-10-07")).toHaveClass("dp-ui__date--range-end");
        expect(picker.getValue()).toMatchObject({
          start: { value: "2026-10-01" },
          end: { value: "2026-10-07" },
        });
      });

      it("save commits a complete range, emits confirm and stays mounted", async () => {
        const { picker, container } = await openInline(
          {},
          { ui: { layout: "fullscreen" } },
        );
        const onConfirm = vi.fn();
        picker.on("confirm", onConfirm);
        const save = document.querySelector<HTMLButtonElement>(
          ".dp-ui__text-button--save",
        )!;
        expect(save).toBeDisabled();

        clickDate("2026-10-20");
        clickDate("2026-10-25");
        expect(save).toBeEnabled();
        save.click();
        await flush();

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(container.querySelector(".dp-ui__container")).not.toBeNull();
        expect(picker.getValue()).toMatchObject({
          start: { value: "2026-10-20" },
          end: { value: "2026-10-25" },
        });
      });
    });

    describe("announceSelection", () => {
      it("announces a pick by default", async () => {
        await openInline();
        clickDate("2026-10-20");
        expect(liveRegion()).toContain("Oct 20");
      });

      it("leaves the live region empty after a pick with announceSelection: false", async () => {
        await openInline({ announceSelection: false });
        clickDate("2026-10-20");
        clickDate("2026-10-25");
        expect(liveRegion()).toBe("");
      });

      it("still announces the months on a next-month click", async () => {
        setViewportWidth(1280);
        await openInline(
          { announceSelection: false },
          {
            calendar: { months: 2 },
          },
        );

        clickSelector(
          ".dp-ui__navigation--months .dp-ui__icon-button--next-month",
        );
        await flush();

        expect(liveRegion()).toContain("December");
      });

      it("ignores announceSelection: false on a docked surface", async () => {
        await open({ ui: { inline: { announceSelection: false } } });
        clickDate("2026-10-20");
        expect(liveRegion()).toContain("Oct 20");
      });
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

  describe("fit and reveal on a view built directly", () => {
    const rules: DateRules = {
      isDisabled: () => false,
      unavailableReason: () => null,
      isMonthDisabled: () => false,
      yearBounds: () => ({ min: 1926, max: 2046 }),
      isSelectable: () => true,
    };
    const originalObserver = globalThis.ResizeObserver;
    let shells: CalendarShell[] = [];
    let sizeCallback: ((entries: unknown[]) => void) | null = null;

    beforeEach(() => {
      sizeCallback = null;
      class StubObserver {
        constructor(cb: (entries: unknown[]) => void) {
          sizeCallback = cb;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
      globalThis.ResizeObserver =
        StubObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalObserver;
      for (const shell of shells) shell.destroy();
      shells = [];
    });

    const build = (
      presets: ViewLayout["presets"] = "none",
      parent: HTMLElement = document.body,
    ): { shell: CalendarShell; core: CoreState } => {
      const host = document.createElement("div");
      const input = document.createElement("input");
      host.appendChild(input);
      document.body.appendChild(host);
      const core = new CoreState(input, host, false, {
        calendar: {
          mode: "range",
          locale: "en-US",
          range: {
            presets: [
              {
                label: "Early",
                value: { start: "2026-10-01", end: "2026-10-07" },
              },
            ],
          },
        },
      });
      core.resetSession();
      core.setCalendarLayout("docked");
      core.setLayout({ months: 1, presets });
      const actions = {
        select: vi.fn(),
        focusDate: vi.fn(),
        navigate: vi.fn(),
        page: vi.fn(),
        selectRange: vi.fn(),
        jumpTo: vi.fn(),
        showPanel: vi.fn(),
        confirm: vi.fn(),
        cancel: vi.fn(),
        today: vi.fn(),
        clear: vi.fn(),
        typeDraft: vi.fn(),
        renderedMonths: vi.fn(),
      };
      const shell = createRangeView({
        core,
        actions,
        rules,
        mode: "docked",
        fullscreen: false,
      });
      shells.push(shell);
      parent.appendChild(shell.element);
      return { shell, core };
    };

    const containerEl = (): HTMLElement => {
      const container = document.createElement("div");
      container.className = "dp-ui__container";
      document.body.appendChild(container);
      return container;
    };

    it("fit applies the range chrome once the view sits in its container", () => {
      const container = containerEl();
      const { shell } = build("column", container);
      expect(container).not.toHaveClass("dp-ui__container--range");

      shell.fit();

      expect(container).toHaveClass("dp-ui__container--range");
      expect(container).toHaveClass("dp-ui__container--presets");
    });

    it("fit leaves document.activeElement unchanged", () => {
      const container = containerEl();
      const outside = document.createElement("button");
      document.body.appendChild(outside);
      const { shell } = build("none", container);
      outside.focus();

      shell.fit();

      expect(document.activeElement).toBe(outside);
    });

    it("fit does nothing after destroy", () => {
      const container = containerEl();
      const { shell } = build("none", container);
      shell.destroy();

      expect(() => {
        shell.fit();
      }).not.toThrow();
      expect(container).not.toHaveClass("dp-ui__container--range");
    });

    describe("list reveal when the list becomes visible", () => {
      const HEIGHT = 200;

      const stubLayout = (shell: CalendarShell): HTMLElement => {
        const list =
          shell.element.querySelector<HTMLElement>(".dp-ui__month-list");
        if (!list) throw new Error("no month list");
        Object.defineProperty(list, "scrollTop", {
          value: 0,
          writable: true,
          configurable: true,
        });
        list.getBoundingClientRect = () => new DOMRect(0, 0, 300, 568);
        list.querySelectorAll("table").forEach((table, index) => {
          table.getBoundingClientRect = () =>
            new DOMRect(0, index * HEIGHT - list.scrollTop, 300, HEIGHT);
        });
        return list;
      };

      const anchorIndex = (list: HTMLElement): number =>
        Array.from(list.querySelectorAll("caption")).findIndex((caption) =>
          caption.textContent.includes("October"),
        );

      const report = (height: number): void => {
        if (sizeCallback === null) throw new Error("no observer");
        sizeCallback([{ contentRect: { height } }]);
      };

      it("scrolls to the anchor month when the height goes from 0 to 568", () => {
        const { shell } = build();
        const list = stubLayout(shell);
        const index = anchorIndex(list);
        expect(index).toBeGreaterThan(0);

        report(0);
        expect(list.scrollTop).toBe(0);
        report(568);

        expect(list.scrollTop).toBe(index * HEIGHT);
      });

      it("does not move the list again while it stays visible", () => {
        const { shell } = build();
        const list = stubLayout(shell);
        report(568);
        const settled = list.scrollTop;
        list.scrollTop = settled + 37;

        report(500);

        expect(list.scrollTop).toBe(settled + 37);
      });
    });
  });
});
