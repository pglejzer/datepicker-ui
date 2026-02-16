/**
 * CoreState - Pure state container
 * No logic, no DOM manipulation, only data
 *
 * Architecture: Composition-only
 * Never mutate state directly - use setter methods
 */

import { isDocument } from "../utils/node";
import type { DatepickerOptions, UIOptions } from "../types/options";

function getMonthNames(locale: string = "en-US"): string[] {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2025, i, 1);
    const name = new Intl.DateTimeFormat(locale, { month: "long" }).format(
      date,
    );
    months.push(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return months;
}

function getMonthNamesShort(locale: string = "en-US"): string[] {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2025, i, 1);
    const name = new Intl.DateTimeFormat(locale, { month: "short" }).format(
      date,
    );
    months.push(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return months;
}

function getWeekdayNames(locale: string = "en-US"): string[] {
  const weekdays: string[] = [];
  const baseDate = new Date(2025, 0, 5);
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    const name = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      date,
    );
    weekdays.push(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return weekdays;
}

export const DEFAULT_DATEPICKER_OPTIONS: Required<DatepickerOptions> = {
  calendar: {
    weekStart: "auto",
    locale: "en-US",
    minDate: undefined,
    maxDate: undefined,
    disabledDates: [],
    enabledDates: [],
  },
  ui: {
    format: "dd/mm/yyyy",
    iconSelector: "",
    displayMode: "dropdown",
    modalLabel: "Select date",
    showModalLabel: true,
    theme: "basic",
    showWeekNumbers: false,
    yearRange: {
      before: 100,
      after: 20,
    },
    showTodayButton: false,
    showClearButton: false,
    backdrop: false,
    animation: true,
    mobile: false,
    enableScrollbar: true,
    maskEnabled: false,
    cssClass: "",
    appendModalSelector: "",
    inline: {
      enabled: false,
      containerId: "",
      showButtons: false,
      autoUpdate: true,
    },
    rangeSelection: false, // Temporarily disabled
    swipe: {
      enabled: true,
      velocity: 0.3,
      snapDuration: 200,
      overlapPreview: true,
      multipleMonthsJump: true,
      touchEnabled: true,
      mouseEnabled: true,
      threshold: 50,
      resistance: 0.5,
    },
  },
  labels: {
    months: undefined as any,
    monthsShort: undefined as any,
    customMonths: undefined,
    monthLetters: 3,
    weekdays: undefined as any,
    customWeekdays: undefined,
    weekdayLetters: 1,
    today: "Today",
    clear: "Clear",
    cancel: "Cancel",
    confirm: "OK",
  },
  behavior: {
    closeOnSelect: true,
    closeOnCancel: true,
    closeOnClickOutside: true,
    autoApply: false,
    focusTrap: false,
    focusInputAfterClose: false,
    delayHandler: 300,
  },
  callbacks: {},
};

export interface CoreStateData {
  readonly selectedDate: Date | null;
  readonly tempSelectedDate: Date | null;
  readonly rangeStartDate: Date | null;
  readonly rangeEndDate: Date | null;
  readonly tempRangeStartDate: Date | null;
  readonly tempRangeEndDate: Date | null;
  readonly currentMonth: number;
  readonly currentYear: number;
  readonly viewMode: "day" | "month" | "year";
  readonly displayMode: "modal" | "dropdown";
  readonly options: Required<DatepickerOptions>;
  readonly element: HTMLElement;
  readonly instanceId: string;
  readonly isMobileView: boolean;
  readonly disabledDates: Date[];
  readonly minDate: Date | null;
  readonly maxDate: Date | null;
  readonly isModalRemove: boolean;
  readonly isInitialized: boolean;
  readonly customId?: string;
  readonly eventHandlersRegistered: boolean;
  readonly isDestroyed: boolean;
  readonly isSwiping: boolean;
}

export class CoreState {
  private state: CoreStateData;

  constructor(
    element: HTMLElement,
    options: DatepickerOptions,
    instanceId: string,
    customId?: string,
  ) {
    const mergedOptions = this.mergeOptions(options);

    this.state = {
      selectedDate: null,
      tempSelectedDate: null,
      rangeStartDate: null,
      rangeEndDate: null,
      tempRangeStartDate: null,
      tempRangeEndDate: null,
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      viewMode: "day",
      displayMode: mergedOptions.ui.displayMode || "dropdown",
      options: mergedOptions,
      element,
      instanceId,
      isMobileView: mergedOptions.ui.mobile || false,
      disabledDates: mergedOptions.calendar.disabledDates || [],
      minDate: mergedOptions.calendar.minDate || null,
      maxDate: mergedOptions.calendar.maxDate || null,
      isModalRemove: true,
      isInitialized: false,
      customId,
      eventHandlersRegistered: false,
      isDestroyed: false,
      isSwiping: false,
    };
  }

  private mergeOptions(
    options: DatepickerOptions,
  ): Required<DatepickerOptions> {
    const locale = options.calendar?.locale || "en-US";

    console.log("[CoreState] Merging options with locale:", locale);
    console.log(
      "[CoreState] Generated months:",
      getMonthNames(locale).slice(0, 3),
    );

    return {
      calendar: {
        ...DEFAULT_DATEPICKER_OPTIONS.calendar,
        ...(options.calendar || {}),
      },
      ui: {
        ...DEFAULT_DATEPICKER_OPTIONS.ui,
        ...(options.ui || {}),
        inline: {
          ...DEFAULT_DATEPICKER_OPTIONS.ui.inline,
          ...(options.ui?.inline || {}),
        },
        swipe: {
          ...DEFAULT_DATEPICKER_OPTIONS.ui.swipe,
          ...(options.ui?.swipe || {}),
        },
      },
      labels: {
        today: options.labels?.today || DEFAULT_DATEPICKER_OPTIONS.labels.today,
        clear: options.labels?.clear || DEFAULT_DATEPICKER_OPTIONS.labels.clear,
        cancel:
          options.labels?.cancel || DEFAULT_DATEPICKER_OPTIONS.labels.cancel,
        confirm:
          options.labels?.confirm || DEFAULT_DATEPICKER_OPTIONS.labels.confirm,
        monthLetters:
          options.labels?.monthLetters ??
          DEFAULT_DATEPICKER_OPTIONS.labels.monthLetters,
        weekdayLetters:
          options.labels?.weekdayLetters ??
          DEFAULT_DATEPICKER_OPTIONS.labels.weekdayLetters,
        customMonths: options.labels?.customMonths,
        customWeekdays: options.labels?.customWeekdays,
        months:
          options.labels?.months ||
          options.labels?.customMonths ||
          getMonthNames(locale),
        monthsShort: options.labels?.monthsShort || getMonthNamesShort(locale),
        weekdays:
          options.labels?.weekdays ||
          options.labels?.customWeekdays ||
          getWeekdayNames(locale),
      },
      behavior: {
        ...DEFAULT_DATEPICKER_OPTIONS.behavior,
        ...(options.behavior || {}),
      },
      callbacks: {
        ...DEFAULT_DATEPICKER_OPTIONS.callbacks,
        ...(options.callbacks || {}),
      },
    };
  }

  get selectedDate(): Date | null {
    return this.state.selectedDate;
  }

  get tempSelectedDate(): Date | null {
    return this.state.tempSelectedDate;
  }

  get currentMonth(): number {
    return this.state.currentMonth;
  }

  get currentYear(): number {
    return this.state.currentYear;
  }

  get viewMode(): "day" | "month" | "year" {
    return this.state.viewMode;
  }

  get displayMode(): "modal" | "dropdown" {
    return this.state.displayMode;
  }

  get options(): Required<DatepickerOptions> {
    return this.state.options;
  }

  get element(): HTMLElement {
    return this.state.element;
  }

  get instanceId(): string {
    return this.state.instanceId;
  }

  get isMobileView(): boolean {
    return this.state.isMobileView;
  }

  get disabledDates(): Date[] {
    return this.state.disabledDates;
  }

  get minDate(): Date | null {
    return this.state.minDate;
  }

  get maxDate(): Date | null {
    return this.state.maxDate;
  }

  get isModalRemove(): boolean {
    return this.state.isModalRemove;
  }

  get isInitialized(): boolean {
    return this.state.isInitialized;
  }

  get customId(): string | undefined {
    return this.state.customId;
  }

  get eventHandlersRegistered(): boolean {
    return this.state.eventHandlersRegistered;
  }

  get isDestroyed(): boolean {
    return this.state.isDestroyed;
  }

  get isSwiping(): boolean {
    return this.state.isSwiping;
  }

  setIsSwiping(value: boolean): void {
    this.state = { ...this.state, isSwiping: value };
  }

  setSelectedDate(date: Date | null): void {
    this.state = { ...this.state, selectedDate: date };
  }

  setTempSelectedDate(date: Date | null): void {
    this.state = { ...this.state, tempSelectedDate: date };
  }

  commitTempSelection(): void {
    this.state = { ...this.state, selectedDate: this.state.tempSelectedDate };
  }

  resetTempSelection(): void {
    this.state = { ...this.state, tempSelectedDate: this.state.selectedDate };
  }

  getSelectedDate(): Date | null {
    return this.state.selectedDate;
  }

  get rangeStartDate(): Date | null {
    return this.state.rangeStartDate;
  }

  get rangeEndDate(): Date | null {
    return this.state.rangeEndDate;
  }

  get tempRangeStartDate(): Date | null {
    return this.state.tempRangeStartDate;
  }

  get tempRangeEndDate(): Date | null {
    return this.state.tempRangeEndDate;
  }

  setRangeStartDate(date: Date | null): void {
    this.state = { ...this.state, rangeStartDate: date };
  }

  setRangeEndDate(date: Date | null): void {
    this.state = { ...this.state, rangeEndDate: date };
  }

  setTempRangeStartDate(date: Date | null): void {
    this.state = { ...this.state, tempRangeStartDate: date };
  }

  setTempRangeEndDate(date: Date | null): void {
    this.state = { ...this.state, tempRangeEndDate: date };
  }

  commitTempRangeSelection(): void {
    this.state = {
      ...this.state,
      rangeStartDate: this.state.tempRangeStartDate,
      rangeEndDate: this.state.tempRangeEndDate,
    };
  }

  resetTempRangeSelection(): void {
    this.state = {
      ...this.state,
      tempRangeStartDate: this.state.rangeStartDate,
      tempRangeEndDate: this.state.rangeEndDate,
    };
  }

  resetRangeSelection(): void {
    this.state = {
      ...this.state,
      rangeStartDate: null,
      rangeEndDate: null,
      tempRangeStartDate: null,
      tempRangeEndDate: null,
    };
  }

  getRangeValue(): { startDate: Date; endDate: Date } | null {
    if (this.state.rangeStartDate && this.state.rangeEndDate) {
      return {
        startDate: this.state.rangeStartDate,
        endDate: this.state.rangeEndDate,
      };
    }
    return null;
  }

  setCurrentMonth(month: number): void {
    this.state = { ...this.state, currentMonth: month };
  }

  setCurrentYear(year: number): void {
    this.state = { ...this.state, currentYear: year };
  }

  setViewMode(mode: "day" | "month" | "year"): void {
    this.state = { ...this.state, viewMode: mode };
  }

  setDisplayMode(mode: "modal" | "dropdown"): void {
    this.state = { ...this.state, displayMode: mode };
  }

  setOptions(options: Required<DatepickerOptions>): void {
    this.state = { ...this.state, options };
  }

  setIsMobileView(value: boolean): void {
    this.state = { ...this.state, isMobileView: value };
  }

  setDisabledDates(dates: Date[]): void {
    this.state = { ...this.state, disabledDates: dates };
  }

  setMinDate(date: Date | null): void {
    this.state = { ...this.state, minDate: date };
  }

  setMaxDate(date: Date | null): void {
    this.state = { ...this.state, maxDate: date };
  }

  setIsModalRemove(value: boolean): void {
    this.state = { ...this.state, isModalRemove: value };
  }

  setIsInitialized(value: boolean): void {
    this.state = { ...this.state, isInitialized: value };
  }

  setEventHandlersRegistered(value: boolean): void {
    this.state = { ...this.state, eventHandlersRegistered: value };
  }

  setIsDestroyed(value: boolean): void {
    this.state = { ...this.state, isDestroyed: value };
  }

  updateOptions(updates: Partial<DatepickerOptions>): void {
    this.state = {
      ...this.state,
      options: {
        ...this.state.options,
        calendar: {
          ...this.state.options.calendar,
          ...(updates.calendar || {}),
        },
        ui: {
          ...this.state.options.ui,
          ...(updates.ui || {}),
          inline: {
            ...this.state.options.ui.inline,
            ...(updates.ui?.inline || {}),
          },
        },
        labels: { ...this.state.options.labels, ...(updates.labels || {}) },
        behavior: {
          ...this.state.options.behavior,
          ...(updates.behavior || {}),
        },
        callbacks: {
          ...this.state.options.callbacks,
          ...(updates.callbacks || {}),
        },
      },
    };
  }

  reset(): void {
    this.state = {
      ...this.state,
      selectedDate: null,
      rangeStartDate: null,
      rangeEndDate: null,
      tempRangeStartDate: null,
      tempRangeEndDate: null,
      viewMode: "day",
      disabledDates: [],
      isModalRemove: true,
      isInitialized: false,
      isDestroyed: true,
      eventHandlersRegistered: false,
    };
  }

  getModalElement(): HTMLDivElement | null {
    if (isDocument() === false) return null;
    return document.querySelector(`[data-owner-id="${this.state.instanceId}"]`);
  }

  getInput(): HTMLInputElement | null {
    return this.state.element?.querySelector("input");
  }

  getCalendarGrid(): HTMLDivElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__calendar-grid") || null;
  }

  getCalendarHeader(): HTMLDivElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__calendar-header") || null;
  }

  getPrevButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__prev-btn") || null;
  }

  getNextButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__next-btn") || null;
  }

  getMonthYearButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__month-year-btn") || null;
  }

  getTodayButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__today-btn") || null;
  }

  getClearButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__clear-btn") || null;
  }

  getCancelButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__cancel-btn") || null;
  }

  getOkButton(): HTMLButtonElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__ok-btn") || null;
  }

  getWrapper(): HTMLDivElement | null {
    const modal = this.getModalElement();
    return modal?.querySelector(".dp-ui__wrapper") || null;
  }
}
