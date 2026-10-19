import { describe, expect, it } from "vitest";
import { nextFocusDate } from "@/managers/calendar/GridKeyboard";

const oct17 = { year: 2026, month: 10, day: 17 };

describe("nextFocusDate", () => {
  it("moves by one day with horizontal arrows", () => {
    expect(nextFocusDate("ArrowRight", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 18,
    });
    expect(nextFocusDate("ArrowLeft", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 16,
    });
  });

  it("reverses horizontal arrows in rtl", () => {
    expect(nextFocusDate("ArrowLeft", false, oct17, true)).toEqual({
      year: 2026,
      month: 10,
      day: 18,
    });
    expect(nextFocusDate("ArrowRight", false, oct17, true)).toEqual({
      year: 2026,
      month: 10,
      day: 16,
    });
  });

  it("moves by one week with vertical arrows", () => {
    expect(nextFocusDate("ArrowUp", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 10,
    });
    expect(nextFocusDate("ArrowDown", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 24,
    });
  });

  it("crosses month boundaries with arrows", () => {
    expect(
      nextFocusDate(
        "ArrowDown",
        false,
        { year: 2026, month: 10, day: 28 },
        false,
      ),
    ).toEqual({ year: 2026, month: 11, day: 4 });
  });

  it("jumps to the first and last day of the month", () => {
    expect(nextFocusDate("Home", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 1,
    });
    expect(nextFocusDate("End", false, oct17, false)).toEqual({
      year: 2026,
      month: 10,
      day: 31,
    });
  });

  it("returns null for other keys", () => {
    expect(nextFocusDate("Tab", false, oct17, false)).toBeNull();
    expect(nextFocusDate("a", false, oct17, false)).toBeNull();
  });

  it("clamps the day when paging months", () => {
    expect(
      nextFocusDate(
        "PageDown",
        false,
        { year: 2026, month: 1, day: 31 },
        false,
      ),
    ).toEqual({ year: 2026, month: 2, day: 28 });
    expect(
      nextFocusDate("PageUp", false, { year: 2026, month: 3, day: 31 }, false),
    ).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it("pages by a year with Shift and clamps leap days", () => {
    expect(
      nextFocusDate("PageUp", true, { year: 2024, month: 2, day: 29 }, false),
    ).toEqual({ year: 2023, month: 2, day: 28 });
    expect(nextFocusDate("PageDown", true, oct17, false)).toEqual({
      year: 2027,
      month: 10,
      day: 17,
    });
  });
});
