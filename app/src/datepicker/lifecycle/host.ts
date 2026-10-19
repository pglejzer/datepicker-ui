import { isDocument } from "../../utils/node";

const HOST_CLASS = "dp-ui";
const INPUT_ATTRIBUTES = [
  "class",
  "name",
  "aria-invalid",
  "aria-describedby",
] as const;

export interface HostTarget {
  readonly input: HTMLInputElement;
  readonly host: HTMLElement;
  readonly createdHost: boolean;
}

export interface HostSnapshot {
  readonly target: HostTarget;
  readonly hostHadClass: boolean;
  readonly inputAttributes: ReadonlyMap<string, string | null>;
}

function findElement(target: string | HTMLElement): Element | null {
  return typeof target === "string" ? document.querySelector(target) : target;
}

function findInput(element: Element | null): HTMLInputElement | null {
  if (element instanceof HTMLInputElement) {
    return element;
  }
  return element?.querySelector("input") ?? null;
}

function wrapInput(input: HTMLInputElement): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = HOST_CLASS;
  input.before(wrapper);
  wrapper.append(input);
  return wrapper;
}

export function attachHost(target: string | HTMLElement): HostTarget {
  if (!isDocument()) {
    throw new Error("DatepickerUI needs a document");
  }
  const element = findElement(target);
  const input = findInput(element);
  if (input === null) {
    throw new Error("DatepickerUI could not find an input element");
  }
  const parent = input.parentElement;
  if (
    parent !== null &&
    (element !== input || parent.classList.contains(HOST_CLASS))
  ) {
    return { input, host: parent, createdHost: false };
  }
  return { input, host: wrapInput(input), createdHost: true };
}

export function claimHost(target: HostTarget): HostSnapshot {
  const { input, host, createdHost } = target;
  const inputAttributes = new Map<string, string | null>();
  for (const name of INPUT_ATTRIBUTES) {
    inputAttributes.set(name, input.getAttribute(name));
  }
  const hostHadClass = host.classList.contains(HOST_CLASS);
  host.classList.add(HOST_CLASS);
  return {
    target: { input, host, createdHost },
    hostHadClass,
    inputAttributes,
  };
}

export function releaseHost(snapshot: HostSnapshot): void {
  const { input, host, createdHost } = snapshot.target;
  for (const [name, value] of snapshot.inputAttributes) {
    if (value === null) {
      input.removeAttribute(name);
    } else {
      input.setAttribute(name, value);
    }
  }
  if (createdHost) {
    if (input.parentNode === host) {
      host.replaceWith(input);
    } else {
      host.remove();
    }
    return;
  }
  if (!snapshot.hostHadClass) {
    host.classList.remove(HOST_CLASS);
  }
}
