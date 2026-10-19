import type { PlainDate } from "@/types/date";
import type { ResolvedPreset } from "@/datepicker/options/types";
import { rethrowLater } from "@/utils/rethrow";
import { toSelection } from "@/utils/selection/value";

export interface PresetRange {
  readonly start: PlainDate;
  readonly end: PlainDate;
}

export function resolvePreset(preset: ResolvedPreset): PresetRange | null {
  let raw: unknown;
  try {
    raw = preset.value();
  } catch (error) {
    rethrowLater(error);
    return null;
  }
  const selection = toSelection(raw, "range", "day");
  if (selection?.mode !== "range") return null;
  const { start, end } = selection;
  if (start === null || end === null) return null;
  return { start, end };
}
