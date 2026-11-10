import { lockScroll } from "../../utils/scrollLock";
import { createElement } from "../../utils/dom";
import { nameSurface, waitForExit } from "./SurfaceHost";
import type { SurfaceHost } from "./SurfaceHost";

export class DialogHost implements SurfaceHost {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly controller = new AbortController();
  private readonly allowPageScroll: boolean;
  private releaseScroll: (() => void) | null = null;
  private openPromise: Promise<void> | null = null;
  private closePromise: Promise<void> | null = null;
  private pointerStartedOnBackdrop = false;
  private destroyed = false;

  constructor(options: {
    parent: HTMLElement;
    label: string;
    /** Id, or space-separated ids, of a visible title that names the surface. When set, the root gets `aria-labelledby` and no `aria-label`. */
    labelledBy?: string;
    allowPageScroll: boolean;
    onCancel(reason: "escape" | "outside"): void;
  }) {
    this.allowPageScroll = options.allowPageScroll;
    this.dialog = createElement("dialog", "dp-ui__dialog");
    nameSurface(this.dialog, options.label, options.labelledBy);
    this.body = createElement(
      "div",
      "dp-ui__container dp-ui__container--modal",
    );
    this.root = this.dialog;
    this.dialog.appendChild(this.body);
    options.parent.appendChild(this.dialog);

    const { signal } = this.controller;
    this.dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        if (this.closePromise) return;
        options.onCancel("escape");
      },
      { signal },
    );
    this.dialog.addEventListener(
      "pointerdown",
      (event) => {
        this.pointerStartedOnBackdrop = event.target === this.dialog;
      },
      { signal },
    );
    this.dialog.addEventListener(
      "click",
      (event) => {
        const isBackdropClick =
          this.pointerStartedOnBackdrop && event.target === this.dialog;
        this.pointerStartedOnBackdrop = false;
        if (isBackdropClick && !this.closePromise) options.onCancel("outside");
      },
      { signal },
    );
  }

  open(): Promise<void> {
    if (this.openPromise) return this.openPromise;
    this.openPromise = Promise.resolve();
    if (this.destroyed) return this.openPromise;
    if (!this.allowPageScroll) this.releaseScroll = lockScroll();
    this.dialog.showModal();
    return this.openPromise;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    if (this.dialog.open) this.dialog.close();
    this.closePromise = waitForExit(this.dialog).then(() => {
      this.unlock();
    });
    return this.closePromise;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.controller.abort();
    this.unlock();
    this.dialog.remove();
  }

  setLabel(label: string, labelledBy?: string): void {
    nameSurface(this.dialog, label, labelledBy);
  }

  private unlock(): void {
    this.releaseScroll?.();
    this.releaseScroll = null;
  }
}
