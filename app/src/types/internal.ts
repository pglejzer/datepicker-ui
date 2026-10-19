import type { PlainDate, YearMonth } from "./date";
import type { RangeEnd, Selection } from "./selection";
import type { UnavailableReason } from "./types";

export type Panel =
  "days" | "month-menu" | "year-menu" | "month-grid" | "year-grid" | "input";
export type SurfaceMode = "docked" | "modal" | "inline";
export type NavigateSource =
  "drag" | "wheel" | "button" | "keyboard" | "menu" | "api";
export type CancelReason = "button" | "escape" | "outside";

export interface InternalEventMap {
  "change:draft": { readonly draft: Selection };
  "change:view": {
    readonly view: YearMonth;
    readonly delta: number;
    readonly source: NavigateSource;
  };
  "change:focus": { readonly focus: PlainDate };
  "change:panel": { readonly panel: Panel };
  "change:value": { readonly value: Selection };
  "change:active-end": { readonly end: RangeEnd };
  "change:options": Record<string, never>;
}

export interface PickerActions {
  select(date: PlainDate): void;
  selectRange(start: PlainDate, end: PlainDate): void;
  typeDraft(selection: Selection): void;
  focusDate(date: PlainDate): void;
  navigate(delta: number, source: NavigateSource): void;
  page(direction: -1 | 1, source: NavigateSource): void;
  jumpTo(view: YearMonth, source: NavigateSource): void;
  showPanel(panel: Panel): void;
  confirm(): void;
  cancel(reason: CancelReason): void;
  today(): void;
  clear(): void;
}

export interface DateRules {
  isDisabled(date: PlainDate): boolean;
  unavailableReason(date: PlainDate): UnavailableReason | null;
  isSelectable(date: PlainDate, draft: Selection): boolean;
  isMonthDisabled(view: YearMonth): boolean;
  yearBounds(): { readonly min: number; readonly max: number };
}
