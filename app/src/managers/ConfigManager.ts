import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

export class ConfigManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
    this.validateOptions();
  }

  private validateOptions(): void {
    const { minDate, maxDate } = this.core;

    if (minDate && maxDate && minDate > maxDate) {
      this.emitter.emit("error", {
        code: "E_INVALID_RANGE",
        message: "minDate cannot be greater than maxDate",
      });
    }
  }

  destroy(): void {}
}
