import { describe, expect, it } from "vitest";
import { resolvePattern } from "@/utils/date/format";
import {
  isDateTextComplete,
  leadingDateLength,
  maskDateText,
} from "@/utils/date/mask";

const dmy = resolvePattern("dd/MM/yyyy", "en-US");
const iso = resolvePattern("yyyy-MM-dd", "en-US");

const dotted = resolvePattern("dd.MM.yyyy", "en-US");
const us = resolvePattern("MM/dd/yyyy", "en-US");

describe("maskDateText", () => {
  describe("dd.MM.yyyy", () => {
    it.each([
      ["21.10.26.", "21.10.26"],
      ["21.10.26 14:30", "21.10.26"],
      ["2.", "02"],
      ["21.1.", "21.01"],
      ["21102026", "21.10.2026"],
      ["٢١.١٠.٢٠٢٦", "21.10.2026"],
      ["ab12", "12"],
    ])("masks %j as %j", (text, expected) => {
      expect(maskDateText(text, dotted)).toBe(expected);
    });
  });

  describe("separator after the last group", () => {
    it("stops the scan without padding in yyyy-MM-dd", () => {
      expect(maskDateText("2026-10-2 ", iso)).toBe("2026-10-2");
    });

    it("stops the scan without padding in MM/dd/yyyy", () => {
      expect(maskDateText("10/21/26/", us)).toBe("10/21/26");
    });
  });

  describe("dd/MM/yyyy", () => {
    it.each([
      ["1710", "17/10"],
      ["17102026", "17/10/2026"],
      ["171020269", "17/10/2026"],
      ["1/5", "01/5"],
      ["17", "17"],
      ["1", "1"],
      ["", ""],
      ["١٧١٠", "17/10"],
      ["17//10", "17/10"],
      ["17ab10", "17/10"],
      ["abc", ""],
    ])("masks %j as %j", (text, expected) => {
      expect(maskDateText(text, dmy)).toBe(expected);
    });

    it("pads a day typed with a separator and continues to the month", () => {
      expect(maskDateText("1/5/2026", dmy)).toBe("01/05/2026");
    });

    it("accepts the other separators as group breaks", () => {
      expect(maskDateText("1.5-2026", dmy)).toBe("01/05/2026");
    });

    it("is stable when applied to its own output", () => {
      expect(maskDateText("17/10/2026", dmy)).toBe("17/10/2026");
    });
  });

  describe("yyyy-MM-dd", () => {
    it("writes the year group first", () => {
      expect(maskDateText("20261017", iso)).toBe("2026-10-17");
      expect(maskDateText("2026", iso)).toBe("2026");
      expect(maskDateText("202610", iso)).toBe("2026-10");
    });
  });
});

describe("leadingDateLength", () => {
  describe("dd.MM.yyyy", () => {
    it.each([
      ["21.10.2026 14:30", 10],
      ["21.10.26 14:30", 8],
      ["21102026 14:30", 8],
      ["21.10.2026", 10],
      ["21.10.2026.", 10],
      ["‏21.10.2026", 11],
      ["‏21.10.2026 14:30", 11],
      ["٢١.١٠.٢٠٢٦ ١٤:٣٠", 10],
      ["21.", 3],
      ["21", 2],
      ["ab12", 4],
      ["abc", 0],
      ["", 0],
    ])("measures %j as %i", (text, expected) => {
      expect(leadingDateLength(text, dotted)).toBe(expected);
    });
  });

  describe("yyyy-MM-dd", () => {
    it("stops before the time of an ISO date-time", () => {
      expect(leadingDateLength("2026-10-21T10:00", iso)).toBe(10);
    });

    it("measures a partial date", () => {
      expect(leadingDateLength("2026-10", iso)).toBe(7);
    });
  });
});

const short = resolvePattern("dd.MM.yy", "en-US");

describe("isDateTextComplete", () => {
  it.each([
    ["21.10.2026", true],
    ["21.10.202", false],
    ["1.5.2026", true],
    ["21102026", true],
    ["21.10.2026 14:30", true],
    ["21.10.", false],
    ["21.10.26", false],
    ["", false],
  ])("dd.MM.yyyy %j is %s", (text, expected) => {
    expect(isDateTextComplete(text, dotted)).toBe(expected);
  });

  it.each([
    ["2026-10-05", true],
    ["2026-10-5", false],
  ])("yyyy-MM-dd %j is %s", (text, expected) => {
    expect(isDateTextComplete(text, iso)).toBe(expected);
  });

  it.each([
    ["21.10.26", true],
    ["21.10.2", false],
  ])("dd.MM.yy %j is %s", (text, expected) => {
    expect(isDateTextComplete(text, short)).toBe(expected);
  });
});
