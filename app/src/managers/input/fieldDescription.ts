import { createElement } from "../../utils/dom";

const DESCRIBED_BY = "aria-describedby";
const HIDDEN_CLASS = "dp-ui__visually-hidden";

export interface FieldDescription {
  setHint(hint: string): void;
  setError(message: string | null): void;
  destroy(): void;
}

const tokensOf = (field: HTMLElement): string[] =>
  (field.getAttribute(DESCRIBED_BY) ?? "")
    .split(/\s+/)
    .filter((token) => token !== "");

export function describeField(
  field: HTMLInputElement,
  container: HTMLElement,
  id: string,
  hint: string,
): FieldDescription {
  const element = createElement("span", HIDDEN_CLASS, { id });
  const error = createElement("span", undefined, { "aria-live": "polite" });
  const hintText = createElement("span");
  hintText.textContent = hint;
  element.append(error, " ", hintText);
  container.append(element);
  field.setAttribute(DESCRIBED_BY, [...tokensOf(field), id].join(" "));

  return {
    setHint: (next) => {
      if (hintText.textContent !== next) hintText.textContent = next;
    },
    setError: (message) => {
      const text = message ?? "";
      if (error.textContent !== text) error.textContent = text;
    },
    destroy: () => {
      element.remove();
      const rest = tokensOf(field).filter((token) => token !== id);
      if (rest.length === 0) {
        field.removeAttribute(DESCRIBED_BY);
      } else {
        field.setAttribute(DESCRIBED_BY, rest.join(" "));
      }
    },
  };
}
