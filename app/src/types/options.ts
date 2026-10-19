import type { WeekStartOption } from "../utils/date/intl";
import type { FormatOption } from "../utils/date/format";
import type { DateInput } from "./date";
import type { CalendarMode, PageBy, Precision } from "./selection";
import type {
  CancelEventData,
  CloseEventData,
  ConfirmEventData,
  ErrorEventData,
  NavigateEventData,
  OpenEventData,
  PickerValue,
  RangeEndEventData,
  RangeStartEventData,
  SelectDayEventData,
  SelectMonthEventData,
  SelectYearEventData,
  UpdateEventData,
} from "./types";

/** Built-in theme names. */
export type ThemeName =
  | "basic"
  | "m3-green"
  | "crane"
  | "crane-straight"
  | "m2"
  | "glassmorphic"
  | "pastel"
  | "ai"
  | "cyberpunk"
  | "blueprint";

/** A label that is a plain string or a map from `Intl.PluralRules` categories to strings. `{count}` is replaced by the number. */
export type PluralLabel =
  string | Readonly<Partial<Record<Intl.LDMLPluralRule, string>>>;

/** Extra presentation of a single day returned by `calendar.decorateDate`. */
export interface DateDecoration {
  /** Class name added to the day cell. */
  className?: string;
  /** Show a small badge dot on the day. */
  badge?: boolean;
  /** Text appended to the accessible name of the day. */
  label?: string;
}

/** The two ends of a range preset. */
export interface RangePresetValue {
  /** First day of the range. */
  start: DateInput;
  /** Last day of the range, on or after `start`. */
  end: DateInput;
}

/** A ready-made range offered next to the calendar, for example "Last 7 days". */
export interface RangePreset {
  /** Text of the preset button. */
  label: string;
  /** The range, or a function that returns it (called each time the picker refreshes, so "today" stays current). */
  value: RangePresetValue | (() => RangePresetValue);
}

/** Which days exist and how the weeks are laid out. */
export interface CalendarOptions {
  /**
   * What the user selects: one day, a range of days or any number of days.
   * @default "single"
   */
  mode?: CalendarMode;
  /**
   * What one selection is: a day, a month or a year. With `"month"` the value
   * is `YYYY-MM` and with `"year"` it is `YYYY`, both standing for the first
   * day of the period. Only used in `single` mode (other modes report an
   * `invalid-option` error and use `"day"`). Typed text is masked only at
   * day precision.
   * @default "day"
   */
  precision?: Precision;
  /**
   * How many months are shown side by side, a positive integer. Applies to
   * the docked and inline surfaces and to day precision, as many as fit the
   * width at open (up to this number). A modal shows one month.
   * @default 1
   */
  months?: number;
  /**
   * How far the previous / next arrows, the swipe and the keyboard page move:
   * `"month"` one month, `"view"` as many months as are shown.
   * @default "view"
   */
  pageBy?: PageBy;
  /**
   * Length limits of a range in days, both ends included, and ready-made
   * ranges (`presets`). Only used in `range` mode. Presets show as a column
   * beside the picker when it fits, otherwise as a chip row; clicking one
   * picks the range and follows `behavior.closeOnSelect` and
   * `behavior.commitOnChange`.
   * @default undefined
   */
  range?: {
    minLength?: number;
    maxLength?: number;
    presets?: readonly RangePreset[];
  };
  /**
   * Limits of a multiple selection. Only used in `multiple` mode.
   * @default undefined
   */
  multiple?: { max?: number };
  /**
   * Return `true` for a day that cannot be selected, on top of `minDate`,
   * `maxDate`, `disabledDates` and `enabledDates`.
   * @default undefined
   */
  isDateDisabled?: (date: Date) => boolean;
  /**
   * Weekdays that cannot be selected, `0` is Sunday and `6` is Saturday.
   * @default []
   */
  disabledWeekdays?: readonly number[];
  /**
   * Return extra presentation for a day, or `undefined` for none.
   * @default undefined
   */
  decorateDate?: (date: Date) => DateDecoration | undefined;
  /**
   * Content shown inside each day cell, for example a price: a string (text,
   * never HTML), a DOM node, or `null` / `undefined` for none. The text is
   * added to the accessible name of the day.
   * @default undefined
   */
  renderDate?: (date: Date) => string | Node | null | undefined;
  /**
   * Field validity rule run on the presented value (`null` when empty) after
   * `setValue()`, typed input and every commit. Return a message to mark the
   * input invalid (`aria-invalid`, `setCustomValidity`, an `error` event with
   * code `invalid-value`); return `null`, `undefined` or an empty string when
   * the value is fine. It never blocks a pick or a commit.
   * @default undefined
   */
  validate?: (value: PickerValue | null) => string | null | undefined;
  /**
   * BCP 47 locale for month and weekday names, the headline, the input format
   * and the first day of the week. Falls back to `<html lang>`, then
   * `navigator.language`, then `en-US`.
   * @default the page locale
   */
  locale?: string;
  /**
   * First day of the week. `auto` follows the locale.
   * @default "auto"
   */
  weekStart?: WeekStartOption;
  /**
   * Earliest selectable day: a `Date`, an ISO `YYYY-MM-DD` string or `"today"`.
   * @default undefined
   */
  minDate?: DateInput;
  /**
   * Latest selectable day: a `Date`, an ISO `YYYY-MM-DD` string or `"today"`.
   * @default undefined
   */
  maxDate?: DateInput;
  /**
   * Days that cannot be selected.
   * @default []
   */
  disabledDates?: readonly DateInput[];
  /**
   * When set, only these days can be selected.
   * @default undefined
   */
  enabledDates?: readonly DateInput[];
}

/** Presentation and display behaviour. */
export interface UIOptions {
  /**
   * `auto` opens the docked popover on wide viewports and the modal dialog on
   * compact ones; `docked` and `modal` force one of them.
   * @default "auto"
   */
  displayMode?: "auto" | "docked" | "modal";
  /**
   * Render the calendar permanently into a container instead of opening it.
   * `container` is a selector or an element.
   * @default { enabled: false }
   */
  inline?: { enabled?: boolean; container?: string | HTMLElement };
  /**
   * `auto` follows the locale's numeric order and separators; otherwise a
   * pattern built from `d dd M MM yy yyyy` and one separator of `/ . - space`.
   * With `calendar.precision` `"month"` or `"year"` the pattern may leave out
   * the finer parts (`"MM/yyyy"`, `"yyyy-MM"`, and for `"year"` also `"yyyy"`).
   * @default "auto"
   */
  format?: FormatOption;
  /**
   * Theme applied to the picker surface: `basic`, `m3-green`, `crane`,
   * `crane-straight`, `m2`, `glassmorphic`, `pastel`, `ai`, `cyberpunk`,
   * `blueprint`. `basic` and `blueprint` follow `colorScheme`, the others have
   * one fixed scheme.
   * @default "basic"
   */
  theme?: ThemeName;
  /**
   * `auto` detects the scheme when the picker opens: the first opaque
   * `background-color` from the input up to `<html>` decides (dark when its
   * luminance is low); without one, the page `color-scheme` decides (`dark`
   * is dark, `light dark` follows the OS, anything else is light). An inline
   * picker follows later page changes. `light` and `dark` force one. Themes
   * with a single version ignore this option.
   * @default "auto"
   */
  colorScheme?: "auto" | "light" | "dark";
  /**
   * Range pickers in a modal open full screen below this window width:
   * `true` below 600 px, a number below that many px (for example 840), `false`
   * never. With `displayMode: "auto"` the surface is docked from 600 px, so a
   * value above 600 only matters with `displayMode: "modal"`. Decided when the
   * picker opens.
   * @default true
   */
  fullscreen?: boolean | number;
  /**
   * Selector or element that opens the picker besides the input, for example
   * a calendar icon button.
   * @default undefined
   */
  toggleButton?: string | HTMLElement;
  /**
   * Show ISO week numbers before each row.
   * @default false
   */
  weekNumbers?: boolean;
  /**
   * Show the days of neighbouring months in the first and last rows. `true`
   * and `{}` show them selectable; `{ selectable: false }` shows them dimmed
   * and inert.
   * @default false
   */
  outsideDays?: boolean | { selectable?: boolean };
  /**
   * Always render six week rows, so the calendar keeps its height from month
   * to month.
   * @default false
   */
  fixedWeeks?: boolean;
  /**
   * Years offered in the year selection, counted from the current year.
   * @default { before: 100, after: 20 }
   */
  yearRange?: { before?: number; after?: number };
  /**
   * Show the Today button in the footer.
   * @default false
   */
  todayButton?: boolean;
  /**
   * Show the Clear button in the footer. `true` also clears the input; pass
   * `{ clearInput: false }` to keep the typed text.
   * @default false
   */
  clearButton?: boolean | { clearInput?: boolean };
  /**
   * Show the footer with the action buttons. Unset means shown, except in
   * inline mode.
   * @default undefined
   */
  footer?: boolean;
  /**
   * Play motion. Always off with `prefers-reduced-motion: reduce`.
   * @default true
   */
  animation?: boolean;
  /**
   * Keep the page scrollable while the modal is open.
   * @default false
   */
  allowPageScroll?: boolean;
  /**
   * Extra class names added to the picker surface.
   * @default ""
   */
  cssClass?: string;
  /**
   * Selector or element the modal dialog is appended to. Defaults to the
   * picker host.
   * @default undefined
   */
  appendTo?: string | HTMLElement;
  /**
   * Drag, wheel and swipe between months.
   * @default true
   */
  swipe?: boolean;
  /**
   * Show the button that switches between the calendar and the text input
   * view, where the mode and surface support it.
   * @default true
   */
  viewSwitch?: boolean;
  /**
   * View shown when the picker opens, where the mode and surface support the
   * input view.
   * @default "calendar"
   */
  initialView?: "calendar" | "input";
  /**
   * Mask the text typed into the input to `ui.format` (digits only, separators added).
   * Single mode and the split range fields (`ui.endInput`), day precision only.
   * @default false
   */
  mask?: boolean;
  /**
   * Selector or element of the page's second `<input>`, which turns a range
   * picker into a Start / End pair: the main input holds the start, this one
   * the end. Read when `create()` runs; only used in `range` mode. Typing
   * commits only a full pair (or two empty fields). Clicking a field opens
   * the picker on that end, and the field being picked gets the class
   * `dp-ui__input--active`.
   * @default undefined
   */
  endInput?: string | HTMLElement;
  /**
   * First calendar panel when the picker opens: the day grid, the month list
   * (docked, inline) or grid (modal), or the year list or grid. `initialView:
   * "input"` wins; ignored in `range` mode and when `calendar.precision` is not
   * `"day"`.
   * @default "day"
   */
  startView?: "day" | "month" | "year";
}

/** Texts used by buttons and assistive technology. Month and weekday names come from `Intl`. */
export interface LabelsOptions {
  /**
   * Modal header supporting text.
   * @default "Select date"
   */
  title?: string;
  /**
   * Header supporting text with `calendar.precision: "month"`.
   * @default "Select month"
   */
  monthTitle?: string;
  /**
   * Header supporting text with `calendar.precision: "year"`.
   * @default "Select year"
   */
  yearTitle?: string;
  /**
   * Modal headline while no date is selected.
   * @default "No date selected"
   */
  noDate?: string;
  /**
   * Confirm button.
   * @default "OK"
   */
  confirm?: string;
  /**
   * Cancel button.
   * @default "Cancel"
   */
  cancel?: string;
  /**
   * Today button.
   * @default "Today"
   */
  today?: string;
  /**
   * Clear button.
   * @default "Clear"
   */
  clear?: string;
  /**
   * Accessible name of the toggle button.
   * @default "Choose date"
   */
  openCalendar?: string;
  /**
   * Previous month button.
   * @default "Previous month"
   */
  previousMonth?: string;
  /**
   * Next month button.
   * @default "Next month"
   */
  nextMonth?: string;
  /**
   * Previous year button.
   * @default "Previous year"
   */
  previousYear?: string;
  /**
   * Next year button.
   * @default "Next year"
   */
  nextYear?: string;
  /**
   * Month menu button and list.
   * @default "Choose month"
   */
  chooseMonth?: string;
  /**
   * Year menu button and list.
   * @default "Choose year"
   */
  chooseYear?: string;
  /**
   * Week number column header.
   * @default "Week"
   */
  weekNumber?: string;
  /**
   * Message for a typed text that is not a date.
   * @default "Enter a valid date"
   */
  invalidDate?: string;
  /**
   * Message for a typed date that is disabled or out of range.
   * @default "This date is not available"
   */
  unavailableDate?: string;
  /**
   * Header supporting text in `range` mode.
   * @default "Select dates"
   */
  rangeTitle?: string;
  /**
   * Headline placeholder for the missing start of a range.
   * @default "Start"
   */
  rangeStart?: string;
  /**
   * Headline placeholder for the missing end of a range.
   * @default "End"
   */
  rangeEnd?: string;
  /**
   * Headline in `multiple` mode; `{count}` is the number of selected days.
   * @default "{count} selected"
   */
  multipleSelected?: PluralLabel;
  /**
   * Save button of the fullscreen range picker.
   * @default "Save"
   */
  save?: string;
  /**
   * Close button of the fullscreen range picker.
   * @default "Close"
   */
  close?: string;
  /**
   * Accessible name of the button that shows the text input view.
   * @default "Switch to text input"
   */
  switchToInput?: string;
  /**
   * Accessible name of the button that shows the calendar view.
   * @default "Switch to calendar"
   */
  switchToCalendar?: string;
  /**
   * Label of the date text field in `single` mode.
   * @default "Date"
   */
  dateField?: string;
  /**
   * Label of the start date text field in `range` mode.
   * @default "Start date"
   */
  startDateField?: string;
  /**
   * Label of the end date text field in `range` mode.
   * @default "End date"
   */
  endDateField?: string;
  /**
   * Message for a range whose end is before its start or breaks the length limits.
   * @default "End date must be on or after the start date"
   */
  invalidRange?: string;
  /**
   * Message for a typed date before `minDate`; `{date}` is the minimum date.
   * @default "Enter a date on or after {date}"
   */
  beforeMinDate?: string;
  /**
   * Message for a typed date after `maxDate`; `{date}` is the maximum date.
   * @default "Enter a date on or before {date}"
   */
  afterMaxDate?: string;
  /**
   * Accessible name of the range presets group.
   * @default "Presets"
   */
  presets?: string;
  /**
   * Name of the Page Up key in the keyboard shortcut tooltips of the navigation buttons.
   * @default "Page Up"
   */
  pageUpKey?: string;
  /**
   * Name of the Page Down key in the keyboard shortcut tooltips of the navigation buttons.
   * @default "Page Down"
   */
  pageDownKey?: string;
  /**
   * Name of the Shift key in the keyboard shortcut tooltips (`Shift+Page Up`, `Shift+M`).
   * @default "Shift"
   */
  shiftKey?: string;
  /**
   * Placeholder letters for the day in the format hint shown under the field (Polish: "dd").
   * @default "dd"
   */
  hintDay?: string;
  /**
   * Placeholder letters for the month in the format hint shown under the field (Polish: "mm").
   * @default "mm"
   */
  hintMonth?: string;
  /**
   * Placeholder letters for the year in the format hint shown under the field (Polish: "rrrr").
   * A two-digit year format uses the first two characters.
   * @default "yyyy"
   */
  hintYear?: string;
}

/** Interaction rules. */
export interface BehaviorOptions {
  /**
   * Commit and close as soon as a day is picked.
   * @default false
   */
  closeOnSelect?: boolean;
  /**
   * Close the picker when it is cancelled.
   * @default true
   */
  closeOnCancel?: boolean;
  /**
   * Commit every change to the input immediately, without the confirm button.
   * @default false
   */
  commitOnChange?: boolean;
  /**
   * Keep the picker open when the user clicks outside of it.
   * @default false
   */
  ignoreOutsideClick?: boolean;
  /**
   * Move focus back to the input when the picker closes.
   * @default true
   */
  returnFocus?: boolean;
  /**
   * Custom instance id for `DatepickerUI.getById()`.
   * @default undefined
   */
  id?: string;
}

/** User callbacks, called through the event bridge. */
export interface CallbacksOptions {
  /** Called when the picker opens. */
  onOpen?: (data: OpenEventData) => void;
  /** Called when the picker closes. */
  onClose?: (data: CloseEventData) => void;
  /** Called when the picker is dismissed without committing. */
  onCancel?: (data: CancelEventData) => void;
  /** Called when a value is committed or cleared. */
  onConfirm?: (data: ConfirmEventData) => void;
  /** Called after `setOptions()` applied a patch. */
  onUpdate?: (data: UpdateEventData) => void;
  /** Called for invalid typed dates and rejected options. */
  onError?: (data: ErrorEventData) => void;
  /** Called when a day is picked. */
  onSelectDay?: (data: SelectDayEventData) => void;
  /** Called when a month is chosen in the month menu. */
  onSelectMonth?: (data: SelectMonthEventData) => void;
  /** Called when a year is chosen. */
  onSelectYear?: (data: SelectYearEventData) => void;
  /** Called when the first day of a range is picked. */
  onRangeStart?: (data: RangeStartEventData) => void;
  /** Called when the range is completed. */
  onRangeEnd?: (data: RangeEndEventData) => void;
  /** Called when the displayed month changes. */
  onNavigate?: (data: NavigateEventData) => void;
}

/** Options accepted by the `DatepickerUI` constructor and `setOptions()`. */
export interface DatepickerOptions {
  /** Days, locale and week layout. */
  calendar?: CalendarOptions;
  /** Presentation and display behaviour. */
  ui?: UIOptions;
  /** Button texts and accessible names. */
  labels?: LabelsOptions;
  /** Interaction rules. */
  behavior?: BehaviorOptions;
  /** Event callbacks. */
  callbacks?: CallbacksOptions;
}
