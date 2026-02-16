import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";
import type { PickerManager } from "../PickerManager";
import type { NavigationManager } from "../NavigationManager";
import type { AnimationManager } from "../AnimationManager";
import type { ModalManager } from "../ModalManager";
import { CalendarDateUtils } from "./CalendarDateUtils";
import { CalendarGridGenerator } from "./CalendarGridGenerator";
import { CalendarRenderer } from "./CalendarRenderer";
import { CalendarNavigator } from "./CalendarNavigator";

export class CalendarManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private picker: PickerManager;
  private navigation: NavigationManager;
  private animation: AnimationManager;
  private modal: ModalManager;

  private dateUtils: CalendarDateUtils;
  private gridGenerator: CalendarGridGenerator;
  private renderer: CalendarRenderer;
  private navigator: CalendarNavigator;

  private eventHandlers: Map<string, EventListener> = new Map();
  private currentView: "days" | "months" | "years" = "days";

  constructor(
    core: CoreState,
    emitter: EventEmitter<DatepickerEventMap>,
    picker: PickerManager,
    navigation: NavigationManager,
    animation: AnimationManager,
    modal: ModalManager,
  ) {
    this.core = core;
    this.emitter = emitter;
    this.picker = picker;
    this.navigation = navigation;
    this.animation = animation;
    this.modal = modal;

    this.dateUtils = new CalendarDateUtils(core);
    this.gridGenerator = new CalendarGridGenerator(core, this.dateUtils);
    this.renderer = new CalendarRenderer(
      core,
      this.gridGenerator,
      this.selectDate.bind(this),
    );
    this.navigator = new CalendarNavigator(
      core,
      emitter,
      animation,
      this.renderer,
    );

    this.emitter.on("navigate:prev", () => this.prevMonth());
    this.emitter.on("navigate:next", () => this.nextMonth());
    this.emitter.on("navigate:jump", (data) => this.jumpMonths(data.months));
    this.emitter.on("navigate:swipe-complete", (data) =>
      this.handleSwipeComplete(data.month, data.year),
    );
  }

  init(): void {
    if (typeof window === "undefined") return;
  }

  get isAnimating(): boolean {
    return this.navigator.animating;
  }

  prevMonth(): void {
    if (this.currentView !== "days") return;
    if (this.picker.isUnifiedPickerOpen()) return;
    this.navigator.prevMonth();
  }

  nextMonth(): void {
    if (this.currentView !== "days") return;
    if (this.picker.isUnifiedPickerOpen()) return;
    this.navigator.nextMonth();
  }

  jumpMonths(months: number): void {
    if (this.currentView !== "days") return;
    this.navigator.jumpMonths(months);
  }

  /**
   * Handle swipe completion - update state without additional animation
   * The swipe preview already animated to the target month
   */
  private handleSwipeComplete(month: number, year: number): void {
    if (this.currentView !== "days") return;

    this.core.setCurrentMonth(month);
    this.core.setCurrentYear(year);

    this.emitter.emit("select:month", { month, year });

    this.renderCalendar();
    this.renderer.updateMonthYearDisplay();
  }

  prevYear(): void {
    if (this.currentView !== "days") return;
    this.navigator.prevYear();
  }

  nextYear(): void {
    if (this.currentView !== "days") return;
    this.navigator.nextYear();
  }

  goToToday(): void {
    this.navigator.goToToday();
  }

  selectDate(date: Date): void {
    if (this.dateUtils.isDisabled(date)) {
      this.emitter.emit("error", {
        code: "DISABLED_DATE",
        message: "This date is disabled",
        rejectedDate: date,
      });
      return;
    }

    if (this.core.tempRangeStartDate !== null) {
      return;
    }

    this.core.setTempSelectedDate(date);
    this.core.setCurrentMonth(date.getMonth());
    this.core.setCurrentYear(date.getFullYear());

    this.emitter.emit("select:day", {
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      date,
    });

    const displayMode = this.core.options.ui?.displayMode;
    if (displayMode === "modal") {
      this.modal.updateSelectedDate(date);
    }

    this.renderCalendar();
  }

  clearDate(): void {
    this.core.setTempSelectedDate(null);

    this.renderCalendar();
  }

  renderCalendar(): void {
    this.renderer.renderCalendar();
    this.renderer.updateMonthYearDisplay();
    this.setDataViewAttribute("days");
    this.emitter.emit("calendar:rendered", { timestamp: Date.now() });
  }

  private setDataViewAttribute(view: "days" | "months" | "years"): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const modal = wrapper.closest(".dp-ui__modal");
    const target = modal || wrapper;
    target.setAttribute("data-view", view);
  }

  private setCurrentView(view: "days" | "months" | "years"): void {
    this.currentView = view;
    this.setDataViewAttribute(view);
  }

  bindNavigationEvents(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      const unifiedPickerToggle = wrapper.querySelector(
        ".dp-ui__unified-picker-toggle",
      );

      if (unifiedPickerToggle) {
        const handler = () => {
          if (this.picker.isUnifiedPickerOpen()) {
            this.picker.closeUnifiedPicker();
            this.setCurrentView("days");
          } else {
            this.setCurrentView("years");
            this.picker.openYearPicker(() => {
              this.setCurrentView("days");
              this.modal.updateUnifiedPickerLabel();
              this.renderCalendar();
            });
          }
        };
        unifiedPickerToggle.addEventListener("click", handler);
        this.eventHandlers.set(
          "unified-picker-toggle",
          handler as EventListener,
        );
      }

      const monthNavPrev = wrapper.querySelector(".dp-ui__month-nav-btn--prev");
      const monthNavNext = wrapper.querySelector(".dp-ui__month-nav-btn--next");

      if (monthNavPrev) {
        const handler = this.prevMonth.bind(this);
        monthNavPrev.addEventListener("click", handler);
        this.eventHandlers.set("month-nav-prev", handler as EventListener);
      }

      if (monthNavNext) {
        const handler = this.nextMonth.bind(this);
        monthNavNext.addEventListener("click", handler);
        this.eventHandlers.set("month-nav-next", handler as EventListener);
      }
    } else {
      const monthPrevBtn = wrapper.querySelector(".dp-ui__month-prev-btn");
      const monthNextBtn = wrapper.querySelector(".dp-ui__month-next-btn");
      const monthSelectBtn = wrapper.querySelector(".dp-ui__month-select");
      const yearPrevBtn = wrapper.querySelector(".dp-ui__year-prev-btn");
      const yearNextBtn = wrapper.querySelector(".dp-ui__year-next-btn");
      const yearSelectBtn = wrapper.querySelector(".dp-ui__year-select");

      if (monthPrevBtn) {
        const handler = this.prevMonth.bind(this);
        monthPrevBtn.addEventListener("click", handler);
        this.eventHandlers.set("month-prev", handler as EventListener);
      }

      if (monthNextBtn) {
        const handler = this.nextMonth.bind(this);
        monthNextBtn.addEventListener("click", handler);
        this.eventHandlers.set("month-next", handler as EventListener);
      }

      if (monthSelectBtn) {
        const handler = () => {
          this.setCurrentView("months");
          this.picker.openMonthPicker(() => {
            this.setCurrentView("days");
            this.renderer.updateMonthYearDisplay();
          });
        };
        monthSelectBtn.addEventListener("click", handler);
        this.eventHandlers.set("month-select", handler as EventListener);
      }

      if (yearPrevBtn) {
        const handler = this.prevYear.bind(this);
        yearPrevBtn.addEventListener("click", handler);
        this.eventHandlers.set("year-prev", handler as EventListener);
      }

      if (yearNextBtn) {
        const handler = this.nextYear.bind(this);
        yearNextBtn.addEventListener("click", handler);
        this.eventHandlers.set("year-next", handler as EventListener);
      }

      if (yearSelectBtn) {
        const handler = () => {
          this.setCurrentView("years");
          this.picker.openYearPicker(() => {
            this.setCurrentView("days");
            this.renderCalendar();
          });
        };
        yearSelectBtn.addEventListener("click", handler);
        this.eventHandlers.set("year-select", handler as EventListener);
      }
    }

    const todayBtn = this.core.getTodayButton();
    const clearBtn = this.core.getClearButton();

    if (todayBtn) {
      const todayHandler = this.goToToday.bind(this);
      todayBtn.addEventListener("click", todayHandler);
      this.eventHandlers.set("today", todayHandler as EventListener);
    }

    if (clearBtn) {
      const clearHandler = this.clearDate.bind(this);
      clearBtn.addEventListener("click", clearHandler);
      this.eventHandlers.set("clear", clearHandler as EventListener);
    }

    // this.navigation.bindSwipeEvents();
  }

  destroy(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const monthPrevBtn = wrapper.querySelector(".dp-ui__month-prev-btn");
    const monthNextBtn = wrapper.querySelector(".dp-ui__month-next-btn");
    const yearPrevBtn = wrapper.querySelector(".dp-ui__year-prev-btn");
    const yearNextBtn = wrapper.querySelector(".dp-ui__year-next-btn");
    const todayBtn = this.core.getTodayButton();
    const clearBtn = this.core.getClearButton();

    if (monthPrevBtn && this.eventHandlers.has("month-prev")) {
      monthPrevBtn.removeEventListener(
        "click",
        this.eventHandlers.get("month-prev")!,
      );
    }
    if (monthNextBtn && this.eventHandlers.has("month-next")) {
      monthNextBtn.removeEventListener(
        "click",
        this.eventHandlers.get("month-next")!,
      );
    }
    if (yearPrevBtn && this.eventHandlers.has("year-prev")) {
      yearPrevBtn.removeEventListener(
        "click",
        this.eventHandlers.get("year-prev")!,
      );
    }
    if (yearNextBtn && this.eventHandlers.has("year-next")) {
      yearNextBtn.removeEventListener(
        "click",
        this.eventHandlers.get("year-next")!,
      );
    }
    if (todayBtn && this.eventHandlers.has("today")) {
      todayBtn.removeEventListener("click", this.eventHandlers.get("today")!);
    }
    if (clearBtn && this.eventHandlers.has("clear")) {
      clearBtn.removeEventListener("click", this.eventHandlers.get("clear")!);
    }

    this.eventHandlers.clear();
  }
}
