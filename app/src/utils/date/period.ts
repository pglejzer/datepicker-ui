import type { PlainDate } from "@/types/date";
import type { Precision } from "@/types/selection";
import type { FormatPattern, HintLetters } from "@/utils/date/format";
import { formatDate, formatHint } from "@/utils/date/format";
import { digitGroups, expandYear, parseDate } from "@/utils/date/parse";
import { createPlainDate, fromISO, toISO } from "@/utils/date/plainDate";

const MONTH_ISO = /^(\d{4})-(\d{2})$/;
const YEAR_ISO = /^\d{4}$/;
const ISO_MONTH_LENGTH = 7;
const ISO_YEAR_LENGTH = 4;

export function normalizePeriod(
  date: PlainDate,
  precision: Precision,
): PlainDate {
  switch (precision) {
    case "day":
      return date;
    case "month":
      return { year: date.year, month: date.month, day: 1 };
    default:
      return { year: date.year, month: 1, day: 1 };
  }
}

export function periodISO(date: PlainDate, precision: Precision): string {
  const iso = toISO(date);
  switch (precision) {
    case "day":
      return iso;
    case "month":
      return iso.slice(0, ISO_MONTH_LENGTH);
    default:
      return iso.slice(0, ISO_YEAR_LENGTH);
  }
}

export function parsePeriodISO(
  text: string,
  precision: Precision,
): PlainDate | null {
  const full = fromISO(text);
  if (full !== null || precision === "day") {
    return full === null ? null : normalizePeriod(full, precision);
  }
  if (precision === "month") {
    const match = MONTH_ISO.exec(text);
    return match
      ? createPlainDate(Number(match[1]), Number(match[2]), 1)
      : null;
  }
  return YEAR_ISO.test(text) ? createPlainDate(Number(text), 1, 1) : null;
}

function periodPattern(
  pattern: FormatPattern,
  precision: Precision,
): FormatPattern {
  return {
    ...pattern,
    order: pattern.order.filter(
      (part) => part === "year" || (precision === "month" && part === "month"),
    ),
  };
}

export function formatPeriod(
  date: PlainDate,
  pattern: FormatPattern,
  precision: Precision,
): string {
  if (precision === "day") {
    return formatDate(date, pattern);
  }
  return formatDate(date, periodPattern(pattern, precision));
}

export function periodHint(
  pattern: FormatPattern,
  precision: Precision,
  letters?: HintLetters,
): string {
  if (precision === "day") {
    return formatHint(pattern, letters);
  }
  return formatHint(periodPattern(pattern, precision), letters);
}

export function parsePeriod(
  text: string,
  pattern: FormatPattern,
  precision: Precision,
): PlainDate | null {
  if (precision === "day") {
    return parseDate(text, pattern);
  }
  const { order } = periodPattern(pattern, precision);
  const groups = digitGroups(text);
  if (groups?.length !== order.length) {
    return null;
  }
  let month = 1;
  let year: number | null = null;
  for (const [index, part] of order.entries()) {
    const group = groups[index] ?? "";
    if (part === "year") {
      year = expandYear(group);
    } else if (group.length > 2) {
      return null;
    } else {
      month = Number(group);
    }
  }
  return year === null ? null : createPlainDate(year, month, 1);
}
