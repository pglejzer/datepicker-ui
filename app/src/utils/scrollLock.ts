import { isDocument } from "./node";

const SCROLLBAR_GAP_PROPERTY = "--dp-ui-scrollbar-gap";
const SCROLLING_OVERFLOW = ["auto", "scroll"];

interface SavedScrollStyles {
  element: HTMLElement;
  overflow: string;
  paddingRight: string;
}

let lockCount = 0;
let savedStyles: SavedScrollStyles[] = [];
let savedGap = "";

const isScrollContainer = (element: HTMLElement): boolean =>
  SCROLLING_OVERFLOW.includes(window.getComputedStyle(element).overflowY);

function lockElement(element: HTMLElement): number {
  const { style } = element;
  const widthBefore = element.clientWidth;
  const paddingBefore =
    parseFloat(window.getComputedStyle(element).paddingRight) || 0;
  savedStyles.push({
    element,
    overflow: style.overflow,
    paddingRight: style.paddingRight,
  });
  style.overflow = "hidden";
  const gap = Math.max(0, element.clientWidth - widthBefore);
  if (gap > 0) style.paddingRight = `${String(paddingBefore + gap)}px`;
  return gap;
}

function acquire(): void {
  if (lockCount === 0) {
    const { body, documentElement: root } = document;
    const bodyGap = isScrollContainer(body) ? lockElement(body) : 0;
    const rootGap = lockElement(root);
    savedGap = root.style.getPropertyValue(SCROLLBAR_GAP_PROPERTY);
    root.style.setProperty(
      SCROLLBAR_GAP_PROPERTY,
      `${String(Math.max(bodyGap, rootGap))}px`,
    );
  }
  lockCount += 1;
}

function release(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;
  savedStyles.forEach(({ element, overflow, paddingRight }) => {
    element.style.overflow = overflow;
    element.style.paddingRight = paddingRight;
  });
  const root = document.documentElement;
  if (savedGap) {
    root.style.setProperty(SCROLLBAR_GAP_PROPERTY, savedGap);
  } else {
    root.style.removeProperty(SCROLLBAR_GAP_PROPERTY);
  }
  savedStyles = [];
  savedGap = "";
}

export function lockScroll(): () => void {
  if (!isDocument()) return () => undefined;
  acquire();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    release();
  };
}
