import type { DatepickerOptions } from "../types/options";
import type { RangeEnd } from "../types/selection";
import type {
  DatepickerEventMap,
  PickerValue,
  PickerValueInput,
} from "../types/types";
import { EventEmitter } from "../utils/EventEmitter";
import type { Handler } from "../utils/EventEmitter";
import { CoreState, sanitizeInstanceId } from "./CoreState";
import { attachHost } from "./lifecycle/host";
import { Lifecycle } from "./Lifecycle";
import { Managers } from "./Managers";

const instanceRegistry = new Map<string, DatepickerUI>();

const detachedListener = (): void => undefined;

export default class DatepickerUI {
  private readonly core: CoreState;
  private readonly emitter: EventEmitter<DatepickerEventMap>;
  private readonly lifecycle: Lifecycle;

  constructor(
    selectorOrElement: string | HTMLElement,
    options?: DatepickerOptions,
  ) {
    const target = attachHost(selectorOrElement);
    this.emitter = new EventEmitter<DatepickerEventMap>();
    this.core = new CoreState(
      target.input,
      target.host,
      target.createdHost,
      options,
    );
    this.lifecycle = new Lifecycle(
      this.core,
      this.emitter,
      new Managers(this.core, this.emitter),
    );
    instanceRegistry.set(this.core.instanceId, this);
  }

  create(): void {
    this.lifecycle.create();
  }

  open(): void {
    this.lifecycle.open("api");
  }

  close(): void {
    void this.lifecycle.close();
  }

  destroy(options?: { keepInputValue?: boolean }): void {
    this.lifecycle.destroy(options?.keepInputValue ?? false);
    if (instanceRegistry.get(this.core.instanceId) === this) {
      instanceRegistry.delete(this.core.instanceId);
    }
  }

  getValue(): PickerValue | null {
    return this.lifecycle.getValue();
  }

  setValue(value: PickerValueInput | null): void {
    this.lifecycle.setValue(value);
  }

  setActiveEnd(end: RangeEnd): void {
    this.lifecycle.setActiveEnd(end);
  }

  setOptions(options: DatepickerOptions): void {
    this.lifecycle.setOptions(options);
  }

  getElement(): HTMLElement {
    return this.core.host;
  }

  on<K extends keyof DatepickerEventMap>(
    event: K,
    handler: Handler<DatepickerEventMap[K]>,
  ): () => void {
    if (this.lifecycle.destroyed) {
      return detachedListener;
    }
    return this.emitter.on(event, handler);
  }

  once<K extends keyof DatepickerEventMap>(
    event: K,
    handler: Handler<DatepickerEventMap[K]>,
  ): () => void {
    if (this.lifecycle.destroyed) {
      return detachedListener;
    }
    return this.emitter.once(event, handler);
  }

  off<K extends keyof DatepickerEventMap>(
    event: K,
    handler?: Handler<DatepickerEventMap[K]>,
  ): void {
    this.emitter.off(event, handler);
  }

  get instanceId(): string {
    return this.core.instanceId;
  }

  get options(): DatepickerOptions {
    return this.core.rawOptions;
  }

  get isInitialized(): boolean {
    return this.lifecycle.created;
  }

  get isDestroyed(): boolean {
    return this.lifecycle.destroyed;
  }

  static getById(id: string): DatepickerUI | undefined {
    return instanceRegistry.get(sanitizeInstanceId(id));
  }

  static getAllInstances(): DatepickerUI[] {
    return [...instanceRegistry.values()];
  }

  static destroyAll(): void {
    for (const instance of [...instanceRegistry.values()]) {
      instance.destroy();
    }
  }
}
