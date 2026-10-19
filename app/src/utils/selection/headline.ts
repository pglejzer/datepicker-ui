import type { PluralLabel } from "@/types/options";
import type { CalendarMode, Precision, Selection } from "@/types/selection";
import {
  formatPeriodLabel,
  formatShortDate,
  formatShortRange,
} from "@/utils/date/intl";
import { RANGE_SEPARATOR } from "@/utils/selection/text";

export interface HeadlineLabels {
  readonly noDate: string;
  readonly rangeStart: string;
  readonly rangeEnd: string;
  readonly multipleSelected: PluralLabel;
}

export interface TitleLabels {
  readonly title: string;
  readonly rangeTitle: string;
  readonly monthTitle: string;
  readonly yearTitle: string;
}

export function titleText(
  labels: TitleLabels,
  mode: CalendarMode,
  precision: Precision,
): string {
  if (mode === "range") {
    return labels.rangeTitle;
  }
  switch (precision) {
    case "month":
      return labels.monthTitle;
    case "year":
      return labels.yearTitle;
    case "day":
      return labels.title;
  }
}

const pluralCache = new Map<string, Intl.PluralRules>();
const numberCache = new Map<string, Intl.NumberFormat>();

function pluralRules(locale: string): Intl.PluralRules {
  const cached = pluralCache.get(locale);
  if (cached) {
    return cached;
  }
  const rules = new Intl.PluralRules(locale);
  pluralCache.set(locale, rules);
  return rules;
}

function numberFormat(locale: string): Intl.NumberFormat {
  const cached = numberCache.get(locale);
  if (cached) {
    return cached;
  }
  const format = new Intl.NumberFormat(locale);
  numberCache.set(locale, format);
  return format;
}

export function formatCount(
  label: PluralLabel,
  count: number,
  locale: string,
): string {
  const template =
    typeof label === "string"
      ? label
      : (label[pluralRules(locale).select(count)] ??
        label.other ??
        Object.values(label).at(0) ??
        "");
  return template.replaceAll("{count}", numberFormat(locale).format(count));
}

export function headlineText(
  s: Selection,
  view: "calendar" | "input",
  locale: string,
  labels: HeadlineLabels,
  precision: Precision,
): string {
  switch (s.mode) {
    case "single":
      return s.date
        ? formatPeriodLabel(s.date, precision, locale, "headline")
        : labels.noDate;
    case "range": {
      if (view === "input" && s.start && s.end) {
        return formatShortRange(s.start, s.end, locale);
      }
      const start = s.start
        ? formatShortDate(s.start, locale)
        : labels.rangeStart;
      const end = s.end ? formatShortDate(s.end, locale) : labels.rangeEnd;
      return `${start}${RANGE_SEPARATOR}${end}`;
    }
    default:
      return s.dates.length === 0
        ? labels.noDate
        : formatCount(labels.multipleSelected, s.dates.length, locale);
  }
}
