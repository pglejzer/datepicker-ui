import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PopoverHost } from "@/managers/renderers/PopoverHost";

const setCssSupports = (supports: boolean): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    writable: true,
    value: { supports: () => supports },
  });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, "CSS", descriptor);
    else Reflect.deleteProperty(globalThis, "CSS");
  };
};

const withoutPopoverApi = (): (() => void) => {
  const proto = HTMLElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "showPopover");
  Object.defineProperty(proto, "showPopover", {
    configurable: true,
    writable: true,
    value: undefined,
  });
  return () => {
    if (descriptor) Object.defineProperty(proto, "showPopover", descriptor);
    else Reflect.deleteProperty(proto, "showPopover");
  };
};

const press = (target: Element, key: string): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

interface Fixture {
  readonly host: HTMLElement;
  readonly input: HTMLInputElement;
  readonly popover: PopoverHost;
  readonly onOutside: ReturnType<typeof vi.fn>;
  readonly onEscape: ReturnType<typeof vi.fn>;
}

const create = (): Fixture => {
  const host = document.createElement("div");
  const input = document.createElement("input");
  host.append(input);
  document.body.append(host);
  const onOutside = vi.fn();
  const onEscape = vi.fn();
  const popover = new PopoverHost({
    host,
    anchor: input,
    instanceId: "dp-ui-test",
    rtl: false,
    label: "Choose date",
    inside: [],
    ignoreOutsideClick: false,
    onOutside,
    onEscape,
  });
  return { host, input, popover, onOutside, onEscape };
};

describe("PopoverHost", () => {
  const restores: (() => void)[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => {
      restore();
    });
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Escape", () => {
    it("reports Escape pressed inside the popover", async () => {
      const { popover, onEscape } = create();
      await popover.open();

      const event = press(popover.root, "Escape");

      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(false);
    });

    it("ignores other keys and handled Escape events", async () => {
      const { popover, onEscape } = create();
      await popover.open();
      const inner = document.createElement("button");
      popover.root.append(inner);
      inner.addEventListener("keydown", (event) => {
        event.preventDefault();
      });

      press(popover.root, "Enter");
      press(inner, "Escape");

      expect(onEscape).not.toHaveBeenCalled();
    });

    it("ignores Escape and outside presses while closing", async () => {
      const { popover, onEscape, onOutside } = create();
      await popover.open();
      const closing = popover.close();

      press(popover.root, "Escape");
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true }),
      );
      await vi.advanceTimersByTimeAsync(1000);
      await closing;

      expect(onEscape).not.toHaveBeenCalled();
      expect(onOutside).not.toHaveBeenCalled();
    });
  });

  describe("open and close", () => {
    it("returns the same promise for repeated open() calls", () => {
      const { popover } = create();

      expect(popover.open()).toBe(popover.open());
    });

    it("does not show a destroyed popover", async () => {
      const { popover, host } = create();
      const root = popover.root;
      const show = vi.spyOn(root, "showPopover");
      popover.destroy();

      await expect(popover.open()).resolves.toBeUndefined();

      expect(show).not.toHaveBeenCalled();
      expect(host.querySelector(".dp-ui__container")).toBeNull();
    });

    it("destroys idempotently", async () => {
      const { popover } = create();
      await popover.open();

      popover.destroy();

      expect(() => {
        popover.destroy();
      }).not.toThrow();
    });

    it("falls back when showPopover throws", async () => {
      const { popover } = create();
      vi.spyOn(popover.root, "showPopover").mockImplementation(() => {
        throw new Error("not allowed");
      });

      await popover.open();

      expect(popover.root).not.toHaveAttribute("popover");
      expect(popover.root).toHaveAttribute("data-positioning", "fallback");
      expect(popover.root.style.position).toBe("fixed");
    });

    it("hides with display none when hidePopover throws", async () => {
      const { popover } = create();
      await popover.open();
      vi.spyOn(popover.root, "hidePopover").mockImplementation(() => {
        throw new Error("not open");
      });

      const closing = popover.close();
      await vi.advanceTimersByTimeAsync(1000);
      await closing;

      expect(popover.root).not.toHaveAttribute("popover");
      expect(popover.root.style.display).toBe("none");
    });

    it("hides through hidePopover on close", async () => {
      const { popover } = create();
      await popover.open();
      expect(popover.root).toHaveAttribute("data-test-popover-open");

      const closing = popover.close();
      await vi.advanceTimersByTimeAsync(1000);
      await closing;

      expect(popover.root).not.toHaveAttribute("data-test-popover-open");
    });
  });

  describe("without the Popover API", () => {
    it("toggles display and positions with the fallback", async () => {
      restores.push(withoutPopoverApi());
      const { popover } = create();
      expect(popover.root).not.toHaveAttribute("popover");
      expect(popover.root.style.display).toBe("none");

      await popover.open();
      expect(popover.root.style.display).toBe("");
      expect(popover.root).toHaveAttribute("data-positioning", "fallback");
      expect(popover.root).toHaveAttribute("data-placement");

      const closing = popover.close();
      await vi.advanceTimersByTimeAsync(1000);
      await closing;
      expect(popover.root.style.display).toBe("none");
    });
  });

  describe("anchor positioning", () => {
    it("uses the anchor name instead of the fallback", async () => {
      restores.push(setCssSupports(true));
      const { popover } = create();

      await popover.open();

      expect(popover.root).toHaveAttribute("data-positioning", "anchor");
      expect(popover.root.style.getPropertyValue("--dp-ui-anchor-name")).toBe(
        "--dp-ui-anchor-dp-ui-test",
      );
      expect(popover.root.style.position).toBe("");
    });

    it("switches to the fallback when the popover would stick out sideways", async () => {
      restores.push(setCssSupports(true));
      const { popover, input } = create();
      vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
        top: 100,
        bottom: 140,
        left: 80,
        right: 336,
        width: 256,
      } as DOMRect);
      vi.spyOn(popover.root, "offsetWidth", "get").mockReturnValue(360);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
        415,
      );

      await popover.open();

      expect(popover.root).toHaveAttribute("data-positioning", "fallback");
    });

    it("stays anchored when the popover fits beside the field", async () => {
      restores.push(setCssSupports(true));
      const { popover, input } = create();
      vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
        top: 100,
        bottom: 140,
        left: 40,
        right: 296,
        width: 256,
      } as DOMRect);
      vi.spyOn(popover.root, "offsetWidth", "get").mockReturnValue(360);
      vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
        415,
      );

      await popover.open();

      expect(popover.root).toHaveAttribute("data-positioning", "anchor");
    });

    it("re-resolves the placement when the page scrolls", async () => {
      restores.push(setCssSupports(true));
      const { popover, input } = create();
      vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
        top: 200,
      } as DOMRect);
      const rootRect = vi.spyOn(popover.root, "getBoundingClientRect");
      rootRect.mockReturnValue({ top: 230 } as DOMRect);
      await popover.open();
      expect(popover.root).toHaveAttribute("data-placement", "bottom");

      rootRect.mockReturnValue({ top: 0 } as DOMRect);
      window.dispatchEvent(new Event("scroll"));
      await vi.advanceTimersByTimeAsync(50);

      expect(popover.root).toHaveAttribute("data-placement", "top");
    });
  });
});
