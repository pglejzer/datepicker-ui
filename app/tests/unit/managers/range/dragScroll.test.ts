import { afterEach, describe, expect, it, vi } from "vitest";
import { GESTURE } from "@/constants/timings";
import {
  bindDragScroll,
  type DragScrollOptions,
} from "@/managers/range/dragScroll";

const row = (scrollWidth: number): HTMLDivElement => {
  const element = document.createElement("div");
  Object.defineProperty(element, "scrollWidth", { value: scrollWidth });
  Object.defineProperty(element, "clientWidth", { value: 300 });
  Object.defineProperty(element, "scrollLeft", { value: 0, writable: true });
  const chip = document.createElement("button");
  element.append(chip);
  document.body.append(element);
  return element;
};

const pointer = (
  target: Element,
  type: string,
  clientX: number,
  pointerType = "mouse",
): void => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    button: 0,
  });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
};

describe("bindDragScroll", () => {
  let controller: AbortController;

  afterEach(() => {
    controller.abort();
    document.body.innerHTML = "";
  });

  const bind = (element: HTMLElement): void => {
    controller = new AbortController();
    bindDragScroll(element, controller.signal);
  };

  it("turns a vertical wheel into a sideways scroll", () => {
    const element = row(800);
    bind(element);
    const event = new WheelEvent("wheel", { deltaY: 40, cancelable: true });
    element.dispatchEvent(event);
    expect(element.scrollLeft).toBe(40);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves the wheel alone when nothing overflows", () => {
    const element = row(300);
    bind(element);
    const event = new WheelEvent("wheel", { deltaY: 40, cancelable: true });
    element.dispatchEvent(event);
    expect(element.scrollLeft).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it("drags with the mouse and swallows the click that ends the drag", () => {
    const element = row(800);
    bind(element);
    const chip = element.querySelector("button");
    const onClick = vi.fn();
    chip?.addEventListener("click", onClick);

    pointer(element, "pointerdown", 200);
    pointer(element, "pointermove", 120);
    pointer(element, "pointerup", 120);
    chip?.click();

    expect(element.scrollLeft).toBe(80);
    expect(onClick).not.toHaveBeenCalled();

    chip?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("scrolls incrementally on the x axis after the content shifts", () => {
    const element = row(2000);
    bind(element);
    pointer(element, "pointerdown", 500);
    pointer(element, "pointermove", 400);
    expect(element.scrollLeft).toBe(100);

    element.scrollLeft += 400;
    pointer(element, "pointermove", 390);
    expect(element.scrollLeft).toBe(510);
  });

  it("keeps a click when the mouse barely moves", () => {
    const element = row(800);
    bind(element);
    const chip = element.querySelector("button");
    const onClick = vi.fn();
    chip?.addEventListener("click", onClick);

    pointer(element, "pointerdown", 200);
    pointer(element, "pointermove", 197);
    pointer(element, "pointerup", 197);
    chip?.click();

    expect(element.scrollLeft).toBe(0);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("leaves touch to the browser's native scrolling", () => {
    const element = row(800);
    bind(element);
    pointer(element, "pointerdown", 200, "touch");
    pointer(element, "pointermove", 100, "touch");
    expect(element.scrollLeft).toBe(0);
  });

  describe("vertical axis", () => {
    const column = (scrollHeight: number): HTMLDivElement => {
      const element = document.createElement("div");
      Object.defineProperty(element, "scrollHeight", { value: scrollHeight });
      Object.defineProperty(element, "clientHeight", { value: 300 });
      Object.defineProperty(element, "scrollTop", {
        value: 0,
        writable: true,
      });
      Object.defineProperty(element, "scrollLeft", {
        value: 0,
        writable: true,
      });
      element.append(document.createElement("button"));
      document.body.append(element);
      return element;
    };

    const pointerY = (
      target: Element,
      type: string,
      clientY: number,
      pointerType = "mouse",
    ): void => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientY,
        button: 0,
      });
      Object.defineProperty(event, "pointerId", { value: 1 });
      Object.defineProperty(event, "pointerType", { value: pointerType });
      target.dispatchEvent(event);
    };

    const bindY = (element: HTMLElement, options?: DragScrollOptions): void => {
      controller = new AbortController();
      bindDragScroll(element, controller.signal, "y", options);
    };

    it("applies the full delta from the start on the first move past the threshold", () => {
      const element = column(2000);
      bindY(element);
      element.scrollTop = 500;
      pointerY(element, "pointerdown", 300);
      pointerY(element, "pointermove", 300 - GESTURE.DRAG_START_PX - 4);
      expect(element.scrollTop).toBe(500 + GESTURE.DRAG_START_PX + 4);
    });

    it("scrolls incrementally after the content shifts under the drag (no runaway)", () => {
      const element = column(2000);
      bindY(element);
      pointerY(element, "pointerdown", 500);
      pointerY(element, "pointermove", 400);
      expect(element.scrollTop).toBe(100);

      element.scrollTop += 400;
      pointerY(element, "pointermove", 390);
      expect(element.scrollTop).toBe(510);

      pointerY(element, "pointermove", 395);
      expect(element.scrollTop).toBe(505);
    });

    it("keeps the drag going when setPointerCapture throws NotFoundError", () => {
      const element = column(2000);
      bindY(element);
      element.setPointerCapture = vi.fn(() => {
        throw new DOMException("no such pointer", "NotFoundError");
      });
      pointerY(element, "pointerdown", 300);
      expect(() => {
        pointerY(element, "pointermove", 200);
      }).not.toThrow();
      expect(element.scrollTop).toBe(100);
      pointerY(element, "pointermove", 150);
      expect(element.scrollTop).toBe(150);
    });

    describe("onDragEnd", () => {
      it("reports 1 after an upward drag", () => {
        const element = column(2000);
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        pointerY(element, "pointerdown", 300);
        pointerY(element, "pointermove", 200);
        pointerY(element, "pointerup", 200);
        expect(onDragEnd).toHaveBeenCalledTimes(1);
        expect(onDragEnd).toHaveBeenCalledWith(1);
      });

      it("reports -1 after a downward drag", () => {
        const element = column(2000);
        element.scrollTop = 500;
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        pointerY(element, "pointerdown", 200);
        pointerY(element, "pointermove", 300);
        pointerY(element, "pointerup", 300);
        expect(onDragEnd).toHaveBeenCalledWith(-1);
      });

      it("is not called below the drag threshold", () => {
        const element = column(2000);
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        pointerY(element, "pointerdown", 200);
        pointerY(element, "pointermove", 200 - GESTURE.DRAG_START_PX + 1);
        pointerY(element, "pointerup", 200 - GESTURE.DRAG_START_PX + 1);
        expect(onDragEnd).not.toHaveBeenCalled();
      });

      it("is not called on pointercancel", () => {
        const element = column(2000);
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        pointerY(element, "pointerdown", 300);
        pointerY(element, "pointermove", 200);
        pointerY(element, "pointercancel", 200);
        expect(onDragEnd).not.toHaveBeenCalled();
      });

      it("is not called for touch or pen", () => {
        const element = column(2000);
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        for (const type of ["touch", "pen"]) {
          pointerY(element, "pointerdown", 300, type);
          pointerY(element, "pointermove", 200, type);
          pointerY(element, "pointerup", 200, type);
        }
        expect(onDragEnd).not.toHaveBeenCalled();
      });

      it("works without the option", () => {
        const element = column(2000);
        bindY(element);
        pointerY(element, "pointerdown", 300);
        pointerY(element, "pointermove", 200);
        expect(() => {
          pointerY(element, "pointerup", 200);
        }).not.toThrow();
      });

      it("still swallows the click after a drag that reported its end", () => {
        const element = column(2000);
        const onDragEnd = vi.fn();
        bindY(element, { onDragEnd });
        const button = element.querySelector("button");
        const onClick = vi.fn();
        button?.addEventListener("click", onClick);
        pointerY(element, "pointerdown", 300);
        pointerY(element, "pointermove", 200);
        pointerY(element, "pointerup", 200);
        button?.click();
        expect(onDragEnd).toHaveBeenCalledTimes(1);
        expect(onClick).not.toHaveBeenCalled();
      });
    });

    it("scrolls up and down with a mouse drag", () => {
      const element = column(2000);
      bindY(element);
      element.scrollTop = 500;

      pointerY(element, "pointerdown", 200);
      pointerY(element, "pointermove", 120);
      expect(element.scrollTop).toBe(580);
      pointerY(element, "pointermove", 260);
      expect(element.scrollTop).toBe(440);
      pointerY(element, "pointerup", 260);
    });

    it("swallows the click that ends a real drag, once", () => {
      const element = column(2000);
      bindY(element);
      const button = element.querySelector("button");
      const onClick = vi.fn();
      button?.addEventListener("click", onClick);

      pointerY(element, "pointerdown", 200);
      pointerY(element, "pointermove", 100);
      pointerY(element, "pointerup", 100);
      button?.click();
      expect(onClick).not.toHaveBeenCalled();

      button?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("keeps the click when the mouse moves less than the threshold", () => {
      const element = column(2000);
      bindY(element);
      const button = element.querySelector("button");
      const onClick = vi.fn();
      button?.addEventListener("click", onClick);

      pointerY(element, "pointerdown", 200);
      pointerY(element, "pointermove", 200 - GESTURE.DRAG_START_PX + 1);
      pointerY(element, "pointerup", 200 - GESTURE.DRAG_START_PX + 1);
      button?.click();

      expect(element.scrollTop).toBe(0);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("ignores touch and pen pointers", () => {
      const element = column(2000);
      bindY(element);
      pointerY(element, "pointerdown", 200, "touch");
      pointerY(element, "pointermove", 100, "touch");
      pointerY(element, "pointerup", 100, "touch");
      pointerY(element, "pointerdown", 200, "pen");
      pointerY(element, "pointermove", 100, "pen");
      expect(element.scrollTop).toBe(0);
    });

    it("does nothing when the element does not overflow vertically", () => {
      const element = column(300);
      bindY(element);
      pointerY(element, "pointerdown", 200);
      pointerY(element, "pointermove", 100);
      expect(element.scrollTop).toBe(0);
    });

    it("adds no wheel handling", () => {
      const element = column(2000);
      bindY(element);
      const event = new WheelEvent("wheel", { deltaY: 40, cancelable: true });
      element.dispatchEvent(event);
      expect(element.scrollLeft).toBe(0);
      expect(element.scrollTop).toBe(0);
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
