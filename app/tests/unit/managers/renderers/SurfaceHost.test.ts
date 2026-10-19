import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForExit } from "@/managers/renderers/SurfaceHost";

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

describe("waitForExit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("under reduced motion waits for running animations to settle", async () => {
    stubReducedMotion(true);
    const element = document.createElement("div");
    document.body.append(element);
    let settle: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      settle = resolve;
    });
    element.getAnimations = (() => [
      { finished },
    ]) as unknown as typeof element.getAnimations;
    let done = false;

    const exit = waitForExit(element).then(() => {
      done = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(done).toBe(false);

    settle();
    await exit;
    expect(done).toBe(true);
  });

  it("resolves once a rejected animation settles", async () => {
    stubReducedMotion(true);
    const element = document.createElement("div");
    document.body.append(element);
    const finished = Promise.reject(new Error("AbortError"));
    finished.catch(() => undefined);
    element.getAnimations = (() => [
      { finished },
    ]) as unknown as typeof element.getAnimations;

    await expect(waitForExit(element)).resolves.toBeUndefined();
  });

  it("resolves at once when nothing is running", async () => {
    stubReducedMotion(true);
    const element = document.createElement("div");
    document.body.append(element);
    element.getAnimations = () => [];

    await expect(waitForExit(element)).resolves.toBeUndefined();
  });
});
