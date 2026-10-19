import { GESTURE } from "@/constants/timings";

export type DragScrollAxis = "x" | "y";

const scrolls = (element: HTMLElement, axis: DragScrollAxis): boolean =>
  axis === "x"
    ? element.scrollWidth > element.clientWidth
    : element.scrollHeight > element.clientHeight;

const coordinate = (event: PointerEvent, axis: DragScrollAxis): number =>
  axis === "x" ? event.clientX : event.clientY;

const capture = (element: HTMLElement, pointerId: number): void => {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    return;
  }
};

const scrollBy = (
  element: HTMLElement,
  axis: DragScrollAxis,
  amount: number,
): void => {
  if (axis === "x") {
    element.scrollLeft += amount;
  } else {
    element.scrollTop += amount;
  }
};

export interface DragScrollOptions {
  readonly onDragEnd?: (direction: 1 | -1) => void;
}

export const bindDragScroll = (
  element: HTMLElement,
  signal: AbortSignal,
  axis: DragScrollAxis = "x",
  options: DragScrollOptions = {},
): void => {
  let pointer: number | null = null;
  let start = 0;
  let last = 0;
  let total = 0;
  let dragged = false;

  if (axis === "x") {
    element.addEventListener(
      "wheel",
      (event) => {
        if (!scrolls(element, axis)) return;
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        element.scrollLeft += event.deltaY;
      },
      { signal, passive: false },
    );
  }

  element.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (!scrolls(element, axis)) return;
      pointer = event.pointerId;
      start = coordinate(event, axis);
      last = start;
      total = 0;
      dragged = false;
    },
    { signal },
  );

  element.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerId !== pointer) return;
      const current = coordinate(event, axis);
      total = current - start;
      if (!dragged && Math.abs(total) < GESTURE.DRAG_START_PX) return;
      if (!dragged) {
        dragged = true;
        capture(element, event.pointerId);
      }
      scrollBy(element, axis, last - current);
      last = current;
    },
    { signal },
  );

  element.addEventListener(
    "selectstart",
    (event) => {
      if (pointer !== null) event.preventDefault();
    },
    { signal },
  );

  const end = (event: PointerEvent): void => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    if (dragged && event.type === "pointerup" && total !== 0) {
      options.onDragEnd?.(total < 0 ? 1 : -1);
    }
  };
  element.addEventListener("pointerup", end, { signal });
  element.addEventListener("pointercancel", end, { signal });

  element.addEventListener(
    "click",
    (event) => {
      if (!dragged) return;
      dragged = false;
      event.stopPropagation();
      event.preventDefault();
    },
    { signal, capture: true },
  );
};
