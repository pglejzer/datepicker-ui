import { describe, expect, it } from "vitest";
import type { PlainDate } from "@/types/date";
import type { Selection } from "@/types/selection";
import type { UnavailableReason } from "@/types/types";
import {
  createSelectionGuard,
  isSelectionAllowed,
  selectionIssue,
} from "@/utils/selection/constraints";
import { d, limits, NO_LIMITS, oct } from "../../../helpers/selection";

const none = () => false;
const disabledOn =
  (...days: number[]) =>
  (date: PlainDate) =>
    date.month === 10 && days.includes(date.day);
const startOnly = (day: number): Selection => ({
  mode: "range",
  start: oct(day),
  end: null,
});
const LAST = d(2026, 12, 31);

describe("createSelectionGuard", () => {
  it("minLength 3 blocks start+1 and allows start+2", () => {
    const guard = createSelectionGuard(
      startOnly(20),
      limits({ minLength: 3 }),
      none,
      LAST,
    );
    expect(guard(oct(21))).toBe(true);
    expect(guard(oct(20))).toBe(true);
    expect(guard(oct(22))).toBe(false);
  });

  it("maxLength 7 blocks start+7 and allows start+6", () => {
    const guard = createSelectionGuard(
      startOnly(10),
      limits({ maxLength: 7 }),
      none,
      LAST,
    );
    expect(guard(oct(16))).toBe(false);
    expect(guard(oct(17))).toBe(true);
    expect(guard(oct(25))).toBe(true);
  });

  it("a disabled day after the start blocks it and everything later", () => {
    const guard = createSelectionGuard(
      startOnly(20),
      NO_LIMITS,
      disabledOn(24),
      LAST,
    );
    expect(guard(oct(23))).toBe(false);
    expect(guard(oct(24))).toBe(true);
    expect(guard(oct(31))).toBe(true);
    expect(guard(d(2026, 11, 3))).toBe(true);
  });

  it("never blocks dates before the start", () => {
    const guard = createSelectionGuard(
      startOnly(20),
      limits({ minLength: 3, maxLength: 7 }),
      disabledOn(24),
      LAST,
    );
    expect(guard(oct(19))).toBe(false);
    expect(guard(oct(1))).toBe(false);
  });

  it("a start on the last day blocks nothing before it", () => {
    const last = d(2026, 10, 31);
    const guard = createSelectionGuard(
      startOnly(31),
      limits({ maxLength: 7 }),
      none,
      last,
    );
    expect(guard(oct(30))).toBe(false);
    expect(guard(oct(1))).toBe(false);
  });

  it("a complete or empty range blocks nothing", () => {
    const complete: Selection = {
      mode: "range",
      start: oct(20),
      end: oct(22),
    };
    const empty: Selection = { mode: "range", start: null, end: null };
    const l = limits({ minLength: 3, maxLength: 7 });
    for (const s of [complete, empty]) {
      const guard = createSelectionGuard(s, l, disabledOn(24), LAST);
      expect(guard(oct(21))).toBe(false);
      expect(guard(oct(30))).toBe(false);
    }
  });

  it("single never blocks", () => {
    const s: Selection = { mode: "single", date: oct(5) };
    const guard = createSelectionGuard(s, limits({ maxLength: 1 }), none, LAST);
    expect(guard(oct(9))).toBe(false);
  });

  it("multiple at max blocks unselected dates but not selected ones", () => {
    const s: Selection = { mode: "multiple", dates: [oct(1), oct(2)] };
    const guard = createSelectionGuard(
      s,
      limits({ multipleMax: 2 }),
      none,
      LAST,
    );
    expect(guard(oct(3))).toBe(true);
    expect(guard(oct(1))).toBe(false);
    expect(guard(oct(2))).toBe(false);
  });

  it("multiple below max blocks nothing", () => {
    const s: Selection = { mode: "multiple", dates: [oct(1)] };
    const guard = createSelectionGuard(
      s,
      limits({ multipleMax: 2 }),
      none,
      LAST,
    );
    expect(guard(oct(3))).toBe(false);
  });
});

describe("selectionIssue", () => {
  const reasonOn =
    (reason: UnavailableReason, ...days: number[]) =>
    (date: PlainDate): UnavailableReason | null =>
      date.month === 10 && days.includes(date.day) ? reason : null;
  const noReason = (): UnavailableReason | null => null;
  const range = (start: number, end: number): Selection => ({
    mode: "range",
    start: oct(start),
    end: oct(end),
  });

  it("returns null for empty selections and unrestricted ones", () => {
    expect(
      selectionIssue({ mode: "single", date: null }, NO_LIMITS, noReason),
    ).toBeNull();
    expect(
      selectionIssue(
        { mode: "range", start: null, end: null },
        limits({ minLength: 3 }),
        noReason,
      ),
    ).toBeNull();
    expect(
      selectionIssue({ mode: "multiple", dates: [] }, NO_LIMITS, noReason),
    ).toBeNull();
    expect(selectionIssue(range(20, 28), NO_LIMITS, noReason)).toBeNull();
  });

  it("returns the reason of a single date", () => {
    expect(
      selectionIssue(
        { mode: "single", date: oct(24) },
        NO_LIMITS,
        reasonOn("min", 24),
      ),
    ).toBe("min");
  });

  it("returns range-length before any day reason", () => {
    expect(
      selectionIssue(
        range(20, 28),
        limits({ maxLength: 5 }),
        reasonOn("disabled", 24),
      ),
    ).toBe("range-length");
    expect(
      selectionIssue(range(20, 22), limits({ minLength: 5 }), noReason),
    ).toBe("range-length");
  });

  it("returns the weekday reason for a range crossing a disabled weekday", () => {
    expect(
      selectionIssue(range(20, 28), NO_LIMITS, reasonOn("weekday", 24, 25)),
    ).toBe("weekday");
  });

  it("returns the first reason found walking the range", () => {
    const reasonOf = (date: PlainDate): UnavailableReason | null => {
      if (date.day === 22) return "disabled";
      return date.day === 25 ? "weekday" : null;
    };
    expect(selectionIssue(range(20, 28), NO_LIMITS, reasonOf)).toBe("disabled");
  });

  it("checks only the start of a start-only range", () => {
    expect(
      selectionIssue(startOnly(20), NO_LIMITS, reasonOn("disabled", 24)),
    ).toBeNull();
    expect(
      selectionIssue(startOnly(24), NO_LIMITS, reasonOn("disabled", 24)),
    ).toBe("disabled");
  });

  it("returns multiple-max before date reasons", () => {
    const s: Selection = {
      mode: "multiple",
      dates: [oct(1), oct(2), oct(3)],
    };
    expect(
      selectionIssue(s, limits({ multipleMax: 2 }), reasonOn("disabled", 1)),
    ).toBe("multiple-max");
    expect(
      selectionIssue(s, limits({ multipleMax: 3 }), reasonOn("disabled", 2)),
    ).toBe("disabled");
    expect(selectionIssue(s, limits({ multipleMax: 3 }), noReason)).toBeNull();
  });
});

describe("isSelectionAllowed", () => {
  it("accepts empty selections", () => {
    expect(
      isSelectionAllowed(
        { mode: "range", start: null, end: null },
        limits({ minLength: 3 }),
        none,
      ),
    ).toBe(true);
    expect(
      isSelectionAllowed({ mode: "multiple", dates: [] }, NO_LIMITS, none),
    ).toBe(true);
    expect(
      isSelectionAllowed({ mode: "single", date: null }, NO_LIMITS, none),
    ).toBe(true);
  });

  it("rejects a disabled single date", () => {
    expect(
      isSelectionAllowed(
        { mode: "single", date: oct(24) },
        NO_LIMITS,
        disabledOn(24),
      ),
    ).toBe(false);
    expect(
      isSelectionAllowed(
        { mode: "single", date: oct(25) },
        NO_LIMITS,
        disabledOn(24),
      ),
    ).toBe(true);
  });

  it("rejects a range containing a disabled day", () => {
    const s: Selection = { mode: "range", start: oct(20), end: oct(28) };
    expect(isSelectionAllowed(s, NO_LIMITS, disabledOn(24))).toBe(false);
    expect(isSelectionAllowed(s, NO_LIMITS, none)).toBe(true);
  });

  it("rejects a range beyond maxLength or below minLength", () => {
    const s: Selection = { mode: "range", start: oct(20), end: oct(28) };
    expect(isSelectionAllowed(s, limits({ maxLength: 8 }), none)).toBe(false);
    expect(isSelectionAllowed(s, limits({ maxLength: 9 }), none)).toBe(true);
    expect(isSelectionAllowed(s, limits({ minLength: 10 }), none)).toBe(false);
  });

  it("rejects a multiple selection over the max", () => {
    const s: Selection = {
      mode: "multiple",
      dates: [oct(1), oct(2), oct(3)],
    };
    expect(isSelectionAllowed(s, limits({ multipleMax: 2 }), none)).toBe(false);
    expect(isSelectionAllowed(s, limits({ multipleMax: 3 }), none)).toBe(true);
  });

  it("rejects a multiple selection with a disabled date", () => {
    const s: Selection = { mode: "multiple", dates: [oct(1), oct(24)] };
    expect(isSelectionAllowed(s, NO_LIMITS, disabledOn(24))).toBe(false);
  });
});
