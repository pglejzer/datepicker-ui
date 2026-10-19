import { DEFAULT_DATEPICKER_OPTIONS } from "./defaults";
import type { OptionIssue } from "./pick";
import type { ResolvedPreset } from "./types";

const OPTION = "calendar.range.presets";

function toPreset(item: unknown): ResolvedPreset | null {
  if (typeof item !== "object" || item === null) return null;
  const label: unknown = Reflect.get(item, "label");
  const value: unknown = Reflect.get(item, "value");
  if (typeof label !== "string" || label === "") return null;
  if (typeof value === "function") {
    return {
      label,
      value: (): unknown => Reflect.apply(value, undefined, []),
    };
  }
  if (typeof value === "object" && value !== null) {
    return { label, value: () => value };
  }
  return null;
}

export function resolvePresets(
  value: unknown,
  issues: OptionIssue[],
): readonly ResolvedPreset[] {
  if (value === undefined) return DEFAULT_DATEPICKER_OPTIONS.calendar.presets;
  if (!Array.isArray(value)) {
    issues.push({ option: OPTION, value });
    return DEFAULT_DATEPICKER_OPTIONS.calendar.presets;
  }
  const items: unknown[] = value;
  const presets: ResolvedPreset[] = [];
  for (const item of items) {
    const preset = toPreset(item);
    if (preset === null) {
      issues.push({ option: OPTION, value: item });
    } else {
      presets.push(preset);
    }
  }
  return presets;
}
