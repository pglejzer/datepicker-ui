import type { CoreState } from "@/datepicker/CoreState";
import type { PlainDate, YearMonth } from "@/types/date";
import type { DateRules } from "@/types/internal";
import type { DateDecoration } from "@/types/options";
import { formatMonthRange } from "@/utils/date/intl";
import { addMonths, toDate, todayDate } from "@/utils/date/plainDate";
import { rethrowLater } from "@/utils/rethrow";
import { headlineText } from "@/utils/selection/headline";
import { isDateSelected } from "@/utils/selection/model";
import { draftForEnd } from "@/utils/selection/pick";
import type { GridContext } from "../GridRenderer";
import type { Layout } from "./types";

const decoratorOf = (
  core: CoreState,
): ((date: PlainDate) => DateDecoration | null) => {
  const { decorateDate } = core.options;
  if (decorateDate === null) return () => null;
  return (date) => {
    try {
      return decorateDate(toDate(date)) ?? null;
    } catch (error) {
      rethrowLater(error);
      return null;
    }
  };
};

const contentOf = (
  core: CoreState,
): ((date: PlainDate) => string | Node | null) => {
  const { renderDate } = core.options;
  if (renderDate === null) return () => null;
  return (date) => renderDate(toDate(date));
};

export const createSelectionGridContext = (
  core: CoreState,
  rules: DateRules,
  showOutside: boolean,
): GridContext => {
  const { options } = core;
  return {
    locale: options.locale,
    weekStart: options.weekStart,
    weekNumbers: options.weekNumbers,
    showOutside,
    outsideSelectable:
      options.outsideDays !== false && options.outsideDays.selectable,
    labels: { weekNumber: options.labels.weekNumber },
    rangeLabels: {
      start: options.labels.rangeStart,
      end: options.labels.rangeEnd,
    },
    headingVisible: false,
    weekdaysVisible: true,
    multiselectable: core.draft.mode !== "single",
    rangeRole: () => null,
    decorate: decoratorOf(core),
    content: contentOf(core),
    isSelected: (date) => isDateSelected(core.draft, date),
    isDisabled: (date) =>
      !rules.isSelectable(
        date,
        core.followsActiveEnd
          ? draftForEnd(core.draft, core.activeEnd)
          : core.draft,
      ),
    today: todayDate(),
    focus: core.focus,
  };
};

export const createDaysGridContext = (
  core: CoreState,
  rules: DateRules,
  layout: Layout,
): GridContext => {
  const several = core.layout.months > 1;
  const showOutside =
    layout === "docked" && !several && core.options.outsideDays !== false;
  const context = createSelectionGridContext(core, rules, showOutside);
  return several ? { ...context, headingVisible: true } : context;
};

export const visibleMonthsText = (core: CoreState, view: YearMonth): string =>
  formatMonthRange(
    view,
    addMonths(view, core.layout.months - 1),
    core.options.locale,
  );

export const headlineFor = (core: CoreState): string =>
  headlineText(
    core.draft,
    core.panel === "input" ? "input" : "calendar",
    core.options.locale,
    core.options.labels,
    core.options.precision,
  );
