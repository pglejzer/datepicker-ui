import { rethrowLater } from "./rethrow";

export type Handler<Data> = (data: Data) => void;

interface Listener<Data> {
  readonly handler: Handler<Data>;
}

type Store<Events extends object> = {
  [K in keyof Events]?: Set<Listener<Events[K]>>;
};

export class EventEmitter<Events extends object> {
  private store: Store<Events> = {};

  on<K extends keyof Events>(
    event: K,
    handler: Handler<Events[K]>,
    signal?: AbortSignal,
  ): () => void {
    const listeners = this.listenersOf(event);
    const listener: Listener<Events[K]> = { handler };
    const unsubscribe = (): void => {
      listeners.delete(listener);
      signal?.removeEventListener("abort", unsubscribe);
    };
    if (signal?.aborted) {
      return unsubscribe;
    }
    listeners.add(listener);
    signal?.addEventListener("abort", unsubscribe, { once: true });
    return unsubscribe;
  }

  once<K extends keyof Events>(
    event: K,
    handler: Handler<Events[K]>,
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      handler(data);
    });
    return unsubscribe;
  }

  off<K extends keyof Events>(event: K, handler?: Handler<Events[K]>): void {
    const listeners = this.store[event];
    if (!listeners) {
      return;
    }
    if (!handler) {
      listeners.clear();
      return;
    }
    for (const listener of listeners) {
      if (listener.handler === handler) {
        listeners.delete(listener);
      }
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.store[event];
    if (!listeners) {
      return;
    }
    const errors: unknown[] = [];
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) {
        continue;
      }
      try {
        listener.handler(data);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      rethrowLater(errors[0]);
    }
  }

  listenerCount(event: keyof Events): number {
    return this.store[event]?.size ?? 0;
  }

  clear(): void {
    this.store = {};
  }

  private listenersOf<K extends keyof Events>(
    event: K,
  ): Set<Listener<Events[K]>> {
    const existing = this.store[event];
    if (existing) {
      return existing;
    }
    const created = new Set<Listener<Events[K]>>();
    this.store[event] = created;
    return created;
  }
}
