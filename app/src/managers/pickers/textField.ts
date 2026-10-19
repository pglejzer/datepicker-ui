import { createElement } from "@/utils/dom";

export interface TextFieldOptions {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly hint: string;
  readonly value: string;
  readonly describedById?: string;
}

export interface TextField {
  readonly element: HTMLDivElement;
  readonly input: HTMLInputElement;
  getValue(): string;
  setValue(value: string): void;
  setError(message: string | null): void;
}

const ERROR_CLASS = "dp-ui__text-field--error";

export function createTextField(options: TextFieldOptions): TextField {
  const supportingId = options.describedById ?? `${options.id}-supporting`;
  const element = createElement("div", "dp-ui__text-field");
  const input = createElement("input", "dp-ui__text-field-input", {
    id: options.id,
    type: "text",
    inputmode: "numeric",
    autocomplete: "off",
    placeholder: options.placeholder,
    tabindex: "0",
    "aria-invalid": "false",
    "aria-describedby": supportingId,
  });
  input.value = options.value;
  const label = createElement("label", "dp-ui__text-field-label", {
    for: options.id,
  });
  label.textContent = options.label;
  const supporting = createElement("div", "dp-ui__text-field-supporting", {
    id: supportingId,
    "aria-live": "polite",
  });
  supporting.textContent = options.hint;
  element.append(input, label, supporting);

  return {
    element,
    input,
    getValue: () => input.value,
    setValue: (value) => {
      input.value = value;
    },
    setError: (message) => {
      const hasError = message !== null;
      element.classList.toggle(ERROR_CLASS, hasError);
      input.setAttribute("aria-invalid", hasError ? "true" : "false");
      const text = message ?? options.hint;
      if (supporting.textContent !== text) supporting.textContent = text;
    },
  };
}
