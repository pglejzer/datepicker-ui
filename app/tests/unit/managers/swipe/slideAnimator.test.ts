import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMINGS } from "@/constants/timings";
import { createSlideAnimator } from "@/managers/swipe/slideAnimator";

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

describe("createSlideAnimator", () => {
  let track: HTMLElement;
  let animate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    track = document.createElement("div");
    animate = vi.fn(() => ({
      finished: Promise.resolve(),
      cancel: vi.fn(),
    }));
    track.animate = animate as unknown as typeof track.animate;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("slides the transform with full motion and completes after it finishes", async () => {
    stubReducedMotion(false);
    const complete = vi.fn();

    createSlideAnimator(track, true).run(
      "translateX(0)",
      "translateX(-100%)",
      complete,
    );

    expect(animate).toHaveBeenCalledTimes(1);
    const [frames] = animate.mock.calls[0] as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(frames).toEqual([
      { transform: "translateX(0)" },
      { transform: "translateX(-100%)" },
    ]);
    expect(complete).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("completes synchronously and fades opacity under reduced motion", () => {
    stubReducedMotion(true);
    const complete = vi.fn();

    createSlideAnimator(track, true).run(
      "translateX(0)",
      "translateX(-100%)",
      complete,
    );

    expect(complete).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, timing] = animate.mock.calls[0] as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(frames).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(frames.every((frame) => !("transform" in frame))).toBe(true);
    expect(timing.duration).toBe(TIMINGS.REDUCED_FADE);
    expect(TIMINGS.REDUCED_FADE).toBe(150);
  });

  it("completes and does not animate when animation is off", () => {
    stubReducedMotion(false);
    const complete = vi.fn();

    createSlideAnimator(track, false).run(
      "translateX(0)",
      "translateX(-100%)",
      complete,
    );

    expect(complete).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });

  it("does not animate under reduced motion when animation is off", () => {
    stubReducedMotion(true);
    const complete = vi.fn();

    createSlideAnimator(track, false).run(
      "translateX(0)",
      "translateX(-100%)",
      complete,
    );

    expect(complete).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });
});
