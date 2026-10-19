import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, resolvePattern } from "@/utils/date/format";
import { parseDate } from "@/utils/date/parse";

const d = { year: 2026, month: 3, day: 4 };
const dmy = resolvePattern("dd/MM/yyyy", "en-US");

describe("parseDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts any separator from / . - and space", () => {
    for (const t of [
      "4-3-2026",
      "04.03.2026",
      "4 3 2026",
      "04/03/2026",
      "04032026",
    ]) {
      expect(parseDate(t, dmy)).toEqual(d);
    }
  });

  it("follows the pattern order", () => {
    expect(
      parseDate("3/4/2026", resolvePattern("MM/dd/yyyy", "en-US")),
    ).toEqual(d);
  });

  it("rejects impossible or malformed input", () => {
    for (const t of ["31/02/2026", "", "abc", "1/2", "32/01/2026"]) {
      expect(parseDate(t, dmy)).toBeNull();
    }
  });

  it("expands two-digit years within 20 years of today", () => {
    expect(parseDate("04/03/26", dmy)?.year).toBe(2026);
    expect(parseDate("04/03/99", dmy)?.year).toBe(1999);
  });

  it("accepts Arabic-Indic digits", () => {
    expect(parseDate("٠٤/٠٣/٢٠٢٦", dmy)).toEqual(d);
  });

  it("accepts Extended Arabic-Indic digits", () => {
    expect(parseDate("۰۴/۰۳/۲۰۲۶", dmy)).toEqual(d);
  });

  it("round-trips format -> parse for five locales", () => {
    for (const loc of ["en-US", "pl-PL", "ja-JP", "de-DE", "ar-EG"]) {
      for (const x of [
        d,
        { year: 2026, month: 12, day: 31 },
        { year: 2000, month: 1, day: 1 },
      ]) {
        const p = resolvePattern("auto", loc);
        expect(parseDate(formatDate(x, p), p)).toEqual(x);
      }
    }
  });
});
