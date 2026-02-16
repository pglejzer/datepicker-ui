import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

const LONG_PRESS_DURATION = 250;
const TOUCH_MOVE_THRESHOLD = 10;

export class RangeManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private touchStartPos: { x: number; y: number } | null = null;
  private cleanupHandlers: Array<() => void> = [];
  private isLongPressTriggered: boolean = false;
  private savedSelectedDate: Date | null = null;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
    // Range selection temporarily disabled
    // TODO: Re-enable when range feature is ready
    // if (!this.core.options.ui?.rangeSelection) return;
    return;

    this.emitter.on("calendar:rendered", () => {
      this.bindDayHoverEvents();
      this.bindHeaderButtons();
      this.updateRangeHighlight();
    });

    this.bindEvents();
  }

  private bindEvents(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarGrid = wrapper.querySelector(".dp-ui__calendar-grid");
    if (!calendarGrid) return;

    let mouseDownTarget: HTMLElement | null = null;
    let mouseDownTime: number = 0;

    const mouseDownHandler = (e: Event): void => {
      const mouseEvent = e as MouseEvent;
      const target = mouseEvent.target as HTMLElement;
      if (!this.isDayElement(target)) return;

      mouseDownTarget = target;
      mouseDownTime = Date.now();

      this.longPressTimer = setTimeout(() => {
        if (mouseDownTarget) {
          const longPressDate = this.getDateFromElement(mouseDownTarget);
          if (longPressDate) {
            this.resetAndStartNewRange(longPressDate);
          }
        }
      }, LONG_PRESS_DURATION);
    };

    const mouseUpHandler = (): void => {
      this.cancelLongPress();
    };

    const clickHandler = (e: Event): void => {
      const target = e.target as HTMLElement;
      if (!this.isDayElement(target)) return;

      const clickTime = Date.now();
      const wasLongPress = clickTime - mouseDownTime >= LONG_PRESS_DURATION;

      if (wasLongPress) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const clickedDate = this.getDateFromElement(target);
      if (!clickedDate) return;

      this.handleDayClick(clickedDate);
    };

    calendarGrid.addEventListener("mousedown", mouseDownHandler, true);
    calendarGrid.addEventListener("mouseup", mouseUpHandler, true);
    calendarGrid.addEventListener("click", clickHandler, true);

    this.cleanupHandlers.push(() => {
      calendarGrid.removeEventListener("mousedown", mouseDownHandler, true);
      calendarGrid.removeEventListener("mouseup", mouseUpHandler, true);
      calendarGrid.removeEventListener("click", clickHandler, true);
    });

    this.bindDayHoverEvents();
    this.bindTouchEvents(calendarGrid);
    this.bindKeyboardEvents();
    this.bindHeaderButtons();
  }

  private bindHeaderButtons(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const handleCloseClick = (e: Event): void => {
      const target = e.target as HTMLElement;
      if (target.closest(".dp-ui__range-close-btn")) {
        e.preventDefault();
        e.stopPropagation();
        this.cancelRange();
      }
    };

    const handleSaveClick = (e: Event): void => {
      const target = e.target as HTMLElement;
      if (target.closest(".dp-ui__range-save-btn")) {
        e.preventDefault();
        e.stopPropagation();
        this.saveRange();
      }
    };

    wrapper.addEventListener("click", handleCloseClick, true);
    wrapper.addEventListener("click", handleSaveClick, true);

    this.cleanupHandlers.push(() => {
      wrapper.removeEventListener("click", handleCloseClick, true);
      wrapper.removeEventListener("click", handleSaveClick, true);
    });
  }

  private bindDayHoverEvents(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const allDays = wrapper.querySelectorAll(
      ".dp-ui__day",
    ) as NodeListOf<HTMLElement>;

    allDays.forEach((day) => {
      if (this.isDayElement(day)) {
        const mouseEnterHandler = (): void => {
          const startDate = this.core.tempRangeStartDate;
          if (startDate && !this.core.tempRangeEndDate) {
            const hoverDate = this.getDateFromElement(day);
            if (hoverDate) {
              this.updatePreview(startDate, hoverDate);
            }
          }
        };

        day.addEventListener("mouseenter", mouseEnterHandler);
        this.cleanupHandlers.push(() => {
          day.removeEventListener("mouseenter", mouseEnterHandler);
        });
      }
    });
  }

  private bindTouchEvents(calendarGrid: Element): void {
    let touchStartTarget: HTMLElement | null = null;

    const touchStartHandler = (e: Event): void => {
      const touchEvent = e as TouchEvent;
      const target = touchEvent.target as HTMLElement;
      if (!this.isDayElement(target)) return;

      touchStartTarget = target;
      const touch = touchEvent.touches[0];
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      this.isLongPressTriggered = false;

      this.longPressTimer = setTimeout(() => {
        if (touchStartTarget && this.touchStartPos) {
          this.isLongPressTriggered = true;
          const longPressDate = this.getDateFromElement(touchStartTarget);
          if (longPressDate) {
            this.resetAndStartNewRange(longPressDate);
          }
        }
      }, LONG_PRESS_DURATION);
    };

    const touchMoveHandler = (e: Event): void => {
      const touchEvent = e as TouchEvent;
      if (!this.touchStartPos) return;

      const touch = touchEvent.touches[0];
      const deltaX = Math.abs(touch.clientX - this.touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - this.touchStartPos.y);

      if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
        this.cancelLongPress();
      }

      const startDate = this.core.tempRangeStartDate;
      if (startDate && !this.core.tempRangeEndDate) {
        const target = document.elementFromPoint(
          touch.clientX,
          touch.clientY,
        ) as HTMLElement;

        if (target && this.isDayElement(target)) {
          const hoverDate = this.getDateFromElement(target);
          if (hoverDate) {
            this.updatePreview(startDate, hoverDate);
          }
        }
      }
    };

    const touchEndHandler = (): void => {
      this.cancelLongPress();

      if (this.isLongPressTriggered) {
        this.isLongPressTriggered = false;
        touchStartTarget = null;
        this.touchStartPos = null;
        return;
      }

      if (touchStartTarget) {
        const clickedDate = this.getDateFromElement(touchStartTarget);
        if (clickedDate) {
          this.handleDayClick(clickedDate);
        }
      }

      touchStartTarget = null;
      this.touchStartPos = null;
    };

    const touchCancelHandler = (): void => {
      this.cancelLongPress();
      touchStartTarget = null;
      this.touchStartPos = null;
      this.isLongPressTriggered = false;
    };

    calendarGrid.addEventListener(
      "touchstart",
      touchStartHandler as EventListener,
      {
        passive: true,
      },
    );
    calendarGrid.addEventListener(
      "touchmove",
      touchMoveHandler as EventListener,
      {
        passive: true,
      },
    );
    calendarGrid.addEventListener("touchend", touchEndHandler as EventListener);
    calendarGrid.addEventListener(
      "touchcancel",
      touchCancelHandler as EventListener,
    );

    this.cleanupHandlers.push(() => {
      calendarGrid.removeEventListener(
        "touchstart",
        touchStartHandler as EventListener,
      );
      calendarGrid.removeEventListener(
        "touchmove",
        touchMoveHandler as EventListener,
      );
      calendarGrid.removeEventListener(
        "touchend",
        touchEndHandler as EventListener,
      );
      calendarGrid.removeEventListener(
        "touchcancel",
        touchCancelHandler as EventListener,
      );
    });
  }

  private bindKeyboardEvents(): void {
    const keydownHandler = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        const startDate = this.core.tempRangeStartDate;
        if (startDate) {
          e.preventDefault();
          this.cancelRange();
        }
      }
    };

    document.addEventListener("keydown", keydownHandler);
    this.cleanupHandlers.push(() => {
      document.removeEventListener("keydown", keydownHandler);
    });
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private isDayElement(element: HTMLElement): boolean {
    return (
      element.classList.contains("dp-ui__day") &&
      !element.classList.contains("dp-ui__day--disabled") &&
      !element.classList.contains("dp-ui__day--empty")
    );
  }

  private getDateFromElement(element: HTMLElement): Date | null {
    const dateStr = element.dataset.date;
    if (!dateStr) return null;
    return new Date(dateStr);
  }

  private handleDayClick(clickedDate: Date): void {
    const currentStart = this.core.tempRangeStartDate;
    const currentEnd = this.core.tempRangeEndDate;

    if (!currentStart) {
      this.setRangeStart(clickedDate);
    } else if (!currentEnd) {
      this.setRangeEnd(clickedDate);
    } else {
      this.resetAndStartNewRange(clickedDate);
    }
  }

  private setRangeStart(date: Date): void {
    this.savedSelectedDate = this.core.tempSelectedDate;
    this.core.setTempSelectedDate(null);

    this.core.setTempRangeStartDate(date);
    this.core.setTempRangeEndDate(null);

    this.emitter.emit("range:start", {
      startDate: date,
      timestamp: Date.now(),
    });

    this.clearSelectedHighlight();
    this.updateRangeHighlight();
    this.emitter.emit("range:header-update", {});
  }

  private setRangeEnd(date: Date): void {
    const startDate = this.core.tempRangeStartDate;
    if (!startDate) return;

    const [orderedStart, orderedEnd] = this.orderDates(startDate, date);

    this.core.setTempRangeStartDate(orderedStart);
    this.core.setTempRangeEndDate(orderedEnd);

    this.emitter.emit("range:end", {
      startDate: orderedStart,
      endDate: orderedEnd,
      timestamp: Date.now(),
    });

    this.updateRangeHighlight();
    this.emitter.emit("range:header-update", {});
  }

  private resetAndStartNewRange(date: Date): void {
    this.core.setTempRangeStartDate(date);
    this.core.setTempRangeEndDate(null);

    this.emitter.emit("range:start", {
      startDate: date,
      timestamp: Date.now(),
    });

    this.updateRangeHighlight();
    this.emitter.emit("range:header-update", {});
  }

  private cancelRange(): void {
    const startDate = this.core.tempRangeStartDate;

    this.core.setTempRangeStartDate(null);
    this.core.setTempRangeEndDate(null);

    if (this.savedSelectedDate) {
      this.core.setTempSelectedDate(this.savedSelectedDate);
      this.savedSelectedDate = null;
    }

    this.emitter.emit("range:cancel", {
      startDate,
      timestamp: Date.now(),
    });

    this.clearRangeHighlight();
    this.emitter.emit("range:header-update", {});
  }

  private saveRange(): void {
    if (!this.core.tempRangeStartDate || !this.core.tempRangeEndDate) {
      return;
    }

    this.core.commitTempRangeSelection();
    this.savedSelectedDate = null;

    this.emitter.emit("confirm", {
      date: this.core.tempRangeEndDate,
      timestamp: Date.now(),
    });
  }

  private updatePreview(startDate: Date, previewEndDate: Date): void {
    this.emitter.emit("range:update", {
      startDate,
      previewEndDate,
      timestamp: Date.now(),
    });

    this.updateRangeHighlight(previewEndDate);
    this.emitter.emit("range:header-update", {});
  }

  private updateRangeHighlight(previewEnd?: Date): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    this.clearRangeHighlight();

    const startDate = this.core.tempRangeStartDate;
    if (!startDate) return;

    const endDate = previewEnd || this.core.tempRangeEndDate;

    const allDays = wrapper.querySelectorAll(
      ".dp-ui__day",
    ) as NodeListOf<HTMLElement>;

    if (endDate) {
      const [orderedStart, orderedEnd] = this.orderDates(startDate, endDate);

      allDays.forEach((day) => {
        if (
          day.classList.contains("dp-ui__day--disabled") ||
          day.classList.contains("dp-ui__day--empty")
        ) {
          return;
        }

        const dayDate = this.getDateFromElement(day);
        if (!dayDate) return;

        if (this.isSameDay(dayDate, orderedStart)) {
          day.classList.add("dp-ui__day--range-start");
        }

        if (this.isSameDay(dayDate, orderedEnd)) {
          day.classList.add("dp-ui__day--range-end");
        }

        if (this.isDateBetween(dayDate, orderedStart, orderedEnd)) {
          day.classList.add("dp-ui__day--range-between");
        }
      });
    } else {
      allDays.forEach((day) => {
        if (
          day.classList.contains("dp-ui__day--disabled") ||
          day.classList.contains("dp-ui__day--empty")
        ) {
          return;
        }

        const dayDate = this.getDateFromElement(day);
        if (!dayDate) return;

        if (this.isSameDay(dayDate, startDate)) {
          day.classList.add("dp-ui__day--range-start");
        }
      });
    }
  }

  private clearRangeHighlight(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const allDays = wrapper.querySelectorAll(
      ".dp-ui__day",
    ) as NodeListOf<HTMLElement>;

    allDays.forEach((day) => {
      day.classList.remove(
        "dp-ui__day--range-start",
        "dp-ui__day--range-end",
        "dp-ui__day--range-between",
      );
    });
  }

  private clearSelectedHighlight(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const allDays = wrapper.querySelectorAll(
      ".dp-ui__day",
    ) as NodeListOf<HTMLElement>;

    allDays.forEach((day) => {
      day.classList.remove("dp-ui__day--selected");
    });
  }

  public rebindHoverEvents(): void {
    this.bindDayHoverEvents();
  }

  private orderDates(date1: Date, date2: Date): [Date, Date] {
    return date1.getTime() <= date2.getTime() ? [date1, date2] : [date2, date1];
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private isDateBetween(date: Date, start: Date, end: Date): boolean {
    const time = date.getTime();
    const startTime = start.getTime();
    const endTime = end.getTime();

    return time > startTime && time < endTime;
  }

  get isRangeActive(): boolean {
    return this.core.tempRangeStartDate !== null;
  }

  get isRangeComplete(): boolean {
    return (
      this.core.tempRangeStartDate !== null &&
      this.core.tempRangeEndDate !== null
    );
  }

  destroy(): void {
    this.cancelLongPress();
    this.clearRangeHighlight();
    this.core.resetRangeSelection();

    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];
  }
}
