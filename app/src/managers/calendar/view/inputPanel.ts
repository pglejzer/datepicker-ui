import type { CoreState } from "@/datepicker/CoreState";
import { createDateInputPanel } from "@/managers/pickers/DateInputPanel";
import type { DateRules, PickerActions } from "@/types/internal";
import { unavailableMessage } from "@/utils/selection/messages";
import { showsFooter } from "@/utils/surface";

export interface InputPanelContext {
  readonly core: CoreState;
  readonly actions: PickerActions;
  readonly rules: DateRules;
}

export const createInputPanelParts = (
  context: InputPanelContext,
): HTMLElement[] => {
  const { core, actions, rules } = context;
  const { pattern, labels, limits } = core.options;
  return [
    createDateInputPanel({
      instanceId: core.instanceId,
      draft: core.draft,
      pattern,
      labels,
      rules,
      limits,
      messageFor: (reason) => unavailableMessage(reason, core.options),
      onDraft: (selection) => {
        actions.typeDraft(selection);
      },
      onSubmit: () => {
        if (showsFooter(core.options.footerExplicit, core.mode)) {
          actions.confirm();
        } else {
          actions.submitDraft();
        }
      },
    }),
  ];
};
