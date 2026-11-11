import { resolveElement } from "../../utils/dom";
import {
  calendarLayout,
  resolveSurfaceMode,
  resolveViewLayout,
} from "../../utils/surface";
import { TaskQueue } from "../../utils/taskQueue";
import type { NavigateSource, SurfaceMode } from "../../types/internal";
import type { RangeEnd } from "../../types/selection";
import type { LifecycleContext } from "./context";
import { showMonth } from "./navigation";
import type { ViewControls } from "./view";
import type { VisibleRangeTracker } from "./visible";

export type OpenSource = "api" | "pointer" | "toggle" | "keyboard";

type Phase = "closed" | "open" | "closing";

export class SurfaceSession {
  private readonly queue = new TaskQueue();
  private controller: AbortController | null = null;
  private phase: Phase = "closed";
  private sessionId = 0;
  private mounts = 0;
  private closing: Promise<void> = Promise.resolve();
  private openedFrom: RangeEnd = "start";
  private mountSource: NavigateSource = "open";

  constructor(
    private readonly context: LifecycleContext,
    private readonly views: ViewControls,
    private readonly visible: VisibleRangeTracker,
  ) {}

  get active(): boolean {
    return this.phase === "open";
  }

  open(source: OpenSource, end: RangeEnd = "start"): void {
    const { core, emitter, managers, status } = this.context;
    if (!status.created || status.destroyed) {
      return;
    }
    if (core.options.inline.enabled) {
      return;
    }
    if (this.phase === "open") {
      core.setActiveEnd(end);
      return;
    }
    if (source !== "api" && core.input.disabled) {
      return;
    }
    const mode = this.pickMode();
    this.openedFrom = end;
    core.setActiveEnd(end);
    this.begin(mode);
    managers.triggers.setExpanded(true);
    emitter.emit("open", { mode: core.mode ?? mode });
  }

  fallBackToModal(): void {
    if (!this.active || this.context.core.mode !== "docked") {
      return;
    }
    this.stopListening();
    this.adoptMode("modal");
    this.listen();
    this.mount("modal", this.mountSource);
  }

  mountInline(): void {
    const { core, emitter } = this.context;
    if (resolveElement(core.options.inline.container) === null) {
      emitter.emit("error", {
        code: "invalid-option",
        message: "ui.inline.container does not match an element",
        option: "ui.inline.container",
      });
      return;
    }
    this.begin("inline");
    emitter.emit("open", { mode: "inline" });
  }

  close(): Promise<void> {
    if (this.context.core.mode === "inline") {
      return Promise.resolve();
    }
    return this.end();
  }

  end(): Promise<void> {
    if (this.phase === "closing") {
      return this.closing;
    }
    if (this.phase !== "open") {
      return Promise.resolve();
    }
    const { core, emitter, managers } = this.context;
    const mode = core.mode;
    const id = this.sessionId;
    this.phase = "closing";
    this.stopListening();
    this.visible.reset();
    managers.triggers.setExpanded(false);
    const closing = this.queue
      .run(() => managers.display.unmount())
      .then(() => {
        this.finish(id, mode);
      });
    this.closing = closing;
    emitter.emit("close", {});
    return closing;
  }

  syncLayout(surface: SurfaceMode): void {
    const { core } = this.context;
    const options = core.options;
    let width = window.innerWidth;
    if (surface === "inline") {
      const inline = resolveElement(options.inline.container)?.clientWidth ?? 0;
      width = inline > 0 ? inline : width;
    }
    core.setLayout(
      resolveViewLayout({
        months: options.months,
        precision: options.precision,
        mode: options.mode,
        layout: core.calendarLayout,
        width,
        weekNumbers: options.weekNumbers,
        presets: options.presets.length,
      }),
    );
  }

  remount(mode: SurfaceMode): void {
    const { core, managers } = this.context;
    this.visible.pause();
    this.decideLayout(mode);
    this.syncLayout(mode);
    this.clampView();
    core.setMode(mode);
    this.views.dropUnsupported();
    void this.queue.run(() => managers.display.unmount());
    this.mount(mode, "api");
  }

  refresh(mode: SurfaceMode, source: NavigateSource): void {
    const { core, managers } = this.context;
    this.visible.hold(source, () => {
      this.syncLayout(mode);
      this.clampView();
      core.setListSpan(null);
      managers.display.update();
    });
  }

  pickMode(): SurfaceMode {
    const { displayMode } = this.context.core.options;
    return resolveSurfaceMode(
      displayMode,
      false,
      window.innerWidth,
      window.innerHeight,
    );
  }

  clampView(): void {
    showMonth(this.context, this.context.core.view, "api");
  }

  teardown(): void {
    this.phase = "closed";
    this.stopListening();
    this.visible.reset();
    this.queue.stop();
  }

  private begin(mode: SurfaceMode): void {
    this.stopListening();
    this.sessionId += 1;
    this.phase = "open";
    this.visible.reset();
    this.context.core.resetSession();
    this.adoptMode(mode);
    this.listen();
    this.mount(mode, "open");
  }

  private adoptMode(mode: SurfaceMode): void {
    const { core } = this.context;
    this.decideLayout(mode);
    core.setPanel(this.views.opening(mode));
    this.syncLayout(mode);
    this.clampView();
    core.setMode(mode);
  }

  private listen(): void {
    const controller = new AbortController();
    this.controller = controller;
    this.views.bind(controller.signal);
    this.visible.bind(controller.signal);
    window.addEventListener(
      "resize",
      () => {
        this.relayout();
      },
      { signal: controller.signal },
    );
  }

  private mount(mode: SurfaceMode, source: NavigateSource): void {
    const { core, managers } = this.context;
    this.mounts += 1;
    this.mountSource = source;
    const ticket = this.mounts;
    void this.queue
      .run(() => {
        core.setListSpan(null);
        return managers.display.mount(mode);
      })
      .then(() => {
        if (ticket === this.mounts && this.active) {
          this.visible.resume(source);
        }
      });
  }

  private decideLayout(mode: SurfaceMode): void {
    const { core } = this.context;
    core.setCalendarLayout(
      calendarLayout(mode, core.options, window.innerWidth),
    );
  }

  private relayout(): void {
    const { core } = this.context;
    const mode = core.mode;
    if (mode === null) {
      return;
    }
    const previous = core.layout;
    this.syncLayout(mode);
    const next = core.layout;
    if (next.months === previous.months && next.presets === previous.presets) {
      return;
    }
    this.refresh(mode, "resize");
  }

  private stopListening(): void {
    this.controller?.abort();
    this.controller = null;
  }

  private finish(id: number, mode: SurfaceMode | null): void {
    if (this.sessionId !== id || this.phase !== "closing") {
      return;
    }
    this.phase = "closed";
    this.context.core.setMode(null);
    this.returnFocus(mode);
  }

  private returnFocus(mode: SurfaceMode | null): void {
    const { core } = this.context;
    if (!core.options.behavior.returnFocus) {
      return;
    }
    const active = document.activeElement;
    if (mode === "modal" || active === null || active === document.body) {
      const endInput = this.openedFrom === "end" ? core.endInput : null;
      (endInput ?? core.input).focus({ preventScroll: true });
    }
  }
}
