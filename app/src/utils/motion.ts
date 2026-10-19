import { EASING, TIMINGS } from "../constants/timings";

const toKebab = (name: string): string => name.toLowerCase().replace(/_/g, "-");

export function applyMotionVariables(
  root: HTMLElement,
  enabled: boolean,
): void {
  Object.entries(TIMINGS).forEach(([name, ms]) => {
    root.style.setProperty(
      `--dp-ui-motion-${toKebab(name)}`,
      `${String(enabled ? ms : 0)}ms`,
    );
  });
  Object.entries(EASING).forEach(([name, value]) => {
    root.style.setProperty(`--dp-ui-easing-${toKebab(name)}`, value);
  });
}
