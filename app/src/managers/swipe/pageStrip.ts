import type { YearMonth } from "@/types/date";

export const PREVIOUS = 0;
export const CENTER = 1;
export const NEXT = 2;

export type PageIndex = 0 | 1 | 2;
export type EdgeIndex = 0 | 2;

interface Page<K> {
  readonly key: K;
  readonly element: HTMLElement;
}

type Pages<K> = readonly [Page<K>, Page<K>, Page<K>];

export interface PageStrip<K> {
  show(key: K): void;
  centerKey(): K | null;
  reveal(index: EdgeIndex, key: K): void;
  recenter(index: EdgeIndex): void;
  clear(): void;
}

const PAGE_CLASS = "dp-ui__page";

export const isSameMonth = (a: YearMonth, b: YearMonth): boolean =>
  a.year === b.year && a.month === b.month;

export const createPageStrip = <K>(
  track: HTMLElement,
  renderPage: (key: K) => HTMLElement,
  step: (key: K, direction: -1 | 1) => K,
  isSame: (a: K, b: K) => boolean,
): PageStrip<K> => {
  let pages: Pages<K> | null = null;

  const createPage = (key: K): Page<K> => {
    const element = renderPage(key);
    element.classList.add(PAGE_CLASS);
    return { key, element };
  };

  const activate = (index: PageIndex): void => {
    pages?.forEach((page, position) => {
      page.element.toggleAttribute("inert", position !== index);
    });
  };

  const ensure = (current: Pages<K>, index: EdgeIndex, key: K): Pages<K> => {
    const existing = current[index];
    if (isSame(existing.key, key)) return current;
    const page = createPage(key);
    existing.element.replaceWith(page.element);
    return index === PREVIOUS
      ? [page, current[CENTER], current[NEXT]]
      : [current[PREVIOUS], current[CENTER], page];
  };

  return {
    show: (key) => {
      const created: Pages<K> = [
        createPage(step(key, -1)),
        createPage(key),
        createPage(step(key, 1)),
      ];
      track.replaceChildren(...created.map((page) => page.element));
      pages = created;
      activate(CENTER);
    },
    centerKey: () => pages?.[CENTER].key ?? null,
    reveal: (index, key) => {
      if (!pages) return;
      pages = ensure(pages, index, key);
      activate(index);
    },
    recenter: (index) => {
      if (!pages) return;
      const center = pages[index];
      const previous = createPage(step(center.key, -1));
      const next = createPage(step(center.key, 1));
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
