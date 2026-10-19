import type { PlainDate } from "@/types/date";
import type { CalendarMode, Precision, Selection } from "@/types/selection";
import type { FormatPattern } from "@/utils/date/format";
import {
  formatPeriod,
  parsePeriod,
  parsePeriodISO,
  periodISO,
} from "@/utils/date/period";
import { compareDates } from "@/utils/date/plainDate";
import {
  emptySelection,
  selectedDates,
  sortedUnique,
} from "@/utils/selection/model";

export const RANGE_SEPARATOR = " – ";

const MULTIPLE_SEPARATOR = ", ";
const RANGE_SPLIT = /\s*[–—]\s*|\s+-\s+/;
const MULTIPLE_SPLIT = /[,;]/;

export function formatSelection(
  s: Selection,
  pattern: FormatPattern,
  precision: Precision,
): string {
  const parts = selectedDates(s).map((date) =>
    formatPeriod(date, pattern, precision),
  );
  return parts.join(s.mode === "range" ? RANGE_SEPARATOR : MULTIPLE_SEPARATOR);
}

function parseList(
  parts: readonly string[],
  parse: (part: string) => PlainDate | null,
): PlainDate[] | null {
  const dates: PlainDate[] = [];
  for (const part of parts) {
    const date = parse(part);
    if (date === null) {
      return null;
    }
    dates.push(date);
  }
  return dates;
}

function rangeFrom(dates: readonly PlainDate[] | null): Selection | null {
  if (dates?.length !== 2) {
    return null;
  }
  const [start, end] = dates;
  if (compareDates(start, end) > 0) {
    return null;
  }
  return { mode: "range", start, end };
}

function parseMode(
  text: string,
  mode: CalendarMode,
  parse: (part: string) => PlainDate | null,
  rangeSplit: RegExp,
  multipleSplit: RegExp,
): Selection | null {
  switch (mode) {
    case "single": {
      const date = parse(text);
      return date === null ? null : { mode, date };
    }
    case "range":
      return rangeFrom(parseList(text.split(rangeSplit), parse));
    default: {
      const parts = text
        .split(multipleSplit)
        .filter((part) => part.trim() !== "");
      const dates = parseList(parts, parse);
      return dates === null ? null : { mode, dates: sortedUnique(dates) };
    }
  }
}

export function parseSelection(
  text: string,
  mode: CalendarMode,
  pattern: FormatPattern,
  precision: Precision,
): Selection | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return emptySelection(mode);
  }
  return parseMode(
    trimmed,
    mode,
    (part) => parsePeriod(part.trim(), pattern, precision),
    RANGE_SPLIT,
    MULTIPLE_SPLIT,
  );
}

export function serializeSelection(s: Selection, precision: Precision): string {
  if (s.mode === "range") {
    if (s.start === null || s.end === null) {
      return "";
    }
    return `${periodISO(s.start, precision)}/${periodISO(s.end, precision)}`;
  }
  return selectedDates(s)
    .map((date) => periodISO(date, precision))
    .join(",");
}

export function parseSerialized(
  text: string,
  mode: CalendarMode,
  precision: Precision,
): Selection | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return emptySelection(mode);
  }
  return parseMode(
    trimmed,
    mode,
    (part) => parsePeriodISO(part.trim(), precision),
    /\//,
    /,/,
  );
}
