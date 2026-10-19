import type { CoreState } from "@/datepicker/CoreState";
import type { DateRules, PickerActions } from "@/types/internal";
import type { Selection } from "@/types/selection";
import { createElement } from "@/utils/dom";
import { isSelectionAllowed } from "@/utils/selection/constraints";
import { sameSelection } from "@/utils/selection/model";
import { resolvePreset, type PresetRange } from "@/utils/selection/presets";
import { bindDragScroll } from "./dragScroll";

export interface PresetsOptions {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
  readonly signal: AbortSignal;
}

export interface Presets {
  readonly element: HTMLDivElement;
  refresh(): void;
  setHidden(hidden: boolean): void;
}

const BUTTON_SELECTOR = "button.dp-ui__preset";

export const createPresets = (options: PresetsOptions): Presets => {
  const { core, actions, rules, signal } = options;
  const { presets, labels, limits } = core.options;
  const element = createElement("div", "dp-ui__presets", {
    role: "group",
    "aria-label": labels.presets,
  });
  const buttons = presets.map((preset) => {
    const button = createElement("button", "dp-ui__preset", {
      type: "button",
    });
    button.textContent = preset.label;
    return button;
  });
  const ranges: (PresetRange | null)[] = buttons.map(() => null);
  element.append(...buttons);

  const refresh = (): void => {
    presets.forEach((preset, index) => {
      const button = buttons[index];
      const range = resolvePreset(preset);
      ranges[index] = range;
      let allowed = false;
      let pressed = false;
      if (range !== null) {
        const selection: Selection = { mode: "range", ...range };
        allowed = isSelectionAllowed(selection, limits, (date) =>
          rules.isDisabled(date),
        );
        pressed = sameSelection(core.draft, selection);
      }
      button.disabled = !allowed;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
    });
  };

  element.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(BUTTON_SELECTOR);
      const index = buttons.findIndex((item) => item === button);
      if (index < 0) return;
      const range = ranges[index];
      if (range === null) return;
      actions.selectRange(range.start, range.end);
    },
    { signal },
  );

  bindDragScroll(element, signal);
  refresh();

  return {
    element,
    refresh,
    setHidden: (hidden) => {
      element.hidden = hidden;
    },
  };
};
