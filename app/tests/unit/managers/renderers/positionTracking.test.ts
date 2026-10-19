import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackPosition } from "@/managers/renderers/positionTracking";

interface ObserverStub {
  readonly callback: () => void;
  readonly observed: Element[];
  disconnected: boolean;
}

const installObserver = (): ObserverStub[] => {
  const instances: ObserverStub[] = [];
  class StubObserver {
    private readonly stub: ObserverStub;
    constructor(callback: () => void) {
      this.stub = { callback, observed: [], disconnected: false };
      instances.push(this.stub);
    }
    observe(element: Element): void {
      this.stub.observed.push(element);
    }
    unobserve(): void {}
    disconnect(): void {
      this.stub.disconnected = true;
    }
  }
  vi.stubGlobal("ResizeObserver", StubObserver);
  return instances;
};

const setup = (): {
  root: HTMLElement;
  anchor: HTMLElement;
  onUpdate: ReturnType<typeof vi.fn>;
  stop: () => void;
} => {
  const root = document.createElement("div");
  const anchor = document.createElement("input");
  document.body.append(anchor, root);
  const onUpdate = vi.fn();
  const stop = trackPosition(root, anchor, onUpdate);
  return { root, anchor, onUpdate, stop };
};

const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(50);
};

describe("trackPosition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "visualViewport");
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("does not update until something changes", async () => {
    const { onUpdate } = setup();

    await settle();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("updates once per frame after a window resize", async () => {
    const { onUpdate } = setup();

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("updates again for a later change", async () => {
    const { onUpdate } = setup();

    window.dispatchEvent(new Event("resize"));
    await settle();
    window.dispatchEvent(new Event("resize"));
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("updates when an element outside the root scrolls", async () => {
    const { anchor, onUpdate } = setup();

    anchor.dispatchEvent(new Event("scroll"));
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("updates when the window scrolls", async () => {
    const { onUpdate } = setup();

    window.dispatchEvent(new Event("scroll"));
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("ignores scrolling inside the tracked root", async () => {
    const { root, onUpdate } = setup();
    const inner = document.createElement("div");
    root.append(inner);

    inner.dispatchEvent(new Event("scroll"));
    root.dispatchEvent(new Event("scroll"));
    await settle();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("follows the visual viewport", async () => {
    const viewport = new EventTarget();
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    const { onUpdate, stop } = setup();

    viewport.dispatchEvent(new Event("resize"));
    await settle();
    viewport.dispatchEvent(new Event("scroll"));
    await settle();
    expect(onUpdate).toHaveBeenCalledTimes(2);

    stop();
    viewport.dispatchEvent(new Event("resize"));
    await settle();
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("observes the anchor and the root for size changes", async () => {
    const observers = installObserver();
    const { root, anchor, onUpdate } = setup();

    expect(observers).toHaveLength(1);
    expect(observers[0]?.observed).toEqual([anchor, root]);
    observers[0]?.callback();
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("works without ResizeObserver", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { onUpdate } = setup();

    window.dispatchEvent(new Event("resize"));
    await settle();

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  describe("stop", () => {
    it("removes every listener and disconnects the observer", async () => {
      const observers = installObserver();
      const { onUpdate, stop } = setup();

      stop();
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
      await settle();

      expect(onUpdate).not.toHaveBeenCalled();
      expect(observers[0]?.disconnected).toBe(true);
    });

    it("cancels an update that is already scheduled", async () => {
      const { onUpdate, stop } = setup();

      window.dispatchEvent(new Event("resize"));
      stop();
      await settle();

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("can be called twice", () => {
      const { stop } = setup();

      stop();

      expect(() => {
        stop();
      }).not.toThrow();
    });
  });
});
