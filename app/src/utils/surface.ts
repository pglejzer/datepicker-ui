import {
  COMPACT_BREAKPOINT,
  COMPACT_HEIGHT_BREAKPOINT,
  CONTAINER_SIDE_PADDING,
  MONTH_COLUMN_GAP,
  MONTH_COLUMN_WIDTH,
  PRESETS_COLUMN_WIDTH,
  VIEWPORT_GUTTER,
  WEEK_NUMBER_WIDTH,
} from "../constants/constants";
import type {
  CalendarLayout,
  LayoutOption,
  Panel,
  SurfaceMode,
} from "../types/internal";
import type { CalendarMode, Precision } from "../types/selection";

export interface ViewLayout {
  readonly months: number;
  readonly presets: "none" | "column" | "row";
}

export interface ViewLayoutInput {
  readonly months: number;
  readonly precision: Precision;
  readonly mode: CalendarMode;
  readonly layout: CalendarLayout;
  readonly width: number;
  readonly weekNumbers: boolean;
  readonly presets: number;
}

export interface InlineChrome {
  readonly headline: boolean;
  readonly navigation: "menus" | "caption";
  readonly announceSelection: boolean;
}

const SURFACE_CHROME: InlineChrome = {
  headline: true,
  navigation: "menus",
  announceSelection: true,
};

export const resolveViewLayout = (input: ViewLayoutInput): ViewLayout => {
  const wantPresets = input.mode === "range" && input.presets > 0;
  if (input.layout !== "docked" || input.precision !== "day") {
    return { months: 1, presets: wantPresets ? "row" : "none" };
  }
  const column =
    MONTH_COLUMN_WIDTH +
    (input.weekNumbers && input.mode !== "range" ? WEEK_NUMBER_WIDTH : 0);
  const need = (count: number, withPresets: boolean): number =>
    count * column +
    (count - 1) * MONTH_COLUMN_GAP +
    2 * CONTAINER_SIDE_PADDING +
    (withPresets ? PRESETS_COLUMN_WIDTH : 0) +
    2 * VIEWPORT_GUTTER;
  const presetsColumn = wantPresets && need(1, true) <= input.width;
  let months = 1;
  for (let count = 2; count <= input.months; count += 1) {
    if (need(count, presetsColumn) <= input.width) {
      months = count;
    }
  }
  let presets: ViewLayout["presets"] = "none";
  if (presetsColumn) {
    presets = "column";
  } else if (wantPresets) {
    presets = "row";
  }
  return { months, presets };
};

export const supportsInputView = (
  mode: CalendarMode,
  layout: CalendarLayout,
  precision: Precision,
): boolean => {
  if (precision !== "day") {
    return false;
  }
  switch (mode) {
    case "single":
      return layout !== "docked";
    case "range":
      return true;
    case "multiple":
      return false;
  }
};

export const homePanel = (precision: Precision): Panel => {
  switch (precision) {
    case "day":
      return "days";
    case "month":
      return "month-grid";
    case "year":
      return "year-grid";
  }
};

export const startPanel = (
  startView: Precision,
  layout: CalendarLayout,
): Panel => {
  const menus = layout === "docked";
  switch (startView) {
    case "day":
      return "days";
    case "month":
      return menus ? "month-menu" : "month-grid";
    case "year":
      return menus ? "year-menu" : "year-grid";
  }
};

export const resolveSurfaceMode = (
  option: "auto" | "docked" | "modal",
  inlineEnabled: boolean,
  viewportWidth: number,
  viewportHeight: number,
): SurfaceMode => {
  if (inlineEnabled) return "inline";
  if (option === "auto") {
    const compact =
      viewportWidth < COMPACT_BREAKPOINT ||
      viewportHeight < COMPACT_HEIGHT_BREAKPOINT;
    return compact ? "modal" : "docked";
  }
  return option;
};

export const isFullscreenRange = (
  mode: CalendarMode,
  surface: SurfaceMode,
  viewportWidth: number,
  fullscreenBelow: number,
): boolean =>
  mode === "range" && surface === "modal" && viewportWidth < fullscreenBelow;

export const calendarLayout = (
  surface: SurfaceMode,
  options: {
    readonly mode: CalendarMode;
    readonly fullscreenBelow: number;
    readonly layout: LayoutOption;
  },
  viewportWidth: number,
): CalendarLayout => {
  const { mode, layout } = options;
  if (layout === "docked") return "docked";
  if (layout === "fullscreen") {
    return mode === "range" && surface !== "docked" ? "fullscreen" : "modal";
  }
  if (surface === "modal") {
    return isFullscreenRange(
      mode,
      surface,
      viewportWidth,
      options.fullscreenBelow,
    )
      ? "fullscreen"
      : "modal";
  }
  return layout === "modal" ? "modal" : "docked";
};

export const inlineChrome = (
  surface: SurfaceMode,
  inline: InlineChrome,
): InlineChrome => (surface === "inline" ? inline : SURFACE_CHROME);

export const showsFooter = (
  footerExplicit: boolean | null,
  surface: SurfaceMode | null,
): boolean => footerExplicit ?? surface !== "inline";
