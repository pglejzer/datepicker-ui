import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMINGS } from "@/constants/timings";
import { morphContainer } from "@/managers/renderers/containerTransform";
import { setConfirmEnabled } from "@/managers/renderers/shellActions";

const MORPHING = "dp-ui__container--morphing";
const GHOST = ".dp-ui__ghost";

interface FakeAnimation {
  finished: Promise<FakeAnimation>;
  onfinish: ((event: Event) => void) | null;
  oncancel: ((event: Event) => void) | null;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: () => void;
  cancel: () => void;
  finish: () => void;
}

const createFakeAnimation = (): FakeAnimation => {
  const listeners = new Map<string, (() => void)[]>();
  let resolveFinished: (value: FakeAnimation) => void = () => {};
  let rejectFinished: (reason: Error) => void = () => {};
  const finished = new Promise<FakeAnimation>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });
  finished.catch(() => undefined);
  const fire = (type: "finish" | "cancel"): void => {
    for (const listener of listeners.get(type) ?? []) {
      listener();
    }
    const handler = type === "finish" ? animation.onfinish : animation.oncancel;
    handler?.(new Event(type));
  };
  const animation: FakeAnimation = {
    finished,
    onfinish: null,
    oncancel: null,
    addEventListener: (type, listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: () => {},
    cancel: () => {
      fire("cancel");
      rejectFinished(new Error("AbortError"));
    },
    finish: () => {
      fire("finish");
      resolveFinished(animation);
    },
  };
  return animation;
};

const sizeSequence = (
  element: HTMLElement,
  sizes: { width: number; height: number }[],
): void => {
  let call = 0;
  element.getBoundingClientRect = () => {
    const size = sizes[Math.min(call, sizes.length - 1)];
    call += 1;
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: size.width,
      bottom: size.height,
      width: size.width,
      height: size.height,
      toJSON: () => ({}),
    };
  };
};

describe("morphContainer", () => {
  let container: HTMLElement;
  let animate: ReturnType<typeof vi.fn>;
  let fake: FakeAnimation;

  beforeEach(() => {
    container = document.createElement("div");
    container.className = "dp-ui__container";
    document.body.appendChild(container);
    fake = createFakeAnimation();
    animate = vi.fn(() => fake);
    container.animate = animate as unknown as typeof container.animate;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("only runs the change and returns null when animate is false", () => {
    sizeSequence(container, [
      { width: 100, height: 100 },
      { width: 300, height: 300 },
    ]);
    const change = vi.fn();

    const result = morphContainer(container, change, "none");

    expect(result).toBeNull();
    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(container).not.toHaveClass(MORPHING);
    expect(container.querySelector(GHOST)).toBeNull();
  });

  it("reduced motion changes once, adds an inert ghost and does not animate", () => {
    sizeSequence(container, [
      { width: 100, height: 100 },
      { width: 300, height: 300 },
    ]);
    const change = vi.fn();

    const result = morphContainer(container, change, "reduced");

    expect(result).toBeNull();
    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(container).not.toHaveClass(MORPHING);
    const ghost = container.querySelector(GHOST);
    expect(ghost).not.toBeNull();
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost).toHaveAttribute("inert");
  });

  it("animates width, height and border-radius when the size changes", async () => {
    sizeSequence(container, [
      { width: 100, height: 100 },
      { width: 300, height: 200 },
    ]);
    const change = vi.fn();

    const result = morphContainer(container, change, "full");

    expect(result).toBe(fake);
    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, timing] = animate.mock.calls[0] as [
      Record<string, string>[],
      KeyframeAnimationOptions,
    ];
    expect(frames).toHaveLength(2);
    for (const frame of frames) {
      expect(Object.keys(frame)).toEqual(
        expect.arrayContaining(["width", "height", "borderRadius"]),
      );
    }
    expect(frames[0].width).toBe("100px");
    expect(frames[0].height).toBe("100px");
    expect(frames[1].width).toBe("300px");
    expect(frames[1].height).toBe("200px");
    expect(timing.duration).toBe(TIMINGS.VIEW_SWITCH);
    expect(container).toHaveClass(MORPHING);

    fake.finish();
    await fake.finished;
    await Promise.resolve();
    expect(container).not.toHaveClass(MORPHING);
  });

  it("drops the morphing class when the animation is cancelled", async () => {
    sizeSequence(container, [
      { width: 100, height: 100 },
      { width: 300, height: 200 },
    ]);

    morphContainer(container, vi.fn(), "full");
    expect(container).toHaveClass(MORPHING);

    fake.cancel();
    await Promise.resolve();
    expect(container).not.toHaveClass(MORPHING);
  });

  it("still crossfades when neither size nor radius changed", () => {
    sizeSequence(container, [{ width: 100, height: 100 }]);
    const change = vi.fn();

    const result = morphContainer(container, change, "full");

    expect(result).toBe(fake);
    expect(change).toHaveBeenCalledTimes(1);
    expect(container).toHaveClass(MORPHING);
    expect(container.querySelector(GHOST)).not.toBeNull();
  });

  it("overlays a snapshot of the old content that is removed afterwards", async () => {
    container.innerHTML =
      '<div id="old" name="old" class="dp-ui__headline">Old</div>';
    sizeSequence(container, [
      { width: 100, height: 100 },
      { width: 300, height: 200 },
    ]);

    morphContainer(
      container,
      () => {
        container
          .querySelector("#old")
          ?.replaceWith(document.createElement("p"));
      },
      "full",
    );

    const ghost = container.querySelector<HTMLElement>(GHOST);
    expect(ghost).not.toBeNull();
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost).toHaveAttribute("inert");
    expect(ghost).not.toHaveClass(MORPHING);
    expect(ghost?.style.getPropertyValue("inline-size")).toBe("100px");
    expect(ghost?.querySelector(".dp-ui__headline")).not.toBeNull();
    expect(ghost?.querySelector("[id], [name]")).toBeNull();

    await Promise.resolve();
    await Promise.resolve();
    expect(container.querySelector(GHOST)).toBeNull();
  });

  it("animates when only the border radius changes", () => {
    sizeSequence(container, [{ width: 100, height: 100 }]);
    container.style.borderRadius = "28px";

    const result = morphContainer(
      container,
      () => {
        container.style.borderRadius = "0px";
      },
      "full",
    );

    expect(result).toBe(fake);
    expect(animate).toHaveBeenCalledTimes(1);
  });
});

describe("setConfirmEnabled", () => {
  const build = (): {
    root: HTMLElement;
    confirm: HTMLButtonElement;
    save: HTMLButtonElement;
    cancel: HTMLButtonElement;
  } => {
    const root = document.createElement("div");
    const confirm = document.createElement("button");
    confirm.className = "dp-ui__text-button dp-ui__text-button--confirm";
    const save = document.createElement("button");
    save.className = "dp-ui__text-button dp-ui__text-button--save";
    const cancel = document.createElement("button");
    cancel.className = "dp-ui__text-button dp-ui__text-button--cancel";
    root.append(confirm, save, cancel);
    return { root, confirm, save, cancel };
  };

  it("disables confirm and save but not cancel", () => {
    const { root, confirm, save, cancel } = build();

    setConfirmEnabled(root, false);

    expect(confirm).toBeDisabled();
    expect(save).toBeDisabled();
    expect(cancel).not.toBeDisabled();
  });

  it("removes the disabled attribute when enabled again", () => {
    const { root, confirm, save } = build();
    setConfirmEnabled(root, false);

    setConfirmEnabled(root, true);

    expect(confirm).not.toHaveAttribute("disabled");
    expect(save).not.toHaveAttribute("disabled");
  });
});
