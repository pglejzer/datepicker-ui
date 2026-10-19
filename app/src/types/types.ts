import type { CancelReason, NavigateSource } from "./internal";
import type { DateInput } from "./date";
import type { DatepickerOptions } from "./options";

/** A committed date in every representation the consumer may need. */
export interface DateValue {
  /**
   * ISO 8601 calendar date, `YYYY-MM-DD`, whatever the display format is.
   * With `calendar.precision` `"month"` it is `YYYY-MM` and with `"year"` it
   * is `YYYY`.
   */
  readonly value: string;
  /** The same day as a `Date` at local midnight. */
  readonly date: Date;
  /** The date written the way the input shows it (`ui.format`). */
  readonly formatted: string;
}

/** A committed complete range. */
export interface RangeValue {
  /** First day of the range. */
  readonly start: DateValue;
  /** Last day of the range, on or after `start`. */
  readonly end: DateValue;
}

/** The committed value: a day (`single`), a range (`range`) or the sorted days (`multiple`). */
export type PickerValue = DateValue | RangeValue | readonly DateValue[];

/** Accepted by `setValue()`; the shape has to match `calendar.mode`. */
export type PickerValueInput =
  | DateInput
  | { readonly start: DateInput; readonly end: DateInput }
  | readonly DateInput[];

/** Payload of the `open` event. */
export interface OpenEventData {
  /** The surface that was opened. */
  mode: "docked" | "modal" | "inline";
}

/** Payload of the `close` event. */
export type CloseEventData = Record<string, never>;

/** Payload of the `cancel` event. */
export interface CancelEventData {
  /** What dismissed the picker without committing. */
  reason: CancelReason;
}

/** Payload of the `confirm` event. */
export interface ConfirmEventData {
  /** The committed value, or `null` when the value was cleared. */
  value: PickerValue | null;
  /** `true` when the commit came from `behavior.closeOnSelect` or `behavior.commitOnChange` instead of the confirm button. */
  autoCommit: boolean;
}

/** Payload of the `update` event, fired by `setOptions()`. */
export interface UpdateEventData {
  /** The options patch that was applied. */
  options: DatepickerOptions;
}

/** Payload of the `select:day` event. */
export interface SelectDayEventData {
  /**
   * The day the user picked (not yet committed in modal flow). With
   * `calendar.precision` `"month"` or `"year"` it is the picked month or year,
   * as its first day (`value.value` is `YYYY-MM` or `YYYY`).
   */
  value: DateValue;
  /** `false` when a click in `multiple` mode removed the date from the selection. */
  selected: boolean;
}

/** Payload of the `range:start` event. */
export interface RangeStartEventData {
  /** The first day of the range that was just picked. */
  value: DateValue;
}

/** Payload of the `range:end` event. */
export interface RangeEndEventData {
  /** First day of the completed range. */
  start: DateValue;
  /** Last day of the completed range. */
  end: DateValue;
}

/** Payload of the `select:month` event. */
export interface SelectMonthEventData {
  /** Year of the displayed month. */
  year: number;
  /** Chosen month, 1-12. */
  month: number;
}

/** Payload of the `select:year` event. */
export interface SelectYearEventData {
  /** Chosen year. */
  year: number;
}

/** Payload of the `navigate` event. */
export interface NavigateEventData {
  /** Year of the first month now displayed. */
  year: number;
  /** First month now displayed, 1-12 (with `calendar.months` above 1 it is the first of the months shown). */
  month: number;
  /** `-1` backwards, `1` forwards, `0` for a jump that keeps the month. */
  direction: -1 | 0 | 1;
  /** What caused the navigation. `setValue()` and `open()` move the view without this event. */
  source: Exclude<NavigateSource, "api">;
}

/** Why a date cannot be selected, in the order the rules are checked. */
export type UnavailableReason =
  "min" | "max" | "disabled" | "weekday" | "range-length" | "multiple-max";

/** Payload of the `error` event. */
export interface ErrorEventData {
  /** Machine readable reason. `invalid-value` is a message returned by `calendar.validate`. */
  code:
    "invalid-date" | "unavailable-date" | "invalid-option" | "invalid-value";
  /** Human readable description. */
  message: string;
  /** The text the user typed, for `invalid-date` and `unavailable-date`. */
  input?: string;
  /** Dotted path of the rejected option, for `invalid-option`. */
  option?: string;
  /** Why the typed date is unavailable, for `unavailable-date`. */
  reason?: UnavailableReason;
}

/** Public events of a picker instance, keyed by event name. */
export interface DatepickerEventMap {
  open: OpenEventData;
  close: CloseEventData;
  cancel: CancelEventData;
  confirm: ConfirmEventData;
  update: UpdateEventData;
  error: ErrorEventData;
  "select:day": SelectDayEventData;
  "select:month": SelectMonthEventData;
  "select:year": SelectYearEventData;
  "range:start": RangeStartEventData;
  "range:end": RangeEndEventData;
  navigate: NavigateEventData;
}
