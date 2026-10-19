import type { LifecycleContext } from "./context";

export class TriggerBinding {
  private scope: AbortController | null = null;

  constructor(private readonly context: LifecycleContext) {}

  bind(): void {
    this.release();
    const { core, managers } = this.context;
    if (core.options.inline.enabled) {
      return;
    }
    const scope = new AbortController();
    this.scope = scope;
    managers.triggers.bind(scope.signal);
  }

  release(): void {
    this.scope?.abort();
    this.scope = null;
  }
}
