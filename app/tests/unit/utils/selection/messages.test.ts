import { describe, expect, it } from "vitest";
import { DEFAULT_LABELS } from "@/datepicker/options/defaults";
import { resolvePattern } from "@/utils/date/format";
import { unavailableMessage } from "@/utils/selection/messages";
import { oct } from "../../../helpers/selection";

const pattern = resolvePattern("dd/MM/yyyy", "en-US");
const labels = DEFAULT_LABELS;

const options = (
  patch: {
    minDate?: ReturnType<typeof oct>;
    maxDate?: ReturnType<typeof oct>;
  } = {},
) => ({
  labels,
  pattern,
  minDate: patch.minDate ?? null,
  maxDate: patch.maxDate ?? null,
  precision: "day" as const,
});

describe("unavailableMessage", () => {
  it("formats the min date into beforeMinDate", () => {
    expect(unavailableMessage("min", options({ minDate: oct(5) }))).toBe(
      "Enter a date on or after 05/10/2026",
    );
  });

  it("formats the max date into afterMaxDate", () => {
    expect(unavailableMessage("max", options({ maxDate: oct(25) }))).toBe(
      "Enter a date on or before 25/10/2026",
    );
  });

  it("falls back to unavailableDate for min or max without a bound", () => {
    expect(unavailableMessage("min", options())).toBe(labels.unavailableDate);
    expect(unavailableMessage("max", options())).toBe(labels.unavailableDate);
  });

  it("uses invalidRange for range-length", () => {
    expect(unavailableMessage("range-length", options())).toBe(
      labels.invalidRange,
    );
  });

  it("uses unavailableDate for disabled, weekday and multiple-max", () => {
    for (const reason of ["disabled", "weekday", "multiple-max"] as const) {
      expect(unavailableMessage(reason, options({ minDate: oct(5) }))).toBe(
        labels.unavailableDate,
      );
    }
  });

  it("formats the bound at the period precision", () => {
    expect(
      unavailableMessage("min", {
        ...options({ minDate: oct(1) }),
        precision: "month",
      }),
    ).toBe("Enter a date on or after 10/2026");
    expect(
      unavailableMessage("max", {
        ...options({ maxDate: oct(1) }),
        precision: "year",
      }),
    ).toBe("Enter a date on or before 2026");
  });

  it("uses custom label text with the {date} placeholder", () => {
    const custom = { ...labels, beforeMinDate: "Not before {date}!" };
    expect(
      unavailableMessage("min", {
        ...options({ minDate: oct(5) }),
        labels: custom,
      }),
    ).toBe("Not before 05/10/2026!");
  });
});
