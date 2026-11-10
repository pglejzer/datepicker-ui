import { TIMINGS } from "../../constants/timings";

export interface SurfaceHost {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  open(): Promise<void>;
  close(): Promise<void>;
  destroy(): void;
  /** Renames the surface by the constructor's rule: a non-empty `labelledBy` sets `aria-labelledby` and removes `aria-label`; otherwise `label` becomes the `aria-label` and `aria-labelledby` is removed. */
  setLabel(label: string, labelledBy?: string): void;
}

const MOTION_PROBE_PROPERTY = "--dp-ui-motion-surface-exit";

const isMotionDisabled = (element: HTMLElement): boolean => {
  const declared = getComputedStyle(element)
    .getPropertyValue(MOTION_PROBE_PROPERTY)
    .trim();
  return declared.endsWith("ms") && parseFloat(declared) === 0;
};

export function nameSurface(
  root: HTMLElement,
  label: string,
  labelledBy: string | undefined,
): void {
  if (labelledBy !== undefined && labelledBy !== "") {
    root.setAttribute("aria-labelledby", labelledBy);
    root.removeAttribute("aria-label");
    return;
  }
  root.setAttribute("aria-label", label);
  root.removeAttribute("aria-labelledby");
}

export function waitForExit(element: HTMLElement): Promise<void> {
  if (isMotionDisabled(element)) return Promise.resolve();
  if (typeof element.getAnimations !== "function") {
    return new Promise((resolve) => {
      setTimeout(resolve, TIMINGS.SURFACE_EXIT);
    });
  }
  const running = element.getAnimations({ subtree: true });
  return Promise.allSettled(
    running.map((animation) => animation.finished),
  ).then(() => undefined);
}
