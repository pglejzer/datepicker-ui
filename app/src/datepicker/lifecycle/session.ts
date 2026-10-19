import { resolveElement } from "../../utils/dom";
import {
  homePanel,
  isFullscreenRange,
  resolveSurfaceMode,
  resolveViewLayout,
  startPanel,
  supportsInputView,
} from "../../utils/surface";
import { TaskQueue } from "../../utils/taskQueue";
import type { InternalEventMap, SurfaceMode } from "../../types/internal";
import type { RangeEnd } from "../../types/selection";
import type { LifecycleContext } from "./context";
import { showMonth } from "./navigation";

export type OpenSource = "api" | "pointer" | "toggle" | "keyboard";

type Phase = "closed" | "open" | "closing";

function directionOf(delta: number): -1 | 0 | 1 {
  if (delta < 0) {
    return -1;
  }
  return delta > 0 ? 1 : 0;
}

export class SurfaceSession {
  private readonly queue = new TaskQueue();
  private controller: AbortController | null = null;
  private phase: Phase = "closed";
  private sessionId = 0;
  private closing: Promise<void> = Promise.resolve();
  private openedFrom: RangeEnd = "start";

  constructor(private readonly context: LifecycleContext) {}

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
    emitter.emit("open", { mode });
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
        surface,
        fullscreen: isFullscreenRange(
          options.mode,
          surface,
          window.innerWidth,
          options.fullscreenBelow,
        ),
        width,
        weekNumbers: options.weekNumbers,
        presets: options.presets.length,
      }),
    );
  }

  remount(mode: SurfaceMode): void {
    const { core, managers } = this.context;
    this.syncLayout(mode);
    core.setMode(mode);
    const { mode: calendarMode, precision } = core.options;
    if (
      core.panel === "input" &&
      !supportsInputView(calendarMode, mode, precision)
    ) {
      core.setPanel(homePanel(precision));
    }
    void this.queue.run(() => managers.display.unmount());
    void this.queue.run(() => managers.display.mount(mode));
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
    this.queue.stop();
  }

  private begin(mode: SurfaceMode): void {
    const { core, managers } = this.context;
    this.stopListening();
    const controller = new AbortController();
    this.controller = controller;
    this.sessionId += 1;
    this.phase = "open";
    core.resetSession();
    const {
      initialView,
      mode: calendarMode,
      precision,
      startView,
    } = core.options;
    if (
      initialView === "input" &&
      supportsInputView(calendarMode, mode, precision)
    ) {
      core.setPanel("input");
    } else if (
      precision === "day" &&
      calendarMode !== "range" &&
      startView !== "day"
    ) {
      core.setPanel(startPanel(startView, mode));
    }
    this.syncLayout(mode);
    this.clampView();
    core.setMode(mode);
    core.events.on(
      "change:view",
      (change) => {
        this.forwardNavigation(change);
      },
      controller.signal,
    );
    void this.queue.run(() => managers.display.mount(mode));
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

  private forwardNavigation(change: InternalEventMap["change:view"]): void {
    if (change.source === "api") {
      return;
    }
    this.context.emitter.emit("navigate", {
      year: change.view.year,
      month: change.view.month,
      direction: directionOf(change.delta),
      source: change.source,
    });
  }
}
