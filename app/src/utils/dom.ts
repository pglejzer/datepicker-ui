import { isDocument } from "./node";

export function resolveElement(
  target: string | HTMLElement | null,
  scope?: ParentNode,
): HTMLElement | null {
  if (target === null) return null;
  if (typeof target !== "string") return target;
  if (!isDocument()) return null;
  return (
    scope?.querySelector<HTMLElement>(target) ??
    document.querySelector<HTMLElement>(target)
  );
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  }
  return element;
}

export function scrollWithin(
  container: HTMLElement,
  item: Element,
  align: "center" | "nearest",
): void {
  const box = container.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  if (align === "center") {
    container.scrollTop += rect.top - box.top - (box.height - rect.height) / 2;
  } else if (rect.top < box.top) {
    container.scrollTop += rect.top - box.top;
  } else if (rect.bottom > box.bottom) {
    container.scrollTop += rect.bottom - box.bottom;
  }
}

export function createButton(
  className: string,
  label: string,
  icon?: string,
): HTMLButtonElement {
  const button = createElement("button", className, { type: "button" });
  if (icon) {
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
  } else {
    button.textContent = label;
  }
  return button;
}
