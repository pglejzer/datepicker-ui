import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "@/utils/EventEmitter";

interface Events {
  ping: { n: number };
  pong: { s: string };
}

describe("EventEmitter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("on returns a working unsubscribe", () => {
    const e = new EventEmitter<Events>();
    const h = vi.fn();
    const off = e.on("ping", h);
    e.emit("ping", { n: 1 });
    off();
    e.emit("ping", { n: 2 });
    expect(h).toHaveBeenCalledTimes(1);
    expect(h).toHaveBeenCalledWith({ n: 1 });
  });

  it("abort signal removes the handler", () => {
    const e = new EventEmitter<Events>();
    const h = vi.fn();
    const controller = new AbortController();
    e.on("ping", h, controller.signal);
    e.emit("ping", { n: 1 });
    controller.abort();
    e.emit("ping", { n: 2 });
    expect(h).toHaveBeenCalledTimes(1);
    expect(e.listenerCount("ping")).toBe(0);
  });

  it("an already aborted signal never subscribes", () => {
    const e = new EventEmitter<Events>();
    const h = vi.fn();
    const controller = new AbortController();
    controller.abort();
    e.on("ping", h, controller.signal);
    e.emit("ping", { n: 1 });
    expect(h).not.toHaveBeenCalled();
  });

  it("once fires a single time", () => {
    const e = new EventEmitter<Events>();
    const h = vi.fn();
    e.once("ping", h);
    e.emit("ping", { n: 1 });
    e.emit("ping", { n: 2 });
    expect(h).toHaveBeenCalledTimes(1);
    expect(e.listenerCount("ping")).toBe(0);
  });

  it("off(event) removes all handlers, off(event, h) only one", () => {
    const e = new EventEmitter<Events>();
    const a = vi.fn();
    const b = vi.fn();
    e.on("ping", a);
    e.on("ping", b);
    e.off("ping", a);
    e.emit("ping", { n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
    e.off("ping");
    e.emit("ping", { n: 2 });
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("listenerCount counts per event and clear empties all", () => {
    const e = new EventEmitter<Events>();
    e.on("ping", vi.fn());
    e.on("ping", vi.fn());
    e.on("pong", vi.fn());
    expect(e.listenerCount("ping")).toBe(2);
    expect(e.listenerCount("pong")).toBe(1);
    e.clear();
    expect(e.listenerCount("ping")).toBe(0);
    expect(e.listenerCount("pong")).toBe(0);
  });

  it("a throwing handler does not block the next one and is rethrown async", () => {
    const queued: (() => void)[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      queued.push(cb);
    });
    const e = new EventEmitter<Events>();
    const boom = new Error("boom");
    const next = vi.fn();
    e.on("ping", () => {
      throw boom;
    });
    e.on("ping", next);
    expect(() => {
      e.emit("ping", { n: 1 });
    }).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
    expect(queued).toHaveLength(1);
    expect(() => {
      queued[0]?.();
    }).toThrow(boom);
  });

  it("removing a handler during emit does not skip the others", () => {
    const e = new EventEmitter<Events>();
    const calls: string[] = [];
    const a = (): void => {
      calls.push("a");
      e.off("ping", a);
    };
    e.on("ping", a);
    e.on("ping", () => calls.push("b"));
    e.on("ping", () => calls.push("c"));
    e.emit("ping", { n: 1 });
    expect(calls).toEqual(["a", "b", "c"]);
    e.emit("ping", { n: 2 });
    expect(calls).toEqual(["a", "b", "c", "b", "c"]);
  });
});
