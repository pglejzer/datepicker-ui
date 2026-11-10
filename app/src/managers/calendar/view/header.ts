import type { CoreState } from "@/datepicker/CoreState";
import {
  createCaptionHeader,
  type CaptionHeader,
} from "@/managers/renderers/CaptionShell";
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
import { homePanel, inlineChrome, supportsInputView } from "@/utils/surface";
import { headlineFor } from "./selectionContext";
import type { Layout } from "./types";

export interface Header {
  readonly element: HTMLElement | null;
  readonly docked: DockedHeader | null;
  readonly modal: ModalHeader | null;
  readonly caption: CaptionHeader | null;
}

const NO_HEADER: Header = {
  element: null,
  docked: null,
  modal: null,
  caption: null,
};

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

export const usesCaption = (core: CoreState, surface: SurfaceMode): boolean =>
  core.options.precision === "day" &&
  inlineChrome(surface, core.options.inline).navigation === "caption";

export const createHeader = (
  core: CoreState,
  layout: Layout,
  surface: SurfaceMode,
): Header => {
  const { locale, labels, animation, viewSwitch, mode, precision } =
    core.options;
  if (layout === "modal") {
    if (!inlineChrome(surface, core.options.inline).headline) return NO_HEADER;
    const canSwitch =
      viewSwitch && supportsInputView(mode, core.calendarLayout, precision);
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
    return { element: modal.element, docked: null, modal, caption: null };
  }
  if (usesCaption(core, surface)) {
    const caption = createCaptionHeader({
      locale,
      labels,
      view: core.view,
      arrowsOnly: core.layout.months > 1,
    });
    return { element: caption.element, docked: null, modal: null, caption };
  }
  const docked = createDockedHeader({
    instanceId: core.instanceId,
    locale,
    labels,
    view: core.view,
    groups: dockedGroups(precision),
    home: homePanel(precision),
  });
  return { element: docked.element, docked, modal: null, caption: null };
};
