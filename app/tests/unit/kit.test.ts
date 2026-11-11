import { describe, expect, it } from "vitest";
import * as kit from "@/kit";
import { cleanupDom } from "../helpers/picker";

describe("@/kit", () => {
  it("exports the building blocks as functions", () => {
    const names = [
      "PopoverHost",
      "DialogHost",
      "InlineHost",
      "waitForExit",
      "resolveSurfaceMode",
      "isFullscreenRange",
      "detectColorScheme",
      "watchColorScheme",
      "resolvePattern",
      "formatDate",
      "formatHint",
      "parseDate",
      "maskDateText",
      "createTextButton",
      "Pager",
      "fitsViewport",
      "applyTheme",
      "leadingDateLength",
      "isDateTextComplete",
      "normalizeDigits",
      "formatFullDate",
      "formatMonthYear",
      "resolveWeekStart",
      "weekdayNames",
      "splitRangeText",
    ] as const;

    for (const name of names) {
      expect(typeof kit[name]).toBe("function");
    }
  });

  it("exports the range separator", () => {
    expect(kit.RANGE_SEPARATOR).toBe(" – ");
  });

  it("resolves the week start from the locale", () => {
    expect(kit.resolveWeekStart("en-US", "auto")).toBe(0);
    expect(kit.resolveWeekStart("pl-PL", "auto")).toBe(1);
  });

  it("formats a month and year", () => {
    expect(kit.formatMonthYear({ year: 2026, month: 10 }, "en-US")).toBe(
      "October 2026",
    );
  });

  it("tells a complete typed date and formats a date without the year", () => {
    const p = kit.resolvePattern("dd.MM.yyyy", "en-US");
    expect(kit.isDateTextComplete("21.10.2026", p)).toBe(true);
    expect(kit.isDateTextComplete("21.10.20", p)).toBe(false);
    expect(
      kit.formatFullDate({ year: 2026, month: 10, day: 21 }, "en-US", {
        year: false,
      }),
    ).toBe("Wednesday, October 21");
  });

  it("createTextButton builds a modifier class button", () => {
    const button = kit.createTextButton("x", "X");
    expect(button).toHaveClass("dp-ui__text-button");
    expect(button).toHaveClass("dp-ui__text-button--x");
    expect(button.textContent).toContain("X");
  });

  it("splits range text and measures the leading date", () => {
    expect(kit.splitRangeText("a – b")).toEqual(["a", "b"]);
    const p = kit.resolvePattern("dd.MM.yyyy", "en-US");
    expect(kit.leadingDateLength("21.10.2026 14:30", p)).toBe(10);
    expect(kit.normalizeDigits("٢١")).toBe("21");
  });

  it("InlineHost mounts a labelled inline root and removes it on destroy", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const host = new kit.InlineHost({ container, label: "Pick a date" });

    expect(container.contains(host.root)).toBe(true);
    expect(host.root).toHaveClass("dp-ui__container");
    expect(host.root).toHaveClass("dp-ui__container--inline");
    expect(host.root).toHaveAttribute("role", "group");
    expect(host.root).toHaveAttribute("aria-label", "Pick a date");

    host.destroy();

    expect(container.contains(host.root)).toBe(false);
    cleanupDom();
  });

  it("formats, parses, masks and hints through one pattern", () => {
    const p = kit.resolvePattern("dd.MM.yyyy", "en-US");

    expect(kit.formatDate({ year: 2026, month: 10, day: 21 }, p)).toBe(
      "21.10.2026",
    );
    expect(kit.parseDate("21.10.2026", p)).toEqual({
      year: 2026,
      month: 10,
      day: 21,
    });
    expect(kit.maskDateText("21102026", p)).toBe("21.10.2026");
    expect(kit.formatHint(p)).toBe("dd.mm.yyyy");
  });

  it("surface helpers decide modal and full screen", () => {
    expect(kit.resolveSurfaceMode("auto", false, 599, 768)).toBe("modal");
    expect(kit.isFullscreenRange("range", "modal", 599, 600)).toBe(true);
  });
});
