import { describe, expect, it } from "vitest";
import type { YearMonth } from "@/types/date";
import { windowFor } from "@/utils/date/monthWindow";

const ym = (year: number, month: number): YearMonth => ({ year, month });

const OCT = ym(2026, 10);

describe("windowFor", () => {
  it("keeps the view while the target is inside the window", () => {
    expect(windowFor(OCT, ym(2026, 10), 2, "view")).toEqual(OCT);
    expect(windowFor(OCT, ym(2026, 11), 2, "view")).toEqual(OCT);
    expect(windowFor(OCT, ym(2026, 11), 2, "month")).toEqual(OCT);
  });

  it("pages by whole views when the target is after the window", () => {
    expect(windowFor(OCT, ym(2026, 12), 2, "view")).toEqual(ym(2026, 12));
    expect(windowFor(OCT, ym(2027, 1), 2, "view")).toEqual(ym(2026, 12));
  });

  it("pages by whole views when the target is before the window", () => {
    expect(windowFor(OCT, ym(2026, 9), 2, "view")).toEqual(ym(2026, 8));
    expect(windowFor(OCT, ym(2026, 8), 2, "view")).toEqual(ym(2026, 8));
  });

  it("shifts by one month with pageBy month", () => {
    expect(windowFor(OCT, ym(2026, 12), 2, "month")).toEqual(ym(2026, 11));
    expect(windowFor(OCT, ym(2026, 9), 2, "month")).toEqual(ym(2026, 9));
  });

  it("crosses the year boundary", () => {
    const nov = ym(2026, 11);

    expect(windowFor(nov, ym(2027, 1), 2, "view")).toEqual(ym(2027, 1));
    expect(windowFor(nov, ym(2027, 2), 2, "month")).toEqual(ym(2027, 1));
    expect(windowFor(ym(2027, 1), ym(2026, 12), 2, "view")).toEqual(
      ym(2026, 11),
    );
  });

  it("is the target month for a single visible month", () => {
    expect(windowFor(OCT, ym(2026, 12), 1, "view")).toEqual(ym(2026, 12));
    expect(windowFor(OCT, ym(2026, 12), 1, "month")).toEqual(ym(2026, 12));
    expect(windowFor(OCT, ym(2026, 7), 1, "view")).toEqual(ym(2026, 7));
    expect(windowFor(OCT, ym(2026, 10), 1, "view")).toEqual(OCT);
  });

  it("moves a three month view by whole pages", () => {
    expect(windowFor(OCT, ym(2027, 1), 3, "view")).toEqual(ym(2027, 1));
    expect(windowFor(OCT, ym(2026, 12), 3, "view")).toEqual(OCT);
    expect(windowFor(OCT, ym(2026, 7), 3, "view")).toEqual(ym(2026, 7));
  });
});
