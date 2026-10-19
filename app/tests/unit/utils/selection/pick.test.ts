import { describe, expect, it } from "vitest";
import type { RangeEnd, Selection } from "@/types/selection";
import { nextEnd, pickDate } from "@/utils/selection/pick";
import { emptySelection } from "@/utils/selection/model";
import { limits, NO_LIMITS, oct } from "../../../helpers/selection";

const range = (
  start: ReturnType<typeof oct> | null,
  end: ReturnType<typeof oct> | null,
): Selection => ({ mode: "range", start, end });

const pick = (
  s: Selection,
  date: ReturnType<typeof oct>,
  l = NO_LIMITS,
): Selection => pickDate(s, date, l, nextEnd(s));

describe("pickDate", () => {
  it("single replaces the date", () => {
    const first = pick(emptySelection("single"), oct(5));
    expect(first).toEqual({ mode: "single", date: oct(5) });
    expect(pick(first, oct(9))).toEqual({
      mode: "single",
      date: oct(9),
    });
  });

  it("range walks start, earlier start, end, then restarts", () => {
    const a = pick(emptySelection("range"), oct(20));
    expect(a).toEqual({ mode: "range", start: oct(20), end: null });

    const b = pick(a, oct(15));
    expect(b).toEqual({ mode: "range", start: oct(15), end: null });

    const c = pick(b, oct(28));
    expect(c).toEqual({ mode: "range", start: oct(15), end: oct(28) });

    const e = pick(c, oct(1));
    expect(e).toEqual({ mode: "range", start: oct(1), end: null });
  });

  it("range accepts the same day twice as a one-day range", () => {
    const a = pick(emptySelection("range"), oct(20));
    expect(pick(a, oct(20))).toEqual({
      mode: "range",
      start: oct(20),
      end: oct(20),
    });
  });

  it("multiple toggles dates on and off and stays sorted", () => {
    let s = emptySelection("multiple");
    s = pick(s, oct(20));
    s = pick(s, oct(5));
    s = pick(s, oct(12));
    expect(s).toEqual({ mode: "multiple", dates: [oct(5), oct(12), oct(20)] });
    s = pick(s, oct(12));
    expect(s).toEqual({ mode: "multiple", dates: [oct(5), oct(20)] });
    s = pick(s, oct(5));
    s = pick(s, oct(20));
    expect(s).toEqual({ mode: "multiple", dates: [] });
  });

  it("multiple ignores an add at multipleMax but still allows removal", () => {
    const l = limits({ multipleMax: 2 });
    let s = pick(emptySelection("multiple"), oct(1), l);
    s = pick(s, oct(2), l);
    const blocked = pick(s, oct(3), l);
    expect(blocked).toBe(s);
    expect(pick(s, oct(1), l)).toEqual({
      mode: "multiple",
      dates: [oct(2)],
    });
  });

  describe("range with an active end", () => {
    const cases: readonly {
      name: string;
      active: RangeEnd;
      from: Selection;
      date: ReturnType<typeof oct>;
      expected: Selection;
    }[] = [
      {
        name: "start active, empty: sets the start",
        active: "start",
        from: range(null, null),
        date: oct(10),
        expected: range(oct(10), null),
      },
      {
        name: "start active, start only, after the start: restarts at the date",
        active: "start",
        from: range(oct(10), null),
        date: oct(20),
        expected: range(oct(20), null),
      },
      {
        name: "start active, start only, before the start: restarts at the date",
        active: "start",
        from: range(oct(10), null),
        date: oct(5),
        expected: range(oct(5), null),
      },
      {
        name: "start active, complete, after the end: new start, end cleared",
        active: "start",
        from: range(oct(10), oct(15)),
        date: oct(25),
        expected: range(oct(25), null),
      },
      {
        name: "start active, complete, inside: new start, end cleared",
        active: "start",
        from: range(oct(10), oct(15)),
        date: oct(12),
        expected: range(oct(12), null),
      },
      {
        name: "end active, empty: sets the start",
        active: "end",
        from: range(null, null),
        date: oct(10),
        expected: range(oct(10), null),
      },
      {
        name: "end active, start only, after the start: sets the end",
        active: "end",
        from: range(oct(10), null),
        date: oct(20),
        expected: range(oct(10), oct(20)),
      },
      {
        name: "end active, start only, on the start: a one-day range",
        active: "end",
        from: range(oct(10), null),
        date: oct(10),
        expected: range(oct(10), oct(10)),
      },
      {
        name: "end active, start only, before the start: restarts at the date",
        active: "end",
        from: range(oct(10), null),
        date: oct(5),
        expected: range(oct(5), null),
      },
      {
        name: "end active, complete, after the start: replaces the end",
        active: "end",
        from: range(oct(10), oct(15)),
        date: oct(25),
        expected: range(oct(10), oct(25)),
      },
      {
        name: "end active, complete, before the start: restarts at the date",
        active: "end",
        from: range(oct(10), oct(15)),
        date: oct(3),
        expected: range(oct(3), null),
      },
    ];

    it.each(cases)("$name", ({ active, from, date, expected }) => {
      expect(pickDate(from, date, NO_LIMITS, active)).toEqual(expected);
    });
  });
});

describe("nextEnd", () => {
  it("is end only for a range that has a start and no end", () => {
    expect(nextEnd(range(oct(10), null))).toBe("end");
  });

  it("is start for an empty or complete range", () => {
    expect(nextEnd(range(null, null))).toBe("start");
    expect(nextEnd(range(oct(10), oct(12)))).toBe("start");
  });

  it("is start for single and multiple", () => {
    expect(nextEnd(emptySelection("single"))).toBe("start");
    expect(nextEnd(emptySelection("multiple"))).toBe("start");
  });
});
