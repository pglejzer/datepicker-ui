import type { CoreState } from "../datepicker/CoreState";
import type { DateRules, PickerActions, SurfaceMode } from "../types/internal";
import type { DatepickerEventMap } from "../types/types";
import { trackPointerModality } from "../utils/accessibility";
import { resolveElement } from "../utils/dom";
import type { EventEmitter } from "../utils/EventEmitter";
import { watchColorScheme } from "../utils/colorScheme";
import { applyMotionVariables } from "../utils/motion";
import { titleText } from "../utils/selection/headline";
import { fitsViewport } from "../utils/viewportFit";
import { createCalendarView } from "./calendar/CalendarView";
import type { CalendarShell } from "./calendar/CalendarView";
import { createRangeView } from "./range/RangeView";
import { DialogHost } from "./renderers/DialogHost";
import { InlineHost } from "./renderers/InlineHost";
import { PopoverHost } from "./renderers/PopoverHost";
import type { SurfaceHost } from "./renderers/SurfaceHost";
import type { ThemeManager } from "./ThemeManager";

interface Mounted {
  readonly mode: SurfaceMode;
  readonly host: SurfaceHost;
  readonly view: CalendarShell;
  readonly stopModality: () => void;
  readonly stopSchemeWatch: () => void;
}

export class DisplayManager {
  private mounted: Mounted | null = null;
  private generation = 0;

  constructor(
    private readonly core: CoreState,
    _emitter: EventEmitter<DatepickerEventMap>,
    private readonly deps: {
      actions: PickerActions;
      rules: DateRules;
      theme: ThemeManager;
      inside(): readonly HTMLElement[];
      overflow(): void;
    },
  ) {}

  get surface(): HTMLElement | null {
    return this.mounted?.host.root ?? null;
  }

  async mount(mode: SurfaceMode): Promise<void> {
    this.release();
    const host = this.createHost(mode);
    if (host === null) return;
    const { core } = this;
    const { options } = core;
    const { actions, rules, theme } = this.deps;
    const generation = ++this.generation;
    theme.applyTo(host.root);
    applyMotionVariables(host.root, options.animation);
    const viewDeps = {
      core,
      actions,
      rules,
      mode,
      fullscreen: core.calendarLayout === "fullscreen",
    };
    const view =
      options.mode === "range"
        ? createRangeView(viewDeps)
        : createCalendarView(viewDeps);
    this.mounted = {
      mode,
      host,
      view,
      stopModality: trackPointerModality(host.root),
      stopSchemeWatch:
        mode === "inline"
          ? watchColorScheme(() => {
              theme.applyTo(host.root);
            })
          : () => undefined,
    };
    host.body.append(view.element);
    const opened = host.open();
    view.fit();
    if (this.overflows(mode, host)) {
      this.release();
      this.deps.overflow();
      return;
    }
    await opened;
    if (generation === this.generation && mode !== "inline") {
      view.focusInitial();
    }
  }

  async unmount(): Promise<void> {
    const current = this.mounted;
    if (current === null) return;
    const generation = ++this.generation;
    await current.host.close();
    if (generation === this.generation && this.mounted === current) {
      this.release();
    }
  }

  update(): void {
    const current = this.mounted;
    if (current === null) return;
    this.deps.theme.applyTo(current.host.root);
    current.host.setLabel(this.label());
    applyMotionVariables(current.host.root, this.core.options.animation);
    current.view.update();
  }

  private label(): string {
    const { labels, mode, precision } = this.core.options;
    return titleText(labels, mode, precision);
  }

  destroy(): void {
    this.generation += 1;
    this.release();
  }

  private overflows(mode: SurfaceMode, host: SurfaceHost): boolean {
    return (
      mode === "docked" &&
      this.core.options.displayMode === "auto" &&
      !fitsViewport(host.root, this.core.input)
    );
  }

  private release(): void {
    const current = this.mounted;
    if (current === null) return;
    this.mounted = null;
    current.view.destroy();
    current.host.destroy();
    current.stopModality();
    current.stopSchemeWatch();
  }

  private createHost(mode: SurfaceMode): SurfaceHost | null {
    const { core } = this;
    const { options } = core;
    const { actions } = this.deps;
    const label = this.label();
    if (mode === "inline") {
      const container = resolveElement(options.inline.container);
      return container === null ? null : new InlineHost({ container, label });
    }
    if (mode === "modal") {
      return new DialogHost({
        parent: resolveElement(options.appendTo) ?? core.host,
        label,
        allowPageScroll: options.allowPageScroll,
        onCancel: (reason) => {
          actions.cancel(reason);
        },
      });
    }
    return new PopoverHost({
      host: core.host,
      anchor: core.input,
      instanceId: core.instanceId,
      rtl: getComputedStyle(core.input).direction === "rtl",
      label,
      ignoreOutsideClick: options.behavior.ignoreOutsideClick,
      inside: [
        ...(core.endInput === null ? [] : [core.endInput]),
        ...this.deps.inside(),
      ],
      onOutside: () => {
        actions.cancel("outside");
      },
      onEscape: () => {
        actions.cancel("escape");
      },
    });
  }
}
