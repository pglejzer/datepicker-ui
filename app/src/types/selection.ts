import type { PlainDate } from "@/types/date";

export type CalendarMode = "single" | "range" | "multiple";

export type Precision = "day" | "month" | "year";

export type PageBy = "month" | "view";

export type RangeEnd = "start" | "end";

export type Selection =
  | { readonly mode: "single"; readonly date: PlainDate | null }
  | {
      readonly mode: "range";
      readonly start: PlainDate | null;
      readonly end: PlainDate | null;
    }
  | { readonly mode: "multiple"; readonly dates: readonly PlainDate[] };

export type RangeRole = "start" | "end" | "in-range";

export interface SelectionLimits {
  readonly minLength: number | null;
  readonly maxLength: number | null;
  readonly multipleMax: number | null;
}
