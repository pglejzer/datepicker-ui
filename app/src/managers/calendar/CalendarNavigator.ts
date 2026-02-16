import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";
import type { AnimationManager } from "../AnimationManager";
import type { CalendarRenderer } from "./CalendarRenderer";

export class CalendarNavigator {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private animation: AnimationManager;
  private renderer: CalendarRenderer;
  private isAnimating: boolean = false;

  constructor(
    core: CoreState,
    emitter: EventEmitter<DatepickerEventMap>,
    animation: AnimationManager,
    renderer: CalendarRenderer,
  ) {
    this.core = core;
    this.emitter = emitter;
    this.animation = animation;
    this.renderer = renderer;
  }

  get animating(): boolean {
    return this.isAnimating;
  }

  prevMonth(): void {
    if (this.isAnimating) return;

    let { currentMonth, currentYear } = this.core;

    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }

    this.slideCalendar("right", () => {
      this.core.setCurrentMonth(currentMonth);
      this.core.setCurrentYear(currentYear);

      this.emitter.emit("select:month", {
        month: currentMonth,
        year: currentYear,
      });
    });
  }

  nextMonth(): void {
    if (this.isAnimating) return;

    let { currentMonth, currentYear } = this.core;

    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }

    this.slideCalendar("left", () => {
      this.core.setCurrentMonth(currentMonth);
      this.core.setCurrentYear(currentYear);

      this.emitter.emit("select:month", {
        month: currentMonth,
        year: currentYear,
      });
    });
  }

  prevYear(): void {
    if (this.isAnimating) return;

    const yearRangeConfig = this.core.options.ui.yearRange || {
      before: 100,
      after: 20,
    };
    const yearsBefore = Math.min(
      100,
      Math.max(1, yearRangeConfig.before || 100),
    );
    const todayYear = new Date().getFullYear();
    const minYear = todayYear - yearsBefore;

    let currentYear = this.core.currentYear - 1;

    if (currentYear < minYear) {
      return;
    }

    this.slideCalendar("right", () => {
      this.core.setCurrentYear(currentYear);

      this.emitter.emit("select:year", {
        year: currentYear,
      });
    });
  }

  nextYear(): void {
    if (this.isAnimating) return;

    const yearRangeConfig = this.core.options.ui.yearRange || {
      before: 100,
      after: 20,
    };
    const yearsAfter = Math.min(100, Math.max(1, yearRangeConfig.after || 20));
    const todayYear = new Date().getFullYear();
    const maxYear = todayYear + yearsAfter;

    let currentYear = this.core.currentYear + 1;

    if (currentYear > maxYear) {
      return;
    }

    this.slideCalendar("left", () => {
      this.core.setCurrentYear(currentYear);

      this.emitter.emit("select:year", {
        year: currentYear,
      });
    });
  }

  goToToday(): void {
    const today = new Date();

    this.core.setCurrentMonth(today.getMonth());
    this.core.setCurrentYear(today.getFullYear());
    this.core.setSelectedDate(today);

    this.emitter.emit("select:day", {
      day: today.getDate(),
      month: today.getMonth(),
      year: today.getFullYear(),
      date: today,
    });

    this.renderer.renderCalendar();
  }

  jumpMonths(months: number): void {
    if (this.isAnimating) return;
    if (months === 0) return;

    let { currentMonth, currentYear } = this.core;

    const direction: "left" | "right" = months > 0 ? "left" : "right";
    const absMonths = Math.abs(months);

    for (let i = 0; i < absMonths; i++) {
      if (months > 0) {
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

    this.slideCalendar(direction, () => {
      this.core.setCurrentMonth(currentMonth);
      this.core.setCurrentYear(currentYear);

      this.emitter.emit("select:month", {
        month: currentMonth,
        year: currentYear,
      });
    });
  }

  private slideCalendar(
    direction: "left" | "right",
    updateCallback: () => void,
  ): void {
    this.isAnimating = true;

    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    let slider = calendarContainer.querySelector(
      ".dp-ui__calendar-slider",
    ) as HTMLElement;
    let existingCurrent = slider
      ? (slider.querySelector(".dp-ui__calendar-grid--current") as HTMLElement)
      : (calendarContainer.querySelector(
          ".dp-ui__calendar-grid",
        ) as HTMLElement);

    const currentHtml = existingCurrent?.innerHTML || "";

    updateCallback();

    const tempDiv = document.createElement("div");
    this.renderer.renderGridContent(tempDiv);
    const nextHtml = tempDiv.innerHTML;

    this.animation.slideCalendar(direction, currentHtml, nextHtml, () => {
      this.renderer.renderCalendar();
      this.renderer.updateMonthYearDisplay();
      this.isAnimating = false;
    });
  }
}
