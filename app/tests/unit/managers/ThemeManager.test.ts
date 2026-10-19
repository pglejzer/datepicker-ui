import { afterEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import DatepickerUI from "@/datepicker/DatepickerUI";
import { ThemeManager } from "@/managers/ThemeManager";
import type { DatepickerOptions, ThemeName } from "@/types/options";
import {
  cleanupDom,
  flush,
  mountInput,
  surface,
  surfaces,
} from "../../helpers/picker";

const setup = (options: DatepickerOptions = {}) => {
  const host = document.createElement("div");
  host.className = "dp-ui";
  const input = document.createElement("input");
  host.appendChild(input);
  document.body.appendChild(host);
  const core = new CoreState(input, host, false, options);
  const manager = new ThemeManager(core);
  const root = document.createElement("div");
  root.className = "dp-ui__container";
  document.body.appendChild(root);
  return { core, host, input, manager, root };
};

describe("ThemeManager", () => {
  afterEach(() => {
    cleanupDom();
    document.body.removeAttribute("style");
  });

  it("applies the basic theme to the host and the surface by default", () => {
    const { host, manager, root } = setup();
    manager.applyHost();
    manager.applyTo(root);
    expect(host).toHaveAttribute("data-theme", "basic");
    expect(root).toHaveAttribute("data-theme", "basic");
  });

  it("writes a forced color scheme to the surface", () => {
    const { manager, root } = setup({ ui: { colorScheme: "dark" } });
    manager.applyTo(root);
    expect(root).toHaveAttribute("data-color-scheme", "dark");
  });

  it("resolves auto to light on a plain page", () => {
    const { manager, root } = setup({ ui: { colorScheme: "auto" } });
    manager.applyTo(root);
    expect(root).toHaveAttribute("data-color-scheme", "light");
  });

  it("resolves auto to dark under a dark ancestor", () => {
    document.body.style.backgroundColor = "rgb(17, 24, 39)";
    const { manager, root } = setup({ ui: { colorScheme: "auto" } });
    manager.applyTo(root);
    expect(root).toHaveAttribute("data-color-scheme", "dark");
  });

  it("a forced light scheme wins on a dark page", () => {
    document.body.style.backgroundColor = "rgb(17, 24, 39)";
    const { manager, root } = setup({ ui: { colorScheme: "light" } });
    manager.applyTo(root);
    expect(root).toHaveAttribute("data-color-scheme", "light");
  });

  it("adds every cssClass token to the surface", () => {
    const { manager, root } = setup({ ui: { cssClass: "a b" } });
    manager.applyTo(root);
    expect(root).toHaveClass("a", "b", "dp-ui__container");
  });

  it("adds the rtl modifier when the input direction is rtl", () => {
    const { input, manager, root } = setup();
    input.style.direction = "rtl";
    manager.applyTo(root);
    expect(root).toHaveClass("dp-ui__container--rtl");
  });

  it("adds no rtl modifier for ltr", () => {
    const { manager, root } = setup();
    manager.applyTo(root);
    expect(root).not.toHaveClass("dp-ui__container--rtl");
  });

  it("re-applies after setOptions and drops the old cssClass tokens", () => {
    const { core, host, manager, root } = setup({
      ui: { cssClass: "old another", colorScheme: "dark" },
    });
    manager.applyHost();
    manager.applyTo(root);
    core.setOptions({
      ui: { theme: "crane", cssClass: "fresh", colorScheme: "auto" },
    });
    manager.applyHost();
    manager.applyTo(root);
    expect(host).toHaveAttribute("data-theme", "crane");
    expect(root).toHaveAttribute("data-theme", "crane");
    expect(root).toHaveClass("fresh", "dp-ui__container");
    expect(root).not.toHaveClass("old");
    expect(root).not.toHaveClass("another");
    expect(root).toHaveAttribute("data-color-scheme", "light");
  });

  it("applies a theme change at once to the host and the only surface", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    const p = new DatepickerUI(mountInput(), { ui: { displayMode: "docked" } });
    p.create();
    p.open();
    await flush();
    p.setOptions({ ui: { theme: "crane" } });
    await flush();
    expect(document.querySelector(".dp-ui")).toHaveAttribute(
      "data-theme",
      "crane",
    );
    expect(surfaces()).toHaveLength(1);
    expect(surface()).toHaveAttribute("data-theme", "crane");
    p.destroy();
    await flush();
    vi.useRealTimers();
  });

  describe("§12.12 every theme applies", () => {
    const themes: readonly ThemeName[] = [
      "basic",
      "m3-green",
      "crane",
      "crane-straight",
      "m2",
      "glassmorphic",
      "pastel",
      "ai",
      "cyberpunk",
      "blueprint",
    ];

    it.each(themes)("%s reaches the host and the surface root", (theme) => {
      const { host, manager, root } = setup({ ui: { theme } });
      manager.applyHost();
      manager.applyTo(root);
      expect(host).toHaveAttribute("data-theme", theme);
      expect(root).toHaveAttribute("data-theme", theme);
    });

    it.each(themes)("%s is applied by an open picker", async (theme) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 9, 17, 10));
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked", theme },
      });
      p.create();
      p.open();
      await flush();

      expect(p.getElement()).toHaveAttribute("data-theme", theme);
      expect(surface()).toHaveAttribute("data-theme", theme);

      p.destroy();
      await flush();
      vi.useRealTimers();
    });
  });

  it("leaves the host without data-theme after destroy", () => {
    const { host, manager } = setup();
    manager.applyHost();
    manager.destroy();
    expect(host).not.toHaveAttribute("data-theme");
    expect(host).toHaveClass("dp-ui");
  });
});
