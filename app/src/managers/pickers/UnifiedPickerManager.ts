import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";

type PickerView = "year" | "month";

export class UnifiedPickerManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private currentView: PickerView = "year";
  private onCloseCallback?: () => void;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  /**
   * Set data-view attribute on modal for swipe detection
   */
  private setDataViewAttribute(view: "days" | "months" | "years"): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const modal = wrapper.closest(".dp-ui__modal");
    const target = modal || wrapper;
    target.setAttribute("data-view", view);
  }

  isOpen(): boolean {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return false;

    const calendarElement = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarElement) return false;

    const picker = calendarElement.querySelector(".dp-ui__unified-picker");
    return picker !== null;
  }

  open(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.currentView = "year";
    this.setDataViewAttribute("years");
    this.renderYearGrid();
  }

  private renderYearGrid(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    this.clearPicker();

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.add("dp-ui__calendar-header--picker-open");
    }

    const calendarElement = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarElement) return;

    const picker = document.createElement("div");
    picker.className = "dp-ui__unified-picker";
    picker.setAttribute("data-view", "year");

    const yearRangeConfig = this.core.options.ui.yearRange || {
      before: 100,
      after: 20,
    };
    const yearsBefore = Math.min(
      100,
      Math.max(1, yearRangeConfig.before || 100),
    );
    const yearsAfter = Math.min(100, Math.max(1, yearRangeConfig.after || 20));
    const todayYear = new Date().getFullYear();
    const startYear = todayYear - yearsBefore;
    const endYear = todayYear + yearsAfter;

    const grid = document.createElement("div");
    grid.className = "dp-ui__unified-picker-grid";

    const totalYears = endYear - startYear + 1;
    const currentYear = this.core.currentYear;

    for (let i = 0; i < totalYears; i++) {
      const year = startYear + i;
      const yearButton = document.createElement("button");
      yearButton.className = "dp-ui__unified-picker-item";
      yearButton.type = "button";
      yearButton.textContent = year.toString();

      if (year === currentYear) {
        yearButton.classList.add("dp-ui__unified-picker-item--selected");
      }

      yearButton.addEventListener("click", () => {
        this.core.setCurrentYear(year);
        this.emitter.emit("select:year", { year });
        this.currentView = "month";
        this.renderMonthGrid();
      });

      grid.appendChild(yearButton);
    }

    picker.appendChild(grid);
    calendarElement.appendChild(picker);

    let selectedButton: HTMLButtonElement | null = null;
    grid.querySelectorAll(".dp-ui__unified-picker-item").forEach((btn) => {
      if (btn.classList.contains("dp-ui__unified-picker-item--selected")) {
        selectedButton = btn as HTMLButtonElement;
      }
    });

    requestAnimationFrame(() => {
      picker.classList.add("dp-ui__unified-picker--open");

      if (selectedButton) {
        const pickerRect = picker.getBoundingClientRect();
        const itemRect = selectedButton.getBoundingClientRect();
        const offset =
          itemRect.top -
          pickerRect.top -
          pickerRect.height / 2 +
          itemRect.height / 2;
        picker.scrollTop = offset;
      }
    });
  }

  private renderMonthGrid(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarElement = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarElement) return;

    const existingPicker = calendarElement.querySelector(
      ".dp-ui__unified-picker",
    ) as HTMLElement;
    if (!existingPicker) return;

    const grid = existingPicker.querySelector(
      ".dp-ui__unified-picker-grid",
    ) as HTMLElement;
    if (!grid) return;

    existingPicker.setAttribute("data-view", "month");
    this.setDataViewAttribute("months");

    const { customMonths, monthsShort } = this.core.options.labels;
    const monthNames = customMonths || monthsShort || [];
    const currentMonth = this.core.currentMonth;

    grid.innerHTML = "";

    monthNames.forEach((monthName, index) => {
      const monthButton = document.createElement("button");
      monthButton.className = "dp-ui__unified-picker-item";
      monthButton.type = "button";
      monthButton.textContent = monthName;

      if (index === currentMonth) {
        monthButton.classList.add("dp-ui__unified-picker-item--selected");
      }

      monthButton.addEventListener("click", () => {
        this.core.setCurrentMonth(index);
        this.emitter.emit("select:month", {
          month: index,
          year: this.core.currentYear,
        });
        this.close();
      });

      grid.appendChild(monthButton);
    });

    existingPicker.scrollTop = 0;
  }

  private clearPicker(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarElement = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarElement) return;

    const existingPicker = calendarElement.querySelector(
      ".dp-ui__unified-picker",
    );
    if (existingPicker) {
      existingPicker.remove();
    }
  }

  close(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarElement = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarElement) return;

    const picker = calendarElement.querySelector(
      ".dp-ui__unified-picker",
    ) as HTMLElement;
    if (!picker) return;

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.remove("dp-ui__calendar-header--picker-open");
    }

    picker.classList.remove("dp-ui__unified-picker--open");
    this.setDataViewAttribute("days");

    setTimeout(() => {
      picker.remove();
      this.emitter.emit("update", {
        date: this.core.selectedDate,
        timestamp: Date.now(),
      });
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }, 200);
  }

  destroy(): void {
    this.clearPicker();
  }
}
