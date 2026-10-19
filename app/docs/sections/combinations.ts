import type DatepickerUI from "../../src/index";
import { MONTHS_DEMOS } from "./combinations-months";
import { PRESET_DEMOS, SPLIT_DEMOS, SURFACE_DEMOS } from "./combinations-range";
import { BEHAVIOR_DEMOS, RULE_DEMOS, RULE_OUTPUTS } from "./combinations-rules";
import type { CombinationDemo } from "./combinations-shared";
import {
  CONTENT_DEMOS,
  PRECISION_DEMOS,
  VIEW_DEMOS,
} from "./combinations-views";

export const COMBINATION_DEMOS: readonly CombinationDemo[] = [
  ...SURFACE_DEMOS,
  ...MONTHS_DEMOS,
  ...PRESET_DEMOS,
  ...SPLIT_DEMOS,
  ...PRECISION_DEMOS,
  ...VIEW_DEMOS,
  ...CONTENT_DEMOS,
  ...RULE_DEMOS,
  ...BEHAVIOR_DEMOS,
];

const showOutput = (id: string, target: string, text: string): void => {
  const element = document.getElementById(id);
  if (element) element.textContent = `${target}: ${text}`;
};

export const initCombinations = (pickers: Map<string, DatepickerUI>): void => {
  for (const [target, outputId] of RULE_OUTPUTS) {
    const picker = pickers.get(target);
    if (!picker) continue;
    picker.on("error", (data) => {
      showOutput(outputId, target, `${data.code} - ${data.message}`);
    });
    picker.on("confirm", () => {
      showOutput(outputId, target, "valid");
    });
  }
};
