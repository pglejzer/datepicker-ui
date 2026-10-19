import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MonthPager,
  resolveDragCommit,
  type MonthPagerOptions,
} from "@/managers/swipe/MonthPager";
import type { YearMonth } from "@/types/date";

const WIDTH = 360;

const pointer = (type: string, clientX: number, target: EventTarget): void => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY: 100,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: "touch" },
    isPrimary: { value: true },
  });
  target.dispatchEvent(event);
};

describe("resolveDragCommit", () => {
  it("commits next past a quarter of the width", () => {
    expect(resolveDragCommit(-91, 0, WIDTH, false)).toBe(1);
  });

  it("does not commit below the threshold", () => {
    expect(resolveDragCommit(-89, 0, WIDTH, false)).toBe(0);
  });

  it("commits on a flick", () => {
    expect(resolveDragCommit(-20, -0.5, WIDTH, false)).toBe(1);
  });

  it("commits previous on a rightward drag", () => {
    expect(resolveDragCommit(100, 0, WIDTH, false)).toBe(-1);
  });

  it("negates the direction in RTL", () => {
    expect(resolveDragCommit(-100, 0, WIDTH, true)).toBe(-1);
  });
});

describe("MonthPager", () => {
  let viewport: HTMLElement;
  let onCommit: ReturnType<typeof vi.fn<MonthPagerOptions["onCommit"]>>;
  let pager: MonthPager;

  const pageKey = (v: YearMonth): string =>
    `${String(v.year)}-${String(v.month)}`;

  const build = (overrides: Partial<MonthPagerOptions> = {}): MonthPager => {
    const options: MonthPagerOptions = {
      rtl: false,
      swipe: true,
      animate: true,
      fitHeight: false,
      renderPage: (v) => {
        const page = document.createElement("div");
        page.className = "dp-ui__page";
        page.dataset.view = pageKey(v);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "test-cell";
        page.append(button);
        return page;
      },
      pageHeight: () => 300,
      onCommit,
      ...overrides,
    };
    return new MonthPager(viewport, options);
  };

  const track = (): HTMLElement => {
    const el = viewport.querySelector<HTMLElement>(".dp-ui__pager-track");
    if (!el) throw new Error("no track");
    return el;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    viewport = document.createElement("div");
    Object.defineProperty(viewport, "clientWidth", { value: WIDTH });
    document.body.append(viewport);
    onCommit = vi.fn<MonthPagerOptions["onCommit"]>();
    pager = build();
    pager.show({ year: 2026, month: 10 });
  });

  afterEach(() => {
    pager.destroy();
    viewport.remove();
    vi.useRealTimers();
  });

  it("renders previous, current and next pages on show", () => {
    const pages = [...viewport.querySelectorAll<HTMLElement>("[data-view]")];
    expect(pages.map((p) => p.dataset.view)).toEqual([
      "2026-9",
      "2026-10",
      "2026-11",
    ]);
  });

  it("sets touch-action pan-y on the viewport", () => {
    expect(viewport.style.touchAction).toBe("pan-y");
  });

  it("commits next after a leftward drag past the threshold", () => {
    pointer("pointerdown", 300, viewport);
    pointer("pointermove", 150, viewport);
    pointer("pointerup", 150, viewport);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1, "drag");
  });

  it("does not commit a 4 px press and lets the click reach the cell", () => {
    const button = viewport.querySelector<HTMLButtonElement>(".test-cell");
    if (!button) throw new Error("no button");
    const onClick = vi.fn();
    button.addEventListener("click", onClick);

    pointer("pointerdown", 200, button);
    pointer("pointermove", 204, viewport);
    pointer("pointerup", 204, viewport);
    button.click();

    expect(onCommit).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("commits next after a horizontal wheel settles", () => {
    viewport.dispatchEvent(
      new WheelEvent("wheel", {
        deltaX: 120,
        deltaY: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(90);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1, "wheel");
  });

  it("ignores a mostly vertical wheel", () => {
    viewport.dispatchEvent(
      new WheelEvent("wheel", { deltaX: 10, deltaY: 120, bubbles: true }),
    );
    vi.advanceTimersByTime(500);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("ends on the last view after two quick slides", () => {
    pager.slide({ year: 2026, month: 11 }, 1);
    pager.slide({ year: 2026, month: 12 }, 1);
    pager.finish();
    const pages = [...track().querySelectorAll<HTMLElement>("[data-view]")];
    expect(pages[1]?.dataset.view).toBe("2026-12");
  });

  it("replaces the neighbour when the jump is larger than one month", () => {
    pager.slide({ year: 2027, month: 3 }, 1);
    pager.finish();
    const pages = [...track().querySelectorAll<HTMLElement>("[data-view]")];
    expect(pages.map((p) => p.dataset.view)).toContain("2027-3");
    expect(pages[1]?.dataset.view).toBe("2027-3");
  });

  it("does not throw or commit when destroyed mid-drag", () => {
    pointer("pointerdown", 300, viewport);
    pointer("pointermove", 150, viewport);
    pager.destroy();
    expect(() => {
      pointer("pointerup", 150, viewport);
      pointer("pointerup", 150, document);
    }).not.toThrow();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not translate the track when swipe is false", () => {
    pager.destroy();
    viewport.replaceChildren();
    pager = build({ swipe: false });
    pager.show({ year: 2026, month: 10 });
    pointer("pointerdown", 300, viewport);
    pointer("pointermove", 150, viewport);
    expect(track().style.transform).not.toMatch(/-?150px/);
    pointer("pointerup", 150, viewport);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
