import type { FormatPattern } from "@/utils/date/format";
import type { DatePart } from "@/utils/date/intl";
import { normalizeDigits } from "@/utils/date/parse";

const DIGIT = /^\d$/;
const TYPED_SEPARATORS = new Set(["/", ".", "-", " "]);

function groupWidth(part: DatePart, pattern: FormatPattern): number {
  return part === "year" ? pattern.yearDigits : 2;
}

export function maskDateText(text: string, pattern: FormatPattern): string {
  const { order } = pattern;
  const widths = order.map((part) => groupWidth(part, pattern));
  const groups: string[] = [""];
  for (const char of normalizeDigits(text)) {
    const index = groups.length - 1;
    const width = widths[index] ?? 0;
    const current = groups[index] ?? "";
    if (DIGIT.test(char)) {
      if (current.length >= width) {
        if (groups.length === order.length) break;
        groups.push(char);
      } else {
        groups[index] = current + char;
      }
    } else if (TYPED_SEPARATORS.has(char) && current !== "") {
      groups[index] = current.padStart(width, "0");
      if (groups.length < order.length) groups.push("");
    }
  }
  return groups.filter((group) => group !== "").join(pattern.separator);
}
