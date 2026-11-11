import { afterEach, describe, expect, it } from "vitest";
import { fitsViewport } from "@/utils/viewportFit";
import { setViewportHeight } from "../../helpers/viewport";

const surface = (rectHeight: number, scrollHeight = 0): HTMLElement => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => new DOMRect(0, 0, 300, rectHeight);
  Object.defineProperty(el, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });
  return el;
};

const anchorAt = (top: number, height = 40): HTMLElement => {
  const el = document.createElement("input");
  el.getBoundingClientRect = () => new DOMRect(0, top, 200, height);
  return el;
};

describe("fitsViewport", () => {
  const original = window.innerHeight;

  afterEach(() => {
    setViewportHeight(original);
  });

  it("fits below the anchor", () => {
    setViewportHeight(936);
    expect(fitsViewport(surface(700), anchorAt(100, 38))).toBe(true);
  });

  it("fits when only the space above the anchor is large enough", () => {
    setViewportHeight(936);
    expect(fitsViewport(surface(700), anchorAt(800, 38))).toBe(true);
  });

  it("fits on neither side though the window is tall enough", () => {
    setViewportHeight(936);
    expect(fitsViewport(surface(831), anchorAt(449, 38))).toBe(false);
  });

  it("fits below exactly at the boundary and not one pixel taller", () => {
    setViewportHeight(768);
    expect(fitsViewport(surface(768 - 40 - 8), anchorAt(0))).toBe(true);
    expect(fitsViewport(surface(768 - 40 - 8 + 1), anchorAt(0))).toBe(false);
  });

  it("fits above exactly at the boundary and not one pixel taller", () => {
    setViewportHeight(768);
    expect(fitsViewport(surface(700 - 8), anchorAt(700))).toBe(true);
    expect(fitsViewport(surface(700 - 8 + 1), anchorAt(700))).toBe(false);
  });

  it("counts scrollHeight when it is larger than the rect height", () => {
    setViewportHeight(747);
    expect(fitsViewport(surface(500, 700), anchorAt(0))).toBe(false);
    setViewportHeight(748);
    expect(fitsViewport(surface(500, 700), anchorAt(0))).toBe(true);
  });

  it("counts the rect height when it is larger than scrollHeight", () => {
    setViewportHeight(747);
    expect(fitsViewport(surface(700, 100), anchorAt(0))).toBe(false);
  });

  it("does not fit a surface taller than the window", () => {
    setViewportHeight(600);
    expect(fitsViewport(surface(624), anchorAt(0))).toBe(false);
  });
});
