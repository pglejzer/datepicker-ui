import type { PlainDate } from "@/types/date";
import type { RangeEnd } from "@/types/selection";
import type { FormatPattern } from "@/utils/date/format";
import { parseDate } from "@/utils/date/parse";
import { compareDates } from "@/utils/date/plainDate";

export type SplitResult =
  | { readonly kind: "empty" }
  | { readonly kind: "partial" }
  | { readonly kind: "invalid"; readonly field: RangeEnd }
  | { readonly kind: "reversed" }
  | {
      readonly kind: "range";
      readonly start: PlainDate;
      readonly end: PlainDate;
    };

export function parseSplit(
  startText: string,
  endText: string,
  pattern: FormatPattern,
): SplitResult {
  const startTrimmed = startText.trim();
  const endTrimmed = endText.trim();
  if (startTrimmed === "" && endTrimmed === "") {
    return { kind: "empty" };
  }
  const start = startTrimmed === "" ? null : parseDate(startTrimmed, pattern);
  if (startTrimmed !== "" && start === null) {
    return { kind: "invalid", field: "start" };
  }
  const end = endTrimmed === "" ? null : parseDate(endTrimmed, pattern);
  if (endTrimmed !== "" && end === null) {
    return { kind: "invalid", field: "end" };
  }
  if (start === null || end === null) {
    return { kind: "partial" };
  }
  if (compareDates(start, end) > 0) {
    return { kind: "reversed" };
  }
  return { kind: "range", start, end };
}
