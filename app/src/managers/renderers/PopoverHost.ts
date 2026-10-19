import { createElement } from "../../utils/dom";
import { waitForExit } from "./SurfaceHost";
import type { SurfaceHost } from "./SurfaceHost";
import {
  applyAnchor,
  createAnchorName,
  overflowsInline,
  resolveAnchoredPlacement,
  supportsAnchorPositioning,
} from "./anchorPositioning";
import { createFallbackPositioner } from "./fallbackPositioner";
import { listenOutsidePointer } from "./outsidePointer";
import { trackPosition } from "./positionTracking";

export class PopoverHost implements SurfaceHost {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  private readonly anchor: HTMLElement;
  private readonly anchorName: string;
  private readonly rtl: boolean;
  private readonly fallback: { enable(): void; layout(): void };
  private readonly controller = new AbortController();
  private stopTracking: (() => void) | null = null;
  private restoreAnchor: (() => void) | null = null;
  private hasPopover: boolean;
  private anchored = false;
  private openPromise: Promise<void> | null = null;
  private closePromise: Promise<void> | null = null;
  private destroyed = false;

  constructor(options: {
    host: HTMLElement;
    anchor: HTMLElement;
    instanceId: string;
    rtl: boolean;
    label: string;
    inside: readonly HTMLElement[];
    ignoreOutsideClick: boolean;
    onOutside(): void;
    onEscape(): void;
  }) {
    this.anchor = options.anchor;
    this.rtl = options.rtl;
    this.anchorName = createAnchorName(options.instanceId);
    this.root = createElement(
      "div",
      "dp-ui__container dp-ui__container--docked",
      {
        role: "dialog",
        "aria-modal": "false",
        "aria-label": options.label,
        "data-placement": "bottom",
      },
    );
    this.body = this.root;
    this.fallback = createFallbackPositioner(
      this.root,
      this.anchor,
      options.rtl,
    );
    this.hasPopover = typeof this.root.showPopover === "function";
    if (this.hasPopover) {
      this.root.setAttribute("popover", "manual");
    } else {
      this.root.style.display = "none";
    }
    options.host.appendChild(this.root);

    const { signal } = this.controller;
    listenOutsidePointer({
      inside: [this.root, this.anchor, ...options.inside],
      signal,
      isIgnored: () => options.ignoreOutsideClick || this.closePromise !== null,
      onOutside: () => {
        options.onOutside();
      },
    });
    this.root.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        if (this.closePromise) return;
        options.onEscape();
      },
      { signal },
    );
  }

  open(): Promise<void> {
    if (this.openPromise) return this.openPromise;
    this.openPromise = Promise.resolve();
    if (this.destroyed) return this.openPromise;
    this.show();
    this.update();
    this.stopTracking = trackPosition(this.root, this.anchor, () => {
      this.update();
    });
    return this.openPromise;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.endTracking();
    this.hide();
    this.closePromise = waitForExit(this.root);
    return this.closePromise;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.endTracking();
    this.controller.abort();
    this.restoreAnchor?.();
    this.restoreAnchor = null;
    this.root.remove();
  }

  private endTracking(): void {
    this.stopTracking?.();
    this.stopTracking = null;
  }

  private show(): void {
    if (!this.hasPopover) {
      this.root.style.removeProperty("display");
      this.enableFallback();
      return;
    }
    try {
      this.root.showPopover();
    } catch {
      this.hasPopover = false;
      this.root.removeAttribute("popover");
      this.enableFallback();
      return;
    }
    if (supportsAnchorPositioning(this.root)) {
      this.restoreAnchor = applyAnchor(this.root, this.anchor, this.anchorName);
      this.anchored = true;
    } else {
      this.enableFallback();
    }
  }

  private hide(): void {
    if (!this.hasPopover) {
      this.root.style.display = "none";
      return;
    }
    try {
      this.root.hidePopover();
    } catch {
      this.root.removeAttribute("popover");
      this.hasPopover = false;
      this.root.style.display = "none";
    }
  }

  private enableFallback(): void {
    this.fallback.enable();
    this.anchored = false;
  }

  private update(): void {
    if (this.anchored && overflowsInline(this.root, this.anchor, this.rtl)) {
      this.enableFallback();
    }
    if (this.anchored) {
      resolveAnchoredPlacement(this.root, this.anchor);
    } else {
      this.fallback.layout();
    }
  }
}
