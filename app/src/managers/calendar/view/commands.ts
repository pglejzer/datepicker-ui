import type { Panel, PickerActions } from "@/types/internal";
import type { DateCell, PickerPanel } from "./types";

type Command =
  | { readonly kind: "navigate"; readonly delta: number }
  | { readonly kind: "page"; readonly direction: -1 | 1 }
  | { readonly kind: "panel"; readonly panel: PickerPanel }
  | { readonly kind: "today" | "clear" | "cancel" | "confirm" | "switch" };

export interface ClickDeps {
  readonly actions: PickerActions;
  readonly panel: () => Panel;
  readonly home: Panel;
  readonly cellAt: (target: EventTarget | null) => DateCell | null;
}

const MONTHS_IN_YEAR = 12;

const COMMANDS: readonly (readonly [string, Command])[] = [
  ["dp-ui__icon-button--prev-month", { kind: "page", direction: -1 }],
  ["dp-ui__icon-button--next-month", { kind: "page", direction: 1 }],
  [
    "dp-ui__icon-button--prev-year",
    { kind: "navigate", delta: -MONTHS_IN_YEAR },
  ],
  [
    "dp-ui__icon-button--next-year",
    { kind: "navigate", delta: MONTHS_IN_YEAR },
  ],
  ["dp-ui__menu-button--month", { kind: "panel", panel: "month-menu" }],
  ["dp-ui__menu-button--year", { kind: "panel", panel: "year-menu" }],
  ["dp-ui__menu-button--year-grid", { kind: "panel", panel: "year-grid" }],
  ["dp-ui__text-button--today", { kind: "today" }],
  ["dp-ui__text-button--clear", { kind: "clear" }],
  ["dp-ui__text-button--cancel", { kind: "cancel" }],
  ["dp-ui__text-button--confirm", { kind: "confirm" }],
  ["dp-ui__text-button--save", { kind: "confirm" }],
  ["dp-ui__icon-button--close", { kind: "cancel" }],
  ["dp-ui__icon-button--switch-view", { kind: "switch" }],
];

const entryFor = (element: Element): readonly [string, Command] | undefined =>
  COMMANDS.find(([className]) => element.classList.contains(className));

export const commandClassOf = (element: Element): string | null =>
  entryFor(element)?.[0] ?? null;

const run = (command: Command, deps: ClickDeps): void => {
  const { actions } = deps;
  switch (command.kind) {
    case "navigate":
      actions.navigate(command.delta, "button");
      return;
    case "page":
      actions.page(command.direction, "button");
      return;
    case "panel":
      actions.showPanel(
        deps.panel() === command.panel ? deps.home : command.panel,
      );
      return;
    case "switch":
      actions.showPanel(deps.panel() === "input" ? deps.home : "input");
      return;
    case "today":
      actions.today();
      return;
    case "clear":
      actions.clear();
      return;
    case "cancel":
      actions.cancel("button");
      return;
    case "confirm":
      actions.confirm();
  }
};

export const bindClicks = (
  root: HTMLElement,
  signal: AbortSignal,
  deps: ClickDeps,
): void => {
  root.addEventListener(
    "click",
    (event) => {
      const { target } = event;
      const button =
        target instanceof Element ? target.closest("button") : null;
      if (button !== null) {
        const entry = entryFor(button);
        if (entry) run(entry[1], deps);
        return;
      }
      const cell = deps.cellAt(target);
      if (cell !== null) deps.actions.select(cell.date);
    },
    { signal },
  );
};
