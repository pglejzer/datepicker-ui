import { GESTURE, TIMINGS } from "@/constants/timings";
import type { CoreState } from "@/datepicker/CoreState";
import { updateMonthGrid } from "@/managers/calendar/GridRenderer";
import type { PlainDate, YearMonth } from "@/types/date";
import type { DateRules, NavigateSource } from "@/types/internal";
import { motionMode } from "@/utils/accessibility";
import { addMonths, monthsBetween, toISO } from "@/utils/date/plainDate";
import { createElement, scrollWithin } from "@/utils/dom";
import {
  anchorMonth,
  clampMonth,
  monthOf,
  type MonthBounds,
} from "./monthBounds";
import { bindDragScroll } from "./dragScroll";
import { createRangeGridContext } from "./rangeGrid";

export interface MonthListOptions {
  readonly core: CoreState;
  readonly rules: DateRules;
  readonly render: (view: YearMonth) => HTMLTableElement;
  readonly bounds: () => MonthBounds;
}

export interface MonthList {
  readonly element: HTMLDivElement;
  scrollToMonth(view: YearMonth): void;
  refresh(): void;
  cellAt(target: EventTarget | null): HTMLElement | null;
  focusCell(date: PlainDate): void;
  ensureMonth(view: YearMonth): void;
  reveal(view: YearMonth): void;
  present(view: YearMonth, delta: number, source: NavigateSource): void;
  destroy(): void;
}

const LIST_CLASS = "dp-ui__month-list";
const DATE_CELL_SELECTOR = "td.dp-ui__date[data-date]";
const MONTHS_BEFORE = 2;
const MONTHS_AFTER = 9;
const EXTEND_STEP = 6;

export const createMonthList = (options: MonthListOptions): MonthList => {
  const { core, rules } = options;
  const controller = new AbortController();
  const element = createElement("div", LIST_CLASS);
  const tables: HTMLTableElement[] = [];
  let first: YearMonth | null = null;
  let frame = 0;
  let snapping = false;
  let snapTimer = 0;

  const renderMonths = (from: YearMonth, count: number): HTMLTableElement[] =>
    Array.from({ length: count }, (_, index) =>
      options.render(addMonths(from, index)),
    );

  const append = (count: number): void => {
    if (first === null) return;
    const next = addMonths(first, tables.length);
    const room = monthsBetween(next, options.bounds().last) + 1;
    const size = Math.min(count, room);
    if (size <= 0) return;
    const added = renderMonths(next, size);
    tables.push(...added);
    element.append(...added);
  };

  const prepend = (count: number): void => {
    if (first === null) return;
    const room = monthsBetween(options.bounds().first, first);
    const size = Math.min(count, room);
    if (size <= 0) return;
    const start = addMonths(first, -size);
    const added = renderMonths(start, size);
    const top = element.scrollTop;
    const height = element.scrollHeight;
    first = start;
    tables.unshift(...added);
    element.prepend(...added);
    element.scrollTop = top + element.scrollHeight - height;
  };

  const ensureMonth = (view: YearMonth): void => {
    if (first === null) return;
    const target = clampMonth(view, options.bounds());
    prepend(monthsBetween(target, first));
    append(monthsBetween(addMonths(first, tables.length - 1), target));
  };

  const tableFor = (view: YearMonth): HTMLTableElement | null => {
    if (first === null) return null;
    const index = monthsBetween(first, view);
    return index < 0 ? null : (tables.at(index) ?? null);
  };

  const scrollToMonth = (view: YearMonth): void => {
    const target = clampMonth(view, options.bounds());
    ensureMonth(target);
    const table = tableFor(target);
    if (table === null) return;
    const offset =
      table.getBoundingClientRect().top - element.getBoundingClientRect().top;
    element.scrollTop += offset;
  };

  const extendNearEdges = (): void => {
    if (element.scrollTop < element.clientHeight) prepend(EXTEND_STEP);
    const remaining =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining < element.clientHeight) append(EXTEND_STEP);
  };

  const snapTarget = (direction: 1 | -1): HTMLTableElement | null => {
    const listTop = element.getBoundingClientRect().top;
    const offsets = tables.map((table) => ({
      table,
      top: table.getBoundingClientRect().top - listTop,
      height: table.getBoundingClientRect().height,
    }));
    const index = Math.max(
      offsets.reduce((found, item, at) => (item.top <= 1 ? at : found), 0),
      0,
    );
    const current = offsets.at(index);
    if (current === undefined) return null;
    const passed =
      current.height > 0 ? Math.max(-current.top, 0) / current.height : 0;
    const next = offsets.at(index + 1)?.table ?? current.table;
    if (direction === 1) {
      return passed > GESTURE.COMMIT_FRACTION ? next : current.table;
    }
    return passed < 1 - GESTURE.COMMIT_FRACTION ? current.table : next;
  };

  const finishSnap = (): void => {
    if (!snapping) return;
    window.clearTimeout(snapTimer);
    snapping = false;
    extendNearEdges();
  };

  const snapToMonth = (direction: 1 | -1): void => {
    finishSnap();
    extendNearEdges();
    const table = snapTarget(direction);
    if (table === null) return;
    const delta =
      table.getBoundingClientRect().top - element.getBoundingClientRect().top;
    const animated = motionMode(core.options.animation) === "full";
    if (animated) {
      snapping = true;
      snapTimer = window.setTimeout(finishSnap, TIMINGS.SNAP_SCROLL_FALLBACK);
      element.scrollTo({ top: element.scrollTop + delta, behavior: "smooth" });
    } else {
      element.scrollTop += delta;
    }
  };

  const cellAt = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const cell = target.closest<HTMLElement>(DATE_CELL_SELECTOR);
    return cell !== null && element.contains(cell) ? cell : null;
  };

  const focusCell = (date: PlainDate): void => {
    ensureMonth(monthOf(date));
    const cell = element.querySelector<HTMLElement>(
      `${DATE_CELL_SELECTOR}[data-date="${toISO(date)}"]`,
    );
    if (cell === null) return;
    cell.focus({ preventScroll: true });
    scrollWithin(element, cell, "nearest");
  };

  const refresh = (): void => {
    const context = createRangeGridContext(core, rules, false);
    tables.forEach((table) => {
      updateMonthGrid(table, context);
    });
  };

  const initialBounds = options.bounds();
  const anchor = clampMonth(anchorMonth(core), initialBounds);
  const start = clampMonth(addMonths(anchor, -MONTHS_BEFORE), initialBounds);
  const end = clampMonth(addMonths(anchor, MONTHS_AFTER), initialBounds);
  const count = monthsBetween(start, end) + 1;
  if (count > 0) {
    first = start;
    tables.push(...renderMonths(start, count));
    element.append(...tables);
  }

  element.addEventListener(
    "scroll",
    () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!snapping) extendNearEdges();
      });
    },
    { passive: true, signal: controller.signal },
  );
  element.addEventListener("scrollend", finishSnap, {
    signal: controller.signal,
  });
  bindDragScroll(element, controller.signal, "y", { onDragEnd: snapToMonth });

  return {
    element,
    scrollToMonth,
    refresh,
    cellAt,
    focusCell,
    ensureMonth,
    reveal: scrollToMonth,
    present: (view, _delta, source) => {
      if (source === "api") {
        scrollToMonth(view);
      } else {
        ensureMonth(view);
      }
    },
    destroy: () => {
      controller.abort();
      cancelAnimationFrame(frame);
      frame = 0;
      window.clearTimeout(snapTimer);
      snapping = false;
    },
  };
};
