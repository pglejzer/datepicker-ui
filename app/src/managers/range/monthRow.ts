import { ICONS } from "@/constants/icons";
import type { CoreState } from "@/datepicker/CoreState";
import type { ResolvedOptions } from "@/datepicker/options/types";
import { createMonthPages } from "@/managers/calendar/view/monthPages";
import {
  createIconButton,
  shortcuts,
  type KeyLabels,
} from "@/managers/renderers/shellButtons";
import type { PlainDate } from "@/types/date";
import type { DateRules, PickerActions } from "@/types/internal";
import { toISO } from "@/utils/date/plainDate";
import { createElement } from "@/utils/dom";
import type { RangeDays } from "./rangeDays";
import { createRangeGridContext } from "./rangeGrid";

export interface MonthRowOptions {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly rtl: boolean;
}

type ArrowLabels = Pick<
  ResolvedOptions["labels"],
  "previousMonth" | "nextMonth"
> &
  KeyLabels;

const DATE_CELL_SELECTOR = "td.dp-ui__date[data-date]";

export const createMonthsNavigation = (labels: ArrowLabels): HTMLDivElement => {
  const row = createElement(
    "div",
    "dp-ui__navigation dp-ui__navigation--months",
  );
  const keys = shortcuts(labels);
  row.append(
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

export const createMonthRow = (options: MonthRowOptions): RangeDays => {
  const { core, actions, rules } = options;
  const pages = createMonthPages({
    core,
    layout: "docked",
    rtl: options.rtl,
    gridContext: () => createRangeGridContext(core, rules, true),
    onCommit: (direction, source) => {
      actions.page(direction, source);
    },
  });

  const focusCell = (date: PlainDate): void => {
    const cell = pages.find(
      `${DATE_CELL_SELECTOR}[data-date="${toISO(date)}"]`,
    );
    if (cell === null) {
      pages.focusCell(true);
      return;
    }
    cell.focus({ preventScroll: true });
  };

  return {
    element: pages.element,
    cellAt: (target) => pages.cellAt(target)?.element ?? null,
    focusCell,
    refresh: () => {
      pages.refresh();
    },
    reveal: () => {
      pages.refit();
    },
    present: (view, delta, source) => {
      pages.present(view, source === "api" ? 0 : delta);
    },
    destroy: () => {
      pages.destroy();
    },
  };
};
