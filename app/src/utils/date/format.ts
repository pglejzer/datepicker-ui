import type { PlainDate } from "@/types/date";
import type { Precision } from "@/types/selection";
import type { DatePart } from "@/utils/date/intl";

export type FormatOption = "auto" | (string & Record<never, never>);

export interface FormatPattern {
  readonly order: readonly DatePart[];
  readonly separator: string;
  readonly padDay: boolean;
  readonly padMonth: boolean;
  readonly yearDigits: 2 | 4;
}

const FALLBACK_LOCALE = "en-US";
const FALLBACK_SEPARATOR = "/";
const ALLOWED_SEPARATORS = new Set(["/", ".", "-", " "]);
const DIRECTIONAL_MARKS = /[‎‏؜]/g;
const CUSTOM_FORMAT =
  /^(d{1,2}|M{1,2}|yyyy|yy)([/. -])(d{1,2}|M{1,2}|yyyy|yy)\2(d{1,2}|M{1,2}|yyyy|yy)$/;
const MONTH_YEAR_FORMAT = /^(M{1,2}|yyyy|yy)([/. -])(M{1,2}|yyyy|yy)$/;

const patternCache = new Map<string, FormatPattern>();

function tokenPart(token: string): DatePart {
  if (token.startsWith("d")) {
    return "day";
  }
  return token.startsWith("M") ? "month" : "year";
}

function parseFullFormat(format: string): FormatPattern | null {
  const match = CUSTOM_FORMAT.exec(format);
  if (!match) {
    return null;
  }
  const tokens = [match[1], match[3], match[4]];
  const order = tokens.map(tokenPart);
  if (new Set(order).size !== 3) {
    return null;
  }
  return {
    order,
    separator: match.at(2) ?? FALLBACK_SEPARATOR,
    padDay: tokens.includes("dd"),
    padMonth: tokens.includes("MM"),
    yearDigits: tokens.includes("yy") ? 2 : 4,
  };
}

function parseMonthYearFormat(format: string): FormatPattern | null {
  const match = MONTH_YEAR_FORMAT.exec(format);
  if (!match) {
    return null;
  }
  const tokens = [match[1], match[3]];
  const [first, second] = tokens.map(tokenPart);
  if (first === second) {
    return null;
  }
  return {
    order:
      first === "month" ? ["day", "month", "year"] : ["year", "month", "day"],
    separator: match.at(2) ?? FALLBACK_SEPARATOR,
    padDay: true,
    padMonth: tokens.includes("MM"),
    yearDigits: tokens.includes("yy") ? 2 : 4,
  };
}

function parseYearFormat(format: string): FormatPattern | null {
  if (format !== "yyyy" && format !== "yy") {
    return null;
  }
  return {
    order: ["month", "day", "year"],
    separator: FALLBACK_SEPARATOR,
    padDay: true,
    padMonth: true,
    yearDigits: format === "yy" ? 2 : 4,
  };
}

function parseCustomFormat(
  format: string,
  precision: Precision,
): FormatPattern | null {
  const full = parseFullFormat(format);
  if (full !== null || precision === "day") {
    return full;
  }
  const monthYear = parseMonthYearFormat(format);
  if (monthYear !== null || precision === "month") {
    return monthYear;
  }
  return parseYearFormat(format);
}

export function isFormatOption(
  format: string,
  precision: Precision = "day",
): boolean {
  return (
    format === "auto" || parseCustomFormat(format.trim(), precision) !== null
  );
}

function createAutoFormatter(locale: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions & { numberingSystem: string } = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    numberingSystem: "latn",
    timeZone: "UTC",
  };
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(FALLBACK_LOCALE, options);
  }
}

function autoPattern(locale: string): FormatPattern {
  const parts = createAutoFormatter(locale).formatToParts(
    new Date(Date.UTC(2024, 10, 22, 12)),
  );
  const order: DatePart[] = [];
  let separator = "";
  for (const part of parts) {
    if (part.type === "day" || part.type === "month" || part.type === "year") {
      order.push(part.type);
    } else if (part.type === "literal" && separator === "") {
      separator = part.value.replace(DIRECTIONAL_MARKS, "").trim();
    }
  }
  const safeOrder: readonly DatePart[] =
    order.length === 3 ? order : ["month", "day", "year"];
  return {
    order: safeOrder,
    separator: ALLOWED_SEPARATORS.has(separator)
      ? separator
      : FALLBACK_SEPARATOR,
    padDay: true,
    padMonth: true,
    yearDigits: 4,
  };
}

export function resolvePattern(
  format: FormatOption,
  locale: string,
  precision: Precision = "day",
): FormatPattern {
  const key = `${format}|${locale}|${precision}`;
  const cached = patternCache.get(key);
  if (cached) {
    return cached;
  }
  const custom =
    format === "auto" ? null : parseCustomFormat(format.trim(), precision);
  const pattern = custom ?? autoPattern(locale);
  patternCache.set(key, pattern);
  return pattern;
}

function formatPart(
  date: PlainDate,
  part: DatePart,
  pattern: FormatPattern,
): string {
  switch (part) {
    case "day":
      return pattern.padDay
        ? String(date.day).padStart(2, "0")
        : String(date.day);
    case "month":
      return pattern.padMonth
        ? String(date.month).padStart(2, "0")
        : String(date.month);
    default:
      return pattern.yearDigits === 2
        ? String(date.year % 100).padStart(2, "0")
        : String(date.year).padStart(4, "0");
  }
}

export interface HintLetters {
  readonly day: string;
  readonly month: string;
  readonly year: string;
}

const DEFAULT_HINT_LETTERS: HintLetters = {
  day: "dd",
  month: "mm",
  year: "yyyy",
};
const SHORT_YEAR_LETTERS = 2;

export function hintLetters(labels: {
  readonly hintDay: string;
  readonly hintMonth: string;
  readonly hintYear: string;
}): HintLetters {
  return {
    day: labels.hintDay,
    month: labels.hintMonth,
    year: labels.hintYear,
  };
}

export function formatHint(
  pattern: FormatPattern,
  letters: HintLetters = DEFAULT_HINT_LETTERS,
): string {
  return pattern.order
    .map((part) => {
      if (part === "day") {
        return letters.day;
      }
      if (part === "month") {
        return letters.month;
      }
      return pattern.yearDigits === 2
        ? letters.year.slice(0, SHORT_YEAR_LETTERS)
        : letters.year;
    })
    .join(pattern.separator);
}

export function formatDate(date: PlainDate, pattern: FormatPattern): string {
  return pattern.order
    .map((part) => formatPart(date, part, pattern))
    .join(pattern.separator);
}
