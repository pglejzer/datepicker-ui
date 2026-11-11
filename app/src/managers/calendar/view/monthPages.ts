import type { CoreState } from "@/datepicker/CoreState";
import { createPageNavigation } from "@/managers/renderers/ModalShell";
import { Pager } from "@/managers/swipe/Pager";
import { isSameMonth } from "@/managers/swipe/pageStrip";
import type { YearMonth } from "@/types/date";
import type { SurfaceMode } from "@/types/internal";
import { addMonths, fromISO } from "@/utils/date/plainDate";
import { dayGridShape } from "@/utils/date/visibleRange";
import { createElement } from "@/utils/dom";
import {
  renderMonthGrid,
  updateMonthGrid,
  type GridContext,
} from "../GridRenderer";
import { OUTSIDE_CLASS } from "../gridCell";
import { buildMonth, type MonthModel } from "../MonthModel";
import { commandClassOf } from "./commands";
import { usesCaption } from "./header";
import type { DateCell, Layout } from "./types";

export interface MonthPagesOptions {
  readonly core: CoreState;
  readonly layout: Layout;
  readonly surface?: SurfaceMode;
  readonly rtl: boolean;
  readonly gridContext: () => GridContext;
  readonly onCommit: (direction: -1 | 1, source: "drag" | "wheel") => void;
}

export interface MonthPages {
  readonly element: HTMLDivElement;
  present(view: YearMonth, delta: number): void;
  finish(): void;
  refresh(): void;
  refit(): void;
  cellAt(target: EventTarget | null): DateCell | null;
  focusCell(fallback: boolean): void;
  cellHasFocus(): boolean;
  find(selector: string): HTMLElement | null;
  destroy(): void;
}

interface FocusSnapshot {
  readonly buttonClass: string | null;
}

const PAGER_HEIGHT_PROPERTY = "--dp-ui-pager-height";
const MONTHS_CLASS = "dp-ui__months";
const ACTIVE_PAGE_SELECTOR = ".dp-ui__page:not([inert])";
const GRID_SELECTOR = "table.dp-ui__month-grid";
const NAVIGATION_SELECTOR = ".dp-ui__navigation";
const DATE_CELL_SELECTOR = "td.dp-ui__date[data-date]";
const ROVING_CELL_SELECTOR = 'td.dp-ui__date[tabindex="0"]';
const IN_MONTH_CELL_SELECTOR =
  "td.dp-ui__date[data-date]:not(.dp-ui__date--outside-month)";
const FALLBACK_ROW_HEIGHT = 48;

const withoutTransition = (target: HTMLElement, apply: () => void): void => {
  target.style.setProperty("transition", "none");
  apply();
  target.getBoundingClientRect();
  target.style.removeProperty("transition");
};

export const createMonthPages = (options: MonthPagesOptions): MonthPages => {
  const { core, layout, surface, gridContext } = options;
  const { months } = core.layout;
  const { outsideSelectable, headingVisible } = gridContext();
  const inline = surface === "inline";
  const { fixedWeeks } = dayGridShape({
    layout: layout === "modal" ? "modal" : "docked",
    inline,
    months,
    outsideDays: core.options.outsideDays !== false,
    fixedWeeks: core.options.fixedWeeks,
  });
  const fitHeight = layout === "docked" || inline;
  const caption = surface !== undefined && usesCaption(core, surface);
  const element = createElement("div", undefined, { "data-panel": "days" });

  const find = (selector: string): HTMLElement | null =>
    element
      .querySelector<HTMLElement>(ACTIVE_PAGE_SELECTOR)
      ?.querySelector<HTMLElement>(selector) ?? null;

  const modelOf = (view: YearMonth): MonthModel =>
    buildMonth(view, core.options.weekStart, fixedWeeks);

  const monthsFrom = (view: YearMonth): YearMonth[] =>
    Array.from({ length: months }, (_, index) => addMonths(view, index));

  const renderGrids = (view: YearMonth): HTMLElement => {
    const context = gridContext();
    if (months === 1) return renderMonthGrid(modelOf(view), context);
    const row = createElement("div", MONTHS_CLASS);
    row.append(
      ...monthsFrom(view).map((month) =>
        renderMonthGrid(modelOf(month), context),
      ),
    );
    return row;
  };

  const renderPage = (view: YearMonth): HTMLElement => {
    const page = createElement("div");
    if (layout === "modal") {
      const { locale, labels } = core.options;
      page.append(
        createPageNavigation(view, locale, labels, core.instanceId, caption),
      );
    }
    page.append(renderGrids(view));
    return page;
  };

  const pageWeeks = (view: YearMonth): number =>
    Math.max(...monthsFrom(view).map((month) => modelOf(month).weeks.length));

  const pageHeight = (view: YearMonth): number => {
    const weeks = pageWeeks(view);
    const navigation =
      find(NAVIGATION_SELECTOR)?.getBoundingClientRect().height ?? 0;
    const table = element.querySelector<HTMLTableElement>(GRID_SELECTOR);
    const head = table?.tHead?.getBoundingClientRect().height ?? 0;
    const firstRow = table?.tBodies.item(0)?.rows.item(0);
    const row = firstRow?.getBoundingClientRect().height ?? 0;
    const heading = headingVisible
      ? (table?.caption?.getBoundingClientRect().height ?? 0)
      : 0;
    if (head > 0 && row > 0) return navigation + heading + head + row * weeks;
    const headRows = headingVisible ? 2 : 1;
    return navigation + (weeks + headRows) * FALLBACK_ROW_HEIGHT;
  };

  const pageStep = core.options.pageBy === "view" ? months : 1;

  const pager = new Pager<YearMonth>(element, {
    rtl: options.rtl,
    swipe: core.options.swipe,
    animate: core.options.animation,
    fitHeight,
    step: (view, direction) => addMonths(view, direction * pageStep),
    isSame: isSameMonth,
    renderPage,
    pageHeight,
    onCommit: (direction, source) => {
      options.onCommit(direction, source);
    },
  });

  const activeElement = (): Element | null =>
    element.ownerDocument.activeElement;

  const cellAt = (target: EventTarget | null): DateCell | null => {
    if (!(target instanceof Element)) return null;
    const cell = target.closest<HTMLElement>(DATE_CELL_SELECTOR);
    if (cell === null || !element.contains(cell)) return null;
    if (cell.classList.contains(OUTSIDE_CLASS) && !outsideSelectable) {
      return null;
    }
    const date = fromISO(cell.getAttribute("data-date") ?? "");
    return date === null ? null : { element: cell, date };
  };

  const cellHasFocus = (): boolean => cellAt(activeElement()) !== null;

  const rovingCell = (fallback: boolean): HTMLElement | null => {
    const roving = find(ROVING_CELL_SELECTOR);
    if (roving !== null || !fallback) return roving;
    return find(IN_MONTH_CELL_SELECTOR);
  };

  const focusCell = (fallback: boolean): void => {
    rovingCell(fallback)?.focus({ preventScroll: true });
  };

  const focusSnapshot = (): FocusSnapshot | null => {
    const active = activeElement();
    if (active === null || !element.contains(active)) return null;
    return { buttonClass: commandClassOf(active) };
  };

  const restoreFocus = (snapshot: FocusSnapshot): void => {
    const { buttonClass } = snapshot;
    const button = buttonClass === null ? null : find(`.${buttonClass}`);
    (button ?? rovingCell(true))?.focus({ preventScroll: true });
  };

  const keepingFocus = (render: () => void): void => {
    const snapshot = focusSnapshot();
    render();
    if (snapshot !== null) restoreFocus(snapshot);
  };

  const present = (view: YearMonth, delta: number): void => {
    keepingFocus(() => {
      if (delta === 0) {
        pager.show(view);
      } else {
        pager.slide(view, delta > 0 ? 1 : -1);
      }
    });
  };

  const refit = (): void => {
    if (!fitHeight || element.hidden) return;
    const height = `${String(pageHeight(core.view))}px`;
    if (element.style.getPropertyValue(PAGER_HEIGHT_PROPERTY) === height) {
      return;
    }
    keepingFocus(() => {
      withoutTransition(element, () => {
        pager.show(core.view);
      });
    });
  };

  const refresh = (): void => {
    const context = gridContext();
    element
      .querySelectorAll<HTMLTableElement>(GRID_SELECTOR)
      .forEach((table) => {
        updateMonthGrid(table, context);
      });
  };

  return {
    element,
    present,
    finish: () => {
      pager.finish();
    },
    refresh,
    refit,
    cellAt,
    focusCell,
    cellHasFocus,
    find,
    destroy: () => {
      pager.destroy();
    },
  };
};
