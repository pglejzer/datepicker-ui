import type { PickerValue } from "../../types/types";

export interface OptionIssue {
  readonly option: string;
  readonly value: unknown;
}

export type Check<T> = (value: unknown) => T | undefined;

export function pick<T, F>(
  value: unknown,
  check: Check<T>,
  fallback: F,
  option: string,
  issues: OptionIssue[],
): T | F {
  if (value === undefined) return fallback;
  const checked = check(value);
  if (checked === undefined) {
    issues.push({ option, value });
    return fallback;
  }
  return checked;
}

export const isBoolean: Check<boolean> = (value) =>
  typeof value === "boolean" ? value : undefined;

export const isString: Check<string> = (value) =>
  typeof value === "string" ? value : undefined;

export const isCount: Check<number> = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;

export const isPositiveInteger: Check<number> = (value) =>
  typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : undefined;

export const isFunction: Check<(date: Date) => unknown> = (value) => {
  if (typeof value !== "function") return undefined;
  return (date: Date): unknown => Reflect.apply(value, undefined, [date]);
};

export const isValueFunction: Check<(value: PickerValue | null) => unknown> = (
  value,
) => {
  if (typeof value !== "function") return undefined;
  return (picked: PickerValue | null): unknown =>
    Reflect.apply(value, undefined, [picked]);
};

export const isPluralLabel: Check<string | Record<string, string>> = (
  value,
) => {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value);
  const label: Record<string, string> = {};
  for (const [key, text] of entries) {
    if (typeof text !== "string") return undefined;
    label[key] = text;
  }
  return entries.length > 0 ? label : undefined;
};

export const isTarget: Check<string | HTMLElement> = (value) => {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) {
    return value;
  }
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

export function oneOf<T extends string>(allowed: readonly T[]): Check<T> {
  return (value) => allowed.find((candidate) => candidate === value);
}
