import type { CoreState } from "@/datepicker/CoreState";
import { createMonthGrid } from "@/managers/pickers/MonthGrid";
import { createMonthMenu } from "@/managers/pickers/MonthMenu";
import { createYearGrid } from "@/managers/pickers/YearGrid";
import { createYearMenu } from "@/managers/pickers/YearMenu";
import {
  createYearGridNavigation,
  createYearNavigation,
} from "@/managers/renderers/ModalShell";
import { panelId } from "@/managers/renderers/shellButtons";
import type { YearMonth } from "@/types/date";
import type { DateRules, PickerActions } from "@/types/internal";
import { todayDate } from "@/utils/date/plainDate";
import { anchorDate } from "@/utils/selection/model";
import type { Layout, PickerPanel } from "./types";

export interface PanelContext {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly layout: Layout;
}

const yearsOf = (rules: DateRules): number[] => {
  const { min, max } = rules.yearBounds();
  const years: number[] = [];
  for (let year = min; year <= max; year++) years.push(year);
  return years;
};

const selectedMonth = (core: CoreState, year: number): number | null => {
  const date = anchorDate(core.draft);
  return date?.year === year ? date.month : null;
};

const tagged = <T extends HTMLElement>(
  element: T,
  panel: PickerPanel,
  instanceId: string,
): T => {
  element.setAttribute("data-panel", panel);
  element.id = panelId(instanceId, panel);
  return element;
};

export const createPanelParts = (
  panel: PickerPanel,
  context: PanelContext,
): HTMLElement[] => {
  const { core, rules } = context;
  const { labels, locale } = core.options;
  const view = core.view;
  const { precision } = core.options;
  const pick = (target: YearMonth): void => {
    context.actions.jumpTo(target, "menu");
  };
  const pickYear = (year: number): void => {
    pick({ year, month: core.view.month });
  };

  switch (panel) {
    case "month-menu":
      return [
        tagged(
          createMonthMenu({
            locale,
            view,
            label: labels.chooseMonth,
            isMonthDisabled: (candidate) => rules.isMonthDisabled(candidate),
            onPick: (month) => {
              pick({ year: core.view.year, month });
            },
          }),
          panel,
          core.instanceId,
        ),
      ];
    case "year-menu":
      return [
        tagged(
          createYearMenu({
            view,
            years: yearsOf(rules),
            label: labels.chooseYear,
            locale,
            onPick: pickYear,
          }),
          panel,
          core.instanceId,
        ),
      ];
    case "month-grid": {
      const monthPrecision = precision === "month";
      const selected = monthPrecision
        ? selectedMonth(core, view.year)
        : view.month;
      const grid = tagged(
        createMonthGrid({
          year: view.year,
          selected,
          focused: selected ?? view.month,
          current: todayDate(),
          locale,
          label: labels.chooseMonth,
          isDisabled: (month) =>
            rules.isMonthDisabled({ year: core.view.year, month }),
          onPick: (month) => {
            if (monthPrecision) {
              context.actions.select({ year: core.view.year, month, day: 1 });
            } else {
              pick({ year: core.view.year, month });
            }
          },
        }),
        panel,
        core.instanceId,
      );
      if (context.layout === "docked") return [grid];
      return [
        createYearNavigation(view, locale, labels, core.instanceId),
        grid,
      ];
    }
    case "year-grid": {
      const yearPrecision = precision === "year";
      const selected = yearPrecision
        ? (anchorDate(core.draft)?.year ?? null)
        : view.year;
      const grid = tagged(
        createYearGrid({
          selected,
          focused: selected ?? view.year,
          years: yearsOf(rules),
          currentYear: todayDate().year,
          label: labels.chooseYear,
          locale,
          onPick: yearPrecision
            ? (year) => {
                context.actions.select({ year, month: 1, day: 1 });
              }
            : pickYear,
        }),
        panel,
        core.instanceId,
      );
      if (context.layout === "docked" || yearPrecision) return [grid];
      return [
        createYearGridNavigation(view, locale, labels, core.instanceId),
        grid,
      ];
    }
  }
};
