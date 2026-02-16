import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

export class ValidationManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
  }

  isValidDate(date: Date): boolean {
    const { minDate, maxDate, disabledDates } = this.core;

    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;

    if (disabledDates && disabledDates.length > 0) {
      return !disabledDates.some((disabledDate) =>
        this.isSameDay(date, disabledDate)
      );
    }

    return true;
  }

  isValidRange(startDate: Date, endDate: Date): boolean {
    if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
      return false;
    }

    if (startDate > endDate) {
      return false;
    }

    const { disabledDates } = this.core;
    if (!disabledDates || disabledDates.length === 0) {
      return true;
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      if (
        disabledDates.some((disabledDate) =>
          this.isSameDay(current, disabledDate)
        )
      ) {
        return false;
      }
      current.setDate(current.getDate() + 1);
    }

    return true;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  destroy(): void {}
}
