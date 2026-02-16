import type { SwipeConfig, SwipeState } from "./SwipeTypes";

export type SwipeStartCallback = (clientX: number, clientY: number) => void;
export type SwipeMoveCallback = (clientX: number) => void;
export type SwipeEndCallback = (clientX: number) => void;
export type SwipeCancelCallback = () => void;

const SWIPE_START_THRESHOLD = 10;

export class SwipeEventHandlers {
  private config: SwipeConfig;
  private boundHandlers: Map<string, EventListener> = new Map();
  private onStart: SwipeStartCallback;
  private onMove: SwipeMoveCallback;
  private onEnd: SwipeEndCallback;
  private onCancel: SwipeCancelCallback;
  private getSwipeState: () => SwipeState;
  private pendingTouchStart: { x: number; y: number } | null = null;
  private swipeStarted: boolean = false;

  constructor(
    config: SwipeConfig,
    callbacks: {
      onStart: SwipeStartCallback;
      onMove: SwipeMoveCallback;
      onEnd: SwipeEndCallback;
      onCancel: SwipeCancelCallback;
      getSwipeState: () => SwipeState;
    },
  ) {
    this.config = config;
    this.onStart = callbacks.onStart;
    this.onMove = callbacks.onMove;
    this.onEnd = callbacks.onEnd;
    this.onCancel = callbacks.onCancel;
    this.getSwipeState = callbacks.getSwipeState;
  }

  updateConfig(config: SwipeConfig): void {
    this.config = config;
  }

  /**
   * Check if current view is "days" - swipe only works in day view
   * Looks for data-view attribute on modal or wrapper
   */
  private isDaysView(container: HTMLElement): boolean {
    const modal = container.closest(".dp-ui__modal");
    const wrapper = container.closest(".dp-ui__wrapper");
    const target = modal || wrapper;
    if (!target) return true;
    const view = target.getAttribute("data-view");
    return view === "days" || view === null;
  }

  bindTouchEvents(container: HTMLElement): void {
    const onTouchStart = (e: TouchEvent): void => {
      if (!this.config.enabled) return;
      if (!this.isDaysView(container)) return;

      const target = e.target as HTMLElement;
      if (
        target.closest(".dp-ui__month-nav-btn") ||
        target.closest(".dp-ui__unified-picker-toggle")
      )
        return;

      const touch = e.touches[0];
      if (!touch) return;

      this.pendingTouchStart = { x: touch.clientX, y: touch.clientY };
      this.swipeStarted = false;
    };

    const onTouchMove = (e: TouchEvent): void => {
      const touch = e.touches[0];
      if (!touch) return;

      const state = this.getSwipeState();
      if (state.isActive) {
        const deltaX = touch.clientX - state.startX;
        const deltaY = touch.clientY - state.startY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (e.cancelable) {
            e.preventDefault();
          }
          this.onMove(touch.clientX);
        } else if (Math.abs(deltaY) > 20) {
          this.onCancel();
          this.pendingTouchStart = null;
          this.swipeStarted = false;
        }
        return;
      }

      if (!this.pendingTouchStart) return;

      const deltaX = touch.clientX - this.pendingTouchStart.x;
      const deltaY = touch.clientY - this.pendingTouchStart.y;

      if (
        Math.abs(deltaY) > SWIPE_START_THRESHOLD &&
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        this.pendingTouchStart = null;
        return;
      }

      if (
        Math.abs(deltaX) > SWIPE_START_THRESHOLD &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        if (e.cancelable) {
          e.preventDefault();
        }
        this.swipeStarted = true;
        this.onStart(this.pendingTouchStart.x, this.pendingTouchStart.y);
        this.onMove(touch.clientX);
      }
    };

    const onTouchEnd = (e: TouchEvent): void => {
      const wasPending = this.pendingTouchStart !== null;
      this.pendingTouchStart = null;

      const state = this.getSwipeState();
      if (!state.isActive) {
        this.swipeStarted = false;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        this.swipeStarted = false;
        return;
      }

      this.onEnd(touch.clientX);
      this.swipeStarted = false;
    };

    const onTouchCancel = (): void => {
      this.pendingTouchStart = null;
      this.swipeStarted = false;

      const state = this.getSwipeState();
      if (state.isActive) {
        this.onCancel();
      }
    };

    container.addEventListener("touchstart", onTouchStart as EventListener, {
      passive: true,
    });
    container.addEventListener("touchmove", onTouchMove as EventListener, {
      passive: false,
    });
    container.addEventListener("touchend", onTouchEnd as EventListener, {
      passive: true,
    });
    container.addEventListener("touchcancel", onTouchCancel as EventListener, {
      passive: true,
    });

    this.boundHandlers.set("touchstart", onTouchStart as EventListener);
    this.boundHandlers.set("touchmove", onTouchMove as EventListener);
    this.boundHandlers.set("touchend", onTouchEnd as EventListener);
    this.boundHandlers.set("touchcancel", onTouchCancel as EventListener);
  }

  bindMouseEvents(container: HTMLElement): void {
    let pendingMouseStart: { x: number; y: number } | null = null;
    let mouseSwipeStarted = false;

    const onMouseMove = (e: MouseEvent): void => {
      const state = this.getSwipeState();

      if (state.isActive) {
        e.preventDefault();
        this.onMove(e.clientX);
        return;
      }

      if (!pendingMouseStart) return;

      const deltaX = e.clientX - pendingMouseStart.x;
      const deltaY = e.clientY - pendingMouseStart.y;

      if (
        Math.abs(deltaY) > SWIPE_START_THRESHOLD &&
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        pendingMouseStart = null;
        document.removeEventListener("mousemove", onMouseMove as EventListener);
        document.removeEventListener("mouseup", onMouseUp as EventListener);
        return;
      }

      if (
        Math.abs(deltaX) > SWIPE_START_THRESHOLD &&
        Math.abs(deltaX) > Math.abs(deltaY)
      ) {
        e.preventDefault();
        mouseSwipeStarted = true;
        this.onStart(pendingMouseStart.x, pendingMouseStart.y);
        this.onMove(e.clientX);
      }
    };

    const onMouseUp = (e: MouseEvent): void => {
      document.removeEventListener("mousemove", onMouseMove as EventListener);
      document.removeEventListener("mouseup", onMouseUp as EventListener);

      pendingMouseStart = null;

      const state = this.getSwipeState();
      if (!state.isActive) {
        mouseSwipeStarted = false;
        return;
      }

      this.onEnd(e.clientX);
      mouseSwipeStarted = false;
    };

    const onMouseDown = (e: MouseEvent): void => {
      if (!this.config.enabled) return;
      if (!this.isDaysView(container)) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (
        target.closest(".dp-ui__month-nav-btn") ||
        target.closest(".dp-ui__unified-picker-toggle")
      )
        return;

      pendingMouseStart = { x: e.clientX, y: e.clientY };
      mouseSwipeStarted = false;

      document.addEventListener("mousemove", onMouseMove as EventListener);
      document.addEventListener("mouseup", onMouseUp as EventListener);
    };

    container.addEventListener("mousedown", onMouseDown as EventListener);
    this.boundHandlers.set("mousedown", onMouseDown as EventListener);
    this.boundHandlers.set("mousemove", onMouseMove as EventListener);
    this.boundHandlers.set("mouseup", onMouseUp as EventListener);
  }

  unbind(container: Element): void {
    const touchStartHandler = this.boundHandlers.get("touchstart");
    const touchMoveHandler = this.boundHandlers.get("touchmove");
    const touchEndHandler = this.boundHandlers.get("touchend");
    const touchCancelHandler = this.boundHandlers.get("touchcancel");
    const mouseDownHandler = this.boundHandlers.get("mousedown");

    if (touchStartHandler) {
      container.removeEventListener("touchstart", touchStartHandler);
    }
    if (touchMoveHandler) {
      container.removeEventListener("touchmove", touchMoveHandler);
    }
    if (touchEndHandler) {
      container.removeEventListener("touchend", touchEndHandler);
    }
    if (touchCancelHandler) {
      container.removeEventListener("touchcancel", touchCancelHandler);
    }
    if (mouseDownHandler) {
      container.removeEventListener("mousedown", mouseDownHandler);
    }

    this.boundHandlers.clear();
  }
}
