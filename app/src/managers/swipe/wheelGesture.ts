import { TIMINGS } from "@/constants/timings";

export interface WheelGestureHandlers {
  pageWidth(): number;
  isBlocked(): boolean;
  onBegin(): void;
  onMove(offset: number, width: number): void;
  onSettle(delta: number, width: number): void;
}

export interface WheelGesture {
  cancel(): void;
}

const DOM_DELTA_PIXEL = 0;

const clamp = (value: number, limit: number): number =>
  Math.min(limit, Math.max(-limit, value));

const wheelDistance = (event: WheelEvent, width: number): number =>
  event.deltaMode === DOM_DELTA_PIXEL
    ? event.deltaX
    : Math.sign(event.deltaX) * width;

export const createWheelGesture = (
  viewport: HTMLElement,
  signal: AbortSignal,
  handlers: WheelGestureHandlers,
): WheelGesture => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let delta = 0;

  const settle = (): void => {
    timer = null;
    const settled = delta;
    delta = 0;
    handlers.onSettle(settled, handlers.pageWidth());
  };

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    delta = 0;
  };

  const onWheel = (event: WheelEvent): void => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (handlers.isBlocked()) return;
    event.preventDefault();
    const width = handlers.pageWidth();
    if (timer === null) {
      handlers.onBegin();
    } else {
      clearTimeout(timer);
    }
    delta -= wheelDistance(event, width);
    handlers.onMove(clamp(delta, width), width);
    timer = setTimeout(settle, TIMINGS.WHEEL_SETTLE);
  };

  viewport.addEventListener("wheel", onWheel, { passive: false, signal });

  return { cancel };
};
