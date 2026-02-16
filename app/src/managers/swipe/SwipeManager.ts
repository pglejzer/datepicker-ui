import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";
import { TIMINGS, SWIPE_CONSTANTS } from "../../constants/timings";
import type { SwipeState, SwipeConfig } from "./SwipeTypes";
import { createInitialSwipeState } from "./SwipeTypes";
import { SwipeEventHandlers } from "./SwipeEventHandlers";
import { SwipePreview } from "./SwipePreview";

export class SwipeManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private swipeState: SwipeState;
  private config: SwipeConfig;
  private eventHandlers: SwipeEventHandlers;
  private preview: SwipePreview;
  private animationFrameId: number | null = null;
  private isRTL: boolean = false;
  private calendarWidth: number = 0;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
    this.swipeState = createInitialSwipeState();
    this.config = this.getConfig();
    this.preview = new SwipePreview(core, this.config);
    this.eventHandlers = new SwipeEventHandlers(this.config, {
      onStart: this.handleSwipeStart.bind(this),
      onMove: this.handleSwipeMove.bind(this),
      onEnd: this.handleSwipeEnd.bind(this),
      onCancel: this.handleSwipeCancel.bind(this),
      getSwipeState: () => this.swipeState,
    });
  }

  private getConfig(): SwipeConfig {
    const swipeOptions = this.core.options.ui.swipe;
    return {
      enabled: swipeOptions?.enabled ?? true,
      velocity: swipeOptions?.velocity ?? SWIPE_CONSTANTS.VELOCITY_THRESHOLD,
      snapDuration: swipeOptions?.snapDuration ?? TIMINGS.SWIPE_SNAP_DURATION,
      overlapPreview: swipeOptions?.overlapPreview ?? true,
      multipleMonthsJump: swipeOptions?.multipleMonthsJump ?? true,
      touchEnabled: swipeOptions?.touchEnabled ?? true,
      mouseEnabled: swipeOptions?.mouseEnabled ?? true,
      threshold:
        swipeOptions?.threshold ?? SWIPE_CONSTANTS.MIN_DISTANCE_THRESHOLD,
      resistance: swipeOptions?.resistance ?? SWIPE_CONSTANTS.RESISTANCE_FACTOR,
    };
  }

  init(): void {
    if (typeof window === "undefined") return;
    this.config = this.getConfig();
    this.preview.updateConfig(this.config);
    this.eventHandlers.updateConfig(this.config);
  }

  bind(): void {
    if (typeof window === "undefined") return;
    if (!this.config.enabled) return;

    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    this.isRTL = document.documentElement.dir === "rtl";
    this.calendarWidth = calendarContainer.clientWidth;
    this.preview.setCalendarWidth(this.calendarWidth);

    if (this.config.touchEnabled) {
      this.eventHandlers.bindTouchEvents(calendarContainer as HTMLElement);
    }
    if (this.config.mouseEnabled) {
      this.eventHandlers.bindMouseEvents(calendarContainer as HTMLElement);
    }
  }

  private handleSwipeStart(clientX: number, clientY: number): void {
    if (this.swipeState.isActive) return;

    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    this.calendarWidth = calendarContainer.clientWidth;
    this.preview.setCalendarWidth(this.calendarWidth);

    this.core.setIsSwiping(true);

    this.swipeState = {
      isActive: true,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
      lastDeltaX: 0,
      direction: "none",
    };

    if (this.config.overlapPreview) {
      this.preview.setup();
    }

    this.emitter.emit("swipe:start", {
      startX: clientX,
      startY: clientY,
      timestamp: Date.now(),
    });
  }

  private handleSwipeMove(clientX: number): void {
    if (!this.swipeState.isActive) return;

    const now = Date.now();
    const rawDeltaX = clientX - this.swipeState.startX;
    const deltaX = this.isRTL ? -rawDeltaX : rawDeltaX;
    const timeDelta = now - this.swipeState.lastMoveTime;
    const velocity =
      timeDelta > 0
        ? Math.abs(deltaX - this.swipeState.lastDeltaX) / timeDelta
        : 0;

    let direction: "left" | "right" | "none" = "none";
    if (deltaX < 0) direction = "left";
    else if (deltaX > 0) direction = "right";

    this.swipeState.currentX = clientX;
    this.swipeState.lastMoveTime = now;
    this.swipeState.lastDeltaX = deltaX;
    this.swipeState.direction = direction;

    if (this.config.overlapPreview && this.preview.getSliderElement()) {
      this.preview.update(rawDeltaX);
    }

    this.emitter.emit("swipe:move", {
      deltaX,
      deltaY: 0,
      velocity,
      direction,
      timestamp: now,
    });
  }

  private handleSwipeEnd(clientX: number): void {
    if (!this.swipeState.isActive) return;

    const rawDeltaX = clientX - this.swipeState.startX;
    const deltaX = this.isRTL ? -rawDeltaX : rawDeltaX;
    const totalTime = Date.now() - this.swipeState.startTime;
    const velocity = totalTime > 0 ? Math.abs(deltaX) / totalTime : 0;
    const direction = this.swipeState.direction;

    let monthsToJump = 0;

    if (
      Math.abs(deltaX) >= this.config.threshold ||
      velocity >= this.config.velocity
    ) {
      monthsToJump = 1;

      if (this.config.multipleMonthsJump && velocity > this.config.velocity) {
        const extraMonths = Math.floor(
          velocity * SWIPE_CONSTANTS.VELOCITY_MULTIPLIER,
        );
        monthsToJump = Math.min(
          monthsToJump + extraMonths,
          SWIPE_CONSTANTS.MAX_MONTHS_JUMP,
        );
      }
    }

    this.emitter.emit("swipe:end", {
      deltaX,
      velocity,
      direction,
      monthsToJump,
      timestamp: Date.now(),
    });

    if (monthsToJump > 0) {
      this.preview.animateToTarget(direction, () => {
        this.core.setIsSwiping(false);
        this.triggerNavigation(direction, monthsToJump);
      });
    } else {
      this.preview.animateToReset(() => {
        this.core.setIsSwiping(false);
      });
    }

    this.swipeState = createInitialSwipeState();
  }

  private handleSwipeCancel(): void {
    this.emitter.emit("swipe:cancel", { timestamp: Date.now() });
    this.preview.animateToReset(() => {
      this.core.setIsSwiping(false);
    });
    this.swipeState = createInitialSwipeState();
  }

  private triggerNavigation(
    direction: "left" | "right" | "none",
    monthsToJump: number,
  ): void {
    if (direction === "none" || monthsToJump === 0) return;

    let { currentMonth, currentYear } = this.core;
    const delta = direction === "left" ? monthsToJump : -monthsToJump;

    for (let i = 0; i < Math.abs(delta); i++) {
      if (delta > 0) {
        if (currentMonth === 11) {
          currentMonth = 0;
          currentYear += 1;
        } else {
          currentMonth += 1;
        }
      } else {
        if (currentMonth === 0) {
          currentMonth = 11;
          currentYear -= 1;
        } else {
          currentMonth -= 1;
        }
      }
    }

    this.emitter.emit("navigate:swipe-complete", {
      month: currentMonth,
      year: currentYear,
      direction,
    });
  }

  unbind(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    this.eventHandlers.unbind(calendarContainer);
  }

  destroy(): void {
    this.unbind();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.preview.cleanup();
    this.swipeState = createInitialSwipeState();
  }
}
