import type { CoreState } from "@/datepicker/CoreState";
import type { Panel, PickerActions } from "@/types/internal";
import { isDateSelected } from "@/utils/selection/model";
import { nextFocusDate } from "../GridKeyboard";
import type { DateCell, Layout, PickerPanel } from "./types";

export interface KeyboardDeps {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly layout: Layout;
  readonly home: Panel;
  readonly cellAt: (target: EventTarget | null) => DateCell | null;
  readonly isRtl: () => boolean;
}

const hasCommandModifier = (event: KeyboardEvent): boolean =>
  event.ctrlKey || event.altKey || event.metaKey;

const shortcutPanel = (key: string, layout: Layout): PickerPanel | null => {
  const letter = key.toLowerCase();
  if (layout === "modal") return letter === "y" ? "year-grid" : null;
  if (letter === "m") return "month-menu";
  if (letter === "y") return "year-menu";
  return null;
};

const canOpenShortcut = (deps: KeyboardDeps): boolean => {
  const { panel } = deps.core;
  if (deps.layout === "docked") return deps.home === "days" && panel === "days";
  if (deps.layout === "modal") {
    return panel === deps.home && deps.home !== "year-grid";
  }
  return false;
};

const closeOpenPanel = (event: KeyboardEvent, deps: KeyboardDeps): void => {
  const { panel } = deps.core;
  if (panel === deps.home || panel === "input") return;
  event.preventDefault();
  event.stopPropagation();
  deps.actions.showPanel(deps.home);
};

const openShortcut = (event: KeyboardEvent, deps: KeyboardDeps): boolean => {
  if (!event.shiftKey || !canOpenShortcut(deps)) return false;
  const panel = shortcutPanel(event.key, deps.layout);
  if (panel === null) return false;
  event.preventDefault();
  deps.actions.showPanel(panel);
  return true;
};

const commitDate = (
  event: KeyboardEvent,
  cell: DateCell,
  deps: KeyboardDeps,
): void => {
  event.preventDefault();
  const confirms =
    event.key === "Enter" &&
    deps.layout === "modal" &&
    deps.core.options.mode === "single" &&
    isDateSelected(deps.core.draft, cell.date);
  if (confirms) {
    deps.actions.confirm();
  } else {
    deps.actions.select(cell.date);
  }
};

const handleDateKey = (
  event: KeyboardEvent,
  cell: DateCell,
  deps: KeyboardDeps,
): void => {
  if (event.key === "Enter" || event.key === " ") {
    commitDate(event, cell, deps);
    return;
  }
  const next = nextFocusDate(
    event.key,
    event.shiftKey,
    cell.date,
    deps.isRtl(),
  );
  if (next === null) return;
  event.preventDefault();
  deps.actions.focusDate(next);
};

export const bindKeyboard = (
  root: HTMLElement,
  signal: AbortSignal,
  deps: KeyboardDeps,
): void => {
  root.addEventListener(
    "keydown",
    (event) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        closeOpenPanel(event, deps);
        return;
      }
      if (hasCommandModifier(event) || openShortcut(event, deps)) return;
      const cell = deps.cellAt(event.target);
      if (cell !== null) handleDateKey(event, cell, deps);
    },
    { signal },
  );
};
