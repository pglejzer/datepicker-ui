const ANCHOR_NAME = "anchor-name";
const ANCHOR_VARIABLE = "--dp-ui-anchor-name";

export const supportsAnchorPositioning = (root: HTMLElement): boolean =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("position-try-fallbacks", "flip-block") &&
  typeof root.showPopover === "function";

export const createAnchorName = (instanceId: string): string =>
  `--dp-ui-anchor-${instanceId.replace(/[^\w-]/g, "-")}`;

export const applyAnchor = (
  root: HTMLElement,
  anchor: HTMLElement,
  name: string,
): (() => void) => {
  const { style } = anchor;
  const previous = style.getPropertyValue(ANCHOR_NAME);
  style.setProperty(ANCHOR_NAME, name);
  root.style.setProperty(ANCHOR_VARIABLE, name);
  root.setAttribute("data-positioning", "anchor");
  return (): void => {
    if (previous) {
      style.setProperty(ANCHOR_NAME, previous);
    } else {
      style.removeProperty(ANCHOR_NAME);
    }
  };
};

export const overflowsInline = (
  root: HTMLElement,
  anchor: HTMLElement,
  rtl: boolean,
): boolean => {
  const rect = anchor.getBoundingClientRect();
  const width = root.offsetWidth;
  if (rtl) return rect.right - width < 0;
  return rect.left + width > root.ownerDocument.documentElement.clientWidth;
};

export const resolveAnchoredPlacement = (
  root: HTMLElement,
  anchor: HTMLElement,
): void => {
  const isAbove =
    root.getBoundingClientRect().top < anchor.getBoundingClientRect().top;
  root.setAttribute("data-placement", isAbove ? "top" : "bottom");
};
