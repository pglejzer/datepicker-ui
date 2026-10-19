import { describe, expect, it } from "vitest";
import type { CalendarMode, Selection } from "@/types/selection";
import { resolvePattern } from "@/utils/date/format";
import {
  formatSelection,
  parseSelection,
  parseSerialized,
  RANGE_SEPARATOR,
  serializeSelection,
} from "@/utils/selection/text";
import { oct } from "../../../helpers/selection";

const pattern = resolvePattern("auto", "en-US");

const range = (a: number | null, b: number | null): Selection => ({
  mode: "range",
  start: a === null ? null : oct(a),
  end: b === null ? null : oct(b),
});

describe("formatSelection", () => {
  it("uses an en dash with spaces as the range separator", () => {
    expect(RANGE_SEPARATOR).toBe(" – ");
  });

  it("formats single, range and multiple", () => {
    expect(
      formatSelection({ mode: "single", date: oct(5) }, pattern, "day"),
    ).toBe("10/05/2026");
    expect(
      formatSelection({ mode: "single", date: null }, pattern, "day"),
    ).toBe("");
    expect(formatSelection(range(20, 28), pattern, "day")).toBe(
      "10/20/2026 – 10/28/2026",
    );
    expect(formatSelection(range(20, null), pattern, "day")).toBe("10/20/2026");
    expect(formatSelection(range(null, null), pattern, "day")).toBe("");
    expect(
      formatSelection(
        { mode: "multiple", dates: [oct(5), oct(20)] },
        pattern,
        "day",
      ),
    ).toBe("10/05/2026, 10/20/2026");
    expect(
      formatSelection({ mode: "multiple", dates: [] }, pattern, "day"),
    ).toBe("");
  });

  it("formats a single period at month and year precision", () => {
    const selection: Selection = { mode: "single", date: oct(1) };
    expect(formatSelection(selection, pattern, "month")).toBe("10/2026");
    expect(formatSelection(selection, pattern, "year")).toBe("2026");
  });
});

const parseDay = (text: string, mode: CalendarMode): Selection | null =>
  parseSelection(text, mode, pattern, "day");

describe("parseSelection", () => {
  it("parses a range with en dash, spaced hyphen and a tight en dash", () => {
    const expected = range(20, 28);
    expect(parseDay("10/20/2026 – 10/28/2026", "range")).toEqual(expected);
    expect(parseDay("10/20/2026 - 10/28/2026", "range")).toEqual(expected);
    expect(parseDay("10/20/2026–10/28/2026", "range")).toEqual(expected);
  });

  it("accepts a one-day range", () => {
    expect(parseDay("10/20/2026 – 10/20/2026", "range")).toEqual(range(20, 20));
  });

  it("rejects reversed, single-part and invalid ranges", () => {
    expect(parseDay("10/28/2026 – 10/20/2026", "range")).toBeNull();
    expect(parseDay("10/20/2026", "range")).toBeNull();
    expect(parseDay("10/20/2026 – 13/45/2026", "range")).toBeNull();
    expect(
      parseDay("10/20/2026 – 10/21/2026 – 10/22/2026", "range"),
    ).toBeNull();
  });

  it("sorts and de-duplicates multiple dates", () => {
    expect(parseDay("10/20/2026, 10/05/2026", "multiple")).toEqual({
      mode: "multiple",
      dates: [oct(5), oct(20)],
    });
    expect(parseDay("10/20/2026; 10/20/2026,", "multiple")).toEqual({
      mode: "multiple",
      dates: [oct(20)],
    });
  });

  it("rejects a multiple list with an invalid part", () => {
    expect(parseDay("10/20/2026, nope", "multiple")).toBeNull();
  });

  it("parses single dates", () => {
    expect(parseDay(" 10/20/2026 ", "single")).toEqual({
      mode: "single",
      date: oct(20),
    });
    expect(parseDay("nope", "single")).toBeNull();
  });

  it("returns an empty selection for blank text in every mode", () => {
    expect(parseDay("", "single")).toEqual({ mode: "single", date: null });
    expect(parseDay("  ", "range")).toEqual(range(null, null));
    expect(parseDay("", "multiple")).toEqual({ mode: "multiple", dates: [] });
  });

  it("parses month and year periods in single mode", () => {
    expect(parseSelection("10/2026", "single", pattern, "month")).toEqual({
      mode: "single",
      date: oct(1),
    });
    expect(parseSelection("10/20/2026", "single", pattern, "month")).toBeNull();
    expect(parseSelection("2026", "single", pattern, "year")).toEqual({
      mode: "single",
      date: { year: 2026, month: 1, day: 1 },
    });
    expect(parseSelection("", "single", pattern, "month")).toEqual({
      mode: "single",
      date: null,
    });
  });
});

describe("serializeSelection / parseSerialized", () => {
  const cases: readonly [CalendarMode, Selection, string][] = [
    ["single", { mode: "single", date: oct(5) }, "2026-10-05"],
    ["single", { mode: "single", date: null }, ""],
    ["range", range(20, 28), "2026-10-20/2026-10-28"],
    ["range", range(null, null), ""],
    [
      "multiple",
      { mode: "multiple", dates: [oct(5), oct(20)] },
      "2026-10-05,2026-10-20",
    ],
    ["multiple", { mode: "multiple", dates: [] }, ""],
  ];

  it.each(cases)("round-trips %s", (mode, selection, text) => {
    expect(serializeSelection(selection, "day")).toBe(text);
    expect(parseSerialized(text, mode, "day")).toEqual(selection);
  });

  it("serializes an incomplete range to an empty string", () => {
    expect(serializeSelection(range(20, null), "day")).toBe("");
  });

  it("rejects malformed serialized text", () => {
    expect(parseSerialized("nope", "single", "day")).toBeNull();
    expect(parseSerialized("2026-10-20", "range", "day")).toBeNull();
    expect(parseSerialized("2026-10-28/2026-10-20", "range", "day")).toBeNull();
  });

  it("serializes and parses month and year periods", () => {
    const selection: Selection = { mode: "single", date: oct(1) };
    expect(serializeSelection(selection, "month")).toBe("2026-10");
    expect(serializeSelection(selection, "year")).toBe("2026");
    expect(parseSerialized("2026-10", "single", "month")).toEqual(selection);
    expect(parseSerialized("2026-10", "single", "day")).toBeNull();
    expect(parseSerialized("2026", "single", "month")).toBeNull();
  });
});
