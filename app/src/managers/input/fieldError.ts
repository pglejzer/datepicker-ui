const ERROR_CLASS = "dp-ui--error";

export function markField(
  input: HTMLInputElement,
  host: HTMLElement,
  message: string,
): void {
  input.setAttribute("aria-invalid", "true");
  host.classList.add(ERROR_CLASS);
  input.setCustomValidity(message);
}

export function clearField(input: HTMLInputElement, host: HTMLElement): void {
  input.removeAttribute("aria-invalid");
  host.classList.remove(ERROR_CLASS);
  input.setCustomValidity("");
}
