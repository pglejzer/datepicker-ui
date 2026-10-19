import { resolveElement } from "../../utils/dom";
import type { LifecycleContext } from "./context";

const ATTRIBUTES = ["class", "name", "aria-invalid"] as const;

export function resolveEndInput(
  context: LifecycleContext,
): HTMLInputElement | null {
  const { core, emitter } = context;
  const { endInput, mode } = core.options;
  if (mode !== "range" || endInput === null) {
    return null;
  }
  const element = resolveElement(endInput, core.host);
  if (element instanceof HTMLInputElement && element !== core.input) {
    return element;
  }
  emitter.emit("error", {
    code: "invalid-option",
    message: "ui.endInput does not match an input element",
    option: "ui.endInput",
  });
  return null;
}

export function claimEndInput(input: HTMLInputElement): () => void {
  const attributes = new Map<string, string | null>();
  for (const name of ATTRIBUTES) {
    attributes.set(name, input.getAttribute(name));
  }
  return () => {
    for (const [name, value] of attributes) {
      if (value === null) {
        input.removeAttribute(name);
      } else {
        input.setAttribute(name, value);
      }
    }
  };
}
