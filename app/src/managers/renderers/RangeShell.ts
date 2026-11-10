import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { Weekday } from "@/types/date";
import { weekdayNames } from "@/utils/date/intl";
import { createElement } from "@/utils/dom";
import { createHeadline, type Headline } from "./headline";
import {
  createIconButton,
  createSwitchViewButton,
  createTextButton,
  type SwitchViewButton,
} from "./shellButtons";

type Labels = ResolvedOptions["labels"];

export interface RangeHeaderOptions {
  readonly labels: Labels;
  readonly animate: boolean;
  readonly text: string;
  readonly fullscreen: boolean;
  readonly headline: boolean;
  readonly switchView: { readonly panelId: string } | null;
}

export interface RangeHeader {
  readonly element: HTMLDivElement | null;
  setText(text: string): void;
  setInputView(on: boolean): void;
  destroy(): void;
}

interface HeaderText {
  readonly nodes: readonly HTMLElement[];
  readonly headline: Headline;
  readonly switchButton: SwitchViewButton | null;
}

const DAYS_IN_WEEK = 7;

const createTopBar = (labels: Labels): HTMLDivElement => {
  const bar = createElement("div", "dp-ui__top-bar");
  bar.append(
    createIconButton("close", labels.close, ICONS.close),
    createTextButton("save", labels.save),
  );
  return bar;
};

const createHeaderText = (options: RangeHeaderOptions): HeaderText => {
  const { labels, switchView } = options;
  const text = createElement("div", "dp-ui__header-text");
  const supportingText = createElement("div", "dp-ui__supporting-text");
  supportingText.textContent = labels.rangeTitle;
  const headline = createHeadline(options.text, options.animate);
  text.append(supportingText, headline.element);
  const switchButton =
    switchView === null
      ? null
      : createSwitchViewButton(labels, switchView.panelId);
  return {
    nodes: switchButton === null ? [text] : [text, switchButton.button],
    headline,
    switchButton,
  };
};

const createHeaderElement = (
  children: readonly HTMLElement[],
): HTMLDivElement | null => {
  if (children.length === 0) return null;
  const element = createElement("div", "dp-ui__header dp-ui__header--range");
  element.append(...children);
  return element;
};

export const createRangeHeader = (options: RangeHeaderOptions): RangeHeader => {
  const topBar = options.fullscreen ? createTopBar(options.labels) : null;
  const text = options.headline ? createHeaderText(options) : null;
  const element = createHeaderElement([
    ...(topBar === null ? [] : [topBar]),
    ...(text === null ? [] : text.nodes),
  ]);
  return {
    element,
    setText: (value) => {
      text?.headline.setText(value);
    },
    setInputView: (on) => {
      if (topBar !== null) topBar.hidden = on;
      if (element !== null && text === null) element.hidden = on;
      text?.switchButton?.setInputView(on);
    },
    destroy: () => {
      text?.headline.destroy();
    },
  };
};

export const createWeekdaysBar = (
  locale: string,
  weekStart: Weekday,
): HTMLDivElement => {
  const bar = createElement("div", "dp-ui__weekdays-bar", {
    "aria-hidden": "true",
  });
  const names = weekdayNames(locale, "narrow");
  for (let offset = 0; offset < DAYS_IN_WEEK; offset++) {
    const day = createElement("span", "dp-ui__weekday");
    day.textContent = names.at((weekStart + offset) % DAYS_IN_WEEK) ?? "";
    bar.append(day);
  }
  return bar;
};
