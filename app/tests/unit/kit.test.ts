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
    ] as const;

    for (const name of names) {
      expect(typeof kit[name]).toBe("function");
    }
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
