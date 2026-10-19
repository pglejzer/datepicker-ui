import type { DatepickerOptions } from "../../types/options";

export function mergeOptions(
  base: DatepickerOptions,
  patch: DatepickerOptions,
): DatepickerOptions {
  const merged: DatepickerOptions = {};
  if (base.calendar || patch.calendar) {
    merged.calendar = { ...base.calendar, ...patch.calendar };
  }
  if (base.ui || patch.ui) {
    const ui = { ...base.ui, ...patch.ui };
    if (base.ui?.inline || patch.ui?.inline) {
      ui.inline = { ...base.ui?.inline, ...patch.ui?.inline };
    }
    if (base.ui?.yearRange || patch.ui?.yearRange) {
      ui.yearRange = { ...base.ui?.yearRange, ...patch.ui?.yearRange };
    }
    merged.ui = ui;
  }
  if (base.labels || patch.labels) {
    merged.labels = { ...base.labels, ...patch.labels };
  }
  if (base.behavior || patch.behavior) {
    merged.behavior = { ...base.behavior, ...patch.behavior };
  }
  if (base.callbacks || patch.callbacks) {
    merged.callbacks = { ...base.callbacks, ...patch.callbacks };
  }
  return merged;
}
