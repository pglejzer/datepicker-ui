import type { PlainDate, Weekday, YearMonth } from "@/types/date";
import type { Precision } from "@/types/selection";
import { isDocument } from "@/utils/node";

export type WeekStartOption = "auto" | "sunday" | "monday" | "saturday";
export type DatePart = "day" | "month" | "year";

const DEFAULT_LOCALE = "en-US";
const DEFAULT_ORDER: readonly DatePart[] = ["month", "day", "year"];
const SUNDAY_FIRST_REGIONS = new Set(
  (
    "AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN IS JM JP KE " +
    "KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW " +
    "UM US VE VI WS YE ZA ZW"
  ).split(" "),
);
const SATURDAY_FIRST_REGIONS = new Set(
  "AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY".split(" "),
);
const FRIDAY_FIRST_REGIONS = new Set(["MV"]);

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const numberCache = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale: string): string {
  const cached = numberCache.get(locale);
  if (cached) {
    return cached.format(value);
  }
  const format = new Intl.NumberFormat(locale, { useGrouping: false });
  numberCache.set(locale, format);
  return format.format(value);
}

function getFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  });
  formatterCache.set(key, formatter);
  return formatter;
}

function utcNoon(year: number, month: number, day: number): Date {
  const result = new Date(Date.UTC(2000, 0, 1, 12));
  result.setUTCFullYear(year, month - 1, day);
  return result;
}

function toWeekday(value: number): Weekday | null {
  switch (value) {
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
    case 6:
      return 6;
    default:
      return null;
  }
}

function readFirstDay(locale: Intl.Locale): Weekday | null {
  if (!("getWeekInfo" in locale)) {
    return null;
  }
  const getter: unknown = Reflect.get(locale, "getWeekInfo");
  if (typeof getter !== "function") {
    return null;
  }
  const info: unknown = Reflect.apply(getter, locale, []);
  if (typeof info !== "object" || info === null || !("firstDay" in info)) {
    return null;
  }
  const firstDay: unknown = info.firstDay;
  if (typeof firstDay !== "number") {
    return null;
  }
  return toWeekday(firstDay === 7 ? 0 : firstDay);
}

function weekStartFromRegion(region: string | undefined): Weekday {
  if (region === undefined) {
    return 1;
  }
  if (SUNDAY_FIRST_REGIONS.has(region)) {
    return 0;
  }
  if (SATURDAY_FIRST_REGIONS.has(region)) {
    return 6;
  }
  return FRIDAY_FIRST_REGIONS.has(region) ? 5 : 1;
}

function autoWeekStart(locale: string): Weekday {
  try {
    const parsed = new Intl.Locale(locale);
    const fromInfo = readFirstDay(parsed);
    if (fromInfo !== null) {
      return fromInfo;
    }
    return weekStartFromRegion(parsed.maximize().region);
  } catch {
    return 1;
  }
}

export function isLocaleTag(tag: string): boolean {
  try {
    return Intl.getCanonicalLocales(tag).length > 0;
  } catch {
    return false;
  }
}

const usableLocale = (tag: string | undefined): string | null => {
  const trimmed = tag?.trim();
  if (!trimmed || !isLocaleTag(trimmed)) {
    return null;
  }
  return trimmed;
};

export function resolveLocale(locale?: string): string {
  const explicit = usableLocale(locale);
  if (explicit !== null) {
    return explicit;
  }
  if (isDocument()) {
    const lang = usableLocale(document.documentElement.lang);
    if (lang !== null) {
      return lang;
    }
  }
  if (typeof navigator !== "undefined") {
    const language = usableLocale(navigator.language);
    if (language !== null) {
      return language;
    }
  }
  return DEFAULT_LOCALE;
}

export function monthNames(
  locale: string,
  width: "long" | "short",
): readonly string[] {
  const formatter = getFormatter(locale, { month: width });
  return Array.from({ length: 12 }, (_, index) =>
    formatter.format(utcNoon(2024, index + 1, 1)),
  );
}

export function weekdayNames(
  locale: string,
  width: "long" | "short" | "narrow",
): readonly string[] {
  const formatter = getFormatter(locale, { weekday: width });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(utcNoon(2024, 1, 7 + index)),
  );
}

export function formatHeadline(date: PlainDate, locale: string): string {
  return getFormatter(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(utcNoon(date.year, date.month, date.day));
}

export function formatShortDate(date: PlainDate, locale: string): string {
  return getFormatter(locale, { month: "short", day: "numeric" }).format(
    utcNoon(date.year, date.month, date.day),
  );
}

export function formatShortRange(
  a: PlainDate,
  b: PlainDate,
  locale: string,
): string {
  return getFormatter(locale, { month: "short", day: "numeric" }).formatRange(
    utcNoon(a.year, a.month, a.day),
    utcNoon(b.year, b.month, b.day),
  );
}

export function formatFullDate(date: PlainDate, locale: string): string {
  return getFormatter(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(utcNoon(date.year, date.month, date.day));
}

export function formatMonthYear(view: YearMonth, locale: string): string {
  return getFormatter(locale, { month: "long", year: "numeric" }).format(
    utcNoon(view.year, view.month, 1),
  );
}

export function formatMonthRange(
  first: YearMonth,
  last: YearMonth,
  locale: string,
): string {
  if (first.year === last.year && first.month === last.month) {
    return formatMonthYear(first, locale);
  }
  return getFormatter(locale, { month: "long", year: "numeric" }).formatRange(
    utcNoon(first.year, first.month, 1),
    utcNoon(last.year, last.month, 1),
  );
}

export function formatPeriodLabel(
  date: PlainDate,
  precision: Precision,
  locale: string,
  style: "headline" | "long",
): string {
  switch (precision) {
    case "day":
      return style === "headline"
        ? formatHeadline(date, locale)
        : formatFullDate(date, locale);
    case "month":
      return formatMonthYear(date, locale);
    default:
      return formatNumber(date.year, locale);
  }
}

export function resolveWeekStart(
  locale: string,
  option: WeekStartOption,
): Weekday {
  switch (option) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "saturday":
      return 6;
    default:
      return autoWeekStart(locale);
  }
}

export function numericOrder(locale: string): readonly DatePart[] {
  const parts = getFormatter(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(utcNoon(2024, 11, 22));
  const order: DatePart[] = [];
  for (const part of parts) {
    if (part.type === "day" || part.type === "month" || part.type === "year") {
      order.push(part.type);
    }
  }
  return order.length === 3 ? order : DEFAULT_ORDER;
}
