import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Pager,
  resolveDragCommit,
  type PagerOptions,
} from "@/managers/swipe/Pager";
import { isSameMonth } from "@/managers/swipe/pageStrip";
import { addDays, addMonths, isSameDay, toISO } from "@/utils/date/plainDate";
import type { PlainDate, YearMonth } from "@/types/date";

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

const makeViewport = (): HTMLElement => {
  const viewport = document.createElement("div");
  Object.defineProperty(viewport, "clientWidth", { value: WIDTH });
  document.body.append(viewport);
  return viewport;
};

const trackOf = (viewport: HTMLElement): HTMLElement => {
  const el = viewport.querySelector<HTMLElement>(".dp-ui__pager-track");
  if (!el) throw new Error("no track");
  return el;
};

const keysOf = (viewport: HTMLElement): (string | undefined)[] =>
  [...trackOf(viewport).querySelectorAll<HTMLElement>("[data-view]")].map(
    (p) => p.dataset.view,
  );

const page = (label: string): HTMLElement => {
  const el = document.createElement("div");
  el.className = "dp-ui__page";
  el.dataset.view = label;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "test-cell";
  el.append(button);
  return el;
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

describe("Pager<YearMonth>", () => {
  let viewport: HTMLElement;
  let onCommit: ReturnType<typeof vi.fn<PagerOptions<YearMonth>["onCommit"]>>;
  let pager: Pager<YearMonth>;

  const pageKey = (v: YearMonth): string =>
    `${String(v.year)}-${String(v.month)}`;

  const build = (
    overrides: Partial<PagerOptions<YearMonth>> = {},
  ): Pager<YearMonth> =>
    new Pager<YearMonth>(viewport, {
      rtl: false,
      swipe: true,
      animate: true,
      fitHeight: false,
      renderPage: (v) => page(pageKey(v)),
      pageHeight: () => 300,
      step: (v, d) => addMonths(v, d),
      isSame: isSameMonth,
      onCommit,
      ...overrides,
    });

  const track = (): HTMLElement => trackOf(viewport);

  beforeEach(() => {
    vi.useFakeTimers();
    viewport = makeViewport();
    onCommit = vi.fn<PagerOptions<YearMonth>["onCommit"]>();
    pager = build();
    pager.show({ year: 2026, month: 10 });
  });

  afterEach(() => {
    pager.destroy();
    viewport.remove();
    vi.useRealTimers();
  });

  it("renders previous, current and next pages on show", () => {
    expect(keysOf(viewport)).toEqual(["2026-9", "2026-10", "2026-11"]);
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

  it("adds the swipe class only with swipe, and removes it on destroy", () => {
    expect(viewport.classList.contains("dp-ui__pager--swipe")).toBe(true);
    pager.destroy();
    expect(viewport.classList.contains("dp-ui__pager--swipe")).toBe(false);

    viewport.replaceChildren();
    pager = build({ swipe: false });
    expect(viewport.classList.contains("dp-ui__pager--swipe")).toBe(false);
    expect(viewport.style.touchAction).not.toBe("pan-y");
  });

  describe("RTL", () => {
    beforeEach(() => {
      pager.destroy();
      viewport.replaceChildren();
      pager = build({ rtl: true });
      pager.show({ year: 2026, month: 10 });
    });

    it("commits previous after a leftward drag", () => {
      pointer("pointerdown", 300, viewport);
      pointer("pointermove", 150, viewport);
      pointer("pointerup", 150, viewport);
      expect(onCommit).toHaveBeenCalledWith(-1, "drag");
    });

    it("commits next after a rightward drag", () => {
      pointer("pointerdown", 150, viewport);
      pointer("pointermove", 300, viewport);
      pointer("pointerup", 300, viewport);
      expect(onCommit).toHaveBeenCalledWith(1, "drag");
    });

    it("slides toward the positive side", () => {
      const animate = vi.spyOn(track(), "animate");
      pager.slide({ year: 2026, month: 11 }, 1);
      expect(animate).toHaveBeenCalledTimes(1);
      expect(animate.mock.calls[0]?.[0]).toEqual([
        { transform: `translateX(${String(WIDTH)}px)` },
        { transform: `translateX(${String(WIDTH * 2)}px)` },
      ]);
    });
  });

  describe("fitHeight", () => {
    it("never calls pageHeight when fitHeight is false", () => {
      const pageHeight = vi.fn(() => 300);
      pager.destroy();
      viewport.replaceChildren();
      pager = build({ fitHeight: false, pageHeight });
      pager.show({ year: 2026, month: 10 });
      pager.slide({ year: 2026, month: 11 }, 1);
      pager.finish();
      expect(pageHeight).not.toHaveBeenCalled();
      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).toBe("");
    });

    it("never calls pageHeight when fitHeight is omitted", () => {
      const pageHeight = vi.fn(() => 300);
      pager.destroy();
      viewport.replaceChildren();
      pager = new Pager<YearMonth>(viewport, {
        rtl: false,
        swipe: true,
        animate: true,
        renderPage: (v) => page(pageKey(v)),
        pageHeight,
        step: (v, d) => addMonths(v, d),
        isSame: isSameMonth,
        onCommit,
      });
      pager.show({ year: 2026, month: 10 });
      expect(pageHeight).not.toHaveBeenCalled();
    });

    it("writes the page height with fitHeight", () => {
      pager.destroy();
      viewport.replaceChildren();
      pager = build({ fitHeight: true, pageHeight: () => 280 });
      pager.show({ year: 2026, month: 10 });
      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).toBe(
        "280px",
      );
    });
  });

  describe("width observer", () => {
    type ObserverCallback = (
      entries: { contentRect: { width: number } }[],
    ) => void;

    const original = globalThis.ResizeObserver;
    let callback: ObserverCallback | null;
    let observe: ReturnType<typeof vi.fn>;
    let disconnect: ReturnType<typeof vi.fn>;

    const resize = (width: number): void => {
      if (callback === null) throw new Error("no observer");
      callback([{ contentRect: { width } }]);
    };

    beforeEach(() => {
      callback = null;
      observe = vi.fn();
      disconnect = vi.fn();
      class StubObserver {
        constructor(cb: ObserverCallback) {
          callback = cb;
        }
        observe = observe;
        unobserve = vi.fn();
        disconnect = disconnect;
      }
      globalThis.ResizeObserver =
        StubObserver as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = original;
    });

    const rebuild = (pageHeight: () => number): void => {
      pager.destroy();
      viewport.replaceChildren();
      pager = build({ fitHeight: true, pageHeight });
      pager.show({ year: 2026, month: 10 });
    };

    it("observes the viewport only with fitHeight", () => {
      pager.destroy();
      viewport.replaceChildren();
      pager = build({ fitHeight: false });
      expect(observe).not.toHaveBeenCalled();

      pager.destroy();
      viewport.replaceChildren();
      pager = build({ fitHeight: true });
      expect(observe).toHaveBeenCalledWith(viewport);
    });

    it("rewrites the fitted height when the width changes", () => {
      let height = 300;
      rebuild(() => height);
      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).toBe(
        "300px",
      );

      height = 420;
      resize(400);

      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).toBe(
        "420px",
      );
    });

    it("does not refit when the same width is reported twice", () => {
      let height = 300;
      rebuild(() => height);
      resize(400);
      height = 500;

      resize(400);

      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).not.toBe(
        "500px",
      );
      resize(401);
      expect(viewport.style.getPropertyValue("--dp-ui-pager-height")).toBe(
        "500px",
      );
    });

    it("disconnects on destroy", () => {
      rebuild(() => 300);
      pager.destroy();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});

describe("Pager<PlainDate> weeks", () => {
  let viewport: HTMLElement;
  let onCommit: ReturnType<typeof vi.fn<PagerOptions<PlainDate>["onCommit"]>>;
  let pager: Pager<PlainDate>;

  const start: PlainDate = { year: 2026, month: 10, day: 21 };

  beforeEach(() => {
    vi.useFakeTimers();
    viewport = makeViewport();
    onCommit = vi.fn<PagerOptions<PlainDate>["onCommit"]>();
    pager = new Pager<PlainDate>(viewport, {
      rtl: false,
      swipe: true,
      animate: true,
      renderPage: (d) => page(toISO(d)),
      step: (d, dir) => addDays(d, dir * 7),
      isSame: isSameDay,
      onCommit,
    });
    pager.show(start);
  });

  afterEach(() => {
    pager.destroy();
    viewport.remove();
    vi.useRealTimers();
  });

  it("renders the week before, the week and the week after", () => {
    expect(keysOf(viewport)).toEqual([
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
    ]);
  });

  it("slides to the next week and recenters on it", () => {
    pager.slide({ year: 2026, month: 10, day: 28 }, 1);
    pager.finish();
    expect(keysOf(viewport)).toEqual([
      "2026-10-21",
      "2026-10-28",
      "2026-11-04",
    ]);
  });

  it("slides back to the previous week", () => {
    pager.slide({ year: 2026, month: 10, day: 14 }, -1);
    pager.finish();
    expect(keysOf(viewport)).toEqual([
      "2026-10-07",
      "2026-10-14",
      "2026-10-21",
    ]);
  });

  it("does not slide to the key already shown", () => {
    pager.slide({ ...start }, 1);
    expect(keysOf(viewport)).toEqual([
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
    ]);
  });

  it("commits next on a leftward drag", () => {
    pointer("pointerdown", 300, viewport);
    pointer("pointermove", 150, viewport);
    pointer("pointerup", 150, viewport);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(1, "drag");
  });

  it("shows another week without animation", () => {
    pager.show({ year: 2026, month: 12, day: 30 });
    expect(keysOf(viewport)).toEqual([
      "2026-12-23",
      "2026-12-30",
      "2027-01-06",
    ]);
  });
});
