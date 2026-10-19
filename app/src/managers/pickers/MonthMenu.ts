import { ICONS } from "@/constants/icons";
import type { YearMonth } from "@/types/date";
import { monthNames } from "@/utils/date/intl";
import { scrollWithin } from "@/utils/dom";

export interface MenuItemSpec {
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onPick: () => void;
}

export const revealSelected = (root: HTMLElement): void => {
  const selected = root.querySelector(".dp-ui__menu-item--selected");
  if (selected) scrollWithin(root, selected, "center");
};

const moveFocus = (
  items: readonly HTMLElement[],
  current: number,
  next: number,
): void => {
  const target = items.at(Math.max(0, Math.min(items.length - 1, next)));
  const from = items.at(current);
  if (!target) {
    return;
  }
  from?.setAttribute("tabindex", "-1");
  target.setAttribute("tabindex", "0");
  target.focus({ preventScroll: true });
  if (target.parentElement)
    scrollWithin(target.parentElement, target, "nearest");
};

export const buildMenu = (
  modifier: "month" | "year",
  label: string,
  specs: readonly MenuItemSpec[],
): HTMLUListElement => {
  const list = document.createElement("ul");
  list.className = `dp-ui__menu dp-ui__menu--${modifier}`;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", label);

  const hasSelected = specs.some((spec) => spec.selected);
  const items = specs.map((spec, index) => {
    const item = document.createElement("li");
    item.className = "dp-ui__menu-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", spec.selected ? "true" : "false");
    const tabbable = spec.selected || (!hasSelected && index === 0);
    item.setAttribute("tabindex", tabbable ? "0" : "-1");
    if (spec.selected) {
      item.classList.add("dp-ui__menu-item--selected");
      const holder = document.createElement("span");
      holder.innerHTML = ICONS.check;
      const svg = holder.firstElementChild;
      if (svg) {
        svg.setAttribute("class", "dp-ui__menu-item-icon");
        svg.setAttribute("aria-hidden", "true");
        item.appendChild(svg);
      }
    }
    if (spec.disabled) {
      item.setAttribute("aria-disabled", "true");
    }
    const text = document.createElement("span");
    text.className = "dp-ui__menu-item-label";
    text.textContent = spec.label;
    item.appendChild(text);

    const pick = (): void => {
      if (!spec.disabled) {
        spec.onPick();
      }
    };
    item.addEventListener("click", pick);
    item.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(elements, index, index + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(elements, index, index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        moveFocus(elements, index, 0);
      } else if (event.key === "End") {
        event.preventDefault();
        moveFocus(elements, index, elements.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pick();
      }
    });
    return item;
  });
  const elements: readonly HTMLElement[] = items;
  items.forEach((item) => list.appendChild(item));

  requestAnimationFrame(() => {
    revealSelected(list);
  });
  return list;
};

export const createMonthMenu = (ctx: {
  locale: string;
  view: YearMonth;
  label: string;
  isMonthDisabled(view: YearMonth): boolean;
  onPick(month: number): void;
}): HTMLUListElement => {
  const names = monthNames(ctx.locale, "long");
  return buildMenu(
    "month",
    ctx.label,
    names.map((name, index) => {
      const month = index + 1;
      return {
        label: name,
        selected: month === ctx.view.month,
        disabled: ctx.isMonthDisabled({ year: ctx.view.year, month }),
        onPick: () => {
          ctx.onPick(month);
        },
      };
    }),
  );
};
