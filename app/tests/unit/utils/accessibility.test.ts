import { afterEach, describe, expect, it, vi } from "vitest";
import { motionMode } from "@/utils/accessibility";

const stubReducedMotion = (matches: boolean): void => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
};

describe("motionMode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is none when animation is off, even under reduced motion", () => {
    stubReducedMotion(true);
    expect(motionMode(false)).toBe("none");
    stubReducedMotion(false);
    expect(motionMode(false)).toBe("none");
  });

  it("is reduced when animation is on and the user prefers reduced motion", () => {
    stubReducedMotion(true);
    expect(motionMode(true)).toBe("reduced");
  });

  it("is full when animation is on and nothing is reduced", () => {
    stubReducedMotion(false);
    expect(motionMode(true)).toBe("full");
  });
});
