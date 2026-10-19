import { afterEach, describe, expect, it, vi } from "vitest";
import { createMonthGrid } from "@/managers/pickers/MonthGrid";
import { createMonthMenu } from "@/managers/pickers/MonthMenu";
import { createYearGrid } from "@/managers/pickers/YearGrid";
import { createYearMenu } from "@/managers/pickers/YearMenu";

const view = { year: 2026, month: 10 };
const years = Array.from({ length: 121 }, (_, i) => 1926 + i);

const key = (el: Element, k: string): void => {
  el.dispatchEvent(
    new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }),
  );
};

const mount = <T extends HTMLElement>(el: T): T => {
  document.body.append(el);
  return el;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("createMonthMenu", () => {
  const make = (
    isMonthDisabled: (v: { year: number; month: number }) => boolean = () =>
      false,
    onPick: (month: number) => void = () => {},
  ) =>
    mount(
      createMonthMenu({
        locale: "en-US",
        view,
        label: "Choose month",
        isMonthDisabled,
        onPick,
      }),
    );

  it("renders 12 options with October selected and an icon", () => {
    const menu = make();
    const items = menu.querySelectorAll('li[role="option"]');
    expect(items).toHaveLength(12);
    expect(menu).toHaveAttribute("role", "listbox");
    expect(menu).toHaveAttribute("aria-label", "Choose month");
    const oct = items[9];
    expect(oct).toHaveAttribute("aria-selected", "true");
    expect(oct.querySelector(".dp-ui__menu-item-icon")).not.toBeNull();
    expect(oct).toHaveTextContent("October");
    expect(items[0]).toHaveAttribute("aria-selected", "false");
  });

  it("marks disabled months and does not pick them", () => {
    const onPick = vi.fn();
    const menu = make((v) => v.month === 3, onPick);
    const items = menu.querySelectorAll<HTMLElement>("li");
    expect(items[2]).toHaveAttribute("aria-disabled", "true");
    items[2].click();
    expect(onPick).not.toHaveBeenCalled();
    items[3].click();
    expect(onPick).toHaveBeenCalledWith(4);
  });

  it("moves focus with ArrowDown and the roving tabindex follows", () => {
    const menu = make();
    const items = [...menu.querySelectorAll<HTMLElement>("li")];
    items[9].focus();
    expect(items[9]).toHaveAttribute("tabindex", "0");
    key(items[9], "ArrowDown");
    expect(document.activeElement).toBe(items[10]);
    expect(items[10]).toHaveAttribute("tabindex", "0");
    expect(items[9]).toHaveAttribute("tabindex", "-1");
    key(items[10], "ArrowUp");
    expect(document.activeElement).toBe(items[9]);
  });

  it("jumps to the first and last item with Home and End", () => {
    const menu = make();
    const items = [...menu.querySelectorAll<HTMLElement>("li")];
    items[9].focus();
    key(items[9], "Home");
    expect(document.activeElement).toBe(items[0]);
    key(items[0], "End");
    expect(document.activeElement).toBe(items[11]);
  });

  it("picks the focused month with Enter", () => {
    const onPick = vi.fn();
    const menu = make(() => false, onPick);
    const items = [...menu.querySelectorAll<HTMLElement>("li")];
    items[4].focus();
    key(items[4], "Enter");
    expect(onPick).toHaveBeenCalledWith(5);
  });
});

describe("createYearMenu", () => {
  const make = (onPick: (year: number) => void = () => {}, locale = "en-US") =>
    mount(
      createYearMenu({ view, years, label: "Choose year", locale, onPick }),
    );

  it("renders years in the locale's digits and still picks the number", () => {
    const onPick = vi.fn();
    const menu = make(onPick, "ar-EG");
    const selected = menu.querySelector('[aria-selected="true"]');
    expect(selected).toHaveTextContent("٢٠٢٦");
    const target = [...menu.querySelectorAll<HTMLElement>("li")].find((i) =>
      i.textContent.includes("٢٠٣٠"),
    );
    if (!target) throw new Error("no 2030");
    target.click();
    expect(onPick).toHaveBeenCalledWith(2030);
  });

  it("keeps Latin digits for a latn numbering-system locale", () => {
    const menu = make(() => {}, "ar-EG-u-nu-latn");
    expect(menu.querySelector('[aria-selected="true"]')).toHaveTextContent(
      "2026",
    );
  });

  it("renders 121 items with the current year selected", () => {
    const menu = make();
    const items = menu.querySelectorAll<HTMLElement>('li[role="option"]');
    expect(items).toHaveLength(121);
    const selected = menu.querySelectorAll('[aria-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("2026");
  });

  it("picks the focused year with Enter", () => {
    const onPick = vi.fn();
    const menu = make(onPick);
    const items = [...menu.querySelectorAll<HTMLElement>("li")];
    const target = items.find((i) => i.textContent.includes("2030"));
    if (!target) throw new Error("no 2030");
    target.focus();
    key(target, "Enter");
    expect(onPick).toHaveBeenCalledWith(2030);
  });

  it("picks the focused year with Space", () => {
    const onPick = vi.fn();
    const menu = make(onPick);
    const items = [...menu.querySelectorAll<HTMLElement>("li")];
    const target = items.find((i) => i.textContent.includes("2027"));
    if (!target) throw new Error("no 2027");
    target.focus();
    key(target, " ");
    expect(onPick).toHaveBeenCalledWith(2027);
  });
});

describe("createMonthGrid", () => {
  const make = (
    overrides: {
      selected?: number | null;
      focused?: number;
      isDisabled?: (month: number) => boolean;
      onPick?: (month: number) => void;
    } = {},
  ) =>
    mount(
      createMonthGrid({
        year: 2026,
        selected: overrides.selected === undefined ? 10 : overrides.selected,
        focused: overrides.focused ?? 10,
        current: { year: 2026, month: 10 },
        locale: "en-US",
        label: "Choose month",
        isDisabled: overrides.isDisabled ?? (() => false),
        onPick: overrides.onPick ?? (() => {}),
      }),
    );

  const options = (grid: HTMLElement): HTMLElement[] => [
    ...grid.querySelectorAll<HTMLElement>("button.dp-ui__month-selection-item"),
  ];

  it("renders a labelled listbox of 12 option buttons", () => {
    const grid = make();
    const items = options(grid);
    expect(grid).toHaveClass("dp-ui__month-selection");
    expect(grid).toHaveAttribute("role", "listbox");
    expect(grid).toHaveAttribute("aria-label", "Choose month");
    expect(items).toHaveLength(12);
    expect(items[0]).toHaveAttribute("role", "option");
    expect(items[0]).toHaveTextContent("Jan");
    expect(items[0]).toHaveAttribute("aria-label", "January 2026");
  });

  it("marks the selected and current month", () => {
    const grid = make({ selected: 3 });
    const items = options(grid);
    expect(items[2]).toHaveClass("dp-ui__month-selection-item--selected");
    expect(items[2]).toHaveAttribute("aria-selected", "true");
    expect(items[9]).toHaveClass("dp-ui__month-selection-item--current");
    expect(items[9]).not.toHaveClass("dp-ui__month-selection-item--selected");
  });

  it("selects nothing for null and makes the focused month tabbable", () => {
    const grid = make({ selected: null, focused: 5 });
    const items = options(grid);
    expect(grid.querySelector('[aria-selected="true"]')).toBeNull();
    expect(items[4]).toHaveAttribute("tabindex", "0");
    expect(items[9]).toHaveAttribute("tabindex", "-1");
  });

  it("marks disabled months and does not pick them", () => {
    const onPick = vi.fn();
    const grid = make({ isDisabled: (month) => month === 3, onPick });
    const items = options(grid);
    expect(items[2]).toHaveAttribute("aria-disabled", "true");
    items[2].click();
    key(items[2], "Enter");
    expect(onPick).not.toHaveBeenCalled();
    items[3].click();
    expect(onPick).toHaveBeenCalledWith(4);
  });

  it("moves three months down with ArrowDown", () => {
    const grid = make();
    const items = options(grid);
    items[3].focus();
    key(items[3], "ArrowDown");
    expect(document.activeElement).toBe(items[6]);
    expect(items[6]).toHaveAttribute("tabindex", "0");
    expect(items[3]).toHaveAttribute("tabindex", "-1");
  });

  it("flips ArrowLeft and ArrowRight in a right-to-left grid", () => {
    const grid = make();
    grid.style.direction = "rtl";
    const items = options(grid);
    items[4].focus();
    key(items[4], "ArrowLeft");
    expect(document.activeElement).toBe(items[5]);
    key(items[5], "ArrowRight");
    expect(document.activeElement).toBe(items[4]);
  });

  it("jumps with Home and End", () => {
    const grid = make();
    const items = options(grid);
    items[4].focus();
    key(items[4], "End");
    expect(document.activeElement).toBe(items[11]);
    key(items[11], "Home");
    expect(document.activeElement).toBe(items[0]);
  });

  it("picks the focused month with Enter", () => {
    const onPick = vi.fn();
    const grid = make({ onPick });
    const items = options(grid);
    items[6].focus();
    key(items[6], "Enter");
    expect(onPick).toHaveBeenCalledWith(7);
  });
});

describe("createYearGrid", () => {
  const make = (onPick: (year: number) => void = () => {}, locale = "en-US") =>
    mount(
      createYearGrid({
        selected: view.year,
        focused: view.year,
        years,
        currentYear: 2026,
        label: "Choose year",
        locale,
        onPick,
      }),
    );

  const item = (grid: HTMLElement, year: number): HTMLElement => {
    const found = [...grid.querySelectorAll<HTMLElement>("button")].find(
      (b) => b.textContent.trim() === String(year),
    );
    if (!found) throw new Error(`no ${String(year)}`);
    return found;
  };

  it("renders Arabic-Indic years for ar-EG and picks the number", () => {
    const onPick = vi.fn();
    const grid = make(onPick, "ar-EG");
    const texts = [...grid.querySelectorAll("button")].map((b) =>
      b.textContent.trim(),
    );
    expect(texts).toContain("٢٠٢٦");
    expect(texts).not.toContain("2026");
    const button = [...grid.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "٢٠٣٠",
    );
    button?.click();
    expect(onPick).toHaveBeenCalledWith(2030);
  });

  it("marks the current year", () => {
    const grid = make();
    expect(item(grid, 2026)).toHaveClass("dp-ui__year-selection-item--current");
    expect(item(grid, 2025)).not.toHaveClass(
      "dp-ui__year-selection-item--current",
    );
    expect(item(grid, 2026)).toHaveAttribute("type", "button");
  });

  it("moves three years down with ArrowDown", () => {
    const grid = make();
    item(grid, 2026).focus();
    key(item(grid, 2026), "ArrowDown");
    expect(document.activeElement).toBe(item(grid, 2029));
  });

  it("moves one year with ArrowRight", () => {
    const grid = make();
    item(grid, 2026).focus();
    key(item(grid, 2026), "ArrowRight");
    expect(document.activeElement).toBe(item(grid, 2027));
  });

  it("picks a year on click", () => {
    const onPick = vi.fn();
    const grid = make(onPick);
    item(grid, 2031).click();
    expect(onPick).toHaveBeenCalledWith(2031);
  });
});
