import { describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import { createSelectionGridContext } from "@/managers/calendar/view/selectionContext";
import type { DateRules } from "@/types/internal";
import {
  renderMonthGrid,
  updateMonthGrid,
  type GridContext,
} from "@/managers/calendar/GridRenderer";
import { buildMonth } from "@/managers/calendar/MonthModel";
import type { PlainDate } from "@/types/date";
import { isSameDay } from "@/utils/date/plainDate";

const OCT: PlainDate = { year: 2026, month: 10, day: 17 };
const view = { year: 2026, month: 10 };

const makeCtx = (overrides: Partial<GridContext> = {}): GridContext => ({
  locale: "en-US",
  weekStart: 0,
  weekNumbers: false,
  showOutside: false,
  labels: { weekNumber: "Week" },
  isSelected: () => false,
  isDisabled: () => false,
  rangeRole: () => null,
  decorate: () => null,
  rangeLabels: { start: "Start", end: "End" },
  headingVisible: false,
  weekdaysVisible: true,
  today: OCT,
  focus: OCT,
  outsideSelectable: true,
  content: () => null,
  ...overrides,
});

const render = (overrides: Partial<GridContext> = {}) => {
  const ctx = makeCtx(overrides);
  const model = buildMonth(view, ctx.weekStart, false);
  return renderMonthGrid(model, ctx);
};

const cell = (table: HTMLTableElement, iso: string): HTMLElement => {
  const el = table.querySelector<HTMLElement>(`td[data-date="${iso}"]`);
  if (!el) throw new Error(`no cell ${iso}`);
  return el;
};

describe("renderMonthGrid", () => {
  it("renders a labelled date cell with data-date and aria-label", () => {
    const table = render();
    const c = cell(table, "2026-10-17");
    expect(c).toHaveClass("dp-ui__date");
    expect(c).toHaveAttribute("aria-label", "Saturday, October 17, 2026");
    expect(c.querySelector(".dp-ui__date-indicator")).toHaveTextContent("17");
    expect(table).toHaveAttribute("role", "grid");
    expect(table).toHaveClass("dp-ui__month-grid");
  });

  it("renders day numbers in the locale's digits and keeps data-date ISO", () => {
    const table = render({ locale: "ar-EG" });
    const c = cell(table, "2026-10-17");
    expect(c.querySelector(".dp-ui__date-indicator")).toHaveTextContent("١٧");
    expect(c.dataset.date).toBe("2026-10-17");
  });

  it("keeps Latin day numbers for a latn numbering-system locale", () => {
    const table = render({ locale: "ar-EG-u-nu-latn" });
    expect(
      cell(table, "2026-10-17").querySelector(".dp-ui__date-indicator"),
    ).toHaveTextContent("17");
  });

  it("renders week numbers in the locale's digits", () => {
    const table = render({ locale: "ar-EG", weekNumbers: true });
    const numbers = [...table.querySelectorAll(".dp-ui__week-number")].map(
      (th) => th.textContent,
    );
    expect(numbers.length).toBeGreaterThan(0);
    for (const text of numbers) {
      expect(text).toMatch(/^[٠-٩]+$/);
    }
  });

  it("marks today with aria-current and --today", () => {
    const table = render();
    const c = cell(table, "2026-10-17");
    expect(c).toHaveAttribute("aria-current", "date");
    expect(c).toHaveClass("dp-ui__date--today");
    expect(cell(table, "2026-10-18")).not.toHaveAttribute("aria-current");
  });

  it("marks the selected date", () => {
    const table = render({ isSelected: (d) => isSameDay(d, OCT) });
    const c = cell(table, "2026-10-17");
    expect(c).toHaveAttribute("aria-selected", "true");
    expect(c).toHaveClass("dp-ui__date--selected");
    expect(cell(table, "2026-10-18")).not.toHaveClass("dp-ui__date--selected");
  });

  it("marks disabled dates but keeps them in the tab model", () => {
    const table = render({ isDisabled: (d) => d.day === 20 });
    const c = cell(table, "2026-10-20");
    expect(c).toHaveAttribute("aria-disabled", "true");
    expect(c).toHaveClass("dp-ui__date--disabled");
    expect(c.hasAttribute("tabindex")).toBe(true);
  });

  it("renders narrow weekday headers with long abbr", () => {
    const table = render();
    const ths = [
      ...table.querySelectorAll<HTMLElement>("thead th.dp-ui__weekday"),
    ];
    expect(ths.map((t) => t.textContent)).toEqual([
      "S",
      "M",
      "T",
      "W",
      "T",
      "F",
      "S",
    ]);
    expect(ths[0]).toHaveAttribute("abbr", "Sunday");
    expect(ths[6]).toHaveAttribute("abbr", "Saturday");
    expect(ths[0]).toHaveAttribute("scope", "col");
  });

  it("has a visually hidden caption with the month and year", () => {
    const table = render();
    expect(table.querySelector("caption")).toHaveTextContent("October 2026");
  });

  it("adds a row header per week when weekNumbers is on", () => {
    const table = render({ weekNumbers: true });
    const rows = table.querySelectorAll("tbody tr.dp-ui__week");
    expect(rows).toHaveLength(5);
    expect(
      table.querySelectorAll('tbody th.dp-ui__week-number[scope="row"]'),
    ).toHaveLength(5);
    expect(
      table.querySelector("thead th.dp-ui__week-number-header"),
    ).not.toBeNull();
  });

  it("renders no week number cells when weekNumbers is off", () => {
    const table = render();
    expect(table.querySelector(".dp-ui__week-number")).toBeNull();
  });

  it("renders hidden outside-month cells as empty", () => {
    const table = render({ showOutside: false });
    const empties = table.querySelectorAll("td.dp-ui__date--empty");
    expect(empties.length).toBeGreaterThan(0);
    for (const e of empties) {
      expect(e.textContent).toBe("");
      expect(e.hasAttribute("tabindex")).toBe(false);
    }
    expect(table.querySelector('td[data-date="2026-09-27"]')).toBeNull();
  });

  it("renders visible outside-month cells with --outside-month", () => {
    const table = render({ showOutside: true });
    const c = cell(table, "2026-09-27");
    expect(c).toHaveClass("dp-ui__date--outside-month");
    expect(c).not.toHaveClass("dp-ui__date--empty");
  });

  it("gives exactly one cell tabindex 0 when focus is in the month", () => {
    const table = render({ focus: { year: 2026, month: 10, day: 5 } });
    const zero = table.querySelectorAll('td[tabindex="0"]');
    expect(zero).toHaveLength(1);
    expect(zero[0]).toHaveAttribute("data-date", "2026-10-05");
  });

  it("gives no cell tabindex 0 when focus is in another month", () => {
    const table = render({ focus: { year: 2026, month: 11, day: 15 } });
    expect(table.querySelectorAll('td[tabindex="0"]')).toHaveLength(0);
  });
});

const roleFor =
  (start: number, end: number): GridContext["rangeRole"] =>
  (date) => {
    if (date.year !== 2026 || date.month !== 10) return null;
    if (date.day === start) return "start";
    if (date.day === end) return "end";
    return date.day > start && date.day < end ? "in-range" : null;
  };

const holiday: GridContext["decorate"] = (date) =>
  date.year === 2026 && date.month === 10 && date.day === 20
    ? { className: "holiday promo", badge: true, label: "Holiday" }
    : null;

describe("renderMonthGrid range and decorations", () => {
  it("marks start, end and in-range cells with aria-selected", () => {
    const table = render({ rangeRole: roleFor(20, 28) });
    expect(cell(table, "2026-10-20")).toHaveClass("dp-ui__date--range-start");
    expect(cell(table, "2026-10-28")).toHaveClass("dp-ui__date--range-end");
    expect(table.querySelectorAll(".dp-ui__date--in-range")).toHaveLength(7);
    for (let day = 21; day <= 27; day++) {
      expect(cell(table, `2026-10-${String(day)}`)).toHaveClass(
        "dp-ui__date--in-range",
      );
    }
    for (let day = 20; day <= 28; day++) {
      expect(cell(table, `2026-10-${String(day)}`)).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
    expect(cell(table, "2026-10-19")).not.toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("appends the range role to the aria-label", () => {
    const table = render({ rangeRole: roleFor(20, 28) });
    expect(cell(table, "2026-10-20")).toHaveAttribute(
      "aria-label",
      "Tuesday, October 20, 2026, Start",
    );
    expect(cell(table, "2026-10-28").getAttribute("aria-label")).toMatch(
      /, End$/,
    );
  });

  it("applies decoration classes, one badge and the label suffix", () => {
    const table = render({ decorate: holiday });
    const c = cell(table, "2026-10-20");
    expect(c).toHaveClass("holiday");
    expect(c).toHaveClass("promo");
    expect(c.querySelectorAll("span.dp-ui__date-badge")).toHaveLength(1);
    expect(c.getAttribute("aria-label")).toMatch(/, Holiday$/);
    expect(c).toHaveAttribute("data-decoration-label", "Holiday");
    expect(cell(table, "2026-10-21")).not.toHaveClass("holiday");
  });

  it("refreshes range classes on update and keeps decorations", () => {
    let role = roleFor(20, 28);
    const ctx = makeCtx({ rangeRole: (date) => role(date), decorate: holiday });
    const table = renderMonthGrid(buildMonth(view, 0, false), ctx);
    expect(cell(table, "2026-10-20")).toHaveClass("dp-ui__date--range-start");

    role = roleFor(22, 25);
    updateMonthGrid(table, ctx);

    const c20 = cell(table, "2026-10-20");
    expect(c20).not.toHaveClass("dp-ui__date--range-start");
    expect(c20).not.toHaveAttribute("aria-selected", "true");
    expect(c20).toHaveClass("holiday");
    expect(c20).toHaveClass("promo");
    expect(c20.querySelectorAll("span.dp-ui__date-badge")).toHaveLength(1);
    expect(c20.getAttribute("aria-label")).toMatch(/, Holiday$/);
    expect(c20.getAttribute("aria-label")).not.toMatch(/Start/);
    expect(cell(table, "2026-10-22")).toHaveClass("dp-ui__date--range-start");
    expect(cell(table, "2026-10-25")).toHaveClass("dp-ui__date--range-end");
    expect(cell(table, "2026-10-23")).toHaveClass("dp-ui__date--in-range");
    expect(cell(table, "2026-10-27")).not.toHaveClass("dp-ui__date--in-range");
    expect(cell(table, "2026-10-28")).not.toHaveClass("dp-ui__date--range-end");
  });

  it("shows the month caption as a subhead when headingVisible", () => {
    const caption = render({ headingVisible: true }).querySelector("caption");
    expect(caption).toHaveClass("dp-ui__month-subhead");
    expect(caption).not.toHaveClass("dp-ui__visually-hidden");
  });

  it("hides the weekday row visually when weekdaysVisible is false", () => {
    const table = render({ weekdaysVisible: false });
    expect(table.querySelector("tr.dp-ui__weekdays")).toHaveClass(
      "dp-ui__visually-hidden",
    );
  });

  it("keeps the stage-1 output by default", () => {
    const table = render();
    const caption = table.querySelector("caption");
    expect(caption).toHaveClass("dp-ui__month-heading");
    expect(caption).toHaveClass("dp-ui__visually-hidden");
    expect(caption).not.toHaveClass("dp-ui__month-subhead");
    expect(table.querySelector("tr.dp-ui__weekdays")).not.toHaveClass(
      "dp-ui__visually-hidden",
    );
    expect(table.querySelector(".dp-ui__date-badge")).toBeNull();
  });
});

const priced: GridContext["content"] = (date) =>
  date.year === 2026 && date.month === 10 && date.day === 20 ? "$120" : null;

describe("renderMonthGrid content", () => {
  it("renders string content as a span after the indicator", () => {
    const c = cell(render({ content: priced }), "2026-10-20");
    const content = c.querySelector(".dp-ui__date-content");
    expect(content).toHaveTextContent("$120");
    expect(content?.previousElementSibling).toBe(
      c.querySelector(".dp-ui__date-indicator"),
    );
    expect(c).toHaveClass("dp-ui__date--has-content");
    expect(c).toHaveAttribute("data-content-label", "$120");
    expect(c.getAttribute("aria-label")).toMatch(/, \$120$/);
  });

  it("leaves other cells without content", () => {
    const c = cell(render({ content: priced }), "2026-10-21");
    expect(c.querySelector(".dp-ui__date-content")).toBeNull();
    expect(c).not.toHaveClass("dp-ui__date--has-content");
    expect(c).not.toHaveAttribute("data-content-label");
    expect(c.getAttribute("aria-label")).not.toContain("$");
  });

  it("puts the content label after the decoration label", () => {
    const c = cell(
      render({ content: priced, decorate: holiday }),
      "2026-10-20",
    );
    expect(c.getAttribute("aria-label")).toMatch(/, Holiday, \$120$/);
  });

  it("renders a string as text, never HTML", () => {
    const c = cell(render({ content: () => "<b>x</b>" }), "2026-10-20");
    expect(c.querySelector("b")).toBeNull();
    expect(c.querySelector(".dp-ui__date-content")?.textContent).toBe(
      "<b>x</b>",
    );
  });

  it("appends a Node as given", () => {
    const node = document.createElement("i");
    node.textContent = "hot";
    const c = cell(
      render({ content: (date) => (date.day === 20 ? node : null) }),
      "2026-10-20",
    );
    expect(c.querySelector(".dp-ui__date-content i")).toBe(node);
    expect(c).toHaveClass("dp-ui__date--has-content");
  });

  it("keeps the content after updateMonthGrid", () => {
    const ctx = makeCtx({ content: priced });
    const table = renderMonthGrid(buildMonth(view, 0, false), ctx);
    updateMonthGrid(table, ctx);
    const c = cell(table, "2026-10-20");
    expect(c.querySelectorAll(".dp-ui__date-content")).toHaveLength(1);
    expect(c.getAttribute("aria-label")).toMatch(/, \$120$/);
  });

  it("renders no content when the renderDate option throws", () => {
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => {});
    const host = document.createElement("div");
    const input = document.createElement("input");
    host.appendChild(input);
    const core = new CoreState(input, host, false, {
      calendar: {
        locale: "en-US",
        renderDate: () => {
          throw new Error("boom");
        },
      },
    });
    core.resetSession();
    const rules: DateRules = {
      isDisabled: () => false,
      unavailableReason: () => null,
      isMonthDisabled: () => false,
      yearBounds: () => ({ min: 1926, max: 2046 }),
      isSelectable: () => true,
    };
    const ctx = createSelectionGridContext(core, rules, false);
    expect(ctx.content(OCT)).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("renderMonthGrid inert outside days", () => {
  it("marks outside cells disabled when they are not selectable", () => {
    const table = render({ showOutside: true, outsideSelectable: false });
    const outside = cell(table, "2026-09-27");
    expect(outside).toHaveClass("dp-ui__date--outside-month");
    expect(outside).toHaveClass("dp-ui__date--disabled");
    expect(outside).toHaveAttribute("aria-disabled", "true");
    expect(cell(table, "2026-10-05")).not.toHaveAttribute("aria-disabled");
  });

  it("keeps outside cells enabled when they are selectable", () => {
    const outside = cell(
      render({ showOutside: true, outsideSelectable: true }),
      "2026-09-27",
    );
    expect(outside).not.toHaveClass("dp-ui__date--disabled");
    expect(outside).not.toHaveAttribute("aria-disabled");
  });
});

describe("updateMonthGrid", () => {
  it("moves --selected in place without replacing nodes", () => {
    let selected: PlainDate = OCT;
    const ctx = makeCtx({ isSelected: (d) => isSameDay(d, selected) });
    const table = renderMonthGrid(buildMonth(view, 0, false), ctx);
    const before17 = cell(table, "2026-10-17");
    const before20 = cell(table, "2026-10-20");
    const cellsBefore = [...table.querySelectorAll("td")];
    expect(before17).toHaveClass("dp-ui__date--selected");

    selected = { year: 2026, month: 10, day: 20 };
    updateMonthGrid(table, ctx);

    expect(cell(table, "2026-10-17")).toBe(before17);
    expect(cell(table, "2026-10-20")).toBe(before20);
    expect([...table.querySelectorAll("td")]).toEqual(cellsBefore);
    expect(before17).not.toHaveClass("dp-ui__date--selected");
    expect(before17).not.toHaveAttribute("aria-selected", "true");
    expect(before20).toHaveClass("dp-ui__date--selected");
    expect(before20).toHaveAttribute("aria-selected", "true");
  });

  it("moves the roving tabindex with the focus date", () => {
    const table = render();
    updateMonthGrid(
      table,
      makeCtx({ focus: { year: 2026, month: 10, day: 3 } }),
    );
    const zero = table.querySelectorAll('td[tabindex="0"]');
    expect(zero).toHaveLength(1);
    expect(zero[0]).toHaveAttribute("data-date", "2026-10-03");
  });
});
