import type { PlainDate } from "@/types/date";
import type { DateDecoration } from "@/types/options";
import type { RangeRole } from "@/types/selection";
import { formatFullDate, formatNumber } from "@/utils/date/intl";
import { isSameDay, toISO } from "@/utils/date/plainDate";
import { createElement } from "@/utils/dom";
import type { GridContext } from "./GridRenderer";
import type { MonthCell } from "./MonthModel";

export const DATE_CLASS = "dp-ui__date";
export const OUTSIDE_CLASS = "dp-ui__date--outside-month";
const DECORATION_LABEL_ATTRIBUTE = "data-decoration-label";
const CONTENT_LABEL_ATTRIBUTE = "data-content-label";
const CONTENT_CLASS = "dp-ui__date-content";
const HAS_CONTENT_CLASS = "dp-ui__date--has-content";
const CONTENT_SELECTOR = `:scope > .${CONTENT_CLASS}`;

const isInert = (
  date: PlainDate,
  outside: boolean,
  ctx: GridContext,
): boolean => ctx.isDisabled(date) || (outside && !ctx.outsideSelectable);

const stateClasses = (
  date: PlainDate,
  outside: boolean,
  role: RangeRole | null,
  ctx: GridContext,
): readonly (readonly [string, boolean])[] => [
  ["dp-ui__date--selected", ctx.isSelected(date)],
  ["dp-ui__date--range-start", role === "start"],
  ["dp-ui__date--range-end", role === "end"],
  ["dp-ui__date--in-range", role === "in-range"],
  ["dp-ui__date--today", isSameDay(date, ctx.today)],
  ["dp-ui__date--disabled", isInert(date, outside, ctx)],
  [OUTSIDE_CLASS, outside],
];

const clearContent = (cell: HTMLElement): void => {
  cell.querySelector(CONTENT_SELECTOR)?.remove();
  cell.classList.remove(HAS_CONTENT_CLASS);
  cell.removeAttribute(CONTENT_LABEL_ATTRIBUTE);
};

const syncContent = (
  cell: HTMLElement,
  date: PlainDate,
  ctx: GridContext,
): void => {
  const content = ctx.content(date);
  if (content === null) {
    clearContent(cell);
    return;
  }
  const existing = cell.querySelector(CONTENT_SELECTOR);
  const label = (
    typeof content === "string" ? content : (content.textContent ?? "")
  ).trim();
  const unchanged =
    typeof content === "string" &&
    existing !== null &&
    existing.childElementCount === 0 &&
    existing.textContent === content;
  if (!unchanged) {
    const span = createElement("span", CONTENT_CLASS);
    if (typeof content === "string") {
      span.textContent = content;
    } else {
      span.appendChild(content);
    }
    if (existing === null) {
      cell.querySelector(".dp-ui__date-indicator")?.after(span);
    } else {
      existing.replaceWith(span);
    }
  }
  cell.classList.add(HAS_CONTENT_CLASS);
  if (label === "") {
    cell.removeAttribute(CONTENT_LABEL_ATTRIBUTE);
  } else {
    cell.setAttribute(CONTENT_LABEL_ATTRIBUTE, label);
  }
};

const roleLabel = (role: RangeRole | null, ctx: GridContext): string | null => {
  if (role === "start") return ctx.rangeLabels.start;
  if (role === "end") return ctx.rangeLabels.end;
  return null;
};

const cellLabel = (
  date: PlainDate,
  role: RangeRole | null,
  decorationLabel: string | null,
  contentLabel: string | null,
  ctx: GridContext,
): string =>
  [
    formatFullDate(date, ctx.locale),
    roleLabel(role, ctx),
    decorationLabel,
    contentLabel,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join(", ");

export const applyState = (
  cell: HTMLElement,
  date: PlainDate,
  outside: boolean,
  ctx: GridContext,
): void => {
  const role = ctx.rangeRole(date);
  syncContent(cell, date, ctx);
  stateClasses(date, outside, role, ctx).forEach(([name, on]) =>
    cell.classList.toggle(name, on),
  );
  cell.setAttribute(
    "aria-selected",
    String(ctx.isSelected(date) || role !== null),
  );
  cell.setAttribute(
    "aria-label",
    cellLabel(
      date,
      role,
      cell.getAttribute(DECORATION_LABEL_ATTRIBUTE),
      cell.getAttribute(CONTENT_LABEL_ATTRIBUTE),
      ctx,
    ),
  );
  if (isSameDay(date, ctx.today)) {
    cell.setAttribute("aria-current", "date");
  } else {
    cell.removeAttribute("aria-current");
  }
  if (isInert(date, outside, ctx)) {
    cell.setAttribute("aria-disabled", "true");
  } else {
    cell.removeAttribute("aria-disabled");
  }
  const focusable = !outside && isSameDay(date, ctx.focus);
  cell.setAttribute("tabindex", focusable ? "0" : "-1");
};

const applyDecoration = (
  td: HTMLElement,
  decoration: DateDecoration | null,
): void => {
  if (decoration === null) return;
  const classes = (decoration.className ?? "").split(/\s+/).filter(Boolean);
  td.classList.add(...classes);
  if (decoration.label) {
    td.setAttribute(DECORATION_LABEL_ATTRIBUTE, decoration.label);
  }
  if (decoration.badge === true) {
    td.appendChild(
      createElement("span", "dp-ui__date-badge", { "aria-hidden": "true" }),
    );
  }
};

export const renderCell = (
  cell: MonthCell,
  ctx: GridContext,
): HTMLTableCellElement => {
  if (!cell.inMonth && !ctx.showOutside) {
    return createElement("td", `${DATE_CLASS} dp-ui__date--empty`);
  }
  const td = createElement("td", DATE_CLASS, {
    role: "gridcell",
    "data-date": toISO(cell.date),
  });
  const indicator = createElement("span", "dp-ui__date-indicator");
  indicator.textContent = formatNumber(cell.date.day, ctx.locale);
  td.appendChild(indicator);
  applyDecoration(td, ctx.decorate(cell.date));
  applyState(td, cell.date, !cell.inMonth, ctx);
  return td;
};
