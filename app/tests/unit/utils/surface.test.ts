import { describe, expect, it } from "vitest";
import type { LayoutOption } from "@/types/internal";
import type { CalendarMode } from "@/types/selection";
import {
  calendarLayout,
  homePanel,
  inlineChrome,
  isFullscreenRange,
  resolveSurfaceMode,
  resolveViewLayout,
  startPanel,
  supportsInputView,
  type InlineChrome,
  type ViewLayoutInput,
} from "@/utils/surface";

const layoutInput = (patch: Partial<ViewLayoutInput>): ViewLayoutInput => ({
  months: 2,
  precision: "day",
  mode: "single",
  layout: "docked",
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

  it("is always one month in the modal and full-screen layouts", () => {
    expect(resolveViewLayout(layoutInput({ layout: "modal" })).months).toBe(1);
    expect(
      resolveViewLayout(layoutInput({ layout: "fullscreen" })).months,
    ).toBe(1);
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
      expect(range({ layout: "modal" })).toEqual({
        months: 1,
        presets: "row",
      });
      expect(range({ layout: "fullscreen" })).toEqual({
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
      resolveViewLayout(layoutInput({ mode: "range", layout: "fullscreen" }))
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
  it("opens the day grid for day, in every layout", () => {
    expect(startPanel("day", "docked")).toBe("days");
    expect(startPanel("day", "modal")).toBe("days");
    expect(startPanel("day", "fullscreen")).toBe("days");
  });

  it("opens the menus in the docked layout", () => {
    expect(startPanel("month", "docked")).toBe("month-menu");
    expect(startPanel("year", "docked")).toBe("year-menu");
  });

  it("opens the full grids in the modal and full-screen layouts", () => {
    expect(startPanel("month", "modal")).toBe("month-grid");
    expect(startPanel("year", "modal")).toBe("year-grid");
    expect(startPanel("month", "fullscreen")).toBe("month-grid");
    expect(startPanel("year", "fullscreen")).toBe("year-grid");
  });
});

describe("supportsInputView", () => {
  it("keeps the day precision rules per mode and layout", () => {
    expect(supportsInputView("single", "modal", "day")).toBe(true);
    expect(supportsInputView("single", "fullscreen", "day")).toBe(true);
    expect(supportsInputView("single", "docked", "day")).toBe(false);
    expect(supportsInputView("range", "docked", "day")).toBe(true);
    expect(supportsInputView("range", "modal", "day")).toBe(true);
    expect(supportsInputView("range", "fullscreen", "day")).toBe(true);
    expect(supportsInputView("multiple", "modal", "day")).toBe(false);
    expect(supportsInputView("multiple", "docked", "day")).toBe(false);
  });

  it("is never supported at month or year precision", () => {
    for (const precision of ["month", "year"] as const) {
      expect(supportsInputView("single", "modal", precision)).toBe(false);
      expect(supportsInputView("single", "docked", precision)).toBe(false);
      expect(supportsInputView("range", "modal", precision)).toBe(false);
    }
  });
});

describe("calendarLayout", () => {
  const opts = (
    mode: CalendarMode,
    layout: LayoutOption = "auto",
  ): Parameters<typeof calendarLayout>[1] => ({
    mode,
    fullscreenBelow: 600,
    layout,
  });

  describe('"auto"', () => {
    it("is docked on a docked surface", () => {
      expect(calendarLayout("docked", opts("single"), 1280)).toBe("docked");
      expect(calendarLayout("docked", opts("range"), 300)).toBe("docked");
    });

    it("is full screen for a modal range below ui.fullscreen", () => {
      expect(calendarLayout("modal", opts("range"), 400)).toBe("fullscreen");
      expect(calendarLayout("modal", opts("range"), 599)).toBe("fullscreen");
      expect(calendarLayout("modal", opts("range"), 600)).toBe("modal");
    });

    it("is modal for a modal single", () => {
      expect(calendarLayout("modal", opts("single"), 400)).toBe("modal");
    });

    it("is docked inline", () => {
      expect(calendarLayout("inline", opts("single"), 1280)).toBe("docked");
      expect(calendarLayout("inline", opts("range"), 400)).toBe("docked");
    });
  });

  it('"docked" is docked on every surface, also for a small modal range', () => {
    for (const surface of ["docked", "modal", "inline"] as const) {
      expect(calendarLayout(surface, opts("single", "docked"), 400)).toBe(
        "docked",
      );
      expect(calendarLayout(surface, opts("range", "docked"), 400)).toBe(
        "docked",
      );
    }
  });

  describe('"modal"', () => {
    it("is modal on the popover and inline", () => {
      expect(calendarLayout("docked", opts("single", "modal"), 1280)).toBe(
        "modal",
      );
      expect(calendarLayout("docked", opts("range", "modal"), 400)).toBe(
        "modal",
      );
      expect(calendarLayout("inline", opts("range", "modal"), 400)).toBe(
        "modal",
      );
    });

    it("keeps the ui.fullscreen rule in a dialog", () => {
      expect(calendarLayout("modal", opts("range", "modal"), 599)).toBe(
        "fullscreen",
      );
      expect(calendarLayout("modal", opts("range", "modal"), 600)).toBe(
        "modal",
      );
      expect(calendarLayout("modal", opts("single", "modal"), 400)).toBe(
        "modal",
      );
    });
  });

  describe('"fullscreen"', () => {
    it("is full screen for a range in a dialog at every width and inline", () => {
      expect(calendarLayout("modal", opts("range", "fullscreen"), 1280)).toBe(
        "fullscreen",
      );
      expect(calendarLayout("inline", opts("range", "fullscreen"), 1280)).toBe(
        "fullscreen",
      );
    });

    it("is modal on the popover and for the other modes", () => {
      expect(calendarLayout("docked", opts("range", "fullscreen"), 1280)).toBe(
        "modal",
      );
      expect(calendarLayout("modal", opts("single", "fullscreen"), 400)).toBe(
        "modal",
      );
      expect(
        calendarLayout("inline", opts("multiple", "fullscreen"), 1280),
      ).toBe("modal");
    });
  });
});

describe("inlineChrome", () => {
  const custom: InlineChrome = {
    headline: false,
    navigation: "caption",
    announceSelection: false,
  };

  it("returns the defaults for a docked or modal surface", () => {
    const defaults = {
      headline: true,
      navigation: "menus",
      announceSelection: true,
    };
    expect(inlineChrome("docked", custom)).toEqual(defaults);
    expect(inlineChrome("modal", custom)).toEqual(defaults);
  });

  it("passes the inline options through on an inline surface", () => {
    expect(inlineChrome("inline", custom)).toEqual(custom);
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
