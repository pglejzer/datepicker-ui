export type DateFormat =
  | "dd/mm/yyyy"
  | "dd-mm-yyyy"
  | "dd.mm.yyyy"
  | "mm/dd/yyyy"
  | "mm-dd-yyyy"
  | "mm.dd.yyyy"
  | "yyyy-mm-dd"
  | "yyyy/mm/dd"
  | "yyyy.mm.dd";

interface ParseResult {
  date: Date | null;
  isValid: boolean;
  error?: string;
}

export class DateParser {
  static parse(input: string, format: DateFormat): ParseResult {
    if (!input || input.trim() === "") {
      return { date: null, isValid: false, error: "Empty input" };
    }

    const cleaned = input.trim();

    const withSeparators = this.parseWithSeparators(cleaned, format);
    if (withSeparators.isValid) {
      return withSeparators;
    }

    const withoutSeparators = this.parseWithoutSeparators(cleaned, format);
    if (withoutSeparators.isValid) {
      return withoutSeparators;
    }

    return { date: null, isValid: false, error: "Invalid date format" };
  }

  private static parseWithSeparators(
    input: string,
    format: DateFormat
  ): ParseResult {
    const separator = this.detectSeparator(input);
    if (!separator) {
      return { date: null, isValid: false, error: "No separator found" };
    }

    const parts = input.split(separator).map((p) => p.trim());

    if (parts.length !== 3) {
      return { date: null, isValid: false, error: "Expected 3 parts" };
    }

    let day: number, month: number, year: number;

    if (format.startsWith("dd")) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else if (format.startsWith("mm")) {
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else if (format.startsWith("yyyy")) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      return { date: null, isValid: false, error: "Unknown format" };
    }

    return this.createDate(day, month, year);
  }

  private static parseWithoutSeparators(
    input: string,
    format: DateFormat
  ): ParseResult {
    if (!/^\d+$/.test(input)) {
      return { date: null, isValid: false, error: "Not pure digits" };
    }

    let day: number, month: number, year: number;

    if (input.length === 8) {
      if (format.startsWith("yyyy")) {
        year = parseInt(input.substring(0, 4), 10);
        month = parseInt(input.substring(4, 6), 10);
        day = parseInt(input.substring(6, 8), 10);
      } else if (format.startsWith("mm")) {
        month = parseInt(input.substring(0, 2), 10);
        day = parseInt(input.substring(2, 4), 10);
        year = parseInt(input.substring(4, 8), 10);
      } else {
        day = parseInt(input.substring(0, 2), 10);
        month = parseInt(input.substring(2, 4), 10);
        year = parseInt(input.substring(4, 8), 10);
      }

      return this.createDate(day, month, year);
    }

    if (input.length === 6) {
      let yy: number;

      if (format.startsWith("yyyy")) {
        return {
          date: null,
          isValid: false,
          error: "yyyy formats require 8 digits",
        };
      } else if (format.startsWith("mm")) {
        month = parseInt(input.substring(0, 2), 10);
        day = parseInt(input.substring(2, 4), 10);
        yy = parseInt(input.substring(4, 6), 10);
      } else {
        day = parseInt(input.substring(0, 2), 10);
        month = parseInt(input.substring(2, 4), 10);
        yy = parseInt(input.substring(4, 6), 10);
      }

      year = yy < 50 ? 2000 + yy : 1900 + yy;

      return this.createDate(day, month, year);
    }

    return { date: null, isValid: false, error: "Invalid digit count" };
  }

  private static detectSeparator(input: string): string | null {
    if (input.includes("/")) return "/";
    if (input.includes("-")) return "-";
    if (input.includes(".")) return ".";
    return null;
  }

  private static createDate(
    day: number,
    month: number,
    year: number
  ): ParseResult {
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { date: null, isValid: false, error: "Invalid numbers" };
    }

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { date: null, isValid: false, error: "Invalid date values" };
    }

    return { date, isValid: true };
  }
}
