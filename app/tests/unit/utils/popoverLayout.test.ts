import { describe, expect, it } from "vitest";
import {
  computePopoverLayout,
  type PopoverAnchorRect,
  type PopoverLayoutInput,
} from "@/utils/popoverLayout";

const TOKENS = { gap: 4, minWidth: 260, maxWidth: 328, edgeMargin: 4 };

const anchorAt = (
  top: number,
  left: number,
  width = 200,
  height = 40,
): PopoverAnchorRect => ({
  top,
  left,
  width,
  bottom: top + height,
  right: left + width,
});

const layout = (overrides: Partial<PopoverLayoutInput> = {}) =>
  computePopoverLayout({
    anchor: anchorAt(100, 50),
    contentWidth: 0,
    pickerHeight: 456,
    minHeight: 132,
    layoutWidth: 1024,
    viewport: { width: 1024, height: 768, offsetLeft: 0, offsetTop: 0 },
    tokens: TOKENS,
    request: "auto",
    rtl: false,
    pixelRatio: 1,
    ...overrides,
  });

describe("computePopoverLayout", () => {
  it("opens below when the picker fits there", () => {
    expect(layout()).toMatchObject({
      placement: "bottom",
      top: 144,
      availableHeight: null,
    });
  });

  it("opens above when only the room above fits (viewport 800, anchor bottom 780)", () => {
    const result = layout({
      anchor: anchorAt(740, 50),
      viewport: { width: 1024, height: 800, offsetLeft: 0, offsetTop: 0 },
    });

    expect(result).toMatchObject({
      placement: "top",
      top: 740 - 4 - 456,
      availableHeight: null,
    });
  });

  it("keeps the popover inside a 360 px viewport near the right edge", () => {
    const result = layout({
      anchor: anchorAt(100, 300, 50),
      layoutWidth: 360,
      viewport: { width: 360, height: 800, offsetLeft: 0, offsetTop: 0 },
    });

    expect(result.width).toBe(260);
    expect(result.left + result.width).toBeLessThanOrEqual(360 - 4);
  });

  it("clamps width between the min and max tokens", () => {
    expect(layout({ anchor: anchorAt(100, 50, 120) }).width).toBe(260);
    expect(layout({ contentWidth: 400 }).width).toBe(328);
  });

  it("aligns to the right edge of the anchor in rtl", () => {
    expect(
      layout({ anchor: anchorAt(100, 500), contentWidth: 314, rtl: true }).left,
    ).toBe(386);
  });

  it("constrains the height when neither side fits and returns the larger side", () => {
    const result = layout({
      anchor: anchorAt(150, 50),
      viewport: { width: 1024, height: 400, offsetLeft: 0, offsetTop: 0 },
    });

    expect(result).toMatchObject({
      placement: "bottom",
      top: 194,
      availableHeight: 202,
    });
  });

  it("honours a forced top request when there is room below", () => {
    expect(
      layout({
        request: "top",
        anchor: anchorAt(600, 50),
        viewport: { width: 1024, height: 1200, offsetLeft: 0, offsetTop: 0 },
      }),
    ).toMatchObject({ placement: "top", top: 140, availableHeight: null });
  });

  it("never reports a negative available height", () => {
    expect(
      layout({
        request: "bottom",
        anchor: anchorAt(-20, 50, 200, 808),
      }).availableHeight,
    ).toBe(0);
  });

  it("snaps to device pixels", () => {
    const result = layout({
      anchor: {
        top: 100.6,
        bottom: 140.6,
        left: 50.3,
        right: 250.3,
        width: 200,
      },
      contentWidth: 314.4,
      request: "bottom",
      pixelRatio: 2,
    });

    expect(result).toMatchObject({ top: 144.5, left: 50.5, width: 314.5 });
  });
});
