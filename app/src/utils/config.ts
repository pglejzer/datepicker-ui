/**
 * Configuration utilities
 * Pure functions for configuration handling
 */

import type { DatepickerOptions } from "../types/options";

/**
 * Get scrollbar width
 * SSR-safe
 */
export function getScrollbarWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

/**
 * Generate unique UUID-like identifier
 */
export function generateUUID(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Merge user options with defaults
 */
export function mergeOptions(
  options: DatepickerOptions
): Required<DatepickerOptions> {
  return {
    calendar: {
      weekStart: options.calendar?.weekStart ?? "auto",
      locale: options.calendar?.locale ?? "en-US",
      minDate: options.calendar?.minDate ?? null,
      maxDate: options.calendar?.maxDate ?? null,
      disabledDates: options.calendar?.disabledDates ?? [],
      enabledDates: options.calendar?.enabledDates ?? [],
      ...options.calendar,
    },
    ui: {
      theme: options.ui?.theme ?? "basic",
      showWeekNumbers: options.ui?.showWeekNumbers ?? false,
      showTodayButton: options.ui?.showTodayButton ?? true,
      showClearButton: options.ui?.showClearButton ?? false,
      backdrop: options.ui?.backdrop ?? true,
      animation: options.ui?.animation ?? true,
      mobile: options.ui?.mobile ?? false,
      enableScrollbar: options.ui?.enableScrollbar ?? false,
      cssClass: options.ui?.cssClass,
      appendModalSelector: options.ui?.appendModalSelector ?? "",
      inline: options.ui?.inline ?? {
        enabled: false,
        containerId: "",
        showButtons: true,
        autoUpdate: false,
      },
      ...options.ui,
    },
    labels: {
      months: options.labels?.months ?? [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      weekdays: options.labels?.weekdays ?? [
        "Su",
        "Mo",
        "Tu",
        "We",
        "Th",
        "Fr",
        "Sa",
      ],
      today: options.labels?.today ?? "Today",
      clear: options.labels?.clear ?? "Clear",
      cancel: options.labels?.cancel ?? "Cancel",
      confirm: options.labels?.confirm ?? "OK",
      ...options.labels,
    },
    behavior: {
      closeOnSelect: options.behavior?.closeOnSelect ?? false,
      closeOnCancel: options.behavior?.closeOnCancel ?? true,
      closeOnClickOutside: options.behavior?.closeOnClickOutside ?? true,
      autoApply: options.behavior?.autoApply ?? false,
      focusTrap: options.behavior?.focusTrap ?? true,
      focusInputAfterClose: options.behavior?.focusInputAfterClose ?? false,
      delayHandler: options.behavior?.delayHandler ?? 300,
      id: options.behavior?.id,
      ...options.behavior,
    },
    callbacks: options.callbacks ?? {},
  } as Required<DatepickerOptions>;
}
