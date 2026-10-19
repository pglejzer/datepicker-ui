import { describe, expect, it } from "vitest";
import { resolvePattern } from "@/utils/date/format";
import { maskDateText } from "@/utils/date/mask";

const dmy = resolvePattern("dd/MM/yyyy", "en-US");
const iso = resolvePattern("yyyy-MM-dd", "en-US");

describe("maskDateText", () => {
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
