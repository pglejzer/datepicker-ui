import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePresets } from "@/datepicker/options/presets";
import type { OptionIssue } from "@/datepicker/options/pick";
import type { ResolvedPreset } from "@/datepicker/options/types";
import { resolvePreset } from "@/utils/selection/presets";
import { d } from "../../../helpers/selection";

const preset = (value: unknown): ResolvedPreset => {
  const issues: OptionIssue[] = [];
  const resolved = resolvePresets([{ label: "P", value }], issues).at(0);
  if (resolved === undefined) {
    throw new Error("preset was not resolved");
  }
  return resolved;
};

describe("resolvePreset", () => {
  let queued: (() => void)[];

  beforeEach(() => {
    queued = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      queued.push(cb);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves an object value of dates and ISO strings", () => {
    expect(
      resolvePreset(
        preset({ start: new Date(2026, 9, 11), end: "2026-10-17" }),
      ),
    ).toEqual({ start: d(2026, 10, 11), end: d(2026, 10, 17) });
  });

  it("calls a function value every time", () => {
    let day = 10;
    const resolved = preset(() => ({
      start: new Date(2026, 9, day),
      end: new Date(2026, 9, 20),
    }));
    expect(resolvePreset(resolved)?.start).toEqual(d(2026, 10, 10));
    day = 12;
    expect(resolvePreset(resolved)?.start).toEqual(d(2026, 10, 12));
  });

  it("is null for a reversed range", () => {
    expect(
      resolvePreset(preset({ start: "2026-10-20", end: "2026-10-10" })),
    ).toBeNull();
  });

  it("is null for an invalid or incomplete range", () => {
    expect(
      resolvePreset(preset({ start: "nope", end: "2026-10-10" })),
    ).toBeNull();
    expect(resolvePreset(preset({ start: "2026-10-10" }))).toBeNull();
    expect(resolvePreset(preset(() => "2026-10-10"))).toBeNull();
  });

  it("is null for a throwing value and rethrows later", () => {
    const boom = new Error("boom");
    const resolved = preset(() => {
      throw boom;
    });
    expect(resolvePreset(resolved)).toBeNull();
    expect(queued).toHaveLength(1);
    expect(() => {
      queued[0]?.();
    }).toThrow(boom);
  });
});
