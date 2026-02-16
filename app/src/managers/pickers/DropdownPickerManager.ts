import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class DropdownPickerManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  openMonthPicker(onClose?: () => void): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const existingMonthPicker = wrapper.querySelector(".dp-ui__month-picker");
    if (existingMonthPicker) {
      this.closeMonthPicker(onClose);
      return;
    }

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.add("dp-ui__calendar-header--picker-open");
    }

    const yearSelectBtn = wrapper.querySelector(
      ".dp-ui__year-select"
    ) as HTMLButtonElement;
    if (yearSelectBtn) {
      yearSelectBtn.disabled = true;
      yearSelectBtn.style.opacity = "0.38";
      yearSelectBtn.style.cursor = "not-allowed";
      const svg = yearSelectBtn.querySelector("svg") as SVGElement;
      if (svg) svg.style.display = "none";
    }

    const monthPicker = document.createElement("div");
    monthPicker.className = "dp-ui__month-picker";

    const { customMonths, months } = this.core.options.labels;
    const monthNames = customMonths || months || [];

    let selectedItem: HTMLButtonElement | null = null;

    monthNames.forEach((monthName, index) => {
      const monthItem = document.createElement("button");
      monthItem.className = "dp-ui__month-item";
      monthItem.type = "button";

      const isSelected = index === this.core.currentMonth;

      if (isSelected) {
        monthItem.classList.add("dp-ui__month-item--selected");
        selectedItem = monthItem;

        const checkmark = document.createElement("span");
        checkmark.className = "dp-ui__month-checkmark";
        checkmark.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`;
        monthItem.appendChild(checkmark);
      }

      const monthText = document.createElement("span");
      monthText.className = "dp-ui__month-text";
      monthText.textContent = capitalize(monthName);
      monthItem.appendChild(monthText);

      monthItem.addEventListener("click", () => {
        this.core.setCurrentMonth(index);
        this.emitter.emit("select:month", {
          month: index,
          year: this.core.currentYear,
        });
        this.closeMonthPicker(() => {
          this.emitter.emit("update", {
            date: this.core.selectedDate,
            timestamp: Date.now(),
          });
          if (onClose) onClose();
        });
      });

      monthPicker.appendChild(monthItem);
    });

    wrapper.appendChild(monthPicker);

    requestAnimationFrame(() => {
      monthPicker.classList.add("dp-ui__month-picker--open");

      if (selectedItem) {
        const pickerRect = monthPicker.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        const offset = itemRect.top - pickerRect.top - pickerRect.height / 2 + itemRect.height / 2;
        monthPicker.scrollTop = offset;
      }
    });
  }

  closeMonthPicker(callback?: () => void): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const monthPicker = wrapper.querySelector(
      ".dp-ui__month-picker"
    ) as HTMLElement;
    if (!monthPicker) return;

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.remove("dp-ui__calendar-header--picker-open");
    }

    const yearSelectBtn = wrapper.querySelector(
      ".dp-ui__year-select"
    ) as HTMLButtonElement;
    if (yearSelectBtn) {
      yearSelectBtn.disabled = false;
      yearSelectBtn.style.opacity = "";
      yearSelectBtn.style.cursor = "";
      const svg = yearSelectBtn.querySelector("svg") as SVGElement;
      if (svg) svg.style.display = "";
    }

    monthPicker.classList.remove("dp-ui__month-picker--open");

    setTimeout(() => {
      monthPicker.remove();
      if (callback) callback();
    }, 200);
  }

  openYearPicker(onClose?: () => void): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const existingYearPicker = wrapper.querySelector(".dp-ui__year-picker");
    if (existingYearPicker) {
      this.closeYearPicker(onClose);
      return;
    }

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.add("dp-ui__calendar-header--picker-open");
    }

    const monthSelectBtn = wrapper.querySelector(
      ".dp-ui__month-select"
    ) as HTMLButtonElement;
    if (monthSelectBtn) {
      monthSelectBtn.disabled = true;
      monthSelectBtn.style.opacity = "0.38";
      monthSelectBtn.style.cursor = "not-allowed";
      const svg = monthSelectBtn.querySelector("svg") as SVGElement;
      if (svg) svg.style.display = "none";
    }

    const yearPicker = document.createElement("div");
    yearPicker.className = "dp-ui__year-picker";

    const yearRangeConfig = this.core.options.ui.yearRange || {
      before: 100,
      after: 20,
    };
    const yearsBefore = Math.min(
      100,
      Math.max(1, yearRangeConfig.before || 100)
    );
    const yearsAfter = Math.min(100, Math.max(1, yearRangeConfig.after || 20));
    const todayYear = new Date().getFullYear();
    const startYear = todayYear - yearsBefore;
    const endYear = todayYear + yearsAfter;
    const totalYears = endYear - startYear + 1;
    const currentYear = this.core.currentYear;

    let selectedItem: HTMLButtonElement | null = null;

    for (let i = 0; i < totalYears; i++) {
      const year = startYear + i;
      const yearItem = document.createElement("button");
      yearItem.className = "dp-ui__year-item";
      yearItem.type = "button";

      const isSelected = year === currentYear;

      if (isSelected) {
        yearItem.classList.add("dp-ui__year-item--selected");
        selectedItem = yearItem;

        const checkmark = document.createElement("span");
        checkmark.className = "dp-ui__year-checkmark";
        checkmark.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`;
        yearItem.appendChild(checkmark);
      }

      const yearText = document.createElement("span");
      yearText.className = "dp-ui__year-text";
      yearText.textContent = year.toString();
      yearItem.appendChild(yearText);

      yearItem.addEventListener("click", () => {
        this.core.setCurrentYear(year);
        this.emitter.emit("select:year", { year });
        this.closeYearPicker(() => {
          this.emitter.emit("update", {
            date: this.core.selectedDate,
            timestamp: Date.now(),
          });
          if (onClose) onClose();
        });
      });

      yearPicker.appendChild(yearItem);
    }

    wrapper.appendChild(yearPicker);

    requestAnimationFrame(() => {
      yearPicker.classList.add("dp-ui__year-picker--open");

      if (selectedItem) {
        const pickerRect = yearPicker.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();
        const offset = itemRect.top - pickerRect.top - pickerRect.height / 2 + itemRect.height / 2;
        yearPicker.scrollTop = offset;
      }
    });
  }

  closeYearPicker(callback?: () => void): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const yearPicker = wrapper.querySelector(
      ".dp-ui__year-picker"
    ) as HTMLElement;
    if (!yearPicker) return;

    const header = wrapper.querySelector(".dp-ui__calendar-header");
    if (header) {
      header.classList.remove("dp-ui__calendar-header--picker-open");
    }

    const monthSelectBtn = wrapper.querySelector(
      ".dp-ui__month-select"
    ) as HTMLButtonElement;
    if (monthSelectBtn) {
      monthSelectBtn.disabled = false;
      monthSelectBtn.style.opacity = "";
      monthSelectBtn.style.cursor = "";
      const svg = monthSelectBtn.querySelector("svg") as SVGElement;
      if (svg) svg.style.display = "";
    }

    yearPicker.classList.remove("dp-ui__year-picker--open");

    setTimeout(() => {
      yearPicker.remove();
      if (callback) callback();
    }, 200);
  }

  destroy(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const monthPicker = wrapper.querySelector(".dp-ui__month-picker");
    const yearPicker = wrapper.querySelector(".dp-ui__year-picker");

    if (monthPicker) monthPicker.remove();
    if (yearPicker) yearPicker.remove();
  }
}
