import { scrollWithin } from "@/utils/dom";

const COLUMNS = 3;

export interface OptionItem {
  readonly label: string;
  readonly name: string;
  readonly selected: boolean;
  readonly current: boolean;
  readonly disabled: boolean;
  onPick(): void;
}

export interface OptionGridSpec {
  readonly className: string;
  readonly itemClass: string;
  readonly label: string;
  readonly items: readonly OptionItem[];
  readonly focused: number;
}

export const createOptionGrid = (spec: OptionGridSpec): HTMLDivElement => {
  const grid = document.createElement("div");
  grid.className = spec.className;
  grid.setAttribute("role", "listbox");
  grid.setAttribute("aria-label", spec.label);

  const buttons: HTMLButtonElement[] = [];
  const inRange = spec.focused >= 0 && spec.focused < spec.items.length;
  const tabbable = inRange ? spec.focused : 0;

  const focusAt = (from: number, to: number): void => {
    const target = buttons.at(Math.max(0, Math.min(buttons.length - 1, to)));
    if (!target) {
      return;
    }
    buttons.at(from)?.setAttribute("tabindex", "-1");
    target.setAttribute("tabindex", "0");
    target.focus({ preventScroll: true });
    scrollWithin(grid, target, "nearest");
  };

  const stepFor = (key: string): number | null => {
    const rtl = getComputedStyle(grid).direction === "rtl";
    const horizontal = rtl ? -1 : 1;
    switch (key) {
      case "ArrowRight":
        return horizontal;
      case "ArrowLeft":
        return -horizontal;
      case "ArrowDown":
        return COLUMNS;
      case "ArrowUp":
        return -COLUMNS;
      default:
        return null;
    }
  };

  spec.items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = spec.itemClass;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", item.selected ? "true" : "false");
    button.setAttribute("aria-label", item.name);
    button.setAttribute("tabindex", index === tabbable ? "0" : "-1");
    if (item.selected) {
      button.classList.add(`${spec.itemClass}--selected`);
    }
    if (item.current) {
      button.classList.add(`${spec.itemClass}--current`);
    }
    if (item.disabled) {
      button.setAttribute("aria-disabled", "true");
    }
    button.textContent = item.label;
    const pick = (): void => {
      if (!item.disabled) {
        item.onPick();
      }
    };
    button.addEventListener("click", pick);
    button.addEventListener("keydown", (event) => {
      const step = stepFor(event.key);
      if (step !== null) {
        event.preventDefault();
        focusAt(index, index + step);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusAt(index, 0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusAt(index, buttons.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pick();
      }
    });
    buttons.push(button);
    grid.appendChild(button);
  });

  requestAnimationFrame(() => {
    const target =
      grid.querySelector(`.${spec.itemClass}--selected`) ??
      buttons.at(tabbable);
    if (target) scrollWithin(grid, target, "center");
  });
  return grid;
};
