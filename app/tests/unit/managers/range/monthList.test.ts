import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import { createMonthList, type MonthList } from "@/managers/range/monthList";
import type { YearMonth } from "@/types/date";
import type { DateRules } from "@/types/internal";
import { d } from "../../../helpers/selection";

const rules: DateRules = {
  isDisabled: () => false,
  unavailableReason: () => null,
  isMonthDisabled: () => false,
  yearBounds: () => ({ min: 1926, max: 2046 }),
  isSelectable: () => true,
};

const ym = (year: number, month: number): YearMonth => ({ year, month });
const key = (view: YearMonth): string =>
  `${String(view.year)}-${String(view.month)}`;

const WIDE = { first: ym(2000, 1), last: ym(2100, 12) };

interface Harness {
  list: MonthList;
  core: CoreState;
  render: ReturnType<typeof vi.fn<(view: YearMonth) => HTMLTableElement>>;
}

const mount = (
  bounds: { first: YearMonth; last: YearMonth } = WIDE,
): Harness => {
  const host = document.createElement("div");
  const input = document.createElement("input");
  host.appendChild(input);
  document.body.appendChild(host);
  const core = new CoreState(input, host, false, {
    calendar: { mode: "range", locale: "en-US" },
  });
  core.resetSession();
  const render = vi.fn((view: YearMonth): HTMLTableElement => {
    const table = document.createElement("table");
    table.dataset.month = key(view);
    for (const day of [1, 15]) {
      const cell = document.createElement("td");
      cell.className = "dp-ui__date";
      cell.tabIndex = -1;
      cell.dataset.date = `${String(view.year)}-${String(view.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const inner = document.createElement("span");
      cell.appendChild(inner);
      const row = document.createElement("tr");
      row.appendChild(cell);
      table.appendChild(row);
    }
    return table;
  });
  const list = createMonthList({
    core,
    rules,
    render,
    bounds: () => bounds,
  });
  document.body.appendChild(list.element);
  return { list, core, render };
};

const months = (list: MonthList): string[] =>
  Array.from(list.element.querySelectorAll<HTMLElement>("table")).map(
    (table) => table.dataset.month ?? "",
  );

const defineScroll = (list: MonthList, scrollTop: number): void => {
  const element = list.element;
  Object.defineProperty(element, "scrollTop", {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(element, "scrollHeight", {
    get: () => element.querySelectorAll("table").length * 100,
    configurable: true,
  });
  Object.defineProperty(element, "clientHeight", {
    value: 300,
    configurable: true,
  });
};

const scrollAndFlush = (list: MonthList): void => {
  list.element.dispatchEvent(new Event("scroll"));
  vi.advanceTimersByTime(100);
};

describe("createMonthList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("renders the anchor month minus 2 to plus 9 (12 months)", () => {
    const { list, render } = mount();
    expect(render).toHaveBeenCalledTimes(12);
    const rendered = months(list);
    expect(rendered).toHaveLength(12);
    expect(rendered[0]).toBe("2026-8");
    expect(rendered[11]).toBe("2027-7");
    expect(rendered).toContain("2026-10");
  });

  it("clamps the initial render to bounds()", () => {
    const { list, render } = mount({ first: ym(2026, 10), last: ym(2026, 12) });
    expect(render).toHaveBeenCalledTimes(3);
    expect(months(list)).toEqual(["2026-10", "2026-11", "2026-12"]);
  });

  it("ensureMonth extends the list until the month exists", () => {
    const { list } = mount();
    list.ensureMonth(ym(2028, 6));
    const rendered = months(list);
    expect(rendered).toContain("2028-6");
    expect(rendered[0]).toBe("2026-8");
    expect(new Set(rendered).size).toBe(rendered.length);
  });

  it("ensureMonth prepends for a month before the rendered range", () => {
    const { list } = mount();
    list.ensureMonth(ym(2025, 11));
    const rendered = months(list);
    expect(rendered[0]).toBe("2025-11");
    expect(new Set(rendered).size).toBe(rendered.length);
  });

  it("ensureMonth never renders past bounds().last", () => {
    const { list } = mount({ first: ym(2026, 1), last: ym(2027, 12) });
    list.ensureMonth(ym(2030, 1));
    const rendered = months(list);
    expect(rendered[rendered.length - 1]).toBe("2027-12");
    expect(rendered).not.toContain("2028-1");
  });

  it("ensureMonth never renders before bounds().first", () => {
    const { list } = mount({ first: ym(2026, 6), last: ym(2027, 12) });
    list.ensureMonth(ym(2020, 1));
    const rendered = months(list);
    expect(rendered[0]).toBe("2026-6");
    expect(rendered).not.toContain("2026-5");
  });

  it("scrolling near the bottom adds six months", () => {
    const { list } = mount();
    defineScroll(list, 850);
    scrollAndFlush(list);
    const rendered = months(list);
    expect(rendered).toHaveLength(18);
    expect(rendered[17]).toBe("2028-1");
  });

  it("scrolling near the bottom stops at bounds().last", () => {
    const { list } = mount({ first: ym(2026, 1), last: ym(2027, 9) });
    defineScroll(list, 850);
    scrollAndFlush(list);
    const rendered = months(list);
    expect(rendered[rendered.length - 1]).toBe("2027-9");
  });

  it("scrolling near the top prepends six months and keeps content still", () => {
    const { list } = mount();
    defineScroll(list, 50);
    scrollAndFlush(list);
    const rendered = months(list);
    expect(rendered).toHaveLength(18);
    expect(rendered[0]).toBe("2026-2");
    expect(list.element.scrollTop).toBe(50 + 6 * 100);
  });

  it("scrolling near the top stops at bounds().first", () => {
    const { list } = mount({ first: ym(2026, 6), last: ym(2100, 12) });
    defineScroll(list, 50);
    scrollAndFlush(list);
    expect(months(list)[0]).toBe("2026-6");
  });

  it("a scroll in the middle renders nothing new", () => {
    const { list, render } = mount();
    defineScroll(list, 450);
    const before = render.mock.calls.length;
    scrollAndFlush(list);
    expect(render.mock.calls.length).toBe(before);
  });

  it("cellAt resolves the date cell of an inner target and null outside cells", () => {
    const { list } = mount();
    const cell = list.element.querySelector<HTMLElement>(
      'td.dp-ui__date[data-date="2026-10-15"]',
    );
    const inner = cell?.querySelector("span") as HTMLElement;
    expect(list.cellAt(inner)).toBe(cell);
    expect(list.cellAt(list.element)).toBeNull();
  });

  it("focusCell focuses the cell and renders its month when missing", () => {
    const { list } = mount();
    list.focusCell(d(2026, 10, 15));
    expect(document.activeElement).toHaveAttribute("data-date", "2026-10-15");

    list.focusCell(d(2028, 3, 15));
    expect(months(list)).toContain("2028-3");
    expect(document.activeElement).toHaveAttribute("data-date", "2028-03-15");
  });

  describe("snapping after a mouse drag", () => {
    const HEIGHT = 100;
    const BASE = 400;

    const stubLayout = (list: MonthList): void => {
      const element = list.element;
      Object.defineProperty(element, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(element, "scrollHeight", {
        get: () => element.querySelectorAll("table").length * HEIGHT,
        configurable: true,
      });
      Object.defineProperty(element, "clientHeight", {
        value: 300,
        configurable: true,
      });
      element.getBoundingClientRect = () => new DOMRect(0, 0, 300, 300);
      element.querySelectorAll("table").forEach((table, index) => {
        table.getBoundingClientRect = () =>
          new DOMRect(0, index * HEIGHT - element.scrollTop, 300, HEIGHT);
      });
    };

    const mouse = (target: Element, type: string, clientY: number): void => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientY,
        button: 0,
      });
      Object.defineProperty(event, "pointerId", { value: 1 });
      Object.defineProperty(event, "pointerType", { value: "mouse" });
      target.dispatchEvent(event);
    };

    const dragFrom = (
      list: MonthList,
      passed: number,
      direction: "up" | "down",
    ): void => {
      const rest = BASE + passed * HEIGHT;
      const sign = direction === "up" ? 1 : -1;
      list.element.scrollTop = rest - sign * 100;
      mouse(list.element, "pointerdown", 300);
      mouse(list.element, "pointermove", 300 - sign * 100);
      mouse(list.element, "pointerup", 300 - sign * 100);
    };

    const prepare = (): {
      list: MonthList;
      core: CoreState;
      scrollTo: ReturnType<typeof vi.fn>;
    } => {
      const { list, core } = mount();
      stubLayout(list);
      const scrollTo = vi.fn();
      list.element.scrollTo = scrollTo;
      return { list, core, scrollTo };
    };

    const smoothTop = (scrollTo: ReturnType<typeof vi.fn>): number => {
      expect(scrollTo).toHaveBeenCalledTimes(1);
      const arg = scrollTo.mock.calls[0]?.[0] as ScrollToOptions;
      expect(arg.behavior).toBe("smooth");
      return arg.top ?? Number.NaN;
    };

    it.each([
      ["up", 0.25, BASE],
      ["up", 0.3, BASE + HEIGHT],
      ["down", 0.7, BASE],
      ["down", 0.75, BASE + HEIGHT],
    ] as const)(
      "a drag %s ending %s through a month smooths to scrollTop %s",
      (direction, passed, expected) => {
        const { list, scrollTo } = prepare();
        dragFrom(list, passed, direction);
        expect(smoothTop(scrollTo)).toBeCloseTo(expected, 5);
      },
    );

    it("jumps instead of scrolling smoothly when animation is off", () => {
      const { list, core, scrollTo } = prepare();
      core.setOptions({ ui: { animation: false } });
      dragFrom(list, 0.3, "up");
      expect(scrollTo).not.toHaveBeenCalled();
      expect(list.element.scrollTop).toBeCloseTo(BASE + HEIGHT, 5);
    });
  });

  it("destroy removes the scroll listener", () => {
    const { list, render } = mount();
    defineScroll(list, 850);
    list.destroy();
    const before = render.mock.calls.length;
    scrollAndFlush(list);
    expect(render.mock.calls.length).toBe(before);
  });
});
