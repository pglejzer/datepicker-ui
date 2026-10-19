import { GESTURE } from "@/constants/timings";

interface Sample {
  readonly x: number;
  readonly t: number;
}

interface Session {
  readonly pointerId: number;
  readonly startX: number;
  readonly samples: Sample[];
  readonly controller: AbortController;
  lastX: number;
  width: number;
  dragging: boolean;
}

export interface DragRelease {
  readonly dx: number;
  readonly velocity: number;
  readonly width: number;
}

export interface DragGestureHandlers {
  pageWidth(): number;
  onBegin(): void;
  onMove(dx: number, width: number): void;
  onRelease(release: DragRelease): void;
  onAbort(): void;
}

export interface DragGesture {
  isDragging(): boolean;
  cancel(): void;
  dispose(): void;
}

export const DRAGGING_CLASS = "dp-ui__pager--dragging";

const startsOnButton = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest("button") !== null;

const pushSample = (samples: Sample[], sample: Sample): void => {
  samples.push(sample);
  if (samples.length > GESTURE.VELOCITY_SAMPLES) samples.shift();
};

const velocityOf = (samples: readonly Sample[]): number => {
  const first = samples.at(0);
  const last = samples.at(-1);
  if (!first || !last) return 0;
  return (
    (last.x - first.x) / Math.max(GESTURE.MIN_SAMPLE_SPAN_MS, last.t - first.t)
  );
};

const capturePointer = (element: HTMLElement, pointerId: number): void => {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    return;
  }
};

const releasePointer = (element: HTMLElement, pointerId: number): void => {
  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
};

export const createDragGesture = (
  viewport: HTMLElement,
  signal: AbortSignal,
  handlers: DragGestureHandlers,
): DragGesture => {
  let session: Session | null = null;
  let clickGuard: AbortController | null = null;

  const endSession = (ended: Session): void => {
    ended.controller.abort();
    if (session === ended) session = null;
    if (!ended.dragging) return;
    viewport.classList.remove(DRAGGING_CLASS);
    releasePointer(viewport, ended.pointerId);
  };

  const guardClick = (): void => {
    clickGuard?.abort();
    const guard = new AbortController();
    clickGuard = guard;
    viewport.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        guard.abort();
      },
      { capture: true, signal: guard.signal },
    );
    requestAnimationFrame(() => {
      guard.abort();
    });
  };

  const beginDrag = (active: Session): void => {
    handlers.onBegin();
    active.dragging = true;
    active.width = handlers.pageWidth();
    capturePointer(viewport, active.pointerId);
    viewport.classList.add(DRAGGING_CLASS);
  };

  const onMove = (active: Session, event: PointerEvent): void => {
    if (event.pointerId !== active.pointerId) return;
    const dx = event.clientX - active.startX;
    if (!active.dragging) {
      if (Math.abs(dx) <= GESTURE.DRAG_START_PX) return;
      beginDrag(active);
    }
    active.lastX = event.clientX;
    pushSample(active.samples, { x: event.clientX, t: event.timeStamp });
    handlers.onMove(dx, active.width);
  };

  const onEnd = (
    active: Session,
    event: PointerEvent,
    cancelled: boolean,
  ): void => {
    if (event.pointerId !== active.pointerId) return;
    endSession(active);
    if (!active.dragging) return;
    if (cancelled) {
      handlers.onAbort();
      return;
    }
    guardClick();
    pushSample(active.samples, { x: active.lastX, t: event.timeStamp });
    handlers.onRelease({
      dx: active.lastX - active.startX,
      velocity: velocityOf(active.samples),
      width: active.width,
    });
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) return;
    if (startsOnButton(event.target)) return;
    const stale = session;
    if (stale) {
      endSession(stale);
      if (stale.dragging) handlers.onAbort();
    }
    const controller = new AbortController();
    const active: Session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      samples: [{ x: event.clientX, t: event.timeStamp }],
      controller,
      lastX: event.clientX,
      width: 0,
      dragging: false,
    };
    session = active;
    const doc = viewport.ownerDocument;
    const listenerOptions = { signal: controller.signal };
    doc.addEventListener(
      "pointermove",
      (moveEvent) => {
        onMove(active, moveEvent);
      },
      listenerOptions,
    );
    doc.addEventListener(
      "pointerup",
      (upEvent) => {
        onEnd(active, upEvent, false);
      },
      listenerOptions,
    );
    doc.addEventListener(
      "pointercancel",
      (cancelEvent) => {
        onEnd(active, cancelEvent, true);
      },
      listenerOptions,
    );
  };

  viewport.addEventListener("pointerdown", onPointerDown, { signal });

  const cancel = (): void => {
    if (session) endSession(session);
  };

  return {
    isDragging: () => session?.dragging === true,
    cancel,
    dispose: () => {
      cancel();
      clickGuard?.abort();
      clickGuard = null;
    },
  };
};
