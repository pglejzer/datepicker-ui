import type { DateInput } from "../../types/date";
import type { Panel, SurfaceMode } from "../../types/internal";
import type { PickerView } from "../../types/types";
import { anchorDate } from "../../utils/selection/model";
import { toSelection } from "../../utils/selection/value";
import {
  homePanel,
  inlineChrome,
  startPanel,
  supportsInputView,
} from "../../utils/surface";
import type { LifecycleContext } from "./context";
import { clampToLimits, moveFocus } from "./navigation";
import type { VisibleRangeTracker } from "./visible";

const viewOf = (panel: Panel): PickerView =>
  panel === "input" ? "input" : "calendar";

export class ViewControls {
  constructor(
    private readonly context: LifecycleContext,
    private readonly isShown: () => boolean,
    private readonly visible: VisibleRangeTracker,
  ) {}

  get(): PickerView {
    return this.isShown() ? viewOf(this.context.core.panel) : "calendar";
  }

  set(view: PickerView): void {
    const { core } = this.context;
    if (!this.isShown() || !this.hasInputView()) {
      return;
    }
    core.setPanel(
      view === "input" ? "input" : homePanel(core.options.precision),
    );
  }

  goTo(input: DateInput): void {
    const selection = toSelection(input, "single", "day");
    const date = selection === null ? null : anchorDate(selection);
    if (date === null) {
      this.context.emitter.emit("error", {
        code: "invalid-date",
        message: "goTo() received a value that is not a valid date",
        input: typeof input === "string" ? input : undefined,
      });
      return;
    }
    if (!this.isShown()) {
      return;
    }
    this.visible.hold("api", () => {
      moveFocus(this.context, clampToLimits(this.context, date), "api");
    });
  }

  bind(signal: AbortSignal): void {
    const { core, emitter } = this.context;
    let shown = viewOf(core.panel);
    core.events.on(
      "change:panel",
      ({ panel }) => {
        const view = viewOf(panel);
        if (view === shown) {
          return;
        }
        shown = view;
        emitter.emit("switch:view", { view });
      },
      signal,
    );
  }

  opening(surface: SurfaceMode): Panel {
    const { core } = this.context;
    const { initialView, inline, mode, precision, startView } = core.options;
    if (initialView === "input" && this.hasInputView()) {
      return "input";
    }
    const caption = inlineChrome(surface, inline).navigation === "caption";
    if (precision !== "day" || mode === "range" || caption) {
      return homePanel(precision);
    }
    return startPanel(startView, core.calendarLayout);
  }

  dropUnsupported(): void {
    const { core } = this.context;
    if (core.panel === "input" && !this.hasInputView()) {
      core.setPanel(homePanel(core.options.precision));
    }
  }

  private hasInputView(): boolean {
    const { core } = this.context;
    const { mode, precision } = core.options;
    return supportsInputView(mode, core.calendarLayout, precision);
  }
}
