import { describe, expect, it, vi } from "vitest";
import type { PlainDate } from "@/types/date";
import type { CalendarMode, Precision, Selection } from "@/types/selection";
import type { DateValue, PickerValueInput } from "@/types/types";
import { toISO } from "@/utils/date/plainDate";
import {
  toPickerValue,
  toSelection as toSelectionAt,
} from "@/utils/selection/value";
import { oct } from "../../../helpers/selection";

const toSelection = (
  input: PickerValueInput | null,
  mode: CalendarMode,
  precision: Precision = "day",
): Selection | null => toSelectionAt(input, mode, precision);

function describeDate(date: PlainDate): DateValue {
  return {
    value: toISO(date),
    date: new Date(date.year, date.month - 1, date.day),
    formatted: `${String(date.month)}/${String(date.day)}`,
  };
}

describe("toPickerValue", () => {
  it("returns null for empty selections", () => {
    expect(
      toPickerValue({ mode: "single", date: null }, describeDate),
    ).toBeNull();
    expect(
      toPickerValue({ mode: "range", start: null, end: null }, describeDate),
    ).toBeNull();
    expect(
      toPickerValue({ mode: "multiple", dates: [] }, describeDate),
    ).toBeNull();
  });

  it("returns null for an incomplete range", () => {
    expect(
      toPickerValue({ mode: "range", start: oct(20), end: null }, describeDate),
    ).toBeNull();
  });

  it("shapes the value per mode", () => {
    expect(
      toPickerValue({ mode: "single", date: oct(5) }, describeDate),
    ).toEqual(describeDate(oct(5)));
    expect(
      toPickerValue(
        { mode: "range", start: oct(20), end: oct(28) },
        describeDate,
      ),
    ).toEqual({ start: describeDate(oct(20)), end: describeDate(oct(28)) });
    expect(
      toPickerValue(
        { mode: "multiple", dates: [oct(1), oct(2)] },
        describeDate,
      ),
    ).toEqual([describeDate(oct(1)), describeDate(oct(2))]);
  });

  it("calls describe once per date", () => {
    const spy = vi.fn(describeDate);
    toPickerValue({ mode: "range", start: oct(20), end: oct(28) }, spy);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockClear();
    toPickerValue({ mode: "multiple", dates: [oct(1), oct(2), oct(3)] }, spy);
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe("toSelection", () => {
  it("maps null to an empty selection of the mode", () => {
    expect(toSelection(null, "single")).toEqual({ mode: "single", date: null });
    expect(toSelection(null, "range")).toEqual({
      mode: "range",
      start: null,
      end: null,
    });
    expect(toSelection(null, "multiple")).toEqual({
      mode: "multiple",
      dates: [],
    });
  });

  it("reads single values from ISO strings and Dates", () => {
    expect(toSelection("2026-10-20", "single")).toEqual({
      mode: "single",
      date: oct(20),
    });
    expect(toSelection(new Date(2026, 9, 20, 15), "single")).toEqual({
      mode: "single",
      date: oct(20),
    });
    expect(toSelection("nope", "single")).toBeNull();
  });

  it("reads a range with both ends", () => {
    expect(
      toSelection({ start: "2026-10-20", end: new Date(2026, 9, 28) }, "range"),
    ).toEqual({ mode: "range", start: oct(20), end: oct(28) });
  });

  it("rejects a range missing an end or with an invalid end", () => {
    expect(toSelection({ start: "2026-10-20" } as never, "range")).toBeNull();
    expect(
      toSelection({ start: "2026-10-20", end: "nope" }, "range"),
    ).toBeNull();
  });

  it("rejects values of the wrong shape for the mode", () => {
    expect(toSelection("2026-10-20", "range")).toBeNull();
    expect(toSelection("2026-10-20", "multiple")).toBeNull();
    expect(
      toSelection({ start: "2026-10-20", end: "2026-10-21" }, "single"),
    ).toBeNull();
    expect(toSelection(["2026-10-20"], "single")).toBeNull();
    expect(toSelection(["2026-10-20"], "range")).toBeNull();
  });

  it("sorts and de-duplicates multiple values", () => {
    expect(
      toSelection(["2026-10-20", "2026-10-05", "2026-10-20"], "multiple"),
    ).toEqual({ mode: "multiple", dates: [oct(5), oct(20)] });
    expect(toSelection([], "multiple")).toEqual({
      mode: "multiple",
      dates: [],
    });
  });

  it("rejects a multiple list with an invalid entry", () => {
    expect(toSelection(["2026-10-20", "nope"], "multiple")).toBeNull();
  });

  it("normalizes a single Date to the period at month and year precision", () => {
    const date = new Date(2026, 9, 17);
    expect(toSelection(date, "single", "month")).toEqual({
      mode: "single",
      date: oct(1),
    });
    expect(toSelection(date, "single", "year")).toEqual({
      mode: "single",
      date: { year: 2026, month: 1, day: 1 },
    });
  });

  it("reads period ISO strings only at the matching precision", () => {
    expect(toSelection("2026-10", "single", "month")).toEqual({
      mode: "single",
      date: oct(1),
    });
    expect(toSelection("2026-10-17", "single", "month")).toEqual({
      mode: "single",
      date: oct(1),
    });
    expect(toSelection("2026-10", "single", "day")).toBeNull();
    expect(toSelection("2026", "single", "month")).toBeNull();
    expect(toSelection("2026", "single", "year")).toEqual({
      mode: "single",
      date: { year: 2026, month: 1, day: 1 },
    });
  });
});
