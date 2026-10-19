import type {
  CalendarShell,
  CalendarViewDeps,
} from "@/managers/calendar/CalendarView";
import { bindClicks } from "@/managers/calendar/view/commands";
import {
  containerOf,
  setVisibleMonths,
} from "@/managers/calendar/view/containerChrome";
import { bindKeyboard } from "@/managers/calendar/view/keyboard";
import {
  headlineFor,
  visibleMonthsText,
} from "@/managers/calendar/view/selectionContext";
import type { DateCell } from "@/managers/calendar/view/types";
import { morphContainer } from "@/managers/renderers/containerTransform";
import { setConfirmEnabled } from "@/managers/renderers/shellActions";
import type { YearMonth } from "@/types/date";
import type { NavigateSource, Panel } from "@/types/internal";
import { announce, motionMode, type MotionMode } from "@/utils/accessibility";
import { fromISO } from "@/utils/date/plainDate";
import { createElement } from "@/utils/dom";
import { attachRipple } from "@/utils/ripple";
import { isCompleteSelection, isEmptySelection } from "@/utils/selection/model";
import { anchorMonth } from "./monthBounds";
import {
  buildRangeParts,
  RANGE_CONTAINER_CLASSES,
  type RangeParts,
} from "./rangeParts";

const VIEW_CLASS = "dp-ui__calendar";
const RTL_SELECTOR = ".dp-ui__container--rtl";
const RIPPLE_SELECTOR = [
  ".dp-ui__icon-button",
  ".dp-ui__text-button",
  ".dp-ui__preset",
  ".dp-ui__date:not(.dp-ui__date--disabled) .dp-ui__date-indicator",
].join(", ");

const viewPanel = (panel: Panel): Panel =>
  panel === "input" ? "input" : "days";

export const createRangeView = (deps: CalendarViewDeps): CalendarShell => {
  const { core, actions, rules, mode, fullscreen } = deps;
  const controller = new AbortController();
  const element = createElement("div", VIEW_CLASS);
  let parts: RangeParts;
  let frame = 0;
  let morph: Animation | null = null;

  const motion = (): MotionMode => motionMode(core.options.animation);

  const isRtl = (): boolean =>
    element.closest(RTL_SELECTOR) !== null ||
    getComputedStyle(core.input).direction === "rtl";

  const cellAt = (target: EventTarget | null): DateCell | null => {
    const cell = parts.days.cellAt(target);
    const date = fromISO(cell?.dataset.date ?? "");
    return cell === null || date === null ? null : { element: cell, date };
  };

  const syncConfirm = (): void => {
    const { draft, value } = core;
    const nothingToCommit = isEmptySelection(draft) && isEmptySelection(value);
    setConfirmEnabled(element, isCompleteSelection(draft) && !nothingToCommit);
  };

  const reveal = (): void => {
    parts.days.reveal(anchorMonth(core));
  };

  const onSwitched = (
    panel: Panel,
    _previous: Panel,
    hadFocus: boolean,
  ): void => {
    if (panel === "days") reveal();
    if (!hadFocus) return;
    if (panel === "input") {
      parts.panels.entry()?.focus({ preventScroll: true });
    } else {
      parts.days.focusCell(core.focus);
    }
  };

  const swap = (apply: () => void, panel: Panel): void => {
    const change = (): void => {
      parts.applyChrome(panel);
      apply();
    };
    morph?.cancel();
    morph = null;
    const container = containerOf(element);
    if (container === null) {
      change();
      return;
    }
    morph = morphContainer(container, change, motion());
  };

  const start = (): void => {
    parts = buildRangeParts({
      root: element,
      core,
      actions,
      rules,
      mode,
      fullscreen,
      rtl: isRtl(),
      signal: controller.signal,
      motion,
      swap,
      onSwitched,
    });
    parts.days.present(core.view, 0, "api");
    parts.panels.mount(viewPanel(core.panel));
    parts.applyChrome(parts.panels.current());
    syncConfirm();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      parts.applyChrome(parts.panels.current());
      if (parts.panels.current() === "days") reveal();
    });
  };

  const teardown = (): void => {
    morph?.cancel();
    morph = null;
    parts.panels.destroy();
    parts.days.destroy();
    parts.header.destroy();
  };

  const focusInitial = (): void => {
    if (controller.signal.aborted) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const panel = parts.panels.current();
    parts.applyChrome(panel);
    if (panel === "input") {
      parts.panels.entry()?.focus({ preventScroll: true });
      return;
    }
    reveal();
    parts.days.focusCell(core.focus);
  };

  const onDraft = (): void => {
    parts.days.refresh();
    parts.refreshPresets();
    parts.header.setText(headlineFor(core));
    syncConfirm();
    if (parts.panels.current() === "days") {
      announce(parts.liveRegion, headlineFor(core));
    }
  };

  const onFocus = (): void => {
    const hadFocus = cellAt(element.ownerDocument.activeElement) !== null;
    parts.days.refresh();
    if (hadFocus) parts.days.focusCell(core.focus);
  };

  const onView = (
    view: YearMonth,
    delta: number,
    source: NavigateSource,
  ): void => {
    const animated =
      parts.panels.current() === "days" && parts.panels.settled();
    parts.days.present(view, animated ? delta : 0, source);
    if (source !== "api" && core.layout.months > 1) {
      announce(parts.liveRegion, visibleMonthsText(core, view));
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
    events.on(
      "change:active-end",
      () => {
        parts.days.refresh();
      },
      signal,
    );
    events.on("change:value", syncConfirm, signal);
    events.on("change:focus", onFocus, signal);
    events.on(
      "change:panel",
      (data) => {
        parts.panels.switchTo(viewPanel(data.panel));
      },
      signal,
    );
    bindClicks(element, signal, {
      actions,
      panel: () => core.panel,
      home: "days",
      cellAt,
    });
    bindKeyboard(element, signal, {
      core,
      actions,
      layout: "range",
      home: "days",
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
      const container = containerOf(element);
      if (container !== null) {
        container.classList.remove(...RANGE_CONTAINER_CLASSES);
        setVisibleMonths(container, 1);
      }
      element.remove();
    },
  };
};
