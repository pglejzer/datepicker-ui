import type { DateInput, PlainDate, Weekday, YearMonth } from "@/types/date";

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1;
const MAX_YEAR = 9999;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function monthLength(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const shiftedMonth = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days: number): PlainDate {
  const shifted = days + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

function toWeekday(value: number): Weekday {
  switch (((value % 7) + 7) % 7) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    case 5:
      return 5;
    default:
      return 6;
  }
}

export function isValidPlainDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) {
    return false;
  }
  return day >= 1 && day <= monthLength(year, month);
}

export function createPlainDate(
  year: number,
  month: number,
  day: number,
): PlainDate | null {
  return isValidPlainDate(year, month, day) ? { year, month, day } : null;
}

export function fromDate(date: Date): PlainDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function toDate(date: PlainDate): Date {
  const result = new Date(2000, 0, 1);
  result.setFullYear(date.year, date.month - 1, date.day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function fromISO(value: string): PlainDate | null {
  const match = ISO_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return createPlainDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function toISO(date: PlainDate): string {
  const year = String(date.year).padStart(4, "0");
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function compareDates(a: PlainDate, b: PlainDate): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
}

export function isSameDay(a: PlainDate | null, b: PlainDate | null): boolean {
  if (a === null || b === null) {
    return false;
  }
  return compareDates(a, b) === 0;
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return civilFromDays(daysFromCivil(date.year, date.month, date.day) + days);
}

export function daysBetween(a: PlainDate, b: PlainDate): number {
  return (
    daysFromCivil(b.year, b.month, b.day) -
    daysFromCivil(a.year, a.month, a.day)
  );
}

export function addMonths(view: YearMonth, months: number): YearMonth {
  const total = view.year * 12 + (view.month - 1) + months;
  const year = Math.floor(total / 12);
  return { year, month: total - year * 12 + 1 };
}

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return to.year * 12 + to.month - (from.year * 12 + from.month);
}

export function daysInMonth(view: YearMonth): number {
  return monthLength(view.year, view.month);
}

export function dayOfWeek(date: PlainDate): Weekday {
  return toWeekday(daysFromCivil(date.year, date.month, date.day) + 4);
}

export function todayDate(): PlainDate {
  return fromDate(new Date());
}

export function toPlainDate(input: DateInput): PlainDate | null {
  if (input === "today") {
    return todayDate();
  }
  if (typeof input === "string") {
    return fromISO(input);
  }
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return fromDate(input);
}

export function isoWeekNumber(date: PlainDate): number {
  const days = daysFromCivil(date.year, date.month, date.day);
  const isoWeekday = ((dayOfWeek(date) + 6) % 7) + 1;
  const thursday = days + 4 - isoWeekday;
  const thursdayYear = civilFromDays(thursday).year;
  const firstDay = daysFromCivil(thursdayYear, 1, 1);
  return Math.floor((thursday - firstDay) / 7) + 1;
}
