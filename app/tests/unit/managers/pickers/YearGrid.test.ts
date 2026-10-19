import { afterEach, describe, expect, it, vi } from "vitest";
import { createYearGrid } from "@/managers/pickers/YearGrid";

const years = Array.from({ length: 21 }, (_, i) => 2016 + i);

const make = (
  overrides: {
    year?: number;
    selected?: number | null;
    focused?: number;
    onPick?: (year: number) => void;
  } = {},
): HTMLDivElement => {
  const year = overrides.year ?? 2026;
  const grid = createYearGrid({
    selected: overrides.selected === undefined ? year : overrides.selected,
    focused: overrides.focused ?? year,
    years,
    currentYear: 2026,
    label: "Choose year",
    locale: "en-US",
    onPick: overrides.onPick ?? (() => {}),
  });
  document.body.append(grid);
  return grid;
};

const item = (grid: HTMLElement, year: number): HTMLElement => {
  const found = Array.from(grid.querySelectorAll<HTMLElement>("button")).find(
    (button) => button.textContent === String(year),
  );
  if (!found) throw new Error(`no ${String(year)}`);
  return found;
};

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("createYearGrid", () => {
  it("renders a labelled listbox of option buttons", () => {
    const grid = make();

    expect(grid).toHaveAttribute("role", "listbox");
    expect(grid).toHaveAttribute("aria-label", "Choose year");
    const buttons = grid.querySelectorAll("button");
    expect(buttons).toHaveLength(21);
    expect(buttons[0]).toHaveAttribute("role", "option");
  });

  it("marks the viewed year selected and tabbable", () => {
    const grid = make();

    expect(item(grid, 2026)).toHaveAttribute("aria-selected", "true");
    expect(item(grid, 2026)).toHaveAttribute("tabindex", "0");
    expect(item(grid, 2026)).toHaveClass(
      "dp-ui__year-selection-item--selected",
    );
    expect(item(grid, 2025)).toHaveAttribute("aria-selected", "false");
    expect(item(grid, 2025)).toHaveAttribute("tabindex", "-1");
  });

  it("makes the first year tabbable when the viewed year is outside the list", () => {
    const grid = make({ year: 1990 });

    expect(
      grid.querySelector(".dp-ui__year-selection-item--selected"),
    ).toBeNull();
    expect(item(grid, 2016)).toHaveAttribute("tabindex", "0");
    expect(item(grid, 2017)).toHaveAttribute("tabindex", "-1");
  });

  it("keeps selected and focused independent", () => {
    const grid = make({ selected: 2030, focused: 2020 });

    expect(item(grid, 2030)).toHaveAttribute("aria-selected", "true");
    expect(item(grid, 2030)).toHaveAttribute("tabindex", "-1");
    expect(item(grid, 2020)).toHaveAttribute("aria-selected", "false");
    expect(item(grid, 2020)).toHaveAttribute("tabindex", "0");
  });

  it("selects nothing when selected is null and focuses the focused year", () => {
    const grid = make({ selected: null, focused: 2024 });

    expect(
      grid.querySelector(".dp-ui__year-selection-item--selected"),
    ).toBeNull();
    expect(grid.querySelector('[aria-selected="true"]')).toBeNull();
    expect(item(grid, 2024)).toHaveAttribute("tabindex", "0");
    expect(item(grid, 2026)).toHaveAttribute("tabindex", "-1");
  });

  it("moves the roving tabindex and focus with the arrow keys", () => {
    const grid = make();
    const start = item(grid, 2026);
    start.focus();

    const event = press(start, "ArrowLeft");

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item(grid, 2025));
    expect(item(grid, 2025)).toHaveAttribute("tabindex", "0");
    expect(start).toHaveAttribute("tabindex", "-1");

    press(item(grid, 2025), "ArrowUp");
    expect(document.activeElement).toBe(item(grid, 2022));
  });

  it("flips ArrowLeft and ArrowRight in a right-to-left grid", () => {
    const grid = make();
    grid.style.direction = "rtl";
    const start = item(grid, 2026);
    start.focus();

    press(start, "ArrowRight");
    expect(document.activeElement).toBe(item(grid, 2025));

    press(item(grid, 2025), "ArrowLeft");
    expect(document.activeElement).toBe(item(grid, 2026));
  });

  it("clamps at the first and last year", () => {
    const grid = make();
    const first = item(grid, 2016);
    first.focus();
    press(first, "ArrowUp");
    expect(document.activeElement).toBe(first);

    const last = item(grid, 2036);
    last.focus();
    press(last, "ArrowDown");
    expect(document.activeElement).toBe(last);
  });

  it("jumps to the first and last year with Home and End", () => {
    const grid = make();
    const start = item(grid, 2026);
    start.focus();

    expect(press(start, "End").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item(grid, 2036));

    press(item(grid, 2036), "Home");
    expect(document.activeElement).toBe(item(grid, 2016));
  });

  it.each(["Enter", " "])("picks the focused year with %j", (key) => {
    const onPick = vi.fn();
    const grid = make({ onPick });

    const event = press(item(grid, 2030), key);

    expect(event.defaultPrevented).toBe(true);
    expect(onPick).toHaveBeenCalledWith(2030);
  });

  it("ignores unrelated keys", () => {
    const onPick = vi.fn();
    const grid = make({ onPick });
    const start = item(grid, 2026);
    start.focus();

    const event = press(start, "a");

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(start);
    expect(onPick).not.toHaveBeenCalled();
  });
});
