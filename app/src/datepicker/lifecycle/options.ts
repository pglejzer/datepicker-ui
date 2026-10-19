import type { DatepickerOptions } from "../../types/options";
import { emptySelection, isEmptySelection } from "../../utils/selection/model";
import type { OptionIssue } from "../options/pick";
import type { ResolvedOptions } from "../options/types";
import type { CallbackBridge } from "./callbacks";
import type { LifecycleContext } from "./context";
import type { SurfaceSession } from "./session";
import type { TriggerBinding } from "./triggers";

const OPTION_GROUPS = [
  "calendar",
  "ui",
  "labels",
  "behavior",
  "callbacks",
] as const;

function patchedPaths(patch: DatepickerOptions): string[] {
  const paths: string[] = [];
  for (const group of OPTION_GROUPS) {
    const values = patch[group];
    if (values === undefined) {
      continue;
    }
    for (const key of Object.keys(values)) {
      paths.push(`${group}.${key}`);
    }
  }
  return paths;
}

function isPatched(paths: readonly string[], issue: OptionIssue): boolean {
  return paths.some(
    (path) => issue.option === path || issue.option.startsWith(`${path}.`),
  );
}

export function reportIssues(
  context: LifecycleContext,
  issues: readonly OptionIssue[],
): void {
  for (const issue of issues) {
    context.emitter.emit("error", {
      code: "invalid-option",
      message: `Invalid value for option ${issue.option}`,
      option: issue.option,
    });
  }
}

export class OptionUpdates {
  constructor(
    private readonly context: LifecycleContext,
    private readonly session: SurfaceSession,
    private readonly callbacks: CallbackBridge,
    private readonly triggers: TriggerBinding,
  ) {}

  apply(patch: DatepickerOptions): void {
    const { core, emitter, status } = this.context;
    if (status.destroyed) {
      return;
    }
    const previous = core.options;
    core.setOptions(patch);
    if (core.options.mode !== previous.mode) {
      this.resetSelection();
    }
    if (status.created) {
      this.reapply(previous, patch);
    }
    emitter.emit("update", { options: patch });
  }

  private resetSelection(): void {
    const { core, managers, status } = this.context;
    const empty = emptySelection(core.options.mode);
    core.setValue(empty);
    core.setDraft(empty);
    if (status.created) {
      managers.input.write(empty);
      managers.form.sync();
    }
  }

  private reapply(previous: ResolvedOptions, patch: DatepickerOptions): void {
    const { core, managers } = this.context;
    this.callbacks.bind();
    managers.theme.applyHost();
    this.triggers.bind();
    if (!isEmptySelection(core.value)) {
      managers.input.write(core.value);
    }
    managers.triggers.updateLabel();
    this.refreshSurface(previous);
    const paths = patchedPaths(patch);
    reportIssues(
      this.context,
      core.options.issues.filter((issue) => isPatched(paths, issue)),
    );
  }

  private refreshSurface(previous: ResolvedOptions): void {
    const { core, managers } = this.context;
    const next = core.options;
    if (
      next.inline.enabled !== previous.inline.enabled ||
      (next.inline.enabled &&
        next.inline.container !== previous.inline.container)
    ) {
      void this.session.end();
      if (next.inline.enabled) {
        this.session.mountInline();
      }
      return;
    }
    const mode = core.mode;
    if (!this.session.active || mode === null) {
      return;
    }
    const keepMode =
      mode === "inline" || next.displayMode === previous.displayMode;
    const target = keepMode ? mode : this.session.pickMode();
    this.session.syncLayout(target);
    this.session.clampView();
    if (target === mode && next.mode === previous.mode) {
      managers.display.update();
      return;
    }
    this.session.remount(target);
  }
}
