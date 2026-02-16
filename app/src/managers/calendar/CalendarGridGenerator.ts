import type { CoreState } from "../../datepicker/CoreState";
import type { CalendarDateUtils } from "./CalendarDateUtils";

export interface CalendarDay {
  date: Date;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  weekNumber?: number;
}

export class CalendarGridGenerator {
  private core: CoreState;
  private dateUtils: CalendarDateUtils;

  constructor(core: CoreState, dateUtils: CalendarDateUtils) {
    this.core = core;
    this.dateUtils = dateUtils;
  }

  private shouldShowAdjacentMonths(): boolean {
    const displayMode = this.core.options.ui?.displayMode;
    return displayMode === "dropdown";
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

  generateCalendarGrid(): CalendarDay[] {
    const { currentMonth, currentYear } = this.core;
    const startDay = this.getStartDay();
    const showAdjacentMonths = this.shouldShowAdjacentMonths();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const offset = (dayOfWeek - startDay + 7) % 7;

    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const lastDayWeekday = lastDayOfMonth.getDay();
    const daysAfter = (startDay - lastDayWeekday - 1 + 7) % 7;

    let startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - offset);

    const totalDays = offset + daysInMonth + daysAfter;
    const grid: CalendarDay[] = [];

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      const isCurrentMonth = date.getMonth() === currentMonth;

      grid.push({
        date: new Date(date),
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isCurrentMonth,
        isToday: this.dateUtils.isToday(date),
        isSelected: this.dateUtils.isSelected(date),
        isDisabled: this.dateUtils.isDisabled(date),
        weekNumber: this.core.options.ui.showWeekNumbers
          ? this.dateUtils.getWeekNumber(date)
          : undefined,
      });

      startDate.setDate(startDate.getDate() + 1);
    }

    return grid;
  }
}
