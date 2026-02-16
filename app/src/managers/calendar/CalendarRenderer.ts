import type { CoreState } from "../../datepicker/CoreState";
import type {
  CalendarGridGenerator,
  CalendarDay,
} from "./CalendarGridGenerator";
import { isDocument } from "../../utils/node";
import { ICONS } from "../../constants/icons";

export class CalendarRenderer {
  private core: CoreState;
  private gridGenerator: CalendarGridGenerator;
  private onDayClick: (date: Date) => void;

  constructor(
    core: CoreState,
    gridGenerator: CalendarGridGenerator,
    onDayClick: (date: Date) => void,
  ) {
    this.core = core;
    this.gridGenerator = gridGenerator;
    this.onDayClick = onDayClick;
  }

  private getStartDay(): number {
    const { weekStart = "auto", locale = "en-US" } = this.core.options.calendar;

    if (weekStart === "auto") {
      if (typeof Intl !== "undefined" && typeof Intl.Locale !== "undefined") {
        try {
          const intlLocale = new Intl.Locale(locale);
          const weekInfo =
            (intlLocale as any).weekInfo || (intlLocale as any).getWeekInfo?.();
          if (weekInfo?.firstDay !== undefined) {
            return weekInfo.firstDay === 7 ? 0 : weekInfo.firstDay;
          }
        } catch (e) {
          return 1;
        }
      }
      return 1;
    }

    return weekStart === "sunday" ? 0 : 1;
  }

  renderCalendar(): void {
    if (isDocument() === false) return;

    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    const slider = calendarContainer.querySelector(".dp-ui__calendar-slider");
    if (slider) {
      const grid = document.createElement("div");
      grid.className = "dp-ui__calendar-grid";
      slider.replaceWith(grid);
    }

    const gridElement = this.core.getCalendarGrid();
    if (!gridElement) return;

    this.renderGridContent(gridElement);
  }

  renderGridContent(gridElement: Element, htmlContent?: string): void {
    if (htmlContent) {
      gridElement.innerHTML = htmlContent;
      return;
    }

    const grid = this.gridGenerator.generateCalendarGrid();

    let weekdaysRow = gridElement.querySelector(".dp-ui__weekdays");
    let daysGrid = gridElement.querySelector(".dp-ui__days");

    if (!weekdaysRow) {
      weekdaysRow = document.createElement("div");
      weekdaysRow.className = "dp-ui__weekdays";

      if (this.core.options.ui.showWeekNumbers) {
        const weekCell = document.createElement("div");
        weekCell.className = "dp-ui__weekday dp-ui__weekday--week";
        weekCell.textContent = "Wk";
        weekdaysRow.appendChild(weekCell);
      }

      const {
        customWeekdays,
        weekdays,
        weekdayLetters = 1,
      } = this.core.options.labels;
      let weekdayNames = customWeekdays || weekdays || [];

      const startDay = this.getStartDay();
      if (startDay > 0) {
        weekdayNames = [
          ...weekdayNames.slice(startDay),
          ...weekdayNames.slice(0, startDay),
        ];
      }

      weekdayNames.forEach((weekday) => {
        const cell = document.createElement("div");
        cell.className = "dp-ui__weekday";

        let displayName = weekday;
        if (weekdayLetters && weekdayLetters > 0) {
          displayName = weekday.substring(0, weekdayLetters);
        }

        cell.textContent = displayName;
        weekdaysRow?.appendChild(cell);
      });

      gridElement.appendChild(weekdaysRow);
    }

    if (!daysGrid) {
      daysGrid = document.createElement("div");
      daysGrid.className = "dp-ui__days";
      gridElement.appendChild(daysGrid);
    }

    daysGrid.innerHTML = "";

    const weeksCount = Math.ceil(grid.length / 7);
    const calendarContainer = gridElement.closest(".dp-ui__calendar");
    if (calendarContainer) {
      calendarContainer.classList.remove(
        "dp-ui__calendar--weeks-4",
        "dp-ui__calendar--weeks-5",
        "dp-ui__calendar--weeks-6",
      );
      calendarContainer.classList.add(`dp-ui__calendar--weeks-${weeksCount}`);
    }

    let currentWeek: CalendarDay[] = [];

    grid.forEach((calendarDay, index) => {
      currentWeek.push(calendarDay);

      if ((index + 1) % 7 === 0 || index === grid.length - 1) {
        const weekRow = document.createElement("div");
        weekRow.className = "dp-ui__week";

        if (this.core.options.ui.showWeekNumbers && currentWeek[0].weekNumber) {
          const weekCell = document.createElement("div");
          weekCell.className = "dp-ui__day dp-ui__day--week-number";
          weekCell.textContent = currentWeek[0].weekNumber.toString();
          weekRow.appendChild(weekCell);
        }

        currentWeek.forEach((day) => {
          const displayMode = this.core.options.ui?.displayMode;
          const isModalMode = displayMode === "modal";

          if (!day.isCurrentMonth && isModalMode) {
            const emptyCell = document.createElement("div");
            emptyCell.className = "dp-ui__day dp-ui__day--empty";
            weekRow.appendChild(emptyCell);
            return;
          }

          const dayCell = document.createElement("button");
          dayCell.className = "dp-ui__day";
          dayCell.type = "button";
          dayCell.textContent = day.day.toString();
          dayCell.dataset.date = day.date.toISOString();

          if (!day.isCurrentMonth) {
            dayCell.classList.add("dp-ui__day--other-month");
          }
          if (day.isToday) {
            dayCell.classList.add("dp-ui__day--today");
          }
          if (day.isSelected) {
            dayCell.classList.add("dp-ui__day--selected");
          }
          if (day.isDisabled) {
            dayCell.classList.add("dp-ui__day--disabled");
            dayCell.disabled = true;
          }

          dayCell.addEventListener("click", () => {
            if (!day.isDisabled) {
              this.onDayClick(day.date);
            }
          });

          weekRow.appendChild(dayCell);
        });

        daysGrid.appendChild(weekRow);
        currentWeek = [];
      }
    });
  }

  updateMonthYearDisplay(): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const displayMode = this.core.displayMode;

    if (displayMode === "modal") {
      const unifiedPickerToggle = wrapper.querySelector(
        ".dp-ui__unified-picker-toggle",
      ) as HTMLButtonElement | null;

      if (unifiedPickerToggle) {
        const { customMonths, monthsShort } = this.core.options.labels;
        const months = customMonths || monthsShort || [];
        const monthName = months[this.core.currentMonth] || "";
        const capitalizedMonth =
          monthName.charAt(0).toUpperCase() + monthName.slice(1);
        const unifiedPickerLabel = `${capitalizedMonth} ${this.core.currentYear}`;

        const arrow = unifiedPickerToggle.querySelector(
          ".dp-ui__dropdown-arrow",
        );
        unifiedPickerToggle.textContent = unifiedPickerLabel;
        if (arrow) {
          unifiedPickerToggle.appendChild(arrow);
        } else {
          const newArrow = document.createElement("span");
          newArrow.className = "dp-ui__dropdown-arrow";
          newArrow.innerHTML = ICONS.arrowDropDown;
          unifiedPickerToggle.appendChild(newArrow);
        }
      }
    } else {
      const monthSelect = wrapper.querySelector(
        ".dp-ui__month-select",
      ) as HTMLButtonElement | null;
      const yearSelect = wrapper.querySelector(
        ".dp-ui__year-select",
      ) as HTMLButtonElement | null;

      if (monthSelect) {
        const {
          customMonths,
          monthsShort,
          monthLetters = 3,
        } = this.core.options.labels;
        const months = customMonths || monthsShort || [];
        let monthText = months[this.core.currentMonth] || "";

        if (monthLetters && monthLetters > 0) {
          monthText = monthText.substring(0, monthLetters);
        }

        const arrow = monthSelect.querySelector(".dp-ui__dropdown-arrow");
        monthSelect.textContent = monthText;
        if (arrow) {
          monthSelect.appendChild(arrow);
        } else {
          const newArrow = document.createElement("span");
          newArrow.className = "dp-ui__dropdown-arrow";
          newArrow.innerHTML = ICONS.arrowDropDown;
          monthSelect.appendChild(newArrow);
        }
      }

      if (yearSelect) {
        const yearText = this.core.currentYear.toString();
        const arrow = yearSelect.querySelector(".dp-ui__dropdown-arrow");
        yearSelect.textContent = yearText;
        if (arrow) {
          yearSelect.appendChild(arrow);
        } else {
          const newArrow = document.createElement("span");
          newArrow.className = "dp-ui__dropdown-arrow";
          newArrow.innerHTML = ICONS.arrowDropDown;
          yearSelect.appendChild(newArrow);
        }
      }
    }
  }
}
