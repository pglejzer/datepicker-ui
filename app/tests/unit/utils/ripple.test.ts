import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMINGS } from "@/constants/timings";
import { attachRipple } from "@/utils/ripple";

const PRESSED = "dp-ui--ripple-pressed";
const RIPPLING = "dp-ui--ripple-active";
const FRAME = 20;

const setup = (): {
  root: HTMLElement;
  button: HTMLButtonElement;
  label: HTMLSpanElement;
  controller: AbortController;
} => {
  const root = document.createElement("div");
  const button = document.createElement("button");
  button.className = "target";
  const label = document.createElement("span");
  button.append(label);
  root.append(button);
  document.body.append(root);
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
    left: 10,
    top: 20,
    width: 40,
    height: 30,
  } as DOMRect);
  const controller = new AbortController();
  attachRipple(root, ".target", controller.signal);
  return { root, button, label, controller };
};

const down = (target: Element, init: PointerEventInit = {}): void => {
  target.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 25,
      clientY: 35,
      pointerType: "mouse",
      button: 0,
      ...init,
    }),
  );
};

const fire = (target: Element, type: string): void => {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: type !== "pointerleave" }),
  );
};

describe("attachRipple", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("positions the ripple at the press point and sizes it from the host", () => {
    const { button, label } = setup();

    down(label);

    expect(button).toHaveClass(PRESSED);
    expect(button.style.getPropertyValue("--dp-ui-ripple-x")).toBe("15px");
    expect(button.style.getPropertyValue("--dp-ui-ripple-y")).toBe("15px");
    expect(button.style.getPropertyValue("--dp-ui-ripple-size")).toBe("80px");
    expect(button.style.getPropertyValue("--dp-ui-ripple-duration")).toBe(
      `${String(TIMINGS.RIPPLE)}ms`,
    );
  });

  it("runs the ripple animation for its duration then clears it", async () => {
    const { button } = setup();

    down(button);
    expect(button).not.toHaveClass(RIPPLING);
    await vi.advanceTimersByTimeAsync(FRAME);
    expect(button).toHaveClass(RIPPLING);

    await vi.advanceTimersByTimeAsync(TIMINGS.RIPPLE);
    expect(button).not.toHaveClass(RIPPLING);
    expect(button).toHaveClass(PRESSED);
  });

  it("restarts the animation on a second press", async () => {
    const { button } = setup();
    down(button);
    await vi.advanceTimersByTimeAsync(FRAME);
    expect(button).toHaveClass(RIPPLING);

    down(button);

    expect(button).not.toHaveClass(RIPPLING);
    await vi.advanceTimersByTimeAsync(FRAME);
    expect(button).toHaveClass(RIPPLING);
  });

  it("keeps only the pressed state with prefers-reduced-motion", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const { button } = setup();

    down(button);
    await vi.advanceTimersByTimeAsync(TIMINGS.RIPPLE + 10);

    expect(button).toHaveClass(PRESSED);
    expect(button).not.toHaveClass(RIPPLING);
  });

  it.each(["pointerup", "pointercancel"])("releases on %s", (type) => {
    const { button } = setup();
    down(button);

    fire(button, type);

    expect(button).not.toHaveClass(PRESSED);
  });

  it("releases when the pointer leaves the host", () => {
    const { button } = setup();
    down(button);

    fire(button, "pointerleave");

    expect(button).not.toHaveClass(PRESSED);
  });

  it("ignores disabled hosts", () => {
    const { button } = setup();
    button.disabled = true;
    down(button);
    expect(button).not.toHaveClass(PRESSED);

    button.disabled = false;
    button.setAttribute("aria-disabled", "true");
    down(button);
    expect(button).not.toHaveClass(PRESSED);
  });

  it("ignores a secondary mouse button but not a touch press", () => {
    const { button } = setup();

    down(button, { button: 2 });
    expect(button).not.toHaveClass(PRESSED);

    down(button, { pointerType: "touch", button: -1 });
    expect(button).toHaveClass(PRESSED);
  });

  it("ignores presses outside the selector", () => {
    const { root, button } = setup();
    const other = document.createElement("div");
    root.append(other);

    down(other);

    expect(button).not.toHaveClass(PRESSED);
    expect(other).not.toHaveClass(PRESSED);
  });

  it("stops reacting once the signal aborts", () => {
    const { button, controller } = setup();
    controller.abort();

    down(button);

    expect(button).not.toHaveClass(PRESSED);
  });
});
