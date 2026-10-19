import { describe, expect, it } from "vitest";
import { resolvePattern } from "@/utils/date/format";
import { parseSplit } from "@/utils/selection/splitText";
import { d } from "../../../helpers/selection";

const pattern = resolvePattern("MM/dd/yyyy", "en-US");

describe("parseSplit", () => {
  it("is empty when both fields are blank", () => {
    expect(parseSplit("", "", pattern)).toEqual({ kind: "empty" });
    expect(parseSplit("  ", " ", pattern)).toEqual({ kind: "empty" });
  });

  it("is partial with only the start filled", () => {
    expect(parseSplit("10/20/2026", "", pattern)).toEqual({ kind: "partial" });
  });

  it("is partial with only the end filled", () => {
    expect(parseSplit("", "10/25/2026", pattern)).toEqual({ kind: "partial" });
  });

  it("is invalid on the start field for unparseable start text", () => {
    expect(parseSplit("nope", "10/25/2026", pattern)).toEqual({
      kind: "invalid",
      field: "start",
    });
    expect(parseSplit("13/45/2026", "", pattern)).toEqual({
      kind: "invalid",
      field: "start",
    });
  });

  it("is invalid on the end field for unparseable end text", () => {
    expect(parseSplit("10/20/2026", "02/30/2026", pattern)).toEqual({
      kind: "invalid",
      field: "end",
    });
    expect(parseSplit("", "nope", pattern)).toEqual({
      kind: "invalid",
      field: "end",
    });
  });

  it("checks the start before the end", () => {
    expect(parseSplit("bad", "worse", pattern)).toEqual({
      kind: "invalid",
      field: "start",
    });
  });

  it("is reversed when the end is before the start", () => {
    expect(parseSplit("10/25/2026", "10/20/2026", pattern)).toEqual({
      kind: "reversed",
    });
  });

  it("is a range for an ordered pair, trimming the text", () => {
    expect(parseSplit(" 10/20/2026 ", "11/03/2026  ", pattern)).toEqual({
      kind: "range",
      start: d(2026, 10, 20),
      end: d(2026, 11, 3),
    });
  });

  it("accepts the same day in both fields as a one-day range", () => {
    expect(parseSplit("10/20/2026", "10/20/2026", pattern)).toEqual({
      kind: "range",
      start: d(2026, 10, 20),
      end: d(2026, 10, 20),
    });
  });
});
