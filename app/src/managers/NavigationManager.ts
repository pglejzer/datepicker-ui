import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

export class NavigationManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private eventHandlers: Map<string, EventListener> = new Map();
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isSwiping: boolean = false;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  bindSwipeEvents(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    const onTouchStart = (e: TouchEvent) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isSwiping = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - this.touchStartX;
      const deltaY = e.touches[0].clientY - this.touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        this.isSwiping = true;
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!this.isSwiping) return;

      const deltaX = e.changedTouches[0].clientX - this.touchStartX;

      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.emitter.emit("navigate:prev", {});
        } else {
          this.emitter.emit("navigate:next", {});
        }
      }

      this.isSwiping = false;
    };

    calendarContainer.addEventListener(
      "touchstart",
      onTouchStart as EventListener,
      { passive: true },
    );
    calendarContainer.addEventListener(
      "touchmove",
      onTouchMove as EventListener,
      { passive: false },
    );
    calendarContainer.addEventListener(
      "touchend",
      onTouchEnd as EventListener,
      { passive: true },
    );

    this.eventHandlers.set("swipe-start", onTouchStart as EventListener);
    this.eventHandlers.set("swipe-move", onTouchMove as EventListener);
    this.eventHandlers.set("swipe-end", onTouchEnd as EventListener);
  }

  destroy(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    if (this.eventHandlers.has("swipe-start")) {
      calendarContainer.removeEventListener(
        "touchstart",
        this.eventHandlers.get("swipe-start")!,
      );
    }
    if (this.eventHandlers.has("swipe-move")) {
      calendarContainer.removeEventListener(
        "touchmove",
        this.eventHandlers.get("swipe-move")!,
      );
    }
    if (this.eventHandlers.has("swipe-end")) {
      calendarContainer.removeEventListener(
        "touchend",
        this.eventHandlers.get("swipe-end")!,
      );
    }

    this.eventHandlers.clear();
  }
}
