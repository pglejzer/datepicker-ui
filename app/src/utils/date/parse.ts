import type { PlainDate } from "@/types/date";
import type { FormatPattern } from "@/utils/date/format";
import type { DatePart } from "@/utils/date/intl";
import { createPlainDate, todayDate } from "@/utils/date/plainDate";

const NON_LATIN_DIGITS = /[٠-٩۰-۹]/g;
const DIRECTIONAL_MARKS = /[‎‏؜]/g;
const SEPARATORS = /[\s./-]+/;
const DIGITS_ONLY = /^\d+$/;
const COMPACT_DATE = /^\d{8}$/;
const TWO_DIGIT_YEAR_LOOKAHEAD = 20;

function toAsciiDigit(char: string): string {
  const code = char.charCodeAt(0);
  const zero = code >= 0x06f0 ? 0x06f0 : 0x0660;
  return String(code - zero);
}

export function normalizeDigits(text: string): string {
  return text
    .replace(DIRECTIONAL_MARKS, "")
    .replace(NON_LATIN_DIGITS, toAsciiDigit)
    .trim();
}

function splitGroups(
  text: string,
  order: readonly DatePart[],
): readonly string[] | null {
  if (COMPACT_DATE.test(text)) {
    const groups: string[] = [];
    let cursor = 0;
    for (const part of order) {
      const length = part === "year" ? 4 : 2;
      groups.push(text.slice(cursor, cursor + length));
      cursor += length;
    }
    return groups;
  }
  const groups = text.split(SEPARATORS).filter((group) => group !== "");
  if (groups.length !== 3 || !groups.every((g) => DIGITS_ONLY.test(g))) {
    return null;
  }
  return groups;
}

export function digitGroups(text: string): readonly string[] | null {
  const groups = normalizeDigits(text)
    .split(SEPARATORS)
    .filter((group) => group !== "");
  return groups.every((group) => DIGITS_ONLY.test(group)) ? groups : null;
}

export function expandYear(group: string): number | null {
  if (group.length === 4) {
    return Number(group);
  }
  if (group.length !== 2) {
    return null;
  }
  const candidate = 2000 + Number(group);
  const limit = todayDate().year + TWO_DIGIT_YEAR_LOOKAHEAD;
  return candidate <= limit ? candidate : 1900 + Number(group);
}

export function parseDate(
  text: string,
  pattern: FormatPattern,
): PlainDate | null {
  const groups = splitGroups(normalizeDigits(text), pattern.order);
  if (groups === null) {
    return null;
  }
  let day = 0;
  let month = 0;
  let year: number | null = 0;
  for (const [index, part] of pattern.order.entries()) {
    const group = groups[index] ?? "";
    if (part === "year") {
      year = expandYear(group);
    } else if (group.length > 2) {
      return null;
    } else if (part === "day") {
      day = Number(group);
    } else {
      month = Number(group);
    }
  }
  return year === null ? null : createPlainDate(year, month, day);
}
