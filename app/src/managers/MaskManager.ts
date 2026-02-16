import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import type { DateFormat } from "../utils/DateParser";

interface MaskSegment {
  type: "day" | "month" | "year";
  start: number;
  end: number;
  length: number;
}

interface MaskConfig {
  separator: string;
  segments: MaskSegment[];
  format: DateFormat;
  placeholder: string;
}

export class MaskManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private cleanupHandlers: Array<() => void> = [];
  private maskConfig: MaskConfig | null = null;
  private isProcessing = false;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
    if (!this.isMaskEnabled()) return;

    const format = this.getFormat();
    this.maskConfig = this.buildMaskConfig(format);
    this.bindInputEvents();
  }

  private isMaskEnabled(): boolean {
    return this.core.options.ui?.maskEnabled === true;
  }

  private getFormat(): DateFormat {
    return (this.core.options.ui?.format as DateFormat) || "dd/mm/yyyy";
  }

  private getSeparator(format: DateFormat): string {
    if (format.includes("/")) return "/";
    if (format.includes("-")) return "-";
    if (format.includes(".")) return ".";
    return "/";
  }

  private buildMaskConfig(format: DateFormat): MaskConfig {
    const separator = this.getSeparator(format);
    const parts = format.split(separator);
    const segments: MaskSegment[] = [];
    let position = 0;

    parts.forEach((part, index) => {
      const length = part.length;
      const type = part.includes("y")
        ? "year"
        : part.includes("m")
          ? "month"
          : "day";

      segments.push({
        type,
        start: position,
        end: position + length,
        length,
      });

      position += length;
      if (index < parts.length - 1) {
        position += separator.length;
      }
    });

    const placeholder = parts
      .map((p) => (p.includes("y") ? "yyyy" : p.includes("m") ? "mm" : "dd"))
      .join(separator);

    return {
      separator,
      segments,
      format,
      placeholder,
    };
  }

  private bindInputEvents(): void {
    const input = this.core.getInput();
    if (!input || input.hasAttribute("readonly")) return;

    const inputHandler = (e: Event): void => {
      if (this.isProcessing) return;
      this.handleInput(e as InputEvent);
    };

    const keydownHandler = (e: KeyboardEvent): void => {
      this.handleKeyDown(e);
    };

    const pasteHandler = (e: ClipboardEvent): void => {
      this.handlePaste(e);
    };

    input.addEventListener("input", inputHandler);
    input.addEventListener("keydown", keydownHandler);
    input.addEventListener("paste", pasteHandler);

    this.cleanupHandlers.push(() => {
      input.removeEventListener("input", inputHandler);
      input.removeEventListener("keydown", keydownHandler);
      input.removeEventListener("paste", pasteHandler);
    });
  }

  private handleInput(e: InputEvent): void {
    const input = this.core.getInput();
    if (!input || !this.maskConfig) return;

    this.isProcessing = true;

    const cursorPos = input.selectionStart || 0;
    const rawValue = input.value;

    const masked = this.applyMask(rawValue, cursorPos);

    if (masked.value !== rawValue) {
      input.value = masked.value;
      input.setSelectionRange(masked.cursorPos, masked.cursorPos);
    }

    this.isProcessing = false;

    this.emitter.emit("mask:input", {
      value: masked.value,
      isComplete: this.isCompleteMask(masked.value),
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const input = this.core.getInput();
    if (!input || !this.maskConfig) return;

    if (e.key === "Backspace" || e.key === "Delete") {
      const cursorPos = input.selectionStart || 0;
      const value = input.value;

      if (
        e.key === "Backspace" &&
        cursorPos > 0 &&
        value[cursorPos - 1] === this.maskConfig.separator
      ) {
        e.preventDefault();
        input.setSelectionRange(cursorPos - 1, cursorPos - 1);
      } else if (
        e.key === "Delete" &&
        cursorPos < value.length &&
        value[cursorPos] === this.maskConfig.separator
      ) {
        e.preventDefault();
        input.setSelectionRange(cursorPos + 1, cursorPos + 1);
      }
    }
  }

  private handlePaste(e: ClipboardEvent): void {
    const input = this.core.getInput();
    if (!input || !this.maskConfig) return;

    e.preventDefault();

    const pastedText = e.clipboardData?.getData("text") || "";
    const cursorPos = input.selectionStart || 0;

    const cleaned = pastedText.replace(/[^\d]/g, "");
    const currentValue = input.value;

    const beforeCursor = currentValue.substring(0, cursorPos);
    const afterCursor = currentValue.substring(input.selectionEnd || cursorPos);

    const newValue = beforeCursor + cleaned + afterCursor;

    const masked = this.applyMask(newValue, cursorPos + cleaned.length);

    input.value = masked.value;
    input.setSelectionRange(masked.cursorPos, masked.cursorPos);

    this.emitter.emit("mask:input", {
      value: masked.value,
      isComplete: this.isCompleteMask(masked.value),
    });
  }

  private applyMask(
    rawValue: string,
    cursorPos: number
  ): { value: string; cursorPos: number } {
    if (!this.maskConfig) {
      return { value: rawValue, cursorPos };
    }

    const digits = rawValue.replace(/[^\d]/g, "");

    if (digits.length === 0) {
      return { value: "", cursorPos: 0 };
    }

    const { separator, segments } = this.maskConfig;
    let result = "";
    let digitIndex = 0;
    let newCursorPos = 0;
    const digitsBeforeCursor = rawValue
      .substring(0, cursorPos)
      .replace(/[^\d]/g, "").length;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDigits = digits.substring(
        digitIndex,
        digitIndex + segment.length
      );

      if (segmentDigits.length === 0) break;

      const corrected = this.correctSegment(
        segmentDigits,
        segment.type,
        digits,
        digitIndex
      );

      result += corrected;
      digitIndex += segmentDigits.length;

      if (digitIndex <= digitsBeforeCursor) {
        newCursorPos = result.length;
      }

      if (i < segments.length - 1 && digitIndex < digits.length) {
        result += separator;
        if (digitIndex <= digitsBeforeCursor) {
          newCursorPos = result.length;
        }
      }
    }

    return { value: result, cursorPos: newCursorPos };
  }

  private correctSegment(
    value: string,
    type: "day" | "month" | "year",
    allDigits: string,
    digitIndex: number
  ): string {
    if (type === "year") {
      const num = parseInt(value, 10);
      if (isNaN(num)) return value;

      if (value.length < 4) {
        return value;
      }

      const yearRange = this.core.options.ui?.yearRange || {
        before: 100,
        after: 20,
      };
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - (yearRange?.before || 100);
      const maxYear = currentYear + (yearRange?.after || 20);

      if (num < minYear) {
        return minYear.toString();
      }

      if (num > maxYear) {
        return maxYear.toString();
      }

      return value;
    }

    if (type === "month") {
      const num = parseInt(value, 10);
      if (isNaN(num)) return value;

      if (value.length === 1) {
        return value;
      }

      if (num > 12) {
        return "12";
      }

      if (num < 1) {
        return "01";
      }

      return value.padStart(2, "0");
    }

    if (type === "day") {
      const num = parseInt(value, 10);
      if (isNaN(num)) return value;

      if (value.length === 1) {
        return value;
      }

      const monthValue = this.extractMonthFromDigits(allDigits, digitIndex);
      const yearValue = this.extractYearFromDigits(allDigits, digitIndex);

      const maxDay = this.getMaxDayInMonth(monthValue, yearValue);

      if (num > maxDay) {
        return maxDay.toString().padStart(2, "0");
      }

      if (num < 1) {
        return "01";
      }

      return value.padStart(2, "0");
    }

    return value;
  }

  private extractMonthFromDigits(
    allDigits: string,
    currentIndex: number
  ): number {
    if (!this.maskConfig) return 1;

    const monthSegment = this.maskConfig.segments.find(
      (s) => s.type === "month"
    );
    if (!monthSegment) return 1;

    let digitPos = 0;
    for (const segment of this.maskConfig.segments) {
      if (segment.type === "month") {
        const monthStr = allDigits.substring(
          digitPos,
          digitPos + segment.length
        );
        const month = parseInt(monthStr, 10);
        return isNaN(month) || month < 1 || month > 12 ? 1 : month;
      }
      digitPos += segment.length;
    }

    return 1;
  }

  private extractYearFromDigits(
    allDigits: string,
    currentIndex: number
  ): number {
    if (!this.maskConfig) return new Date().getFullYear();

    const yearSegment = this.maskConfig.segments.find((s) => s.type === "year");
    if (!yearSegment) return new Date().getFullYear();

    let digitPos = 0;
    for (const segment of this.maskConfig.segments) {
      if (segment.type === "year") {
        const yearStr = allDigits.substring(
          digitPos,
          digitPos + segment.length
        );
        const year = parseInt(yearStr, 10);
        return isNaN(year) ? new Date().getFullYear() : year;
      }
      digitPos += segment.length;
    }

    return new Date().getFullYear();
  }

  private getMaxDayInMonth(month: number, year: number): number {
    if (month < 1 || month > 12) return 31;

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (month === 2 && this.isLeapYear(year)) {
      return 29;
    }

    return daysInMonth[month - 1];
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  private isCompleteMask(value: string): boolean {
    if (!this.maskConfig) return false;

    const digits = value.replace(/[^\d]/g, "");
    const requiredLength = this.maskConfig.segments.reduce(
      (sum, seg) => sum + seg.length,
      0
    );

    return digits.length === requiredLength;
  }

  destroy(): void {
    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];
    this.maskConfig = null;
  }
}
