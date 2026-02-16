import type { CoreState } from "../../datepicker/CoreState";

export class CalendarDateUtils {
  private core: CoreState;

  constructor(core: CoreState) {
    this.core = core;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  isSelected(date: Date): boolean {
    const { tempSelectedDate } = this.core;
    if (!tempSelectedDate) return false;

    return (
      date.getDate() === tempSelectedDate.getDate() &&
      date.getMonth() === tempSelectedDate.getMonth() &&
      date.getFullYear() === tempSelectedDate.getFullYear()
    );
  }

  isDisabled(date: Date): boolean {
    const { minDate, maxDate, disabledDates } = this.core;
    const { enabledDates } = this.core.options.calendar;

    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;

    if (enabledDates && enabledDates.length > 0) {
      return !enabledDates.some((enabledDate) =>
        this.isSameDay(date, enabledDate)
      );
    }

    if (disabledDates && disabledDates.length > 0) {
      return disabledDates.some((disabledDate) =>
        this.isSameDay(date, disabledDate)
      );
    }

    return false;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
