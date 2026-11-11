import { describe, expect, it } from "vitest";
import { applyTheme } from "@/utils/theme";

const container = (): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = "dp-ui__container";
  return el;
};

describe("applyTheme", () => {
  it("writes data-theme and data-color-scheme", () => {
    const root = container();
    applyTheme(root, { theme: "crane", colorScheme: "dark" });
    expect(root).toHaveAttribute("data-theme", "crane");
    expect(root).toHaveAttribute("data-color-scheme", "dark");
  });

  it("adds every className token", () => {
    const root = container();
    applyTheme(root, {
      theme: "basic",
      colorScheme: "light",
      className: "a  b",
    });
    expect(root).toHaveClass("a", "b", "dp-ui__container");
  });

  it("swaps className tokens on a second call and keeps other classes", () => {
    const root = container();
    root.classList.add("mine");
    applyTheme(root, {
      theme: "basic",
      colorScheme: "light",
      className: "old another",
    });
    applyTheme(root, {
      theme: "m3-green",
      colorScheme: "dark",
      className: "fresh",
    });
    expect(root).toHaveClass("fresh", "mine", "dp-ui__container");
    expect(root).not.toHaveClass("old");
    expect(root).not.toHaveClass("another");
    expect(root).toHaveAttribute("data-theme", "m3-green");
    expect(root).toHaveAttribute("data-color-scheme", "dark");
  });

  it("removes the previous tokens when className is omitted", () => {
    const root = container();
    applyTheme(root, { theme: "basic", colorScheme: "light", className: "x" });
    applyTheme(root, { theme: "basic", colorScheme: "light" });
    expect(root).not.toHaveClass("x");
  });

  it("toggles the rtl class on a container root", () => {
    const root = container();
    applyTheme(root, { theme: "basic", colorScheme: "light", rtl: true });
    expect(root).toHaveClass("dp-ui__container--rtl");
    applyTheme(root, { theme: "basic", colorScheme: "light", rtl: false });
    expect(root).not.toHaveClass("dp-ui__container--rtl");
  });

  it("adds no rtl class when rtl is omitted", () => {
    const root = container();
    applyTheme(root, { theme: "basic", colorScheme: "light" });
    expect(root).not.toHaveClass("dp-ui__container--rtl");
  });

  describe("dialog root", () => {
    const dialog = (): { root: HTMLDialogElement; inner: HTMLDivElement } => {
      const root = document.createElement("dialog");
      root.className = "dp-ui__dialog";
      const inner = container();
      root.append(inner);
      return { root, inner };
    };

    it("marks the inner container rtl, not the dialog", () => {
      const { root, inner } = dialog();
      applyTheme(root, { theme: "basic", colorScheme: "light", rtl: true });
      expect(inner).toHaveClass("dp-ui__container--rtl");
      expect(root).not.toHaveClass("dp-ui__container--rtl");
    });

    it("removes the rtl class from the inner container with rtl false", () => {
      const { root, inner } = dialog();
      applyTheme(root, { theme: "basic", colorScheme: "light", rtl: true });
      applyTheme(root, { theme: "basic", colorScheme: "light", rtl: false });
      expect(inner).not.toHaveClass("dp-ui__container--rtl");
    });

    it("puts the attributes and className on the dialog", () => {
      const { root } = dialog();
      applyTheme(root, {
        theme: "pastel",
        colorScheme: "light",
        className: "custom",
      });
      expect(root).toHaveAttribute("data-theme", "pastel");
      expect(root).toHaveClass("custom");
    });

    it("does not throw without an inner container", () => {
      const root = document.createElement("dialog");
      expect(() => {
        applyTheme(root, { theme: "basic", colorScheme: "light", rtl: true });
      }).not.toThrow();
    });
  });
});
