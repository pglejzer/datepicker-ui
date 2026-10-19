import type { Panel } from "@/types/internal";

export const MENU_OPEN_CLASS = "dp-ui__container--menu-open";
export const INPUT_CLASS = "dp-ui__container--input";

const CONTAINER_SELECTOR = ".dp-ui__container";
const MULTI_MONTH_CLASS = "dp-ui__container--multi-month";
const VISIBLE_MONTHS_PROPERTY = "--dp-ui-visible-months";

export const containerOf = (root: HTMLElement): HTMLElement | null =>
  root.closest<HTMLElement>(CONTAINER_SELECTOR);

export const isMenuPanel = (panel: Panel, home: Panel): boolean =>
  panel !== home && panel !== "days" && panel !== "input";

export const setVisibleMonths = (
  container: HTMLElement,
  months: number,
): void => {
  const multi = months > 1;
  container.classList.toggle(MULTI_MONTH_CLASS, multi);
  if (multi) {
    container.style.setProperty(VISIBLE_MONTHS_PROPERTY, String(months));
  } else {
    container.style.removeProperty(VISIBLE_MONTHS_PROPERTY);
  }
};

export const applyViewChrome = (
  container: HTMLElement,
  panel: Panel,
  months: number,
): void => {
  const input = panel === "input";
  container.classList.toggle(INPUT_CLASS, input);
  setVisibleMonths(container, input ? 1 : months);
};
