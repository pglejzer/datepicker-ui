import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatHint,
  hintLetters,
  isFormatOption,
  resolvePattern,
} from "@/utils/date/format";

const d = { year: 2026, month: 3, day: 4 };

describe("resolvePattern + formatDate", () => {
  it("derives the auto pattern from the locale", () => {
    expect(formatDate(d, resolvePattern("auto", "en-US"))).toBe("03/04/2026");
    expect(formatDate(d, resolvePattern("auto", "pl-PL"))).toBe("04.03.2026");
    expect(formatDate(d, resolvePattern("auto", "ja-JP"))).toBe("2026/03/04");
  });

  it("uses Latin digits for ar-EG auto format", () => {
    expect(formatDate(d, resolvePattern("auto", "ar-EG"))).toMatch(/^[0-9/]+$/);
  });

  it("honours explicit tokens", () => {
    expect(formatDate(d, resolvePattern("dd/MM/yyyy", "en-US"))).toBe(
      "04/03/2026",
    );
    expect(formatDate(d, resolvePattern("d.M.yy", "en-US"))).toBe("4.3.26");
  });

  it("pads zero-padded tokens for two-digit days and months", () => {
    const p = resolvePattern("dd/MM/yyyy", "en-US");
    expect(formatDate({ year: 2026, month: 12, day: 31 }, p)).toBe(
      "31/12/2026",
    );
    expect(formatDate({ year: 2000, month: 1, day: 1 }, p)).toBe("01/01/2000");
  });
});

describe("short patterns", () => {
  it("isFormatOption gates short patterns by precision", () => {
    expect(isFormatOption("MM/dd/yyyy")).toBe(true);
    expect(isFormatOption("MM/dd/yyyy", "month")).toBe(true);
    for (const f of ["MM/yyyy", "yyyy-MM", "M.yy"]) {
      expect(isFormatOption(f)).toBe(false);
      expect(isFormatOption(f, "month")).toBe(true);
      expect(isFormatOption(f, "year")).toBe(true);
    }
    expect(isFormatOption("yyyy")).toBe(false);
    expect(isFormatOption("yyyy", "month")).toBe(false);
    expect(isFormatOption("yyyy", "year")).toBe(true);
  });

  it("always resolves a three-part order", () => {
    expect(resolvePattern("MM/yyyy", "en-US", "month").order).toEqual([
      "day",
      "month",
      "year",
    ]);
    expect(resolvePattern("yyyy-MM", "en-US", "month").order).toEqual([
      "year",
      "month",
      "day",
    ]);
    expect(resolvePattern("yyyy", "en-US", "year").order).toEqual([
      "month",
      "day",
      "year",
    ]);
  });
});

describe("formatHint", () => {
  it("writes the placeholder in pattern order", () => {
    expect(formatHint(resolvePattern("auto", "en-US"))).toBe("mm/dd/yyyy");
    expect(formatHint(resolvePattern("auto", "de-DE"))).toBe("dd.mm.yyyy");
    expect(formatHint(resolvePattern("auto", "ja-JP"))).toBe("yyyy/mm/dd");
  });

  it("follows custom tokens", () => {
    expect(formatHint(resolvePattern("d.M.yy", "en-US"))).toBe("dd.mm.yy");
    expect(formatHint(resolvePattern("yyyy-MM-dd", "en-US"))).toBe(
      "yyyy-mm-dd",
    );
  });

  it("uses the given letters", () => {
    const letters = { day: "dd", month: "mm", year: "rrrr" };
    expect(formatHint(resolvePattern("dd.MM.yyyy", "de-DE"), letters)).toBe(
      "dd.mm.rrrr",
    );
  });

  it("cuts the year letters to two for a two-digit year", () => {
    const letters = { day: "dd", month: "mm", year: "rrrr" };
    expect(formatHint(resolvePattern("dd.MM.yy", "de-DE"), letters)).toBe(
      "dd.mm.rr",
    );
  });

  it("matches the default letters when none are given", () => {
    const pattern = resolvePattern("dd.MM.yyyy", "de-DE");
    expect(formatHint(pattern)).toBe("dd.mm.yyyy");
    expect(formatHint(pattern, { day: "dd", month: "mm", year: "yyyy" })).toBe(
      "dd.mm.yyyy",
    );
  });
});

describe("hintLetters", () => {
  it("maps the three hint labels", () => {
    expect(
      hintLetters({ hintDay: "tt", hintMonth: "MM", hintYear: "jjjj" }),
    ).toEqual({ day: "tt", month: "MM", year: "jjjj" });
  });
});
