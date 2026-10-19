import type { CoreState } from "@/datepicker/CoreState";
import { morphContainer } from "@/managers/renderers/containerTransform";
import { createActions } from "@/managers/renderers/shellActions";
import type {
  DateRules,
  Panel,
  PickerActions,
  SurfaceMode,
} from "@/types/internal";
import type { MotionMode } from "@/utils/accessibility";
import { createElement } from "@/utils/dom";
import { applyViewChrome, containerOf } from "./containerChrome";
import { createHeader, type Header } from "./header";
import { createInputPanelParts } from "./inputPanel";
import { createMonthPages, type MonthPages } from "./monthPages";
import { createPanelParts } from "./panels";
import { createPanelSwitcher, type PanelSwitcher } from "./panelSwitcher";
import { createDaysGridContext } from "./selectionContext";
import type { Layout } from "./types";

export interface ViewParts {
  readonly header: Header;
  readonly pages: MonthPages;
  readonly panels: PanelSwitcher;
  readonly liveRegion: HTMLDivElement;
}

export interface ViewPartsOptions {
  readonly root: HTMLElement;
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly mode: SurfaceMode;
  readonly layout: Layout;
  readonly rtl: boolean;
  readonly motion: () => MotionMode;
  readonly onSwitched: (
    panel: Panel,
    previous: Panel,
    hadFocus: boolean,
  ) => void;
}

export const buildViewParts = (options: ViewPartsOptions): ViewParts => {
  const { root, core, actions, rules, mode, layout } = options;
  const resolved = core.options;
  const header = createHeader(core, layout, mode);
  const pages = createMonthPages({
    core,
    layout,
    rtl: options.rtl,
    gridContext: () => createDaysGridContext(core, rules, layout),
    onCommit: (direction, source) => {
      actions.page(direction, source);
    },
  });
  const content = createElement("div", "dp-ui__content");
  content.append(pages.element);
  const panels = createPanelSwitcher({
    root,
    content,
    days: pages.element,
    motion: options.motion,
    createParts: (panel) =>
      panel === "input"
        ? createInputPanelParts({ core, actions, rules })
        : createPanelParts(panel, { core, actions, rules, layout }),
    swap: (apply, panel, previous) => {
      const target = containerOf(root);
      if (target === null || (panel !== "input" && previous !== "input")) {
        apply();
        return;
      }
      morphContainer(
        target,
        () => {
          apply();
          applyViewChrome(target, panel, core.layout.months);
        },
        options.motion(),
      );
    },
    onSwitched: options.onSwitched,
  });
  const footer = createActions({
    labels: resolved.labels,
    visible: resolved.footerExplicit ?? mode !== "inline",
    todayButton: resolved.todayButton,
    clearButton: resolved.clearButton !== false,
  });
  const liveRegion = createElement(
    "div",
    "dp-ui__live-region dp-ui__visually-hidden",
    { "aria-live": "polite", "aria-atomic": "true" },
  );
  root.replaceChildren(header.element, content, footer, liveRegion);
  return { header, pages, panels, liveRegion };
};
