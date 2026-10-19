import type { PlainDate, Weekday } from "../../types/date";
import type {
  BehaviorOptions,
  CallbacksOptions,
  DateDecoration,
  LabelsOptions,
  ThemeName,
} from "../../types/options";
import type {
  CalendarMode,
  PageBy,
  Precision,
  SelectionLimits,
} from "../../types/selection";
import type { PickerValue } from "../../types/types";
import type { FormatPattern } from "../../utils/date/format";
import type { OptionIssue } from "./pick";

export interface ResolvedPreset {
  readonly label: string;
  readonly value: () => unknown;
}

export interface ResolvedOptions {
  readonly locale: string;
  readonly weekStart: Weekday;
  readonly minDate: PlainDate | null;
  readonly maxDate: PlainDate | null;
  readonly disabledDates: readonly PlainDate[];
  readonly enabledDates: readonly PlainDate[] | null;
  readonly mode: CalendarMode;
  readonly precision: Precision;
  readonly months: number;
  readonly pageBy: PageBy;
  readonly limits: SelectionLimits;
  readonly presets: readonly ResolvedPreset[];
  readonly isDateDisabled: ((date: Date) => boolean) | null;
  readonly disabledWeekdays: readonly Weekday[];
  readonly decorateDate: ((date: Date) => DateDecoration | undefined) | null;
  readonly renderDate: ((date: Date) => string | Node | null) | null;
  readonly validate: ((value: PickerValue | null) => string | null) | null;
  readonly viewSwitch: boolean;
  readonly initialView: "calendar" | "input";
  readonly mask: boolean;
  readonly startView: Precision;
  readonly displayMode: "auto" | "docked" | "modal";
  readonly inline: {
    readonly enabled: boolean;
    readonly container: string | HTMLElement | null;
  };
  readonly pattern: FormatPattern;
  readonly theme: ThemeName;
  readonly colorScheme: "auto" | "light" | "dark";
  readonly toggleButton: string | HTMLElement | null;
  readonly endInput: string | HTMLElement | null;
  readonly weekNumbers: boolean;
  readonly outsideDays: false | { readonly selectable: boolean };
  readonly fixedWeeks: boolean;
  readonly yearRange: { readonly before: number; readonly after: number };
  readonly todayButton: boolean;
  readonly clearButton: false | { readonly clearInput: boolean };
  readonly footerExplicit: boolean | null;
  readonly animation: boolean;
  readonly allowPageScroll: boolean;
  readonly fullscreenBelow: number;
  readonly cssClass: string;
  readonly appendTo: string | HTMLElement | null;
  readonly swipe: boolean;
  readonly labels: Readonly<Required<LabelsOptions>>;
  readonly behavior: Required<Omit<BehaviorOptions, "id">> & {
    readonly id: string | null;
  };
  readonly callbacks: CallbacksOptions;
  readonly issues: readonly OptionIssue[];
}
