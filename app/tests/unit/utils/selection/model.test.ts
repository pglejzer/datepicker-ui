import { describe, expect, it } from "vitest";
import type { Selection } from "@/types/selection";
import {
  anchorDate,
  emptySelection,
  isCompleteSelection,
  isDateSelected,
  isEmptySelection,
  rangeRole,
  sameSelection,
  selectedDates,
} from "@/utils/selection/model";
import { oct } from "../../../helpers/selection";

const range = (a: number | null, b: number | null): Selection => ({
  mode: "range",
  start: a === null ? null : oct(a),
  end: b === null ? null : oct(b),
});
const multiple = (...days: number[]): Selection => ({
  mode: "multiple",
  dates: days.map(oct),
});
const single = (day: number | null): Selection => ({
  mode: "single",
  date: day === null ? null : oct(day),
});

describe("selection model", () => {
  it("creates empty selections per mode", () => {
    expect(emptySelection("single")).toEqual({ mode: "single", date: null });
    expect(emptySelection("range")).toEqual({
      mode: "range",
      start: null,
      end: null,
    });
    expect(emptySelection("multiple")).toEqual({ mode: "multiple", dates: [] });
    expect(isEmptySelection(emptySelection("range"))).toBe(true);
    expect(isEmptySelection(range(20, null))).toBe(false);
    expect(isEmptySelection(single(1))).toBe(false);
    expect(isEmptySelection(multiple())).toBe(true);
  });

  it("isCompleteSelection: a range needs both ends or neither", () => {
    expect(isCompleteSelection(range(20, null))).toBe(false);
    expect(isCompleteSelection(range(null, null))).toBe(true);
    expect(isCompleteSelection(range(20, 28))).toBe(true);
    expect(isCompleteSelection(single(null))).toBe(true);
    expect(isCompleteSelection(multiple())).toBe(true);
  });

  it("rangeRole reports start, end and in-range", () => {
    const s = range(20, 28);
    expect(rangeRole(s, oct(20))).toBe("start");
    expect(rangeRole(s, oct(28))).toBe("end");
    expect(rangeRole(s, oct(24))).toBe("in-range");
    expect(rangeRole(s, oct(19))).toBeNull();
    expect(rangeRole(s, oct(29))).toBeNull();
  });

  it("rangeRole is null for start = end, partial ranges and other modes", () => {
    expect(rangeRole(range(20, 20), oct(20))).toBeNull();
    expect(rangeRole(range(20, null), oct(20))).toBeNull();
    expect(rangeRole(single(20), oct(20))).toBeNull();
  });

  it("anchorDate returns the date, range start or first multiple", () => {
    expect(anchorDate(single(5))).toEqual(oct(5));
    expect(anchorDate(single(null))).toBeNull();
    expect(anchorDate(range(7, 9))).toEqual(oct(7));
    expect(anchorDate(range(null, null))).toBeNull();
    expect(anchorDate(multiple(3, 9))).toEqual(oct(3));
    expect(anchorDate(multiple())).toBeNull();
  });

  it("isDateSelected: range counts only start and end", () => {
    expect(isDateSelected(range(20, 28), oct(20))).toBe(true);
    expect(isDateSelected(range(20, 28), oct(28))).toBe(true);
    expect(isDateSelected(range(20, 28), oct(24))).toBe(false);
    expect(isDateSelected(range(20, null), oct(20))).toBe(true);
    expect(isDateSelected(single(4), oct(4))).toBe(true);
    expect(isDateSelected(single(4), oct(5))).toBe(false);
    expect(isDateSelected(multiple(1, 5), oct(5))).toBe(true);
    expect(isDateSelected(multiple(1, 5), oct(2))).toBe(false);
  });

  it("selectedDates lists the chosen days", () => {
    expect(selectedDates(single(null))).toEqual([]);
    expect(selectedDates(single(3))).toEqual([oct(3)]);
    expect(selectedDates(range(3, null))).toEqual([oct(3)]);
    expect(selectedDates(range(3, 9))).toEqual([oct(3), oct(9)]);
    expect(selectedDates(multiple(2, 4))).toEqual([oct(2), oct(4)]);
  });

  it("sameSelection compares by value and mode", () => {
    expect(sameSelection(single(3), single(3))).toBe(true);
    expect(sameSelection(single(3), single(4))).toBe(false);
    expect(sameSelection(single(null), single(null))).toBe(true);
    expect(sameSelection(range(3, 9), range(3, 9))).toBe(true);
    expect(sameSelection(range(3, 9), range(3, null))).toBe(false);
    expect(sameSelection(multiple(1, 2), multiple(1, 2))).toBe(true);
    expect(sameSelection(multiple(1, 2), multiple(1))).toBe(false);
    expect(sameSelection(single(null), range(null, null))).toBe(false);
  });

  it("sameSelection treats empty and start-only ranges as equal to themselves", () => {
    expect(sameSelection(range(null, null), range(null, null))).toBe(true);
    expect(sameSelection(range(3, null), range(3, null))).toBe(true);
    expect(sameSelection(range(3, null), range(4, null))).toBe(false);
    expect(sameSelection(range(null, null), range(3, null))).toBe(false);
  });
});
