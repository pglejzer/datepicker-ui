import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type {
  DateValue,
  ErrorEventData,
  NavigateEventData,
} from "@/types/types";
import {
  cleanupDom,
  clickSelector,
  flush,
  mountInput,
} from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

interface Fixture {
  picker: DatepickerUI;
  events: NavigateEventData[];
}

const build = (options: DatepickerOptions = {}): Fixture => {
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", weekStart: "monday", ...options.calendar },
    ui: { displayMode: "docked", ...options.ui },
  });
  picker.create();
  const events: NavigateEventData[] = [];
  picker.on("navigate", (data) => events.push(data));
  return { picker, events };
};

const buildOpen = async (
  options: DatepickerOptions = {},
  value?: string,
): Promise<Fixture> => {
  const { picker } = build(options);
  if (value !== undefined) picker.setValue(value);
  picker.open();
  await flush();
  const events: NavigateEventData[] = [];
  picker.on("navigate", (data) => events.push(data));
  return { picker, events };
};

const buildInline = (options: DatepickerOptions = {}): Fixture => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return build({
    ...options,
    ui: { ...options.ui, inline: { enabled: true, container } },
  });
};

const focusedDate = (): string | undefined =>
  document.querySelector<HTMLElement>('td.dp-ui__date[tabindex="0"]')?.dataset
    .date;

const spanOf = (data: NavigateEventData): [string, string] => [
  data.from.value,
  data.to.value,
];

describe("navigate event and getVisibleRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  describe("open", () => {
    it("an inline create() emits one open event once the mount resolves", async () => {
      const { events } = buildInline();
      expect(events).toHaveLength(0);

      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        year: 2026,
        month: 10,
        direction: 0,
        source: "open",
      });
      expect(spanOf(events[0])).toEqual(["2026-10-01", "2026-10-31"]);
    });

    it("a docked open() emits one open event", async () => {
      const { picker, events } = build();
      picker.open();
      expect(events).toHaveLength(0);

      await flush();

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("open");
      expect(events[0].direction).toBe(0);
    });

    it("opening again after a close emits another open event", async () => {
      const { picker, events } = build();
      picker.open();
      await flush();
      picker.close();
      await flush();
      events.length = 0;

      picker.open();
      await flush();

      expect(events.map((event) => event.source)).toEqual(["open"]);
    });

    it("opens on the month of the value", async () => {
      const { picker, events } = build();
      picker.setValue("2027-02-10");
      picker.open();
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ year: 2027, month: 2, source: "open" });
      expect(spanOf(events[0])).toEqual(["2027-02-01", "2027-02-28"]);
    });
  });

  describe("user navigation", () => {
    it("the next-month button emits button with November's range", async () => {
      const { events } = await buildOpen();

      clickSelector(".dp-ui__icon-button--next-month");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        year: 2026,
        month: 11,
        direction: 1,
        source: "button",
      });
      expect(spanOf(events[0])).toEqual(["2026-11-01", "2026-11-30"]);
    });

    it("the previous-month button emits direction -1", async () => {
      const { events } = await buildOpen();

      clickSelector(".dp-ui__icon-button--prev-month");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        month: 9,
        direction: -1,
        source: "button",
      });
      expect(spanOf(events[0])).toEqual(["2026-09-01", "2026-09-30"]);
    });
  });

  describe("setValue and setOptions", () => {
    it("setValue to another month emits api", async () => {
      const { picker, events } = await buildOpen();

      picker.setValue("2026-12-05");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        year: 2026,
        month: 12,
        direction: 1,
        source: "api",
      });
      expect(spanOf(events[0])).toEqual(["2026-12-01", "2026-12-31"]);
    });

    it("setValue to a month that is already shown emits nothing", async () => {
      const { picker, events } = await buildOpen();

      picker.setValue("2026-10-05");
      await flush();

      expect(events).toHaveLength(0);
    });

    it("setOptions that widens the grid emits api with direction 0", async () => {
      const { picker, events } = await buildOpen();

      picker.setOptions({ ui: { outsideDays: true } });
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        year: 2026,
        month: 10,
        direction: 0,
        source: "api",
      });
      expect(spanOf(events[0])).toEqual(["2026-09-28", "2026-11-08"]);
    });

    it("setOptions that leaves the shown days alone emits nothing", async () => {
      const { picker, events } = await buildOpen();

      picker.setOptions({ labels: { today: "Dzisiaj" } });
      await flush();

      expect(events).toHaveLength(0);
    });
  });

  describe("goTo", () => {
    it("shows the month of the date and gives that day the roving tabindex", async () => {
      const { picker, events } = await buildOpen({}, "2026-10-05");
      const selected = vi.fn();
      picker.on("select:day", selected);

      picker.goTo("2027-03-15");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        year: 2027,
        month: 3,
        direction: 1,
        source: "api",
      });
      expect(spanOf(events[0])).toEqual(["2027-03-01", "2027-03-31"]);
      expect(focusedDate()).toBe("2027-03-15");
      expect(selected).not.toHaveBeenCalled();
      expect((picker.getValue() as DateValue | null)?.value).toBe("2026-10-05");
    });

    it("accepts a Date", async () => {
      const { picker, events } = await buildOpen();

      picker.goTo(new Date(2026, 11, 24));
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ month: 12, source: "api" });
      expect(focusedDate()).toBe("2026-12-24");
    });

    it("clamps a date past maxDate", async () => {
      const { picker, events } = await buildOpen({
        calendar: { maxDate: "2026-12-20" },
      });

      picker.goTo("2030-01-10");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ year: 2026, month: 12, source: "api" });
      expect(focusedDate()).toBe("2026-12-20");
    });

    it("clamps a date before minDate", async () => {
      const { picker, events } = await buildOpen({
        calendar: { minDate: "2026-08-10" },
      });

      picker.goTo("2020-01-01");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ year: 2026, month: 8 });
      expect(focusedDate()).toBe("2026-08-10");
    });

    it("does nothing on a closed docked picker", async () => {
      const { picker, events } = build();

      picker.goTo("2027-03-15");
      await flush();

      expect(events).toHaveLength(0);
      expect(picker.getVisibleRange()).toBeNull();
    });

    it("reports invalid-date for a value that is not a date", async () => {
      const { picker, events } = await buildOpen();
      const errors: ErrorEventData[] = [];
      picker.on("error", (data) => errors.push(data));

      picker.goTo("nope");
      await flush();

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("invalid-date");
      expect(events).toHaveLength(0);
    });

    it("keeps the page when the date sits in another month already shown", async () => {
      setViewportWidth(1280);
      const { picker, events } = await buildOpen({ calendar: { months: 2 } });
      expect(picker.getVisibleRange()?.to.value).toBe("2026-11-30");

      picker.goTo("2026-11-15");
      await flush();

      expect(events).toHaveLength(0);
      expect(focusedDate()).toBe("2026-11-15");
    });

    it("moves the window when the date is outside the months shown", async () => {
      setViewportWidth(1280);
      const { picker, events } = await buildOpen({ calendar: { months: 2 } });

      picker.goTo("2027-02-10");
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("api");
      expect(events[0].from.value <= "2027-02-10").toBe(true);
      expect(events[0].to.value >= "2027-02-10").toBe(true);
      expect(focusedDate()).toBe("2027-02-10");
    });
  });

  describe("several months", () => {
    it("reports both months in the open range", async () => {
      setViewportWidth(1280);
      const { picker } = build({ calendar: { months: 2 } });
      const opened: NavigateEventData[] = [];
      picker.on("navigate", (data) => opened.push(data));

      picker.open();
      await flush();

      expect(opened).toHaveLength(1);
      expect(spanOf(opened[0])).toEqual(["2026-10-01", "2026-11-30"]);
    });

    it("a resize that changes the months shown emits resize", async () => {
      setViewportWidth(1280);
      const { events } = await buildOpen({ calendar: { months: 2 } });

      setViewportWidth(700);
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        month: 10,
        direction: 0,
        source: "resize",
      });
      expect(spanOf(events[0])).toEqual(["2026-10-01", "2026-10-31"]);
    });

    it("a resize that keeps the months shown emits nothing", async () => {
      setViewportWidth(1280);
      const { events } = await buildOpen({ calendar: { months: 2 } });

      setViewportWidth(1200);
      await flush();

      expect(events).toHaveLength(0);
    });
  });

  describe("inline range list", () => {
    const stubScroll = (scrollTop: number): HTMLElement => {
      const list = document.querySelector<HTMLElement>(".dp-ui__month-list");
      if (list === null) throw new Error("no month list");
      Object.defineProperty(list, "clientHeight", {
        value: 100,
        configurable: true,
      });
      Object.defineProperty(list, "scrollHeight", {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(list, "scrollTop", {
        value: scrollTop,
        writable: true,
        configurable: true,
      });
      return list;
    };

    it("open covers every rendered month", async () => {
      const { events } = buildInline({ calendar: { mode: "range" } });

      await flush();

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("open");
      expect(spanOf(events[0])).toEqual(["2026-08-01", "2027-07-31"]);
    });

    it("growing the list at the bottom emits scroll", async () => {
      const { picker, events } = buildInline({ calendar: { mode: "range" } });
      await flush();
      events.length = 0;
      const list = stubScroll(900);

      list.dispatchEvent(new Event("scroll"));
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ direction: 0, source: "scroll" });
      expect(spanOf(events[0])).toEqual(["2026-08-01", "2028-01-31"]);
      expect(picker.getVisibleRange()?.to.value).toBe("2028-01-31");
    });

    it("growing the list at the top emits scroll", async () => {
      const { events } = buildInline({ calendar: { mode: "range" } });
      await flush();
      events.length = 0;
      const list = stubScroll(0);

      list.dispatchEvent(new Event("scroll"));
      await flush();

      expect(events).toHaveLength(1);
      expect(events[0].source).toBe("scroll");
      expect(spanOf(events[0])).toEqual(["2026-02-01", "2027-07-31"]);
    });
  });

  describe("getVisibleRange", () => {
    it("is null while the picker is closed", () => {
      const { picker } = build();
      expect(picker.getVisibleRange()).toBeNull();
    });

    it("is null again after the picker closes", async () => {
      const { picker } = await buildOpen();
      picker.close();
      await flush();
      expect(picker.getVisibleRange()).toBeNull();
    });

    it("matches the last navigate payload while open", async () => {
      const { picker, events } = await buildOpen();
      clickSelector(".dp-ui__icon-button--next-month");
      await flush();

      const range = picker.getVisibleRange();
      const last = events[events.length - 1];

      expect(range?.from.value).toBe(last.from.value);
      expect(range?.to.value).toBe(last.to.value);
      expect(range?.from.date).toEqual(new Date(2026, 10, 1));
      expect(range?.to.date).toEqual(new Date(2026, 10, 30));
      expect(range?.from.formatted).toBe(last.from.formatted);
    });

    it("includes the outside days that are drawn", async () => {
      const { picker } = await buildOpen({ ui: { outsideDays: true } });
      expect(picker.getVisibleRange()?.from.value).toBe("2026-09-28");
      expect(picker.getVisibleRange()?.to.value).toBe("2026-11-08");
    });

    it("covers the year for month precision", async () => {
      const { picker } = await buildOpen({
        calendar: { precision: "month" },
      });
      expect(picker.getVisibleRange()?.from.value).toBe("2026-01-01");
      expect(picker.getVisibleRange()?.to.value).toBe("2026-12-31");
    });
  });

  describe("callbacks.onNavigate", () => {
    it("receives the same payloads as the event", async () => {
      const onNavigate = vi.fn<(data: NavigateEventData) => void>();
      const { picker } = build({ callbacks: { onNavigate } });
      const events: NavigateEventData[] = [];
      picker.on("navigate", (data) => events.push(data));

      picker.open();
      await flush();
      clickSelector(".dp-ui__icon-button--next-month");
      await flush();
      picker.goTo("2027-03-15");
      await flush();

      expect(events.map((event) => event.source)).toEqual([
        "open",
        "button",
        "api",
      ]);
      expect(onNavigate.mock.calls.map((call) => call[0])).toEqual(events);
    });
  });
});
