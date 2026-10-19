import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { YearMonth } from "@/types/date";
import { formatMonthYear, formatNumber } from "@/utils/date/intl";
import { createElement } from "@/utils/dom";
import { createHeadline } from "./headline";
import {
  createIconButton,
  createMenuButton,
  createSwitchViewButton,
  panelId,
  shortcuts,
} from "./shellButtons";

type Labels = ResolvedOptions["labels"];

export interface ModalHeaderOptions {
  readonly labels: Labels;
  readonly title: string;
  readonly animate: boolean;
  readonly text: string;
  readonly switchView: { readonly panelId: string } | null;
}

export interface ModalHeader {
  readonly element: HTMLDivElement;
  setText(text: string): void;
  setInputView(on: boolean): void;
  destroy(): void;
}

export const createModalHeader = (options: ModalHeaderOptions): ModalHeader => {
  const { labels, switchView } = options;
  const element = createElement("div", "dp-ui__header dp-ui__header--modal");
  const supportingText = createElement("div", "dp-ui__supporting-text");
  supportingText.textContent = options.title;
  const headline = createHeadline(options.text, options.animate);
  element.append(supportingText, headline.element);
  const switchButton =
    switchView === null
      ? null
      : createSwitchViewButton(labels, switchView.panelId);
  if (switchButton !== null) element.append(switchButton.button);
  return {
    element,
    setText: (text) => {
      headline.setText(text);
    },
    setInputView: (on) => {
      switchButton?.setInputView(on);
    },
    destroy: () => {
      headline.destroy();
    },
  };
};

export const createPageNavigation = (
  view: YearMonth,
  locale: string,
  labels: Labels,
  instanceId: string,
): HTMLDivElement => {
  const keys = shortcuts(labels);
  const row = createElement("div", "dp-ui__navigation");
  row.append(
    createMenuButton("year-grid", formatMonthYear(view, locale), {
      name: labels.chooseYear,
      controls: panelId(instanceId, "year-grid"),
      shortcut: keys.chooseYear,
    }).button,
    createIconButton(
      "prev-month",
      labels.previousMonth,
      ICONS.keyboardArrowLeft,
      keys.previousMonth,
    ),
    createIconButton(
      "next-month",
      labels.nextMonth,
      ICONS.keyboardArrowRight,
      keys.nextMonth,
    ),
  );
  return row;
};

export const createYearNavigation = (
  view: YearMonth,
  locale: string,
  labels: Labels,
  instanceId: string,
): HTMLDivElement => {
  const row = createElement(
    "div",
    "dp-ui__navigation dp-ui__navigation--month-grid",
  );
  const keys = shortcuts(labels);
  row.append(
    createMenuButton("year-grid", formatNumber(view.year, locale), {
      name: labels.chooseYear,
      controls: panelId(instanceId, "year-grid"),
      shortcut: keys.chooseYear,
    }).button,
    createIconButton(
      "prev-year",
      labels.previousYear,
      ICONS.keyboardArrowLeft,
      keys.previousYear,
    ),
    createIconButton(
      "next-year",
      labels.nextYear,
      ICONS.keyboardArrowRight,
      keys.nextYear,
    ),
  );
  return row;
};

export const createYearGridNavigation = (
  view: YearMonth,
  locale: string,
  labels: Labels,
  instanceId: string,
): HTMLDivElement => {
  const row = createElement(
    "div",
    "dp-ui__navigation dp-ui__navigation--year-grid",
  );
  const { button } = createMenuButton(
    "year-grid",
    formatMonthYear(view, locale),
    {
      name: labels.chooseYear,
      controls: panelId(instanceId, "year-grid"),
    },
  );
  button.setAttribute("aria-expanded", "true");
  row.append(button);
  return row;
};
