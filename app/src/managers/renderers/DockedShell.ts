import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import type { YearMonth } from "@/types/date";
import type { Panel } from "@/types/internal";
import { formatNumber, monthNames } from "@/utils/date/intl";
import { createElement } from "@/utils/dom";
import {
  createIconButton,
  createMenuButton,
  panelId,
  shortcuts,
} from "./shellButtons";

export interface DockedHeaderOptions {
  readonly instanceId: string;
  readonly locale: string;
  readonly labels: ResolvedOptions["labels"];
  readonly view: YearMonth;
  readonly groups: "both" | "year" | "none";
  readonly home: Panel;
}

export interface DockedHeader {
  readonly element: HTMLDivElement;
  setView(view: YearMonth): void;
  setPanel(panel: Panel): void;
}

const createGroup = (
  modifier: "month" | "year",
  children: readonly HTMLElement[],
): HTMLDivElement => {
  const group = createElement(
    "div",
    `dp-ui__navigation-group dp-ui__navigation-group--${modifier}`,
  );
  group.append(...children);
  return group;
};

export const createDockedHeader = (
  options: DockedHeaderOptions,
): DockedHeader => {
  const { labels } = options;
  const keys = shortcuts(labels);
  const shortMonths = monthNames(options.locale, "short");
  const longMonths = monthNames(options.locale, "long");
  const month = createMenuButton("month", "", {
    name: labels.chooseMonth,
    controls: panelId(options.instanceId, "month-menu"),
    shortcut: keys.chooseMonth,
  });
  const year = createMenuButton("year", "", {
    name: labels.chooseYear,
    controls: panelId(options.instanceId, "year-menu"),
    shortcut: keys.chooseYear,
  });
  const element = createElement("div", "dp-ui__header dp-ui__header--docked");
  const monthGroup = createGroup("month", [
    createIconButton(
      "prev-month",
      labels.previousMonth,
      ICONS.keyboardArrowLeft,
      keys.previousMonth,
    ),
    month.button,
    createIconButton(
      "next-month",
      labels.nextMonth,
      ICONS.keyboardArrowRight,
      keys.nextMonth,
    ),
  ]);
  monthGroup.hidden = options.groups !== "both";
  element.hidden = options.groups === "none";
  element.append(
    monthGroup,
    createGroup("year", [
      createIconButton(
        "prev-year",
        labels.previousYear,
        ICONS.keyboardArrowLeft,
        keys.previousYear,
      ),
      year.button,
      createIconButton(
        "next-year",
        labels.nextYear,
        ICONS.keyboardArrowRight,
        keys.nextYear,
      ),
    ]),
  );

  const setView = (view: YearMonth): void => {
    month.setText(
      shortMonths[view.month - 1] ?? "",
      longMonths[view.month - 1] ?? "",
    );
    year.setText(formatNumber(view.year, options.locale));
  };

  const setPanel = (panel: Panel): void => {
    month.button.setAttribute("aria-expanded", String(panel === "month-menu"));
    year.button.setAttribute("aria-expanded", String(panel === "year-menu"));
    month.button.disabled = panel === "year-menu";
    year.button.disabled = panel === "month-menu";
  };

  setView(options.view);
  setPanel(options.home);
  return { element, setView, setPanel };
};
