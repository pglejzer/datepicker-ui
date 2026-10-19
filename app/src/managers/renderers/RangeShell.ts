import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { Weekday } from "@/types/date";
import { weekdayNames } from "@/utils/date/intl";
import { createElement } from "@/utils/dom";
import { createHeadline } from "./headline";
import {
  createIconButton,
  createSwitchViewButton,
  createTextButton,
} from "./shellButtons";

type Labels = ResolvedOptions["labels"];

export interface RangeHeaderOptions {
  readonly labels: Labels;
  readonly animate: boolean;
  readonly text: string;
  readonly fullscreen: boolean;
  readonly switchView: { readonly panelId: string } | null;
}

export interface RangeHeader {
  readonly element: HTMLDivElement;
  setText(text: string): void;
  setInputView(on: boolean): void;
  destroy(): void;
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

export const createRangeHeader = (options: RangeHeaderOptions): RangeHeader => {
  const { labels, switchView } = options;
  const element = createElement("div", "dp-ui__header dp-ui__header--range");
  const topBar = options.fullscreen ? createTopBar(labels) : null;
  if (topBar !== null) element.append(topBar);
  const text = createElement("div", "dp-ui__header-text");
  const supportingText = createElement("div", "dp-ui__supporting-text");
  supportingText.textContent = labels.rangeTitle;
  const headline = createHeadline(options.text, options.animate);
  text.append(supportingText, headline.element);
  element.append(text);
  const switchButton =
    switchView === null
      ? null
      : createSwitchViewButton(labels, switchView.panelId);
  if (switchButton !== null) element.append(switchButton.button);
  return {
    element,
    setText: (value) => {
      headline.setText(value);
    },
    setInputView: (on) => {
      if (topBar !== null) topBar.hidden = on;
      switchButton?.setInputView(on);
    },
    destroy: () => {
      headline.destroy();
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
