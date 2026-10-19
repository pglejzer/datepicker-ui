import type { YearMonth } from "@/types/date";
import { addMonths } from "@/utils/date/plainDate";

export const PREVIOUS = 0;
export const CENTER = 1;
export const NEXT = 2;

export type PageIndex = 0 | 1 | 2;
export type EdgeIndex = 0 | 2;

interface Page {
  readonly view: YearMonth;
  readonly element: HTMLElement;
}

type Pages = readonly [Page, Page, Page];

export interface PageStrip {
  show(view: YearMonth): void;
  centerView(): YearMonth | null;
  reveal(index: EdgeIndex, view: YearMonth): void;
  recenter(index: EdgeIndex): void;
  clear(): void;
}

const PAGE_CLASS = "dp-ui__page";

export const isSameMonth = (a: YearMonth, b: YearMonth): boolean =>
  a.year === b.year && a.month === b.month;

export const createPageStrip = (
  track: HTMLElement,
  renderPage: (view: YearMonth) => HTMLElement,
  step: number,
): PageStrip => {
  let pages: Pages | null = null;

  const createPage = (view: YearMonth): Page => {
    const element = renderPage(view);
    element.classList.add(PAGE_CLASS);
    return { view, element };
  };

  const activate = (index: PageIndex): void => {
    pages?.forEach((page, position) => {
      page.element.toggleAttribute("inert", position !== index);
    });
  };

  const ensure = (current: Pages, index: EdgeIndex, view: YearMonth): Pages => {
    const existing = current[index];
    if (isSameMonth(existing.view, view)) return current;
    const page = createPage(view);
    existing.element.replaceWith(page.element);
    return index === PREVIOUS
      ? [page, current[CENTER], current[NEXT]]
      : [current[PREVIOUS], current[CENTER], page];
  };

  return {
    show: (view) => {
      const created: Pages = [
        createPage(addMonths(view, -step)),
        createPage(view),
        createPage(addMonths(view, step)),
      ];
      track.replaceChildren(...created.map((page) => page.element));
      pages = created;
      activate(CENTER);
    },
    centerView: () => pages?.[CENTER].view ?? null,
    reveal: (index, view) => {
      if (!pages) return;
      pages = ensure(pages, index, view);
      activate(index);
    },
    recenter: (index) => {
      if (!pages) return;
      const center = pages[index];
      const previous = createPage(addMonths(center.view, -step));
      const next = createPage(addMonths(center.view, step));
      pages.forEach((page, position) => {
        if (position !== index) page.element.remove();
      });
      center.element.before(previous.element);
      center.element.after(next.element);
      pages = [previous, center, next];
      activate(CENTER);
    },
    clear: () => {
      pages = null;
    },
  };
};
