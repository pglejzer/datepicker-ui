// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

describe("SSR safety", () => {
  it("runs without DOM globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("imports the library entry without touching window or document at module top level", async () => {
    vi.resetModules();

    const lib = await import("@/index");

    expect(typeof lib.default).toBe("function");
    expect(lib.DatepickerUI).toBe(lib.default);
    expect(lib.DEFAULT_DATEPICKER_OPTIONS.ui.displayMode).toBe("auto");
  });

  it("imports the kit entry without touching window or document at module top level", async () => {
    vi.resetModules();

    const kit = await import("@/kit");

    expect(typeof kit.resolvePattern).toBe("function");
    expect(typeof kit.PopoverHost).toBe("function");
  });
});
