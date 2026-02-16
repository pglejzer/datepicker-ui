import type {
  DatepickerEventCallback,
  OpenEventData,
  CancelEventData,
  ConfirmEventData,
  UpdateEventData,
  UpdateInfo,
  SelectDayEventData,
  SelectMonthEventData,
  SelectYearEventData,
  ErrorEventData,
  RangeStartEventData,
  RangeUpdateEventData,
  RangeEndEventData,
  RangeCancelEventData,
} from "./types";

/**
 * Swipe/gesture configuration for calendar navigation
 */
export interface SwipeOptions {
  /**
   * @description Enable swipe gestures
   * @default true
   */
  enabled?: boolean;

  /**
   * @description Velocity threshold for swipe detection (pixels per millisecond)
   * @default 0.3
   */
  velocity?: number;

  /**
   * @description Duration of snap animation in milliseconds
   * @default 200
   */
  snapDuration?: number;

  /**
   * @description Show overlapping month preview during swipe
   * @default true
   */
  overlapPreview?: boolean;

  /**
   * @description Allow fast swipe to jump multiple months
   * @default true
   */
  multipleMonthsJump?: boolean;

  /**
   * @description Enable touch gesture support
   * @default true
   */
  touchEnabled?: boolean;

  /**
   * @description Enable mouse drag support
   * @default true
   */
  mouseEnabled?: boolean;

  /**
   * @description Minimum distance in pixels to trigger swipe
   * @default 50
   */
  threshold?: number;

  /**
   * @description Resistance factor when dragging beyond bounds (0-1)
   * @default 0.5
   */
  resistance?: number;
}

/**
 * Calendar behavior configuration
 */
export interface CalendarOptions {
  /**
   * @description First day of week
   * @default "auto"
   * @example
   * weekStart: "monday" // Week starts on Monday
   * weekStart: "sunday" // Week starts on Sunday
   * weekStart: "auto" // Detect from user's locale using Intl.Locale API
   */
  weekStart?: "auto" | "monday" | "sunday";

  /**
   * @description Locale for auto week start detection
   * @default "en-US"
   * @example locale: "pl-PL", locale: "en-GB", locale: "de-DE"
   */
  locale?: string;

  /**
   * @description Minimum selectable date
   */
  minDate?: Date;

  /**
   * @description Maximum selectable date
   */
  maxDate?: Date;

  /**
   * @description Array of disabled dates
   * @example disabledDates: [new Date(2025, 0, 15), new Date(2025, 0, 20)]
   */
  disabledDates?: Date[];

  /**
   * @description Array of enabled dates (only these dates are selectable)
   * @example enabledDates: [new Date(2025, 0, 15), new Date(2025, 0, 20)]
   */
  enabledDates?: Date[];
}

/**
 * UI appearance and behavior configuration
 */
export interface UIOptions {
  /**
   * @description Date format for input display
   * @default "dd/mm/yyyy"
   * @example "dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd", "dd.mm.yyyy", "yyyy/mm/dd"
   */
  format?:
    | "dd/mm/yyyy"
    | "dd-mm-yyyy"
    | "dd.mm.yyyy"
    | "mm/dd/yyyy"
    | "mm-dd-yyyy"
    | "mm.dd.yyyy"
    | "yyyy-mm-dd"
    | "yyyy/mm/dd"
    | "yyyy.mm.dd";

  /**
   * @description Enable automatic input masking while typing
   * @default false
   *
   * When enabled:
   * - Auto-inserts separators (/, -, .)
   * - Corrects invalid values (day > 31 → 31, month > 12 → 12)
   * - Adapts max day based on month and leap year
   * - Preserves cursor position during corrections
   * - Prevents impossible dates while typing
   *
   * When disabled:
   * - Raw input passes through untouched
   * - No automatic formatting or corrections
   * - Validation happens only on blur
   */
  maskEnabled?: boolean;

  /**
   * @description Selector for icon element that opens picker
   * @example iconSelector: ".calendar-icon"
   *
   * **REQUIRED for dropdown picker to work**
   * - Only icon click opens dropdown picker
   * - Input is used only for typing/mask
   * - No input click handler when iconSelector is provided
   *
   * **Modal mode (future)**:
   * - Will open on input click (without iconSelector)
   * - Centered with backdrop
   * - Different UI/UX
   */
  iconSelector?: string;

  /**
   * @description Display mode for picker
   * @default "dropdown"
   *
   * **Current implementation**: Only "dropdown" is fully supported
   * - Opens below/above input
   * - Always scrollable
   * - No backdrop
   * - Triggered by icon click
   *
   * **"modal" mode**: Not yet implemented
   * - Will be centered with backdrop
   * - Different animation
   * - Different event handling
   */
  displayMode?: "modal" | "dropdown";

  /**
   * @description Modal header label text
   * @default "Select date"
   * @example modalLabel: "Choose a date"
   *
   * Only used in modal mode
   */
  modalLabel?: string;

  /**
   * @description Show modal header label
   * @default true
   *
   * Only used in modal mode
   */
  showModalLabel?: boolean;

  /**
   * @description Theme for the datepicker
   * @default "basic"
   */
  theme?:
    | "basic"
    | "crane"
    | "crane-straight"
    | "m2"
    | "m3-green"
    | "dark"
    | "glassmorphic"
    | "pastel"
    | "ai"
    | "cyberpunk";

  /**
   * @description Show week numbers in calendar
   * @default false
   */
  showWeekNumbers?: boolean;

  /**
   * @description Year range for year picker
   * @default { before: 100, after: 20 }
   * @example
   * yearRange: { before: 20, after: 5 } // 20 years before, 5 years after current year
   * yearRange: { before: 5, after: 15 } // 5 years before, 15 years after current year
   *
   * Maximum values: before: 100, after: 100
   */
  yearRange?: {
    /**
     * @description Years before current year
     * @default 100
     * @minimum 1
     * @maximum 100
     */
    before?: number;
    /**
     * @description Years after current year
     * @default 20
     * @minimum 1
     * @maximum 100
     */
    after?: number;
  };

  /**
   * @description Show "Today" button
   * @default true
   */
  showTodayButton?: boolean;

  /**
   * @description Show "Clear" button
   * @default false
   */
  showClearButton?: boolean;

  /**
   * @description Show backdrop when datepicker is open
   * @default false
   *
   * **Dropdown mode**: No backdrop (current behavior)
   * **Modal mode**: Will use backdrop (future)
   */
  backdrop?: boolean;

  /**
   * @description Enable/disable animations
   * @default true
   */
  animation?: boolean;

  /**
   * @description Force mobile mode
   * @default false
   */
  mobile?: boolean;

  /**
   * @description Enable scrollbar when datepicker is open
   * @default true
   *
   * **Dropdown mode**: Always allows scroll (current default)
   * **Modal mode**: Can block scroll with backdrop (future)
   */
  enableScrollbar?: boolean;

  /**
   * @description Additional CSS class for the wrapper
   * @example cssClass: "my-custom-datepicker"
   */
  cssClass?: string;

  /**
   * @description Selector where to append modal (default: body)
   * @default ""
   */
  appendModalSelector?: string;

  /**
   * @description Inline mode configuration
   * @example
   * inline: {
   *   enabled: true,
   *   containerId: "datepicker-container",
   *   showButtons: false,
   *   autoUpdate: true
   * }
   */
  inline?: {
    enabled?: boolean;
    containerId?: string;
    showButtons?: boolean;
    autoUpdate?: boolean;
  };

  /**
   * @description Enable range selection mode
   * @default true
   *
   * When enabled:
   * - Normal click selects single date (default behavior)
   * - Long-press (250ms) on any day activates range selection
   * - After long-press: first click sets start, second sets end
   * - Hover shows live preview between start and end
   * - Close (X) button cancels range and returns to single-date mode
   * - Save button commits range selection
   * - ESC also cancels active range
   * - Third click on range resets and starts new range
   *
   * When disabled:
   * - Only single-date selection available
   * - Long-press has no effect
   *
   * Works in both dropdown and modal modes
   */
  rangeSelection?: boolean;

  /**
   * @description Swipe/gesture configuration for calendar navigation
   * @default { enabled: true }
   *
   * Features:
   * - Touch swipe on mobile devices
   * - Mouse drag on desktop
   * - Smooth overlapping month preview
   * - Velocity-based multi-month jumps
   * - RTL support (auto-reversed)
   *
   * @example
   * swipe: {
   *   enabled: true,
   *   velocity: 0.3,
   *   snapDuration: 200,
   *   overlapPreview: true,
   *   multipleMonthsJump: true,
   *   touchEnabled: true,
   *   mouseEnabled: true
   * }
   */
  swipe?: SwipeOptions;
}

/**
 * Text labels configuration
 */
export interface LabelsOptions {
  /**
   * @description Month names (full)
   * @default ['January', 'February', ...]
   */
  months?: string[];

  /**
   * @description Month names (short)
   * @default ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
   */
  monthsShort?: string[];

  /**
   * @description Custom month names array (12 items)
   * @example ['Styczeń', 'Luty', 'Marzec', ...]
   */
  customMonths?: string[];

  /**
   * @description Number of letters to show from month name
   * @default 3
   * @example monthLetters: 3 → 'Aug', monthLetters: 1 → 'A'
   */
  monthLetters?: number;

  /**
   * @description Weekday names (short)
   * @default ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
   */
  weekdays?: string[];

  /**
   * @description Custom weekday names array (7 items, starting from Sunday)
   * @example ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
   */
  customWeekdays?: string[];

  /**
   * @description Number of letters to show from weekday name
   * @default 1
   * @example weekdayLetters: 1 → 'S', weekdayLetters: 2 → 'Su'
   */
  weekdayLetters?: number;

  /**
   * @description "Today" button text
   * @default "Today"
   */
  today?: string;

  /**
   * @description "Clear" button text
   * @default "Clear"
   */
  clear?: string;

  /**
   * @description "Cancel" button text
   * @default "Cancel"
   */
  cancel?: string;

  /**
   * @description "OK" button text
   * @default "OK"
   */
  confirm?: string;
}

/**
 * Behavior configuration
 */
export interface BehaviorOptions {
  /**
   * @description Close datepicker on date selection
   * @default true
   *
   * **Dropdown mode**: Default true (quick select)
   * **Modal mode**: Default false (confirm/cancel pattern)
   */
  closeOnSelect?: boolean;

  /**
   * @description Close datepicker on cancel button click
   * @default true
   */
  closeOnCancel?: boolean;

  /**
   * @description Close datepicker on backdrop click
   * @default true
   */
  closeOnClickOutside?: boolean;

  /**
   * @description Auto-apply selected date without confirmation
   * @default false
   */
  autoApply?: boolean;

  /**
   * @description Enable focus trap in modal
   * @default false
   *
   * **Dropdown mode**: No focus trap (allows tab out)
   * **Modal mode**: Will trap focus (accessibility)
   */
  focusTrap?: boolean;

  /**
   * @description Focus input after closing modal
   * @default false
   */
  focusInputAfterClose?: boolean;

  /**
   * @description Delay for clickable elements (ms)
   * @default 300
   */
  delayHandler?: number;

  /**
   * @description Custom ID for the datepicker instance
   * @example id: "my-datepicker-1"
   */
  id?: string;
}

/**
 * Event callbacks configuration
 */
export interface CallbacksOptions {
  /**
   * @description Triggered when datepicker opens
   */
  onOpen?: DatepickerEventCallback<OpenEventData>;

  /**
   * @description Triggered when datepicker closes
   */
  onClose?: DatepickerEventCallback<Record<string, never>>;

  /**
   * @description Triggered when user cancels
   */
  onCancel?: DatepickerEventCallback<CancelEventData>;

  /**
   * @description Triggered when user confirms date
   */
  onConfirm?: DatepickerEventCallback<ConfirmEventData>;

  /**
   * @description Triggered during interaction (real-time)
   * @param data - Event data with selected date
   * @param info - Information about event source
   *
   * @example
   * ```typescript
   * onUpdate: (data, info) => {
   *   console.log('Date:', data.date);
   *   console.log('Triggered by:', info.event);
   *
   *   // Filter by event type
   *   if (info.event === 'confirm' || info.event === 'cancel') {
   *     // Only process on confirm/cancel
   *   }
   * }
   * ```
   */
  onUpdate?: (data: UpdateEventData, info: UpdateInfo) => void;

  /**
   * @description Triggered when day is selected
   */
  onSelectDay?: DatepickerEventCallback<SelectDayEventData>;

  /**
   * @description Triggered when month view changes
   */
  onSelectMonth?: DatepickerEventCallback<SelectMonthEventData>;

  /**
   * @description Triggered when year view changes
   */
  onSelectYear?: DatepickerEventCallback<SelectYearEventData>;

  /**
   * @description Triggered on invalid date
   */
  onError?: DatepickerEventCallback<ErrorEventData>;

  /**
   * @description Triggered when range selection starts
   */
  onRangeStart?: DatepickerEventCallback<RangeStartEventData>;

  /**
   * @description Triggered during range hover/drag preview
   */
  onRangeUpdate?: DatepickerEventCallback<RangeUpdateEventData>;

  /**
   * @description Triggered when range selection completes
   */
  onRangeEnd?: DatepickerEventCallback<RangeEndEventData>;

  /**
   * @description Triggered when range selection is cancelled
   */
  onRangeCancel?: DatepickerEventCallback<RangeCancelEventData>;
}

/**
 * Main options type with grouped structure
 */
export interface DatepickerOptions {
  calendar?: CalendarOptions;
  ui?: UIOptions;
  labels?: LabelsOptions;
  behavior?: BehaviorOptions;
  callbacks?: CallbacksOptions;
}

export type OptionTypes = DatepickerOptions;
