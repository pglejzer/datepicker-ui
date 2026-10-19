import type { PlainDate } from "@/types/date";
import type { SelectionLimits } from "@/types/selection";
import { createPlainDate } from "@/utils/date/plainDate";

export function d(year: number, month: number, day: number): PlainDate {
  const date = createPlainDate(year, month, day);
  if (date === null) {
    throw new Error(
      `invalid test date ${String(year)}-${String(month)}-${String(day)}`,
    );
  }
  return date;
}

export function oct(day: number): PlainDate {
  return d(2026, 10, day);
}

export const NO_LIMITS: SelectionLimits = {
  minLength: null,
  maxLength: null,
  multipleMax: null,
};

export function limits(patch: Partial<SelectionLimits>): SelectionLimits {
  return { ...NO_LIMITS, ...patch };
}
