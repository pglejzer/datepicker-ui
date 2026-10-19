import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const errorString = args.join(" ");

  if (
    errorString.includes("Uncaught") ||
    errorString.includes("Cannot read properties of null") ||
    errorString.includes("Cannot read properties of undefined")
  ) {
    return;
  }

  originalConsoleError.call(console, ...args);
};

const installPlatformPolyfills = (): void => {
  const dialogProto = HTMLDialogElement.prototype;

  if (typeof dialogProto.showModal !== "function") {
    dialogProto.showModal = function showModal(this: HTMLDialogElement): void {
      this.setAttribute("open", "");
      this.setAttribute("data-test-modal", "");
    };
  }

  if (typeof dialogProto.close !== "function") {
    dialogProto.close = function close(this: HTMLDialogElement): void {
      if (!this.hasAttribute("open")) return;
      this.removeAttribute("open");
      this.removeAttribute("data-test-modal");
      this.dispatchEvent(new Event("close"));
    };
  }

  const elementProto = HTMLElement.prototype;

  const popoverOpenStyle = document.createElement("style");
  popoverOpenStyle.textContent =
    "[popover][data-test-popover-open] { display: block !important; }";
  document.head.append(popoverOpenStyle);

  const dispatchToggle = (
    el: HTMLElement,
    oldState: string,
    newState: string,
  ): void => {
    const event = new Event("toggle");
    Object.defineProperty(event, "oldState", { value: oldState });
    Object.defineProperty(event, "newState", { value: newState });
    el.dispatchEvent(event);
  };

  if (typeof elementProto.showPopover !== "function") {
    elementProto.showPopover = function showPopover(this: HTMLElement): void {
      if (this.hasAttribute("data-test-popover-open")) return;
      this.setAttribute("data-test-popover-open", "");
      dispatchToggle(this, "closed", "open");
    };
  }

  if (typeof elementProto.hidePopover !== "function") {
    elementProto.hidePopover = function hidePopover(this: HTMLElement): void {
      if (!this.hasAttribute("data-test-popover-open")) return;
      this.removeAttribute("data-test-popover-open");
      dispatchToggle(this, "open", "closed");
    };
  }

  if (typeof elementProto.togglePopover !== "function") {
    elementProto.togglePopover = function togglePopover(
      this: HTMLElement,
      force?: boolean,
    ): boolean {
      const open = this.hasAttribute("data-test-popover-open");
      const next = force ?? !open;
      if (next) this.showPopover();
      else this.hidePopover();
      return next;
    };
  }

  if (typeof Element.prototype.setPointerCapture !== "function") {
    Element.prototype.setPointerCapture = (): void => {};
  }
  if (typeof Element.prototype.releasePointerCapture !== "function") {
    Element.prototype.releasePointerCapture = (): void => {};
  }
  if (typeof Element.prototype.hasPointerCapture !== "function") {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }

  if (typeof Element.prototype.animate !== "function") {
    Element.prototype.animate = function animate(): Animation {
      return {
        finished: Promise.resolve(),
        cancel: () => {},
        finish: () => {},
        onfinish: null,
      } as unknown as Animation;
    };
  }

  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
};

const installDomPolyfills = (): void => {
  Object.defineProperty(window, "crypto", {
    value: {
      randomUUID: () => "12345678-1234-4abc-8abc-123456789012",
    },
  });

  Object.defineProperty(window, "navigator", {
    value: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    writable: true,
  });

  globalThis.requestAnimationFrame = (
    callback: FrameRequestCallback,
  ): number => {
    return setTimeout(() => {
      callback(Date.now());
    }, 0);
  };

  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };

  HTMLElement.prototype.scrollIntoView = vi.fn();

  if (!Reflect.has(Element.prototype, "scrollTo")) {
    Element.prototype.scrollTo = function (
      this: Element,
      options?: ScrollToOptions | number,
    ) {
      if (typeof options === "object") {
        if (options.top !== undefined) this.scrollTop = options.top;
        if (options.left !== undefined) this.scrollLeft = options.left;
      }
    };
  }

  globalThis.Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    screenX: number;
    screenY: number;
    pageX: number;
    pageY: number;
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;

    constructor(touchInit: TouchInit) {
      this.identifier = touchInit.identifier;
      this.target = touchInit.target;
      this.clientX = touchInit.clientX ?? 0;
      this.clientY = touchInit.clientY ?? 0;
      this.screenX = touchInit.screenX ?? 0;
      this.screenY = touchInit.screenY ?? 0;
      this.pageX = touchInit.pageX ?? 0;
      this.pageY = touchInit.pageY ?? 0;
      this.radiusX = touchInit.radiusX ?? 0;
      this.radiusY = touchInit.radiusY ?? 0;
      this.rotationAngle = touchInit.rotationAngle ?? 0;
      this.force = touchInit.force ?? 0;
    }
  };

  globalThis.TouchEvent = class TouchEvent extends UIEvent {
    touches: TouchList;
    targetTouches: TouchList;
    changedTouches: TouchList;

    constructor(type: string, eventInit?: TouchEventInit) {
      super(type, eventInit);
      this.touches = (eventInit?.touches ?? []) as unknown as TouchList;
      this.targetTouches = (eventInit?.targetTouches ??
        []) as unknown as TouchList;
      this.changedTouches = (eventInit?.changedTouches ??
        []) as unknown as TouchList;
    }
  } as unknown as typeof TouchEvent;

  installPlatformPolyfills();
};

if (typeof window !== "undefined") {
  installDomPolyfills();
}
