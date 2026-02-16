import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { DateParser } from "../utils/DateParser";
import { DateFormatter } from "../utils/DateFormatter";
import type { DateFormat } from "../utils/DateParser";

export class InputManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private cleanupHandlers: Array<() => void> = [];

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
    this.bindInputEvents();
  }

  formatDate(date: Date | null): string {
    const format = this.getFormat();
    return DateFormatter.format(date, format);
  }

  parseDate(value: string): Date | null {
    if (!value || value.trim() === "") return null;

    const format = this.getFormat();
    const result = DateParser.parse(value, format);

    return result.isValid ? result.date : null;
  }

  updateInputValue(): void {
    const input = this.core.getInput();
    if (!input) return;

    if (input.hasAttribute("readonly")) {
      const formatted = this.formatDate(this.core.selectedDate);
      input.value = formatted;
      return;
    }

    const formatted = this.formatDate(this.core.selectedDate);
    input.value = formatted;

    this.clearErrorState();
  }

  private bindInputEvents(): void {
    const input = this.core.getInput();
    if (!input) return;

    const blurHandler = (): void => {
      if (input.hasAttribute("readonly")) return;
      this.handleInputBlur();
    };

    const pasteHandler = (e: ClipboardEvent): void => {
      if (input.hasAttribute("readonly")) {
        e.preventDefault();
        return;
      }
    };

    input.addEventListener("blur", blurHandler);
    input.addEventListener("paste", pasteHandler);

    this.cleanupHandlers.push(() => {
      input.removeEventListener("blur", blurHandler);
      input.removeEventListener("paste", pasteHandler);
    });
  }

  private handleInputBlur(): void {
    const input = this.core.getInput();
    if (!input) return;

    const value = input.value.trim();

    if (value === "") {
      this.core.setSelectedDate(null);
      this.clearErrorState();
      this.emitter.emit("update", {
        date: null,
        timestamp: Date.now(),
      });
      return;
    }

    const format = this.getFormat();
    const result = DateParser.parse(value, format);

    if (result.isValid && result.date) {
      this.core.setSelectedDate(result.date);
      this.core.setCurrentMonth(result.date.getMonth());
      this.core.setCurrentYear(result.date.getFullYear());

      input.value = this.formatDate(result.date);

      this.clearErrorState();

      this.emitter.emit("update", {
        date: result.date,
        timestamp: Date.now(),
      });
    } else {
      this.setErrorState();

      this.emitter.emit("error", {
        code: "E_INVALID_FORMAT",
        message: result.error || "Invalid date format",
        inputValue: value,
      });
    }
  }

  private getFormat(): DateFormat {
    return (this.core.options.ui?.format as DateFormat) || "dd/mm/yyyy";
  }

  private setErrorState(): void {
    const input = this.core.getInput();
    if (!input) return;

    input.classList.add("dp-ui--error");
    input.setAttribute("aria-invalid", "true");
  }

  private clearErrorState(): void {
    const input = this.core.getInput();
    if (!input) return;

    input.classList.remove("dp-ui--error");
    input.removeAttribute("aria-invalid");
  }

  destroy(): void {
    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];

    this.clearErrorState();
  }
}
