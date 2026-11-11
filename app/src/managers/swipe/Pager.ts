import { createElement } from "@/utils/dom";
import {
  createDragGesture,
  DRAGGING_CLASS,
  type DragGesture,
} from "./dragGesture";
import {
  CENTER,
  createPageStrip,
  NEXT,
  PREVIOUS,
  type PageIndex,
  type PageStrip,
} from "./pageStrip";
import { resolveDragCommit } from "./resolveDragCommit";
import { createSlideAnimator, type SlideAnimator } from "./slideAnimator";
import { createWheelGesture, type WheelGesture } from "./wheelGesture";

export { resolveDragCommit };

export interface PagerOptions<K> {
  /** Right-to-left: dragging left goes back. */
  readonly rtl: boolean;
  /** Drag and wheel paging. */
  readonly swipe: boolean;
  /** Slide animation. Reduced motion turns it into a fade. */
  readonly animate: boolean;
  /** Sets the pager height to the shown page through `pageHeight`. Default `false`. */
  readonly fitHeight?: boolean;
  /** Builds the page for `key`. */
  renderPage(key: K): HTMLElement;
  /** Height of the page for `key`, used with `fitHeight`. */
  pageHeight?(key: K): number;
  /** The key one page before (`-1`) or after (`1`) `key`. */
  step(key: K, direction: -1 | 1): K;
  /** Whether two keys name the same page. */
  isSame(a: K, b: K): boolean;
  /** A drag or wheel gesture finished on a neighbour page. Call `slide()` to show it. */
  onCommit(direction: -1 | 1, source: "drag" | "wheel"): void;
}

const PAGER_CLASS = "dp-ui__pager";
const TRACK_CLASS = "dp-ui__pager-track";
const SWIPE_CLASS = "dp-ui__pager--swipe";
const HEIGHT_PROPERTY = "--dp-ui-pager-height";
const FALLBACK_PAGE_WIDTH = 360;

export class Pager<K> {
  private readonly viewport: HTMLElement;
  private readonly options: PagerOptions<K>;
  private readonly track: HTMLElement;
  private readonly controller = new AbortController();
  private readonly previousTouchAction: string;
  private readonly strip: PageStrip<K>;
  private readonly animator: SlideAnimator;
  private drag: DragGesture | null = null;
  private wheel: WheelGesture | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private observedWidth = -1;
  private offset = 0;
  private revision = 0;

  constructor(viewport: HTMLElement, options: PagerOptions<K>) {
    this.viewport = viewport;
    this.options = options;
    this.previousTouchAction = viewport.style.touchAction;
    this.track = createElement("div", TRACK_CLASS);
    this.strip = createPageStrip<K>(
      this.track,
      (key) => options.renderPage(key),
      (key, direction) => options.step(key, direction),
      (a, b) => options.isSame(a, b),
    );
    this.animator = createSlideAnimator(this.track, options.animate);
    viewport.classList.add(PAGER_CLASS);
    viewport.append(this.track);
    if (options.swipe) this.enableSwipe();
    this.observeWidth();
  }

  /** Shows `key` without animation. */
  show(key: K): void {
    if (this.destroyed) return;
    this.revision += 1;
    this.animator.cancel();
    this.cancelGestures();
    this.strip.show(key);
    this.rest();
    this.fitHeight(key);
  }

  /** Slides to `key` in `direction`. */
  slide(key: K, direction: -1 | 1): void {
    if (this.destroyed) return;
    this.finish();
    this.cancelGestures();
    const center = this.strip.centerKey();
    if (center === null) {
      this.show(key);
      return;
    }
    this.revision += 1;
    if (this.options.isSame(center, key)) {
      this.settle();
      return;
    }
    const index = direction === 1 ? NEXT : PREVIOUS;
    this.strip.reveal(index, key);
    this.fitHeight(key);
    const width = this.pageWidth();
    const from = this.transformFor(CENTER, this.offset, width);
    this.offset = 0;
    this.animator.run(from, this.transformFor(index, 0, width), () => {
      this.strip.recenter(index);
      this.rest();
    });
  }

  /** Ends a running slide at once. */
  finish(): void {
    this.animator.finish();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.controller.abort();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.cancelGestures();
    this.drag?.dispose();
    this.animator.cancel();
    this.track.remove();
    this.strip.clear();
    this.viewport.style.removeProperty(HEIGHT_PROPERTY);
    this.viewport.classList.remove(SWIPE_CLASS, DRAGGING_CLASS);
    if (this.options.swipe) {
      this.viewport.style.touchAction = this.previousTouchAction;
    }
  }

  private get destroyed(): boolean {
    return this.controller.signal.aborted;
  }

  private enableSwipe(): void {
    const { signal } = this.controller;
    this.viewport.style.touchAction = "pan-y";
    this.viewport.classList.add(SWIPE_CLASS);
    this.drag = createDragGesture(this.viewport, signal, {
      pageWidth: () => this.pageWidth(),
      onBegin: () => {
        this.finish();
        this.wheel?.cancel();
      },
      onMove: (dx, width) => {
        this.setOffset(dx, width);
      },
      onRelease: ({ dx, velocity, width }) => {
        this.release(
          resolveDragCommit(dx, velocity, width, this.options.rtl),
          "drag",
        );
      },
      onAbort: () => {
        this.settle();
      },
    });
    this.wheel = createWheelGesture(this.viewport, signal, {
      pageWidth: () => this.pageWidth(),
      isBlocked: () => this.drag?.isDragging() === true,
      onBegin: () => {
        this.finish();
      },
      onMove: (offset, width) => {
        this.setOffset(offset, width);
      },
      onSettle: (delta, width) => {
        this.release(
          resolveDragCommit(delta, 0, width, this.options.rtl),
          "wheel",
        );
      },
    });
  }

  private observeWidth(): void {
    if (
      this.options.fitHeight !== true ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.at(-1);
      if (entry === undefined || this.destroyed) return;
      const width = entry.contentRect.width;
      if (width === this.observedWidth) return;
      this.observedWidth = width;
      const shown = this.strip.centerKey();
      if (shown !== null) this.fitHeight(shown);
    });
    this.resizeObserver.observe(this.viewport);
  }

  private cancelGestures(): void {
    this.drag?.cancel();
    this.wheel?.cancel();
  }

  private release(direction: -1 | 0 | 1, source: "drag" | "wheel"): void {
    if (direction === 0) {
      this.settle();
      return;
    }
    const revision = this.revision;
    this.options.onCommit(direction, source);
    if (this.revision === revision && !this.destroyed) this.settle();
  }

  private settle(): void {
    this.finish();
    const width = this.pageWidth();
    const from = this.transformFor(CENTER, this.offset, width);
    this.offset = 0;
    this.animator.run(from, this.transformFor(CENTER, 0, width), () => {
      this.rest();
    });
  }

  private fitHeight(key: K): void {
    if (this.options.fitHeight !== true || this.viewport.hidden) return;
    const height = this.options.pageHeight?.(key);
    if (height === undefined) return;
    this.viewport.style.setProperty(HEIGHT_PROPERTY, `${String(height)}px`);
  }

  private rest(): void {
    this.offset = 0;
    this.track.style.removeProperty("transform");
    if (this.viewport.scrollLeft !== 0) this.viewport.scrollLeft = 0;
  }

  private setOffset(offset: number, width: number): void {
    this.offset = offset;
    this.track.style.transform = this.transformFor(CENTER, offset, width);
  }

  private transformFor(
    index: PageIndex,
    offset: number,
    width: number,
  ): string {
    const sign = this.options.rtl ? 1 : -1;
    return `translateX(${String(sign * index * width + offset)}px)`;
  }

  private pageWidth(): number {
    const width = this.viewport.clientWidth;
    return width > 0 ? width : FALLBACK_PAGE_WIDTH;
  }
}
