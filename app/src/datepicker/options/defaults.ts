import type {
  BehaviorOptions,
  LabelsOptions,
  UIOptions,
} from "../../types/options";
import type { CalendarMode, PageBy, Precision } from "../../types/selection";
import type { WeekStartOption } from "../../utils/date/intl";
import type { ResolvedPreset } from "./types";

export const DEFAULT_LABELS: Required<LabelsOptions> = {
  title: "Select date",
  monthTitle: "Select month",
  yearTitle: "Select year",
  noDate: "No date selected",
  confirm: "OK",
  cancel: "Cancel",
  today: "Today",
  clear: "Clear",
  openCalendar: "Choose date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previousYear: "Previous year",
  nextYear: "Next year",
  chooseMonth: "Choose month",
  chooseYear: "Choose year",
  weekNumber: "Week",
  invalidDate: "Enter a valid date",
  unavailableDate: "This date is not available",
  rangeTitle: "Select dates",
  rangeStart: "Start",
  rangeEnd: "End",
  multipleSelected: "{count} selected",
  save: "Save",
  close: "Close",
  switchToInput: "Switch to text input",
  switchToCalendar: "Switch to calendar",
  dateField: "Date",
  startDateField: "Start date",
  endDateField: "End date",
  invalidRange: "End date must be on or after the start date",
  beforeMinDate: "Enter a date on or after {date}",
  afterMaxDate: "Enter a date on or before {date}",
  presets: "Presets",
  pageUpKey: "Page Up",
  pageDownKey: "Page Down",
  shiftKey: "Shift",
  hintDay: "dd",
  hintMonth: "mm",
  hintYear: "yyyy",
};

interface DefaultOptions {
  readonly calendar: {
    readonly weekStart: WeekStartOption;
    readonly mode: CalendarMode;
    readonly precision: Precision;
    readonly months: number;
    readonly pageBy: PageBy;
    readonly presets: readonly ResolvedPreset[];
  };
  readonly ui: Required<
    Pick<
      UIOptions,
      | "displayMode"
      | "format"
      | "theme"
      | "colorScheme"
      | "weekNumbers"
      | "outsideDays"
      | "fixedWeeks"
      | "todayButton"
      | "clearButton"
      | "animation"
      | "allowPageScroll"
      | "fullscreen"
      | "cssClass"
      | "swipe"
      | "viewSwitch"
      | "initialView"
      | "mask"
      | "startView"
    >
  > & {
    readonly inline: { readonly enabled: boolean };
    readonly yearRange: { readonly before: number; readonly after: number };
  };
  readonly labels: Required<LabelsOptions>;
  readonly behavior: Required<Omit<BehaviorOptions, "id">>;
}

export const DEFAULT_DATEPICKER_OPTIONS: DefaultOptions = {
  calendar: {
    weekStart: "auto",
    mode: "single",
    precision: "day",
    months: 1,
    pageBy: "view",
    presets: [],
  },
  ui: {
    displayMode: "auto",
    inline: { enabled: false },
    format: "auto",
    theme: "basic",
    colorScheme: "auto",
    weekNumbers: false,
    outsideDays: false,
    fixedWeeks: false,
    yearRange: { before: 100, after: 20 },
    todayButton: false,
    clearButton: false,
    animation: true,
    allowPageScroll: false,
    fullscreen: true,
    cssClass: "",
    swipe: true,
    viewSwitch: true,
    initialView: "calendar",
    mask: false,
    startView: "day",
  },
  labels: DEFAULT_LABELS,
  behavior: {
    closeOnSelect: false,
    closeOnCancel: true,
    commitOnChange: false,
    ignoreOutsideClick: false,
    returnFocus: true,
  },
};
