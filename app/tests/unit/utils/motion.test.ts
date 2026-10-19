import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EASING, TIMINGS } from "@/constants/timings";
import { applyMotionVariables } from "@/utils/motion";

const stubReducedMotion = (matches: boolean): void => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
};

describe("applyMotionVariables", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes durations in ms and the easing curves when enabled", () => {
    applyMotionVariables(root, true);

    expect(root.style.getPropertyValue("--dp-ui-motion-pager-settle")).toBe(
      "350ms",
    );
    expect(root.style.getPropertyValue("--dp-ui-easing-emphasized")).toBe(
      EASING.EMPHASIZED,
    );
    expect(
      root.style.getPropertyValue("--dp-ui-easing-emphasized-decelerate"),
    ).toBe(EASING.EMPHASIZED_DECELERATE);
    expect(
      root.style.getPropertyValue("--dp-ui-easing-emphasized-accelerate"),
    ).toBe(EASING.EMPHASIZED_ACCELERATE);
  });

  it("zeroes every duration when disabled", () => {
    applyMotionVariables(root, false);

    expect(root.style.getPropertyValue("--dp-ui-motion-pager-settle")).toBe(
      "0ms",
    );
    expect(root.style.getPropertyValue("--dp-ui-motion-surface-exit")).toBe(
      "0ms",
    );
  });

  it("keeps durations under prefers-reduced-motion so the fades still run", () => {
    stubReducedMotion(true);
    applyMotionVariables(root, true);

    expect(root.style.getPropertyValue("--dp-ui-motion-surface-exit")).toBe(
      `${String(TIMINGS.SURFACE_EXIT)}ms`,
    );
  });
});
