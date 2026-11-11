import { DOCKED_VIEWPORT_MARGIN } from "@/constants/constants";

/**
 * Whether a docked surface fits the window entirely below its anchor or
 * entirely above it, keeping an 8 px margin to the window edge. These are
 * the two sides the popover tries, below first. The anchor is measured where
 * it is now, so call it while the surface is shown.
 */
export function fitsViewport(root: HTMLElement, anchor: HTMLElement): boolean {
  const surface = Math.max(
    root.getBoundingClientRect().height,
    root.scrollHeight,
  );
  const { top, bottom } = anchor.getBoundingClientRect();
  const below = window.innerHeight - bottom - DOCKED_VIEWPORT_MARGIN;
  const above = top - DOCKED_VIEWPORT_MARGIN;
  return surface <= Math.max(below, above);
}
