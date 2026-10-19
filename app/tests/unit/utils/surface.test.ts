import { describe, expect, it } from "vitest";
import {
  homePanel,
  isFullscreenRange,
  resolveSurfaceMode,
  resolveViewLayout,
  startPanel,
  supportsInputView,
  type ViewLayoutInput,
} from "@/utils/surface";

const layoutInput = (patch: Partial<ViewLayoutInput>): ViewLayoutInput => ({
  months: 2,
  precision: "day",
  mode: "single",
  surface: "docked",
  fullscreen: false,
  width: 1280,
  weekNumbers: false,
  presets: 0,
  ...patch,
});

describe("resolveSurfaceMode", () => {
  it("auto switches to modal below 600 px and docked from 600 px", () => {
    expect(resolveSurfaceMode("auto", false, 599, 768)).toBe("modal");
    expect(resolveSurfaceMode("auto", false, 600, 768)).toBe("docked");
  });

  it("auto switches to modal below 480 px of height", () => {
    expect(resolveSurfaceMode("auto", false, 1024, 479)).toBe("modal");
    expect(resolveSurfaceMode("auto", false, 1024, 480)).toBe("docked");
  });

  it("honours forced modal and docked regardless of size", () => {
    expect(resolveSurfaceMode("modal", false, 1200, 768)).toBe("modal");
    expect(resolveSurfaceMode("docked", false, 300, 768)).toBe("docked");
    expect(resolveSurfaceMode("docked", false, 1024, 300)).toBe("docked");
    expect(resolveSurfaceMode("modal", false, 1024, 300)).toBe("modal");
  });

  it("inline wins over every option, width and height", () => {
    expect(resolveSurfaceMode("auto", true, 300, 768)).toBe("inline");
    expect(resolveSurfaceMode("modal", true, 1200, 768)).toBe("inline");
    expect(resolveSurfaceMode("docked", true, 800, 768)).toBe("inline");
    expect(resolveSurfaceMode("auto", true, 1024, 300)).toBe("inline");
  });
});

describe("resolveViewLayout", () => {
  it("shows the requested months when the width fits them", () => {
    expect(resolveViewLayout(layoutInput({ width: 1280 }))).toEqual({
      months: 2,
      presets: "none",
    });
    expect(resolveViewLayout(layoutInput({ width: 752 })).months).toBe(2);
  });

  it("falls back to one month when two do not fit (752 needed)", () => {
    expect(resolveViewLayout(layoutInput({ width: 751 })).months).toBe(1);
    expect(resolveViewLayout(layoutInput({ width: 700 })).months).toBe(1);
  });

  it("caps three months at the number that fits (1112 needed)", () => {
    expect(
      resolveViewLayout(layoutInput({ months: 3, width: 1100 })).months,
    ).toBe(2);
    expect(
      resolveViewLayout(layoutInput({ months: 3, width: 1112 })).months,
    ).toBe(3);
  });

  it("is always one month on a modal surface", () => {
    expect(resolveViewLayout(layoutInput({ surface: "modal" })).months).toBe(1);
  });

  it("is one month for month and year precision", () => {
    expect(resolveViewLayout(layoutInput({ precision: "month" })).months).toBe(
      1,
    );
    expect(resolveViewLayout(layoutInput({ precision: "year" })).months).toBe(
      1,
    );
  });

  it("widens each month by the week number column (848 needed)", () => {
    expect(
      resolveViewLayout(layoutInput({ weekNumbers: true, width: 800 })).months,
    ).toBe(1);
    expect(
      resolveViewLayout(layoutInput({ weekNumbers: true, width: 848 })).months,
    ).toBe(2);
  });

  it("does not count week numbers for range", () => {
    expect(
      resolveViewLayout(
        layoutInput({ mode: "range", weekNumbers: true, width: 800 }),
      ).months,
    ).toBe(2);
  });

  describe("range presets", () => {
    const range = (
      patch: Partial<ViewLayoutInput>,
    ): ReturnType<typeof resolveViewLayout> =>
      resolveViewLayout(layoutInput({ mode: "range", presets: 3, ...patch }));

    it("keeps a presets column and two months on a wide window", () => {
      expect(range({ months: 3, width: 1000 })).toEqual({
        months: 2,
        presets: "column",
      });
    });

    it("keeps the column and drops to one month when two do not fit", () => {
      expect(range({ months: 3, width: 900 })).toEqual({
        months: 1,
        presets: "column",
      });
    });

    it("moves the presets to a row when the column does not fit", () => {
      expect(range({ months: 3, width: 540 })).toEqual({
        months: 1,
        presets: "row",
      });
    });

    it("uses a row on a modal and full-screen surface", () => {
      expect(range({ surface: "modal" })).toEqual({
        months: 1,
        presets: "row",
      });
      expect(range({ fullscreen: true })).toEqual({
        months: 1,
        presets: "row",
      });
    });

    it("has no presets without any configured", () => {
      expect(range({ presets: 0 }).presets).toBe("none");
    });
  });

  it("is one month in full screen", () => {
    expect(
      resolveViewLayout(layoutInput({ mode: "range", fullscreen: true }))
        .months,
    ).toBe(1);
  });
});

describe("homePanel", () => {
  it("is the panel that matches the precision", () => {
    expect(homePanel("day")).toBe("days");
    expect(homePanel("month")).toBe("month-grid");
    expect(homePanel("year")).toBe("year-grid");
  });
});

describe("startPanel", () => {
  it("opens the day grid for day, on every surface", () => {
    expect(startPanel("day", "docked")).toBe("days");
    expect(startPanel("day", "inline")).toBe("days");
    expect(startPanel("day", "modal")).toBe("days");
  });

  it("opens the menus on docked and inline surfaces", () => {
    expect(startPanel("month", "docked")).toBe("month-menu");
    expect(startPanel("month", "inline")).toBe("month-menu");
    expect(startPanel("year", "docked")).toBe("year-menu");
    expect(startPanel("year", "inline")).toBe("year-menu");
  });

  it("opens the full grids on a modal surface", () => {
    expect(startPanel("month", "modal")).toBe("month-grid");
    expect(startPanel("year", "modal")).toBe("year-grid");
  });
});

describe("supportsInputView", () => {
  it("keeps the day precision rules per mode and surface", () => {
    expect(supportsInputView("single", "modal", "day")).toBe(true);
    expect(supportsInputView("single", "docked", "day")).toBe(false);
    expect(supportsInputView("single", "inline", "day")).toBe(false);
    expect(supportsInputView("range", "docked", "day")).toBe(true);
    expect(supportsInputView("range", "modal", "day")).toBe(true);
    expect(supportsInputView("multiple", "modal", "day")).toBe(false);
  });

  it("is never supported at month or year precision", () => {
    for (const precision of ["month", "year"] as const) {
      expect(supportsInputView("single", "modal", precision)).toBe(false);
      expect(supportsInputView("single", "docked", precision)).toBe(false);
      expect(supportsInputView("range", "modal", precision)).toBe(false);
    }
  });
});

describe("isFullscreenRange", () => {
  it("is true only for a modal range below the breakpoint", () => {
    expect(isFullscreenRange("range", "modal", 599, 600)).toBe(true);
    expect(isFullscreenRange("range", "modal", 600, 600)).toBe(false);
    expect(isFullscreenRange("range", "docked", 400, 600)).toBe(false);
    expect(isFullscreenRange("single", "modal", 400, 600)).toBe(false);
  });
});
