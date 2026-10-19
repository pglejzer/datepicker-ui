import type { CoreState } from "@/datepicker/CoreState";
import {
  applyViewChrome,
  containerOf,
  INPUT_CLASS,
} from "@/managers/calendar/view/containerChrome";
import { createInputPanelParts } from "@/managers/calendar/view/inputPanel";
import {
  createPanelSwitcher,
  type PanelSwitcher,
} from "@/managers/calendar/view/panelSwitcher";
import { headlineFor } from "@/managers/calendar/view/selectionContext";
import {
  createRangeHeader,
  createWeekdaysBar,
  type RangeHeader,
} from "@/managers/renderers/RangeShell";
import { createActions } from "@/managers/renderers/shellActions";
import { panelId } from "@/managers/renderers/shellButtons";
import type {
  DateRules,
  Panel,
  PickerActions,
  SurfaceMode,
} from "@/types/internal";
import type { MotionMode } from "@/utils/accessibility";
import { createElement } from "@/utils/dom";
import { monthBounds } from "./monthBounds";
import { createMonthList } from "./monthList";
import { createMonthRow, createMonthsNavigation } from "./monthRow";
import { createPresets } from "./presets";
import type { RangeDays } from "./rangeDays";
import { renderRangeMonth } from "./rangeGrid";

export interface RangeParts {
  readonly header: RangeHeader;
  readonly days: RangeDays;
  readonly panels: PanelSwitcher;
  readonly liveRegion: HTMLDivElement;
  applyChrome(panel: Panel): void;
  refreshPresets(): void;
}

export interface RangePartsOptions {
  readonly root: HTMLElement;
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly mode: SurfaceMode;
  readonly fullscreen: boolean;
  readonly rtl: boolean;
  readonly signal: AbortSignal;
  readonly motion: () => MotionMode;
  readonly swap: (apply: () => void, panel: Panel) => void;
  readonly onSwitched: (
    panel: Panel,
    previous: Panel,
    hadFocus: boolean,
  ) => void;
}

const RANGE_CLASS = "dp-ui__container--range";
const FULLSCREEN_CLASS = "dp-ui__container--fullscreen";
const PRESETS_CLASS = "dp-ui__container--presets";

export const RANGE_CONTAINER_CLASSES: readonly string[] = [
  RANGE_CLASS,
  PRESETS_CLASS,
  FULLSCREEN_CLASS,
  INPUT_CLASS,
];

const footerVisible = (core: CoreState, mode: SurfaceMode): boolean =>
  core.options.footerExplicit ?? mode !== "inline";

const buildDays = (
  options: RangePartsOptions,
  range: HTMLElement,
): RangeDays => {
  const { core, actions, rules, rtl } = options;
  const { labels, locale, weekStart } = core.options;
  if (core.layout.months > 1) {
    const row = createMonthRow({ core, actions, rules, rtl });
    range.append(createMonthsNavigation(labels), row.element);
    return row;
  }
  const list = createMonthList({
    core,
    rules,
    render: (view) => renderRangeMonth(core, rules, view),
    bounds: () => monthBounds(core, rules),
  });
  range.append(createWeekdaysBar(locale, weekStart), list.element);
  return list;
};

export const buildRangeParts = (options: RangePartsOptions): RangeParts => {
  const { root, core, actions, rules, mode, fullscreen, signal } = options;
  const resolved = core.options;
  const header = createRangeHeader({
    labels: resolved.labels,
    animate: resolved.animation,
    text: headlineFor(core),
    fullscreen,
    switchView: resolved.viewSwitch
      ? { panelId: panelId(core.instanceId, "input") }
      : null,
  });
  const range = createElement("div", "dp-ui__range", { "data-panel": "days" });
  const days = buildDays(options, range);
  const panels = createPanelSwitcher({
    root,
    content: root,
    days: range,
    motion: options.motion,
    createParts: (panel) =>
      panel === "input" ? createInputPanelParts({ core, actions, rules }) : [],
    swap: options.swap,
    onSwitched: options.onSwitched,
  });
  const footer = createActions({
    labels: resolved.labels,
    visible: footerVisible(core, mode),
    todayButton: resolved.todayButton,
    clearButton: resolved.clearButton !== false,
  });
  const liveRegion = createElement(
    "div",
    "dp-ui__live-region dp-ui__visually-hidden",
    { "aria-live": "polite", "aria-atomic": "true" },
  );
  const presets =
    core.layout.presets === "none"
      ? null
      : createPresets({ core, actions, rules, signal });
  const column = core.layout.presets === "column";
  root.replaceChildren(
    header.element,
    ...(presets === null ? [] : [presets.element]),
    range,
    footer,
    liveRegion,
  );
  const applyChrome = (panel: Panel): void => {
    const input = panel === "input";
    header.setInputView(input);
    header.setText(headlineFor(core));
    presets?.setHidden(input);
    const container = containerOf(root);
    if (container === null) return;
    container.classList.add(RANGE_CLASS);
    container.classList.toggle(PRESETS_CLASS, column);
    container.classList.toggle(FULLSCREEN_CLASS, fullscreen && !input);
    applyViewChrome(container, panel, core.layout.months);
  };
  return {
    header,
    days,
    panels,
    liveRegion,
    applyChrome,
    refreshPresets: () => {
      presets?.refresh();
    },
  };
};
