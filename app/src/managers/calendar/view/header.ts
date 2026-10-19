import type { CoreState } from "@/datepicker/CoreState";
import {
  createDockedHeader,
  type DockedHeader,
} from "@/managers/renderers/DockedShell";
import {
  createModalHeader,
  type ModalHeader,
} from "@/managers/renderers/ModalShell";
import { panelId } from "@/managers/renderers/shellButtons";
import type { Panel, SurfaceMode } from "@/types/internal";
import type { Precision } from "@/types/selection";
import { titleText } from "@/utils/selection/headline";
import { homePanel, supportsInputView } from "@/utils/surface";
import { headlineFor } from "./selectionContext";
import type { Layout } from "./types";

export interface Header {
  readonly element: HTMLElement;
  readonly docked: DockedHeader | null;
  readonly modal: ModalHeader | null;
}

const PANEL_TRIGGERS: Record<Panel, string | null> = {
  days: null,
  input: null,
  "month-menu": ".dp-ui__menu-button--month",
  "year-menu": ".dp-ui__menu-button--year",
  "year-grid": ".dp-ui__menu-button--year-grid",
  "month-grid": null,
};

const dockedGroups = (precision: Precision): "both" | "year" | "none" => {
  switch (precision) {
    case "day":
      return "both";
    case "month":
      return "year";
    case "year":
      return "none";
  }
};

export const triggerSelector = (panel: Panel): string | null =>
  PANEL_TRIGGERS[panel];

export const createHeader = (
  core: CoreState,
  layout: Layout,
  surface: SurfaceMode,
): Header => {
  const { locale, labels, animation, viewSwitch, mode, precision } =
    core.options;
  if (layout === "modal") {
    const canSwitch = viewSwitch && supportsInputView(mode, surface, precision);
    const modal = createModalHeader({
      labels,
      title: titleText(labels, mode, precision),
      animate: animation,
      text: headlineFor(core),
      switchView: canSwitch
        ? { panelId: panelId(core.instanceId, "input") }
        : null,
    });
    modal.setInputView(core.panel === "input");
    return { element: modal.element, docked: null, modal };
  }
  const docked = createDockedHeader({
    instanceId: core.instanceId,
    locale,
    labels,
    view: core.view,
    groups: dockedGroups(precision),
    home: homePanel(precision),
  });
  return { element: docked.element, docked, modal: null };
};
