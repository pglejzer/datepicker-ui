import { TIMINGS } from "../constants/timings";
import { prefersReducedMotion } from "./accessibility";

const PRESSED_CLASS = "dp-ui--ripple-pressed";
const RIPPLING_CLASS = "dp-ui--ripple-active";

const isDisabled = (element: Element): boolean =>
  element.getAttribute("aria-disabled") === "true" ||
  (element instanceof HTMLButtonElement && element.disabled);

export function attachRipple(
  root: HTMLElement,
  selector: string,
  signal: AbortSignal,
): void {
  const hostOf = (target: EventTarget | null): HTMLElement | null =>
    target instanceof Element ? target.closest<HTMLElement>(selector) : null;

  const release = (event: Event): void => {
    hostOf(event.target)?.classList.remove(PRESSED_CLASS);
  };

  const press = (event: PointerEvent): void => {
    const host = hostOf(event.target);
    if (!host || !root.contains(host) || isDisabled(host)) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    host.classList.remove(RIPPLING_CLASS);
    const { left, top, width, height } = host.getBoundingClientRect();
    host.style.setProperty(
      "--dp-ui-ripple-x",
      `${String(event.clientX - left)}px`,
    );
    host.style.setProperty(
      "--dp-ui-ripple-y",
      `${String(event.clientY - top)}px`,
    );
    host.style.setProperty(
      "--dp-ui-ripple-size",
      `${String(Math.max(width, height) * 2)}px`,
    );
    host.style.setProperty(
      "--dp-ui-ripple-duration",
      `${String(TIMINGS.RIPPLE)}ms`,
    );
    host.classList.add(PRESSED_CLASS);
    host.addEventListener("pointerleave", release, { once: true, signal });

    if (!prefersReducedMotion()) {
      requestAnimationFrame(() => {
        host.classList.add(RIPPLING_CLASS);
      });
      window.setTimeout(() => {
        host.classList.remove(RIPPLING_CLASS);
      }, TIMINGS.RIPPLE);
    }
  };

  root.addEventListener("pointerdown", press, { signal });
  root.addEventListener("pointerup", release, { signal });
  root.addEventListener("pointercancel", release, { signal });
}
