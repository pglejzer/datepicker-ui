import type { DateFormat } from "./DateParser";

export class DateFormatter {
  static format(date: Date | null, format: DateFormat): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }

    const day = this.pad(date.getDate());
    const month = this.pad(date.getMonth() + 1);
    const year = date.getFullYear();

    const separator = this.getSeparator(format);

    if (format.startsWith("dd")) {
      return `${day}${separator}${month}${separator}${year}`;
    } else if (format.startsWith("mm")) {
      return `${month}${separator}${day}${separator}${year}`;
    } else if (format.startsWith("yyyy")) {
      return `${year}${separator}${month}${separator}${day}`;
    }

    return `${day}/${month}/${year}`;
  }

  private static pad(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  static getSeparator(format: DateFormat): string {
    if (format.includes("/")) return "/";
    if (format.includes("-")) return "-";
    if (format.includes(".")) return ".";
    return "/";
  }
}
