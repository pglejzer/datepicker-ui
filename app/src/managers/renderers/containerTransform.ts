import { EASING, TIMINGS } from "@/constants/timings";
import type { MotionMode } from "@/utils/accessibility";
import { createGhost } from "./ghost";

interface ContainerBox {
  readonly width: number;
  readonly height: number;
  readonly radius: string;
}

interface SharedBox {
  readonly x: number;
  readonly y: number;
  readonly height: number;
}

const MORPHING_CLASS = "dp-ui__container--morphing";
const SHARED_SELECTOR = ".dp-ui__headline";
const running = new WeakMap<HTMLElement, Animation>();

const measure = (container: HTMLElement): ContainerBox => {
  const rect = container.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    radius: getComputedStyle(container).borderRadius,
  };
};

const measureShared = (
  container: HTMLElement,
  shared: HTMLElement | null,
): SharedBox | null => {
  if (shared === null) return null;
  const outer = container.getBoundingClientRect();
  const rect = shared.getBoundingClientRect();
  const rtl = getComputedStyle(shared).direction === "rtl";
  return {
    x: rtl ? outer.right - rect.right : rect.left - outer.left,
    y: rect.top - outer.top,
    height: rect.height,
  };
};

const keyframeOf = (box: ContainerBox): Keyframe => ({
  width: `${String(box.width)}px`,
  height: `${String(box.height)}px`,
  borderRadius: box.radius,
});

const moveShared = (
  shared: HTMLElement,
  before: SharedBox,
  after: SharedBox,
): void => {
  if (after.height === 0) return;
  const rtl = getComputedStyle(shared).direction === "rtl";
  const dx = (before.x - after.x) * (rtl ? -1 : 1);
  const dy = before.y - after.y;
  const scale = before.height / after.height;
  if (dx === 0 && dy === 0 && scale === 1) return;
  const origin = rtl ? "top right" : "top left";
  shared.animate(
    [
      {
        transform: `translate(${String(dx)}px, ${String(dy)}px) scale(${String(scale)})`,
        transformOrigin: origin,
      },
      { transform: "none", transformOrigin: origin },
    ],
    { duration: TIMINGS.VIEW_SWITCH, easing: EASING.EMPHASIZED },
  );
};

export const morphContainer = (
  container: HTMLElement,
  change: () => void,
  motion: MotionMode,
): Animation | null => {
  if (motion === "none" || typeof container.animate !== "function") {
    change();
    return null;
  }
  if (motion === "reduced") {
    const box = measure(container);
    const fade = createGhost(container, box.width, box.height);
    change();
    fade?.show();
    return null;
  }
  const shared = container.querySelector<HTMLElement>(SHARED_SELECTOR);
  const before = measure(container);
  const sharedBefore = measureShared(container, shared);
  const ghost = createGhost(container, before.width, before.height);
  change();
  const after = measure(container);
  const sharedAfter = measureShared(container, shared);
  container.classList.add(MORPHING_CLASS);
  const animation = container.animate([keyframeOf(before), keyframeOf(after)], {
    duration: TIMINGS.VIEW_SWITCH,
    easing: EASING.EMPHASIZED,
  });
  running.set(container, animation);
  ghost?.show();
  if (shared !== null && sharedBefore !== null && sharedAfter !== null) {
    moveShared(shared, sharedBefore, sharedAfter);
  }
  const release = (): void => {
    ghost?.remove();
    if (running.get(container) !== animation) return;
    running.delete(container);
    container.classList.remove(MORPHING_CLASS);
  };
  void animation.finished.then(release, release);
  return animation;
};
