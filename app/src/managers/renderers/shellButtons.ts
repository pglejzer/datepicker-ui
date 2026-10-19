import { ICONS } from "@/constants/icons";
import type { ResolvedOptions } from "@/datepicker/options/types";
import { createButton, createElement } from "@/utils/dom";

export interface Shortcut {
  readonly keys: string;
  readonly display: string;
}

export interface MenuButtonSpec {
  readonly name: string;
  readonly controls: string;
  readonly shortcut?: Shortcut;
}

export interface MenuButton {
  readonly button: HTMLButtonElement;
  readonly label: HTMLSpanElement;
  setText(text: string, spoken?: string): void;
}

export type KeyLabels = Pick<
  ResolvedOptions["labels"],
  "pageUpKey" | "pageDownKey" | "shiftKey"
>;

export interface Shortcuts {
  readonly previousMonth: Shortcut;
  readonly nextMonth: Shortcut;
  readonly previousYear: Shortcut;
  readonly nextYear: Shortcut;
  readonly chooseMonth: Shortcut;
  readonly chooseYear: Shortcut;
}

export const shortcuts = (labels: KeyLabels): Shortcuts => {
  const shift = (key: string): string => `${labels.shiftKey}+${key}`;
  return {
    previousMonth: { keys: "PageUp", display: labels.pageUpKey },
    nextMonth: { keys: "PageDown", display: labels.pageDownKey },
    previousYear: { keys: "Shift+PageUp", display: shift(labels.pageUpKey) },
    nextYear: { keys: "Shift+PageDown", display: shift(labels.pageDownKey) },
    chooseMonth: { keys: "Shift+M", display: shift("M") },
    chooseYear: { keys: "Shift+Y", display: shift("Y") },
  };
};

export const panelId = (instanceId: string, panel: string): string =>
  `dp-ui-${instanceId.replace(/[^\w-]/g, "-")}-${panel}`;

const applyShortcut = (
  button: HTMLElement,
  name: string,
  shortcut?: Shortcut,
): void => {
  if (shortcut === undefined) return;
  button.setAttribute("title", `${name} (${shortcut.display})`);
  button.setAttribute("aria-keyshortcuts", shortcut.keys);
};

const createIcon = (markup: string, className: string): Element | null => {
  const holder = createElement("span");
  holder.innerHTML = markup;
  const icon = holder.firstElementChild;
  if (icon === null) return null;
  icon.setAttribute("class", className);
  icon.setAttribute("aria-hidden", "true");
  return icon;
};

export const createIconButton = (
  modifier: string,
  label: string,
  icon: string,
  shortcut?: Shortcut,
): HTMLButtonElement => {
  const button = createButton(
    `dp-ui__icon-button dp-ui__icon-button--${modifier}`,
    label,
    icon,
  );
  button.firstElementChild?.setAttribute("aria-hidden", "true");
  applyShortcut(button, label, shortcut);
  return button;
};

export const createMenuButton = (
  modifier: string,
  text: string,
  spec: MenuButtonSpec,
): MenuButton => {
  const button = createElement(
    "button",
    `dp-ui__menu-button dp-ui__menu-button--${modifier}`,
    {
      type: "button",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
      "aria-controls": spec.controls,
    },
  );
  applyShortcut(button, spec.name, spec.shortcut);
  const label = createElement("span", "dp-ui__menu-button-label");
  button.append(label);
  const icon = createIcon(ICONS.arrowDropDown, "dp-ui__menu-button-icon");
  if (icon !== null) button.append(icon);
  const setText = (value: string, spoken: string = value): void => {
    label.textContent = value;
    button.setAttribute("aria-label", `${spec.name}, ${spoken}`);
  };
  setText(text);
  return { button, label, setText };
};

export const createTextButton = (
  modifier: string,
  label: string,
): HTMLButtonElement =>
  createButton(`dp-ui__text-button dp-ui__text-button--${modifier}`, label);

export interface SwitchViewButton {
  readonly button: HTMLButtonElement;
  setInputView(on: boolean): void;
}

export const createSwitchViewButton = (
  labels: { readonly switchToInput: string; readonly switchToCalendar: string },
  controls: string,
): SwitchViewButton => {
  const button = createIconButton(
    "switch-view",
    labels.switchToInput,
    ICONS.pencil,
  );
  const setInputView = (on: boolean): void => {
    button.innerHTML = on ? ICONS.calendar : ICONS.pencil;
    button.firstElementChild?.setAttribute("aria-hidden", "true");
    if (on) {
      button.setAttribute("aria-controls", controls);
    } else {
      button.removeAttribute("aria-controls");
    }
    button.setAttribute(
      "aria-label",
      on ? labels.switchToCalendar : labels.switchToInput,
    );
  };
  return { button, setInputView };
};
