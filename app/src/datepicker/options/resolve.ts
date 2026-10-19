import type { DatepickerOptions } from "../../types/options";
import { resolvePattern } from "../../utils/date/format";
import { resolveCalendarOptions } from "./calendar";
import { DEFAULT_DATEPICKER_OPTIONS } from "./defaults";
import {
  COLOR_SCHEMES,
  DISPLAY_MODES,
  INITIAL_VIEWS,
  THEMES,
  isFormatFor,
  resolveClearButton,
  resolveFullscreenBelow,
  resolveLabels,
  resolveOutsideDays,
  START_VIEWS,
} from "./fields";
import { isBoolean, isCount, isString, isTarget, pick } from "./pick";
import type { OptionIssue } from "./pick";
import type { ResolvedOptions } from "./types";

export function resolveOptions(
  options: DatepickerOptions | undefined,
): ResolvedOptions {
  const issues: OptionIssue[] = [];
  const defaults = DEFAULT_DATEPICKER_OPTIONS;
  const calendar = options?.calendar;
  const ui = options?.ui;
  const behavior = options?.behavior;
  const read = <T, F>(
    value: unknown,
    check: (value: unknown) => T | undefined,
    fallback: F,
    option: string,
  ): T | F => pick(value, check, fallback, option, issues);

  const resolvedCalendar = resolveCalendarOptions(calendar, issues);
  const { locale, precision } = resolvedCalendar;
  const format = read(
    ui?.format,
    isFormatFor(precision),
    defaults.ui.format,
    "ui.format",
  );
  const footer = read(ui?.footer, isBoolean, false, "ui.footer");
  const behaviorId = behavior?.id;

  return {
    ...resolvedCalendar,
    displayMode: read(
      ui?.displayMode,
      DISPLAY_MODES,
      defaults.ui.displayMode,
      "ui.displayMode",
    ),
    inline: {
      enabled: read(
        ui?.inline?.enabled,
        isBoolean,
        defaults.ui.inline.enabled,
        "ui.inline.enabled",
      ),
      container: read(
        ui?.inline?.container,
        isTarget,
        null,
        "ui.inline.container",
      ),
    },
    pattern: resolvePattern(format, locale, precision),
    theme: read(ui?.theme, THEMES, defaults.ui.theme, "ui.theme"),
    colorScheme: read(
      ui?.colorScheme,
      COLOR_SCHEMES,
      defaults.ui.colorScheme,
      "ui.colorScheme",
    ),
    toggleButton: read(ui?.toggleButton, isTarget, null, "ui.toggleButton"),
    endInput: read(ui?.endInput, isTarget, null, "ui.endInput"),
    weekNumbers: read(
      ui?.weekNumbers,
      isBoolean,
      defaults.ui.weekNumbers,
      "ui.weekNumbers",
    ),
    outsideDays: resolveOutsideDays(ui?.outsideDays, issues),
    fixedWeeks: read(
      ui?.fixedWeeks,
      isBoolean,
      defaults.ui.fixedWeeks,
      "ui.fixedWeeks",
    ),
    yearRange: {
      before: read(
        ui?.yearRange?.before,
        isCount,
        defaults.ui.yearRange.before,
        "ui.yearRange.before",
      ),
      after: read(
        ui?.yearRange?.after,
        isCount,
        defaults.ui.yearRange.after,
        "ui.yearRange.after",
      ),
    },
    todayButton: read(
      ui?.todayButton,
      isBoolean,
      defaults.ui.todayButton,
      "ui.todayButton",
    ),
    clearButton: resolveClearButton(ui?.clearButton, issues),
    footerExplicit: typeof ui?.footer === "boolean" ? footer : null,
    animation: read(
      ui?.animation,
      isBoolean,
      defaults.ui.animation,
      "ui.animation",
    ),
    allowPageScroll: read(
      ui?.allowPageScroll,
      isBoolean,
      defaults.ui.allowPageScroll,
      "ui.allowPageScroll",
    ),
    fullscreenBelow: resolveFullscreenBelow(ui?.fullscreen, issues),
    cssClass: read(ui?.cssClass, isString, defaults.ui.cssClass, "ui.cssClass"),
    appendTo: read(ui?.appendTo, isTarget, null, "ui.appendTo"),
    swipe: read(ui?.swipe, isBoolean, defaults.ui.swipe, "ui.swipe"),
    viewSwitch: read(
      ui?.viewSwitch,
      isBoolean,
      defaults.ui.viewSwitch,
      "ui.viewSwitch",
    ),
    initialView: read(
      ui?.initialView,
      INITIAL_VIEWS,
      defaults.ui.initialView,
      "ui.initialView",
    ),
    mask: read(ui?.mask, isBoolean, defaults.ui.mask, "ui.mask"),
    startView: read(
      ui?.startView,
      START_VIEWS,
      defaults.ui.startView,
      "ui.startView",
    ),
    labels: resolveLabels(options?.labels, issues),
    behavior: {
      closeOnSelect: read(
        behavior?.closeOnSelect,
        isBoolean,
        defaults.behavior.closeOnSelect,
        "behavior.closeOnSelect",
      ),
      closeOnCancel: read(
        behavior?.closeOnCancel,
        isBoolean,
        defaults.behavior.closeOnCancel,
        "behavior.closeOnCancel",
      ),
      commitOnChange: read(
        behavior?.commitOnChange,
        isBoolean,
        defaults.behavior.commitOnChange,
        "behavior.commitOnChange",
      ),
      ignoreOutsideClick: read(
        behavior?.ignoreOutsideClick,
        isBoolean,
        defaults.behavior.ignoreOutsideClick,
        "behavior.ignoreOutsideClick",
      ),
      returnFocus: read(
        behavior?.returnFocus,
        isBoolean,
        defaults.behavior.returnFocus,
        "behavior.returnFocus",
      ),
      id:
        typeof behaviorId === "string" && behaviorId.length > 0
          ? behaviorId
          : null,
    },
    callbacks: { ...options?.callbacks },
    issues,
  };
}
