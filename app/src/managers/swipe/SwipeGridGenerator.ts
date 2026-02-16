import type { CoreState } from "../../datepicker/CoreState";

export class SwipeGridGenerator {
  private core: CoreState;

  constructor(core: CoreState) {
    this.core = core;
  }

  generatePrevMonthHtml(): string {
    let { currentMonth, currentYear } = this.core;

    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }

    return this.generateMonthGridHtml(currentMonth, currentYear);
  }

  generateNextMonthHtml(): string {
    let { currentMonth, currentYear } = this.core;

    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }

    return this.generateMonthGridHtml(currentMonth, currentYear);
  }

  generateMonthGridHtml(month: number, year: number): string {
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

    let html = '<div class="dp-ui__days">';
    let dayCounter = 1;
    let nextMonthDay = 1;

    for (let i = 0; i < totalCells; i++) {
      if (i % 7 === 0) {
        html += '<div class="dp-ui__week">';
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
