import type { CoreState } from "../../datepicker/CoreState";
import { ICONS } from "../../constants/icons";

interface MonthData {
  month: number;
  year: number;
}

export class SwipeContentGenerator {
  private core: CoreState;

  constructor(core: CoreState) {
    this.core = core;
  }

  generatePrevMonthPanel(): string {
    const monthData = this.calculatePrevMonth();
    return this.generateFullPanel(monthData.month, monthData.year);
  }

  generateCurrentMonthPanel(): string {
    return this.generateFullPanel(
      this.core.currentMonth,
      this.core.currentYear,
    );
  }

  generateNextMonthPanel(): string {
    const monthData = this.calculateNextMonth();
    return this.generateFullPanel(monthData.month, monthData.year);
  }

  private calculatePrevMonth(): MonthData {
    let month = this.core.currentMonth;
    let year = this.core.currentYear;

    if (month === 0) {
      month = 11;
      year -= 1;
    } else {
      month -= 1;
    }

    return { month, year };
  }

  private calculateNextMonth(): MonthData {
    let month = this.core.currentMonth;
    let year = this.core.currentYear;

    if (month === 11) {
      month = 0;
      year += 1;
    } else {
      month += 1;
    }

    return { month, year };
  }

  private generateFullPanel(month: number, year: number): string {
    const headerHtml = this.generateHeaderHtml(month, year);
    const gridHtml = this.generateCalendarGridHtml(month, year);

    return `
      ${headerHtml}
      <div class="dp-ui__calendar">
        <div class="dp-ui__calendar-grid">
          ${gridHtml}
        </div>
      </div>
    `;
  }

  private generateHeaderHtml(month: number, year: number): string {
    const displayMode = this.core.options.ui?.displayMode;
    const isDropdownMode = displayMode === "dropdown";

    if (isDropdownMode) {
      return this.generateDropdownHeaderHtml(month, year);
    }

    return this.generateModalHeaderHtml(month, year);
  }

  private generateDropdownHeaderHtml(month: number, year: number): string {
    const { customMonths, monthsShort, monthLetters = 3 } = this.core.options.labels;
    const months = customMonths || monthsShort || [];
    let monthName = months[month] || "";

    if (monthLetters && monthLetters > 0) {
      monthName = monthName.substring(0, monthLetters);
    }

    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return `
      <div class="dp-ui__calendar-header">
        <div class="dp-ui__month-control">
          <button type="button" class="dp-ui__month-prev-btn" aria-label="Previous month" tabindex="-1">
            ${ICONS.keyboardArrowLeft}
          </button>
          <button type="button" class="dp-ui__month-select" tabindex="-1">
            ${monthName}
            <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
          </button>
          <button type="button" class="dp-ui__month-next-btn" aria-label="Next month" tabindex="-1">
            ${ICONS.keyboardArrowRight}
          </button>
        </div>
        <div class="dp-ui__year-control">
          <button type="button" class="dp-ui__year-prev-btn" aria-label="Previous year" tabindex="-1">
            ${ICONS.keyboardArrowLeft}
          </button>
          <button type="button" class="dp-ui__year-select" tabindex="-1">
            ${year}
            <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
          </button>
          <button type="button" class="dp-ui__year-next-btn" aria-label="Next year" tabindex="-1">
            ${ICONS.keyboardArrowRight}
          </button>
        </div>
      </div>
    `;
  }

  private generateModalHeaderHtml(month: number, year: number): string {
    const { customMonths, monthsShort } = this.core.options.labels;
    const months = customMonths || monthsShort || [];
    const monthName = months[month] || "";
    const capitalizedMonth =
      monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const labelText = `${capitalizedMonth} ${year}`;

    return `
      <div class="dp-ui__calendar-header">
        <button type="button" class="dp-ui__unified-picker-toggle" tabindex="-1">
          ${labelText}
          <span class="dp-ui__dropdown-arrow">${ICONS.arrowDropDown}</span>
        </button>
        <div class="dp-ui__month-nav">
          <button type="button" class="dp-ui__month-nav-btn dp-ui__month-nav-btn--prev" aria-label="Previous month" tabindex="-1">
            ${ICONS.keyboardArrowLeft}
          </button>
          <button type="button" class="dp-ui__month-nav-btn dp-ui__month-nav-btn--next" aria-label="Next month" tabindex="-1">
            ${ICONS.keyboardArrowRight}
          </button>
        </div>
      </div>
    `;
  }

  private generateCalendarGridHtml(month: number, year: number): string {
    const weekdaysHtml = this.generateWeekdaysHtml();
    const daysHtml = this.generateDaysHtml(month, year);
    return weekdaysHtml + daysHtml;
  }

  private generateWeekdaysHtml(): string {
    const {
      customWeekdays,
      weekdays,
      weekdayLetters = 1,
    } = this.core.options.labels;
    let weekdayNames = customWeekdays || weekdays || [];

    const startDay = this.getWeekStartDay();
    if (startDay > 0) {
      weekdayNames = [
        ...weekdayNames.slice(startDay),
        ...weekdayNames.slice(0, startDay),
      ];
    }

    let html = '<div class="dp-ui__weekdays">';

    if (this.core.options.ui.showWeekNumbers) {
      html += '<div class="dp-ui__weekday dp-ui__weekday--week">Wk</div>';
    }

    weekdayNames.forEach((weekday) => {
      let displayName = weekday;
      if (weekdayLetters && weekdayLetters > 0) {
        displayName = weekday.substring(0, weekdayLetters);
      }
      html += `<div class="dp-ui__weekday">${displayName}</div>`;
    });

    html += "</div>";
    return html;
  }

  private generateDaysHtml(month: number, year: number): string {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const weekStartDay = this.getWeekStartDay();

    let startDayOfWeek = firstDay.getDay() - weekStartDay;
    if (startDayOfWeek < 0) {
      startDayOfWeek += 7;
    }

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const today = new Date();
    const selectedDate = this.core.tempSelectedDate || this.core.selectedDate;

    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
    const weeksCount = totalCells / 7;

    let html = `<div class="dp-ui__days" data-weeks="${weeksCount}">`;
    let dayCounter = 1;
    let nextMonthDay = 1;

    for (let i = 0; i < totalCells; i++) {
      if (i % 7 === 0) {
        html += '<div class="dp-ui__week">';

        if (this.core.options.ui.showWeekNumbers) {
          const weekNumber = this.getWeekNumber(
            year,
            month,
            dayCounter,
            i,
            startDayOfWeek,
            daysInMonth,
          );
          html += `<div class="dp-ui__day dp-ui__day--week-number">${weekNumber}</div>`;
        }
      }

      const dayData = this.getDayData(
        i,
        startDayOfWeek,
        daysInMonth,
        prevMonthLastDay,
        dayCounter,
        nextMonthDay,
        month,
        year,
        today,
        selectedDate,
      );

      html += dayData.html;
      dayCounter = dayData.dayCounter;
      nextMonthDay = dayData.nextMonthDay;

      if ((i + 1) % 7 === 0) {
        html += "</div>";
      }
    }

    html += "</div>";
    return html;
  }

  private getWeekStartDay(): number {
    const locale = this.core.options.calendar.locale || "en-US";
    const weekStartOption = this.core.options.calendar.weekStart || "auto";

    if (weekStartOption === "monday") return 1;
    if (weekStartOption === "sunday") return 0;

    try {
      const localeObj = new Intl.Locale(locale);
      const weekInfo = (
        localeObj as Intl.Locale & { weekInfo?: { firstDay?: number } }
      ).weekInfo;
      return weekInfo?.firstDay === 7 ? 0 : (weekInfo?.firstDay ?? 0);
    } catch {
      return 0;
    }
  }

  private getWeekNumber(
    year: number,
    month: number,
    dayCounter: number,
    cellIndex: number,
    startDayOfWeek: number,
    daysInMonth: number,
  ): number {
    let dayForWeek: number;

    if (cellIndex < startDayOfWeek) {
      dayForWeek = 1;
    } else if (dayCounter > daysInMonth) {
      dayForWeek = daysInMonth;
    } else {
      dayForWeek = dayCounter;
    }

    const date = new Date(year, month, dayForWeek);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;

    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  private getDayData(
    index: number,
    startDayOfWeek: number,
    daysInMonth: number,
    prevMonthLastDay: number,
    dayCounter: number,
    nextMonthDay: number,
    month: number,
    year: number,
    today: Date,
    selectedDate: Date | null,
  ): { html: string; dayCounter: number; nextMonthDay: number } {
    const displayMode = this.core.options.ui?.displayMode;
    const isModalMode = displayMode === "modal";

    let dayClass = "dp-ui__day";
    let dayNumber: number;
    let isCurrentMonth = true;

    if (index < startDayOfWeek) {
      dayNumber = prevMonthLastDay - startDayOfWeek + index + 1;
      isCurrentMonth = false;

      if (isModalMode) {
        return {
          html: `<div class="dp-ui__day dp-ui__day--empty"></div>`,
          dayCounter,
          nextMonthDay,
        };
      }

      dayClass += " dp-ui__day--other-month";
    } else if (dayCounter > daysInMonth) {
      dayNumber = nextMonthDay;
      isCurrentMonth = false;
      nextMonthDay++;

      if (isModalMode) {
        return {
          html: `<div class="dp-ui__day dp-ui__day--empty"></div>`,
          dayCounter,
          nextMonthDay,
        };
      }

      dayClass += " dp-ui__day--other-month";
    } else {
      dayNumber = dayCounter;
      dayClass += this.getDayClasses(
        dayNumber,
        month,
        year,
        today,
        selectedDate,
      );
      dayCounter++;
    }

    const dataAttr = isCurrentMonth
      ? `data-day="${dayNumber}" data-month="${month}" data-year="${year}"`
      : "";

    return {
      html: `<div class="${dayClass}" ${dataAttr}>${dayNumber}</div>`,
      dayCounter,
      nextMonthDay,
    };
  }

  private getDayClasses(
    dayNumber: number,
    month: number,
    year: number,
    today: Date,
    selectedDate: Date | null,
  ): string {
    let classes = "";
    const currentDate = new Date(year, month, dayNumber);

    if (this.isToday(dayNumber, month, year, today)) {
      classes += " dp-ui__day--today";
    }

    if (this.isSelected(dayNumber, month, year, selectedDate)) {
      classes += " dp-ui__day--selected";
    }

    if (this.isDateDisabled(currentDate)) {
      classes += " dp-ui__day--disabled";
    }

    return classes;
  }

  private isToday(
    day: number,
    month: number,
    year: number,
    today: Date,
  ): boolean {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  }

  private isSelected(
    day: number,
    month: number,
    year: number,
    selectedDate: Date | null,
  ): boolean {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  }

  private isDateDisabled(date: Date): boolean {
    const { minDate, maxDate, disabledDates } = this.core;

    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    return disabledDates.some(
      (d) =>
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear(),
    );
  }
}
