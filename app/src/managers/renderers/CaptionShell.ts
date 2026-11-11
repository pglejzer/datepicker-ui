import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { YearMonth } from "@/types/date";
import { formatMonthYear } from "@/utils/date/intl";
import { createElement } from "@/utils/dom";
import { createIconButton, shortcuts } from "./shellButtons";

export interface CaptionHeaderOptions {
  readonly locale: string;
  readonly labels: ResolvedOptions["labels"];
  readonly view: YearMonth;
  readonly arrowsOnly: boolean;
}

export interface CaptionHeader {
  readonly element: HTMLDivElement;
  setView(view: YearMonth): void;
}

export const createCaptionHeader = (
  options: CaptionHeaderOptions,
): CaptionHeader => {
  const { locale, labels } = options;
  const keys = shortcuts(labels);
  const element = createElement(
    "div",
    "dp-ui__navigation dp-ui__navigation--caption",
  );
  const caption = createElement("span", "dp-ui__caption");
  caption.hidden = options.arrowsOnly;
  element.append(
    caption,
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

  const setView = (view: YearMonth): void => {
    caption.textContent = formatMonthYear(view, locale);
  };

  setView(options.view);
  return { element, setView };
};
