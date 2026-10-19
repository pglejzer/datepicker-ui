import type { DateInput, PlainDate } from "../../types/date";
import { toPlainDate } from "../../utils/date/plainDate";
import type { OptionIssue } from "./pick";

function toDateInput(value: unknown, allowToday: boolean): DateInput | null {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  if (value === "today" && !allowToday) return null;
  return value;
}

export function resolveDate(
  value: unknown,
  allowToday: boolean,
  option: string,
  issues: OptionIssue[],
): PlainDate | null {
  if (value === undefined) return null;
  const input = toDateInput(value, allowToday);
  const date = input === null ? null : toPlainDate(input);
  if (date === null) issues.push({ option, value });
  return date;
}

export function resolveDateList(
  value: unknown,
  option: string,
  issues: OptionIssue[],
): PlainDate[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) {
    issues.push({ option, value });
    return null;
  }
  const entries: unknown[] = value;
  return entries
    .map((entry) => resolveDate(entry, false, option, issues))
    .filter((date) => date !== null);
}
