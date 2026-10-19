import type { DatepickerEventMap } from "../../types/types";
import type { Handler } from "../../utils/EventEmitter";
import type { LifecycleContext } from "./context";

export class CallbackBridge {
  private subscriptions: (() => void)[] = [];

  constructor(private readonly context: LifecycleContext) {}

  bind(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions = [];
    const { callbacks } = this.context.core.options;
    this.add("open", callbacks.onOpen);
    this.add("close", callbacks.onClose);
    this.add("cancel", callbacks.onCancel);
    this.add("confirm", callbacks.onConfirm);
    this.add("update", callbacks.onUpdate);
    this.add("error", callbacks.onError);
    this.add("select:day", callbacks.onSelectDay);
    this.add("select:month", callbacks.onSelectMonth);
    this.add("select:year", callbacks.onSelectYear);
    this.add("range:start", callbacks.onRangeStart);
    this.add("range:end", callbacks.onRangeEnd);
    this.add("navigate", callbacks.onNavigate);
  }

  private add<K extends keyof DatepickerEventMap>(
    event: K,
    handler: Handler<DatepickerEventMap[K]> | undefined,
  ): void {
    if (handler !== undefined) {
      this.subscriptions.push(this.context.emitter.on(event, handler));
    }
  }
}
