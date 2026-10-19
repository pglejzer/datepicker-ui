import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectColorScheme,
  parseCssColor,
  watchColorScheme,
} from "@/utils/colorScheme";

describe("parseCssColor", () => {
  it("parses opaque rgb as relative luminance", () => {
    const white = parseCssColor("rgb(255, 255, 255)");
    expect(white?.luminance).toBeCloseTo(1, 3);
    expect(white?.alpha).toBe(1);
    expect(parseCssColor("rgb(0, 0, 0)")?.luminance).toBeCloseTo(0, 5);
  });

  it("reads the alpha of rgba", () => {
    expect(parseCssColor("rgba(0, 0, 0, 0)")?.alpha).toBe(0);
    expect(parseCssColor("rgba(0, 0, 0, 0.3)")?.alpha).toBeCloseTo(0.3, 5);
  });

  it("parses the space syntax with a slash alpha", () => {
    const color = parseCssColor("rgb(17 24 39 / 0.5)");
    expect(color?.alpha).toBeCloseTo(0.5, 5);
    expect(color?.luminance).toBeLessThan(0.05);
  });

  it("parses color(srgb ...)", () => {
    const color = parseCssColor("color(srgb 0.1 0.1 0.1)");
    expect(color).not.toBeNull();
    expect(color?.luminance).toBeLessThan(0.05);
    expect(color?.alpha).toBe(1);
    expect(parseCssColor("color(srgb 1 1 1 / 0.25)")?.alpha).toBeCloseTo(
      0.25,
      5,
    );
  });

  it("parses oklch and oklab by lightness", () => {
    const dark = parseCssColor("oklch(0.21 0.034 264.665)");
    expect(dark?.luminance).toBeLessThan(0.179);
    const light = parseCssColor("oklab(0.98 0 0)");
    expect(light?.luminance).toBeGreaterThan(0.9);
  });

  it("parses lab by lightness", () => {
    expect(parseCssColor("lab(20 0 0)")?.luminance).toBeLessThan(0.179);
    expect(parseCssColor("lab(95 0 0)")?.luminance).toBeGreaterThan(0.8);
  });

  it("treats transparent as alpha 0", () => {
    expect(parseCssColor("transparent")?.alpha).toBe(0);
  });

  it("returns null for anything else", () => {
    expect(parseCssColor("red")).toBeNull();
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("url(x.png)")).toBeNull();
  });
});

describe("detectColorScheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  interface Page {
    readonly backgrounds?: Map<Element, string>;
    readonly rootScheme?: string;
    readonly osDark?: boolean;
  }

  const stubPage = ({
    backgrounds = new Map<Element, string>(),
    rootScheme = "normal",
    osDark = false,
  }: Page): void => {
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      (el: Element) =>
        ({
          backgroundColor: backgrounds.get(el) ?? "rgba(0, 0, 0, 0)",
          getPropertyValue: (name: string) =>
            name === "color-scheme" && el === document.documentElement
              ? rootScheme
              : "",
        }) as unknown as CSSStyleDeclaration,
    );
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: osDark && query.includes("dark"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  };

  const nested = (): { section: HTMLElement; target: HTMLElement } => {
    const section = document.createElement("section");
    const target = document.createElement("div");
    section.appendChild(target);
    document.body.appendChild(section);
    return { section, target };
  };

  it("is dark under a dark ancestor background", () => {
    const { section, target } = nested();
    stubPage({
      backgrounds: new Map([[section, "rgb(17, 24, 39)"]]),
    });
    expect(detectColorScheme(target)).toBe("dark");
  });

  it("is light under a white ancestor", () => {
    const { section, target } = nested();
    stubPage({
      backgrounds: new Map([[section, "rgb(255, 255, 255)"]]),
      osDark: true,
    });
    expect(detectColorScheme(target)).toBe("light");
  });

  it("uses the element's own background first", () => {
    const { section, target } = nested();
    stubPage({
      backgrounds: new Map([
        [target, "rgb(0, 0, 0)"],
        [section, "rgb(255, 255, 255)"],
      ]),
    });
    expect(detectColorScheme(target)).toBe("dark");
  });

  it("skips a translucent card and continues to the next ancestor", () => {
    const { section, target } = nested();
    stubPage({
      backgrounds: new Map([
        [target, "rgba(0, 0, 0, 0.3)"],
        [section, "rgb(255, 255, 255)"],
      ]),
    });
    expect(detectColorScheme(target)).toBe("light");
  });

  it("decides on modern colour syntax from computed styles", () => {
    const { section, target } = nested();
    stubPage({
      backgrounds: new Map([[section, "oklch(0.21 0.034 264.665)"]]),
    });
    expect(detectColorScheme(target)).toBe("dark");
  });

  it("reaches the html element's background", () => {
    const { target } = nested();
    stubPage({
      backgrounds: new Map([[document.documentElement, "rgb(0, 0, 0)"]]),
    });
    expect(detectColorScheme(target)).toBe("dark");
  });

  it("falls back to a root color-scheme of dark", () => {
    const { target } = nested();
    stubPage({ rootScheme: "dark" });
    expect(detectColorScheme(target)).toBe("dark");
  });

  it("is light for a transparent page with normal on a dark OS", () => {
    const { target } = nested();
    stubPage({ rootScheme: "normal", osDark: true });
    expect(detectColorScheme(target)).toBe("light");
  });

  it("is light for a transparent page with light on a dark OS", () => {
    const { target } = nested();
    stubPage({ rootScheme: "light", osDark: true });
    expect(detectColorScheme(target)).toBe("light");
  });

  it("follows the OS for light dark", () => {
    const { target } = nested();
    stubPage({ rootScheme: "light dark", osDark: true });
    expect(detectColorScheme(target)).toBe("dark");
    vi.restoreAllMocks();
    stubPage({ rootScheme: "light dark", osDark: false });
    expect(detectColorScheme(target)).toBe("light");
  });
});

describe("watchColorScheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("class");
  });

  const stubMedia = () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: add,
          removeEventListener: remove,
        }) as unknown as MediaQueryList,
    );
    return { add, remove };
  };

  const tick = async (): Promise<void> => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  it("calls back when body style or html class changes", async () => {
    stubMedia();
    const onChange = vi.fn();
    const stop = watchColorScheme(onChange);
    document.body.style.backgroundColor = "rgb(0, 0, 0)";
    await tick();
    expect(onChange).toHaveBeenCalledTimes(1);
    document.documentElement.className = "dark";
    await tick();
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
  });

  it("calls back when the OS preference changes", () => {
    const { add } = stubMedia();
    const onChange = vi.fn();
    const stop = watchColorScheme(onChange);
    const call = add.mock.calls.find(([type]) => type === "change");
    expect(call).toBeDefined();
    (call?.[1] as () => void)();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it("stop disconnects the observer and removes the media listener", async () => {
    const { add, remove } = stubMedia();
    const onChange = vi.fn();
    const stop = watchColorScheme(onChange);
    const listener: unknown = add.mock.calls.find(
      ([type]) => type === "change",
    )?.[1];
    stop();
    expect(remove).toHaveBeenCalledWith("change", listener);
    document.body.style.backgroundColor = "rgb(0, 0, 0)";
    await tick();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores unrelated attribute changes", async () => {
    stubMedia();
    const onChange = vi.fn();
    const stop = watchColorScheme(onChange);
    document.body.setAttribute("data-other", "x");
    await tick();
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });
});
