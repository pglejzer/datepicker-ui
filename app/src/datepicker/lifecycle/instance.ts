import { isEmptySelection } from "../../utils/selection/model";
import type { CallbackBridge } from "./callbacks";
import type { LifecycleContext } from "./context";
import { claimEndInput, resolveEndInput } from "./endInput";
import { claimHost, releaseHost } from "./host";
import type { HostSnapshot } from "./host";
import { reportIssues } from "./options";
import type { SurfaceSession } from "./session";
import type { TriggerBinding } from "./triggers";

export class InstanceLifecycle {
  private readonly controller = new AbortController();
  private readonly hostSnapshot: HostSnapshot;
  private restoreEndInput: (() => void) | null = null;

  constructor(
    private readonly context: LifecycleContext,
    private readonly session: SurfaceSession,
    private readonly callbacks: CallbackBridge,
    private readonly triggers: TriggerBinding,
  ) {
    this.hostSnapshot = claimHost(context.core);
  }

  create(): void {
    const { core, managers, status } = this.context;
    if (status.created || status.destroyed) {
      return;
    }
    status.created = true;
    const signal = this.controller.signal;
    this.callbacks.bind();
    managers.theme.applyHost();
    const endInput = resolveEndInput(this.context);
    core.setEndInput(endInput);
    if (endInput !== null) {
      this.restoreEndInput = claimEndInput(endInput);
    }
    const initial = isEmptySelection(core.value)
      ? managers.input.readInitial()
      : core.value;
    core.setValue(initial);
    if (!isEmptySelection(initial)) {
      managers.input.write(initial);
    }
    managers.form.bind(signal);
    managers.form.sync();
    managers.input.bind(signal);
    this.triggers.bind();
    managers.triggers.updateLabel();
    core.events.on(
      "change:value",
      () => {
        managers.triggers.updateLabel();
      },
      signal,
    );
    if (core.options.inline.enabled) {
      this.session.mountInline();
    }
    reportIssues(this.context, core.options.issues);
  }

  destroy(keepInputValue: boolean): void {
    const { core, emitter, managers, status } = this.context;
    if (status.destroyed) {
      return;
    }
    status.destroyed = true;
    this.session.teardown();
    this.triggers.release();
    this.controller.abort();
    managers.destroy();
    if (!keepInputValue) {
      core.input.value = "";
      if (core.endInput !== null) {
        core.endInput.value = "";
      }
    }
    this.restoreEndInput?.();
    this.restoreEndInput = null;
    core.setEndInput(null);
    releaseHost(this.hostSnapshot);
    core.events.clear();
    emitter.clear();
  }
}
