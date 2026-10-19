import type { CoreState } from "@/datepicker/CoreState";
import type { YearMonth } from "@/types/date";
import type {
  DateRules,
  NavigateSource,
  Panel,
  PickerActions,
  SurfaceMode,
} from "@/types/internal";
import { announce, motionMode } from "@/utils/accessibility";
import { createElement } from "@/utils/dom";
import { attachRipple } from "@/utils/ripple";
import { homePanel } from "@/utils/surface";
import { setConfirmEnabled } from "@/managers/renderers/shellActions";
import { isCompleteSelection } from "@/utils/selection/model";
import { bindClicks } from "./view/commands";
import {
  applyViewChrome,
  containerOf,
  INPUT_CLASS,
  isMenuPanel,
  MENU_OPEN_CLASS,
  setVisibleMonths,
} from "./view/containerChrome";
import { triggerSelector } from "./view/header";
import { bindKeyboard } from "./view/keyboard";
import { buildViewParts, type ViewParts } from "./view/parts";
import { headlineFor, visibleMonthsText } from "./view/selectionContext";
import type { DateCell, Layout } from "./view/types";

export interface CalendarShell {
  readonly element: HTMLElement;
  focusInitial(): void;
  update(): void;
  destroy(): void;
}

export interface CalendarViewDeps {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly mode: SurfaceMode;
  readonly fullscreen: boolean;
}

const VIEW_CLASS = "dp-ui__calendar";
const RTL_SELECTOR = ".dp-ui__container--rtl";
const RIPPLE_SELECTOR = [
  ".dp-ui__icon-button",
  ".dp-ui__menu-button",
  ".dp-ui__text-button",
  ".dp-ui__date:not(.dp-ui__date--disabled) .dp-ui__date-indicator",
  ".dp-ui__menu-item",
  ".dp-ui__year-selection-item",
  ".dp-ui__month-selection-item",
].join(", ");

export const createCalendarView = (deps: CalendarViewDeps): CalendarShell => {
  const { core, actions, rules, mode } = deps;
  const layout: Layout = mode === "modal" ? "modal" : "docked";
  const controller = new AbortController();
  const element = createElement("div", VIEW_CLASS);
  let parts: ViewParts;
  let frame = 0;

  const isRtl = (): boolean =>
    element.closest(RTL_SELECTOR) !== null ||
    getComputedStyle(core.input).direction === "rtl";

  const container = (): HTMLElement | null => containerOf(element);

  const home = (): Panel => homePanel(core.options.precision);

  const cellAt = (target: EventTarget | null): DateCell | null =>
    parts.pages.cellAt(target);

  const syncChrome = (panel: Panel, withInput = true): void => {
    parts.header.docked?.setPanel(panel);
    const target = container();
    if (target === null) return;
    target.classList.toggle(MENU_OPEN_CLASS, isMenuPanel(panel, home()));
    if (withInput) applyViewChrome(target, panel, core.layout.months);
  };

  const focusTarget = (target: HTMLElement | null): void => {
    if (target === null) {
      parts.pages.focusCell(true);
    } else {
      target.focus({ preventScroll: true });
    }
  };

  const triggerFor = (previous: Panel): HTMLElement | null => {
    const selector = triggerSelector(previous);
    if (selector === null) return null;
    return (
      parts.header.element.querySelector<HTMLElement>(selector) ??
      parts.pages.find(selector)
    );
  };

  const onSwitched = (
    panel: Panel,
    previous: Panel,
    hadFocus: boolean,
  ): void => {
    if (panel === "days") parts.pages.refit();
    if (!hadFocus) return;
    if (panel !== "days") {
      focusTarget(parts.panels.entry());
    } else {
      focusTarget(previous === "input" ? null : triggerFor(previous));
    }
  };

  const start = (): void => {
    parts = buildViewParts({
      root: element,
      core,
      actions,
      rules,
      mode,
      layout,
      rtl: isRtl(),
      motion: () => motionMode(core.options.animation),
      onSwitched,
    });
    parts.pages.present(core.view, 0);
    parts.panels.mount(core.panel);
    syncChrome(core.panel);
    parts.header.modal?.setInputView(core.panel === "input");
    setConfirmEnabled(element, isCompleteSelection(core.draft));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      syncChrome(parts.panels.current());
      parts.pages.refit();
    });
  };

  const teardown = (): void => {
    parts.panels.destroy();
    parts.pages.destroy();
    parts.header.modal?.destroy();
  };

  const focusInitial = (): void => {
    if (controller.signal.aborted) return;
    syncChrome(parts.panels.current());
    parts.pages.refit();
    focusTarget(parts.panels.entry());
  };

  const onView = (
    view: YearMonth,
    delta: number,
    source: NavigateSource,
  ): void => {
    parts.header.docked?.setView(view);
    const animated =
      source !== "api" &&
      parts.panels.current() === "days" &&
      parts.panels.settled();
    parts.pages.present(view, animated ? delta : 0);
    parts.panels.rebuild();
    if (source !== "api") {
      announce(parts.liveRegion, visibleMonthsText(core, view));
    }
  };

  const onFocus = (): void => {
    const focused = parts.pages.cellHasFocus();
    parts.pages.refresh();
    if (focused) parts.pages.focusCell(false);
  };

  const onPanel = (panel: Panel): void => {
    parts.pages.finish();
    syncChrome(panel, false);
    parts.header.modal?.setInputView(panel === "input");
    parts.header.modal?.setText(headlineFor(core));
    parts.panels.switchTo(panel);
  };

  const onDraft = (): void => {
    parts.pages.refresh();
    parts.panels.rebuild();
    parts.header.modal?.setText(headlineFor(core));
    setConfirmEnabled(element, isCompleteSelection(core.draft));
    if (parts.panels.current() === home()) {
      announce(parts.liveRegion, headlineFor(core));
    }
  };

  const listen = (signal: AbortSignal): void => {
    const { events } = core;
    events.on(
      "change:view",
      (data) => {
        onView(data.view, data.delta, data.source);
      },
      signal,
    );
    events.on("change:draft", onDraft, signal);
    events.on("change:focus", onFocus, signal);
    events.on(
      "change:panel",
      (data) => {
        onPanel(data.panel);
      },
      signal,
    );
    bindClicks(element, signal, {
      actions,
      panel: () => core.panel,
      home: home(),
      cellAt,
    });
    bindKeyboard(element, signal, {
      core,
      actions,
      layout,
      home: home(),
      cellAt,
      isRtl,
    });
    attachRipple(element, RIPPLE_SELECTOR, signal);
  };

  start();
  listen(controller.signal);

  return {
    element,
    focusInitial,
    update: () => {
      if (controller.signal.aborted) return;
      const hadFocus = element.contains(element.ownerDocument.activeElement);
      teardown();
      start();
      if (hadFocus) focusInitial();
    },
    destroy: () => {
      if (controller.signal.aborted) return;
      controller.abort();
      cancelAnimationFrame(frame);
      teardown();
      const target = container();
      if (target !== null) {
        target.classList.remove(MENU_OPEN_CLASS, INPUT_CLASS);
        setVisibleMonths(target, 1);
      }
      element.remove();
    },
  };
};
