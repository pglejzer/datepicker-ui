import { vi } from "vitest";

export const mountInput = (
  attrs: Record<string, string> = {},
  parent: HTMLElement = document.body,
): HTMLInputElement => {
  const input = document.createElement("input");
  input.type = "text";
  for (const [name, value] of Object.entries(attrs)) {
    input.setAttribute(name, value);
  }
  parent.appendChild(input);
  return input;
};

export const cleanupDom = (): void => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("style");
};

export const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(1000);
};

export const surface = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".dp-ui__container");

export const surfaces = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(".dp-ui__container"));

export const selectedCell = (): HTMLElement | null =>
  document.querySelector<HTMLElement>("td.dp-ui__date--selected");

export const clickDate = (iso: string): void => {
  const cell = document.querySelector<HTMLElement>(
    `td.dp-ui__date[data-date="${iso}"]`,
  );
  if (!cell) {
    throw new Error(`No date cell for ${iso}`);
  }
  cell.click();
};

export const clickSelector = (selector: string): void => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Nothing matches ${selector}`);
  }
  element.click();
};

export const clickConfirm = (): void => {
  clickSelector(".dp-ui__text-button--confirm");
};

export const clickCancel = (): void => {
  clickSelector(".dp-ui__text-button--cancel");
};
