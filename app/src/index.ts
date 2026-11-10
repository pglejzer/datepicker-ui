import DatepickerUI from "./datepicker";
import { DEFAULT_DATEPICKER_OPTIONS } from "./datepicker/options/defaults";
import { EventEmitter } from "./utils/EventEmitter";

export type { PlainDate } from "./types/date";
export type {
  CalendarMode,
  PageBy,
  Precision,
  RangeEnd,
} from "./types/selection";
export type {
  BehaviorOptions,
  CalendarOptions,
  CallbacksOptions,
  DatepickerOptions,
  DateDecoration,
  LabelsOptions,
  PluralLabel,
  RangePreset,
  RangePresetValue,
  ThemeName,
  UIOptions,
} from "./types/options";
export type {
  CancelEventData,
  CancelReason,
  ClearEventData,
  CloseEventData,
  ConfirmEventData,
  DatepickerEventMap,
  DateValue,
  ErrorEventData,
  NavigateEventData,
  NavigateSource,
  OpenEventData,
  PickerValue,
  PickerValueInput,
  PickerView,
  RangeEndEventData,
  RangeStartEventData,
  RangeValue,
  SelectDayEventData,
  SelectMonthEventData,
  SelectYearEventData,
  SwitchViewEventData,
  UnavailableReason,
  UpdateEventData,
  VisibleRange,
} from "./types/types";

export { DatepickerUI, DEFAULT_DATEPICKER_OPTIONS, EventEmitter };
export default DatepickerUI;
