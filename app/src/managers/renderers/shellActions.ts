import type { ResolvedOptions } from "@/datepicker/options/types";
import { createElement } from "@/utils/dom";
import { createTextButton } from "./shellButtons";

export interface ActionsOptions {
  readonly labels: ResolvedOptions["labels"];
  readonly visible: boolean;
  readonly todayButton: boolean;
  readonly clearButton: boolean;
}

const CONFIRM_SELECTOR =
  ".dp-ui__text-button--confirm, .dp-ui__text-button--save";

export const setConfirmEnabled = (
  root: HTMLElement,
  enabled: boolean,
): void => {
  root
    .querySelectorAll<HTMLButtonElement>(CONFIRM_SELECTOR)
    .forEach((button) => {
      button.disabled = !enabled;
    });
};

export const createActions = (options: ActionsOptions): HTMLDivElement => {
  const { labels } = options;
  const actions = createElement("div", "dp-ui__actions");
  actions.hidden = !options.visible;
  const start = createElement("div", "dp-ui__actions-start");
  if (options.todayButton) {
    start.append(createTextButton("today", labels.today));
  }
  if (options.clearButton) {
    start.append(createTextButton("clear", labels.clear));
  }
  const end = createElement("div", "dp-ui__actions-end");
  end.append(
    createTextButton("cancel", labels.cancel),
    createTextButton("confirm", labels.confirm),
  );
  actions.append(start, end);
  return actions;
};
