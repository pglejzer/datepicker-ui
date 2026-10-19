import type { PlainDate, Weekday } from "@/types/date";
import type { DateDecoration } from "@/types/options";
import type { RangeRole } from "@/types/selection";
import { formatMonthYear, formatNumber, weekdayNames } from "@/utils/date/intl";
import { fromISO } from "@/utils/date/plainDate";
import { createElement } from "@/utils/dom";
import { OUTSIDE_CLASS, applyState, renderCell } from "./gridCell";
import type { MonthModel } from "./MonthModel";

export interface GridContext {
  readonly locale: string;
  readonly weekStart: Weekday;
  readonly weekNumbers: boolean;
  readonly showOutside: boolean;
  readonly outsideSelectable: boolean;
  readonly labels: { readonly weekNumber: string };
  readonly rangeLabels: { readonly start: string; readonly end: string };
  readonly headingVisible: boolean;
  readonly weekdaysVisible: boolean;
  readonly multiselectable?: boolean;
  isSelected(date: PlainDate): boolean;
  isDisabled(date: PlainDate): boolean;
  rangeRole(date: PlainDate): RangeRole | null;
  decorate(date: PlainDate): DateDecoration | null;
  content(date: PlainDate): string | Node | null;
  readonly today: PlainDate;
  readonly focus: PlainDate;
}

const DAYS_IN_WEEK = 7;
const VISUALLY_HIDDEN_CLASS = "dp-ui__visually-hidden";

const renderHead = (ctx: GridContext): HTMLTableSectionElement => {
  const thead = createElement("thead");
  const row = createElement(
    "tr",
    ctx.weekdaysVisible
      ? "dp-ui__weekdays"
      : `dp-ui__weekdays ${VISUALLY_HIDDEN_CLASS}`,
  );
  if (ctx.weekNumbers) {
    const header = createElement("th", "dp-ui__week-number-header", {
      scope: "col",
    });
    header.textContent = ctx.labels.weekNumber;
    row.appendChild(header);
  }
  const narrow = weekdayNames(ctx.locale, "narrow");
  const long = weekdayNames(ctx.locale, "long");
  for (let offset = 0; offset < DAYS_IN_WEEK; offset++) {
    const index = (ctx.weekStart + offset) % DAYS_IN_WEEK;
    const name = long[index] ?? "";
    const th = createElement("th", "dp-ui__weekday", {
      role: "columnheader",
      scope: "col",
      abbr: name,
      title: name,
    });
    th.textContent = narrow[index] ?? "";
    row.appendChild(th);
  }
  thead.appendChild(row);
  return thead;
};

export const renderMonthGrid = (
  model: MonthModel,
  ctx: GridContext,
): HTMLTableElement => {
  const table = createElement("table", "dp-ui__month-grid", { role: "grid" });
  if (ctx.multiselectable === true) {
    table.setAttribute("aria-multiselectable", "true");
  }
  const caption = createElement(
    "caption",
    ctx.headingVisible
      ? "dp-ui__month-subhead"
      : `dp-ui__month-heading ${VISUALLY_HIDDEN_CLASS}`,
  );
  caption.textContent = formatMonthYear(model.view, ctx.locale);
  table.appendChild(caption);
  table.appendChild(renderHead(ctx));

  const tbody = createElement("tbody");
  model.weeks.forEach((week, weekIndex) => {
    const tr = createElement("tr", "dp-ui__week");
    if (ctx.weekNumbers) {
      const th = createElement("th", "dp-ui__week-number", { scope: "row" });
      const weekNumber = model.weekNumbers.at(weekIndex);
      th.textContent =
        weekNumber === undefined ? "" : formatNumber(weekNumber, ctx.locale);
      tr.appendChild(th);
    }
    week.forEach((cell) => tr.appendChild(renderCell(cell, ctx)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
};

export const updateMonthGrid = (
  table: HTMLTableElement,
  ctx: GridContext,
): void => {
  table.querySelectorAll<HTMLElement>("td[data-date]").forEach((cell) => {
    const date = fromISO(cell.dataset.date ?? "");
    if (date === null) {
      return;
    }
    applyState(cell, date, cell.classList.contains(OUTSIDE_CLASS), ctx);
  });
};
