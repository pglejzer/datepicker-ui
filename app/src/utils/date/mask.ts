import type { FormatPattern } from "@/utils/date/format";
import type { DatePart } from "@/utils/date/intl";
import { DIRECTIONAL_MARK, normalizeDigit } from "@/utils/date/parse";

const DIGIT = /^\d$/;
const TYPED_SEPARATORS = new Set(["/", ".", "-", " "]);

function groupWidth(part: DatePart, pattern: FormatPattern): number {
  return part === "year" ? pattern.yearDigits : 2;
}

export function scanDateText(
  text: string,
  pattern: FormatPattern,
): { readonly groups: readonly string[]; readonly end: number } {
  const { order } = pattern;
  const widths = order.map((part) => groupWidth(part, pattern));
  const groups: string[] = [""];
  let end = 0;
  for (let position = 0; position < text.length; position++) {
    const raw = text.charAt(position);
    if (DIRECTIONAL_MARK.test(raw)) continue;
    const char = normalizeDigit(raw);
    const index = groups.length - 1;
    const width = widths[index] ?? 0;
    const current = groups[index] ?? "";
    const last = groups.length === order.length;
    if (DIGIT.test(char)) {
      if (current.length >= width) {
        if (last) break;
        groups.push(char);
      } else {
        groups[index] = current + char;
      }
      end = position + 1;
    } else if (TYPED_SEPARATORS.has(char)) {
      if (current === "") continue;
      if (last) break;
      groups[index] = current.padStart(width, "0");
      groups.push("");
      end = position + 1;
    }
  }
  return { groups, end };
}

export function maskDateText(text: string, pattern: FormatPattern): string {
  return scanDateText(text, pattern)
    .groups.filter((group) => group !== "")
    .join(pattern.separator);
}

/**
 * Length of the date at the start of `text`, in characters of `text` as
 * given: the index just after the last digit group `pattern` expects, or the
 * separator before the next group. A separator after the last group is not
 * part of the date. Bidi marks, locale digits and characters the mask skips
 * count as written. Returns 0 when `text` holds no digit.
 */
export function leadingDateLength(
  text: string,
  pattern: FormatPattern,
): number {
  return scanDateText(text, pattern).end;
}

/**
 * Whether `text` starts with a whole date: every group `pattern` expects is
 * there and the last one has all its digits. A separator closes an earlier
 * group, so `1.5.2026` is complete. Text after the date is ignored.
 */
export function isDateTextComplete(
  text: string,
  pattern: FormatPattern,
): boolean {
  const { groups } = scanDateText(text, pattern);
  const lastPart = pattern.order.at(-1);
  const lastGroup = groups.at(-1);
  if (
    lastPart === undefined ||
    lastGroup === undefined ||
    groups.length !== pattern.order.length
  ) {
    return false;
  }
  return lastGroup.length === groupWidth(lastPart, pattern);
}

export function maskInput(
  input: HTMLInputElement,
  pattern: FormatPattern,
): void {
  const masked = maskDateText(input.value, pattern);
  if (masked === input.value) return;
  input.value = masked;
  input.setSelectionRange(masked.length, masked.length);
}
