import { isNode } from "./node";

const POINTER_MODALITY_CLASS = "dp-ui--pointer";
const MODIFIER_KEYS: readonly string[] = ["Shift", "Control", "Alt", "Meta"];

export function prefersReducedMotion(): boolean {
  if (isNode() || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type MotionMode = "full" | "reduced" | "none";

export function motionMode(animation: boolean): MotionMode {
  if (!animation) return "none";
  return prefersReducedMotion() ? "reduced" : "full";
}

export function announce(region: HTMLElement, message: string): void {
  region.textContent = "";
  region.textContent = message;
}

export function trackPointerModality(root: HTMLElement): () => void {
  const doc = root.ownerDocument;

  const markPointer = (): void => {
    root.classList.add(POINTER_MODALITY_CLASS);
  };

  const markKeyboard = (event: KeyboardEvent): void => {
    if (!MODIFIER_KEYS.includes(event.key)) {
      root.classList.remove(POINTER_MODALITY_CLASS);
    }
  };

  root.addEventListener("pointerdown", markPointer, true);
  doc.addEventListener("keydown", markKeyboard, true);

  return () => {
    root.removeEventListener("pointerdown", markPointer, true);
    doc.removeEventListener("keydown", markKeyboard, true);
  };
}
