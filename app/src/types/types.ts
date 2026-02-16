/**
 * DatepickerUI Event Types
 * Every event has a dedicated typed payload
 *
 * Architecture: One event → one payload type
 * No optional dumping interfaces
 */

/** Callback function for datepicker events */
export type DatepickerEventCallback<T = unknown> = (eventData: T) => void;

/** Payload when datepicker opens */
export interface OpenEventData {
  date: Date | null;
  month: number;
  year: number;
}

/** Payload when user cancels */
export type CancelEventData = Record<string, never>;

/** Payload when user confirms date */
export interface ConfirmEventData {
  date: Date;
  timestamp: number;
}

/** Payload when modal shows - internal event to trigger mount */
export interface ShowEventData {
  date: Date | null;
  month: number;
  year: number;
  displayMode?: "modal" | "dropdown";
}

/** Payload when modal hides */
export type HideEventData = Record<string, never>;

/** Payload for real-time updates */
export interface UpdateEventData {
  date: Date | null;
  timestamp: number;
}

/** Information about update event source */
export interface UpdateInfo {
  /** Event that triggered the update */
  event:
    | "update"
    | "confirm"
    | "cancel"
    | "open"
    | "select:day"
    | "select:month"
    | "select:year";
}

/** Payload when day is selected */
export interface SelectDayEventData {
  day: number;
  month: number;
  year: number;
  date: Date;
}

/** Payload when month view changes */
export interface SelectMonthEventData {
  month: number;
  year: number;
}

/** Payload when year view changes */
export interface SelectYearEventData {
  year: number;
}

/** Payload when view mode changes */
export interface ChangeViewEventData {
  view: "day" | "month" | "year";
}

/** Payload when validation error occurs */
export interface ErrorEventData {
  code: string;
  message: string;
  rejectedDate?: Date;
  inputValue?: string;
}

/** Payload when range selection starts */
export interface RangeStartEventData {
  startDate: Date;
  timestamp: number;
}

/** Payload when range preview updates (hover/touch move) */
export interface RangeUpdateEventData {
  startDate: Date;
  previewEndDate: Date;
  timestamp: number;
}

/** Payload when range selection completes */
export interface RangeEndEventData {
  startDate: Date;
  endDate: Date;
  timestamp: number;
}

/** Payload when range selection is cancelled */
export interface RangeCancelEventData {
  startDate: Date | null;
  timestamp: number;
}

/** Payload when calendar is rendered (internal event) */
export interface CalendarRenderedEventData {
  timestamp: number;
}

/** Payload when swipe gesture starts */
export interface SwipeStartEventData {
  startX: number;
  startY: number;
  timestamp: number;
}

/** Payload during swipe movement */
export interface SwipeMoveEventData {
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: "left" | "right" | "none";
  timestamp: number;
}

/** Payload when swipe gesture ends */
export interface SwipeEndEventData {
  deltaX: number;
  velocity: number;
  direction: "left" | "right" | "none";
  monthsToJump: number;
  timestamp: number;
}

/** Payload when swipe is cancelled */
export interface SwipeCancelEventData {
  timestamp: number;
}

export type OptionTypes = DatepickerOptions;

import type { DatepickerOptions } from "./options";
