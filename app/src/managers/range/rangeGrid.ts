import type { CoreState } from "@/datepicker/CoreState";
import {
  renderMonthGrid,
  type GridContext,
} from "@/managers/calendar/GridRenderer";
import { buildMonth } from "@/managers/calendar/MonthModel";
import { createSelectionGridContext } from "@/managers/calendar/view/selectionContext";
import type { YearMonth } from "@/types/date";
import type { DateRules } from "@/types/internal";
import { rangeRole } from "@/utils/selection/model";

export const createRangeGridContext = (
  core: CoreState,
  rules: DateRules,
  row: boolean,
): GridContext => ({
  ...createSelectionGridContext(core, rules, false),
  outsideSelectable: false,
  weekNumbers: false,
  headingVisible: true,
  weekdaysVisible: row,
  rangeRole: (date) => rangeRole(core.draft, date),
});

export const renderRangeMonth = (
  core: CoreState,
  rules: DateRules,
  view: YearMonth,
): HTMLTableElement =>
  renderMonthGrid(
    buildMonth(view, core.options.weekStart, false),
    createRangeGridContext(core, rules, false),
  );
