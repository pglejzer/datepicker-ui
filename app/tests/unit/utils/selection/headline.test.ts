import { describe, expect, it } from "vitest";
import type { Selection } from "@/types/selection";
import type { HeadlineLabels } from "@/utils/selection/headline";
import {
  formatCount,
  headlineText as headlineTextAt,
} from "@/utils/selection/headline";
import { oct } from "../../../helpers/selection";

const headlineText = (
  s: Selection,
  view: "calendar" | "input",
  locale: string,
  labels: HeadlineLabels,
): string => headlineTextAt(s, view, locale, labels, "day");

const labels = {
  noDate: "No date selected",
  rangeStart: "Start",
  rangeEnd: "End",
  multipleSelected: "{count} selected",
};

const range = (a: number | null, b: number | null): Selection => ({
  mode: "range",
  start: a === null ? null : oct(a),
  end: b === null ? null : oct(b),
});

describe("headlineText", () => {
  it("range, calendar view", () => {
    expect(headlineText(range(null, null), "calendar", "en-US", labels)).toBe(
      "Start – End",
    );
    expect(headlineText(range(20, null), "calendar", "en-US", labels)).toBe(
      "Oct 20 – End",
    );
    expect(headlineText(range(20, 28), "calendar", "en-US", labels)).toBe(
      "Oct 20 – Oct 28",
    );
  });

  it("range, input view with both ends uses the short range", () => {
    expect(headlineText(range(20, 28), "input", "en-US", labels)).toMatch(
      /^Oct 20\s?–\s?28$/u,
    );
  });

  it("single", () => {
    expect(
      headlineText({ mode: "single", date: null }, "calendar", "en-US", labels),
    ).toBe("No date selected");
    expect(
      headlineText(
        { mode: "single", date: oct(20) },
        "calendar",
        "en-US",
        labels,
      ),
    ).toMatch(/Oct 20/);
  });

  it("multiple", () => {
    expect(
      headlineText(
        { mode: "multiple", dates: [] },
        "calendar",
        "en-US",
        labels,
      ),
    ).toBe("No date selected");
    expect(
      headlineText(
        { mode: "multiple", dates: [oct(1), oct(2)] },
        "calendar",
        "en-US",
        labels,
      ),
    ).toBe("2 selected");
  });
});

describe("headlineText precision", () => {
  const selection: Selection = { mode: "single", date: oct(1) };

  it("shows month and year at month precision", () => {
    expect(
      headlineTextAt(selection, "calendar", "en-US", labels, "month"),
    ).toBe("October 2026");
  });

  it("shows only the year at year precision", () => {
    expect(headlineTextAt(selection, "calendar", "en-US", labels, "year")).toBe(
      "2026",
    );
  });

  it("keeps the empty label at every precision", () => {
    const empty: Selection = { mode: "single", date: null };
    expect(headlineTextAt(empty, "calendar", "en-US", labels, "month")).toBe(
      "No date selected",
    );
  });
});

describe("formatCount", () => {
  const pl = {
    one: "{count} wybrana",
    few: "{count} wybrane",
    many: "{count} wybranych",
  };

  it("picks the plural category for the locale", () => {
    expect(formatCount(pl, 5, "pl-PL")).toBe("5 wybranych");
    expect(formatCount(pl, 2, "pl-PL")).toBe("2 wybrane");
    expect(formatCount(pl, 1, "pl-PL")).toBe("1 wybrana");
  });

  it("uses a string label for every count", () => {
    expect(formatCount("{count} selected", 3, "en-US")).toBe("3 selected");
  });

  it("falls back to other, then to the first value", () => {
    expect(
      formatCount({ one: "{count} a", other: "{count} b" }, 5, "en-US"),
    ).toBe("5 b");
    expect(formatCount({ one: "{count} a" }, 5, "en-US")).toBe("5 a");
  });

  it("formats the number with the locale", () => {
    expect(formatCount("{count}", 1234, "en-US")).toBe("1,234");
  });
});
