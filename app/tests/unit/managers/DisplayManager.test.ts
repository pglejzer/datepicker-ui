import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import { isFullscreenRange } from "@/utils/surface";
import { cleanupDom, flush, mountInput, surface } from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

describe("DisplayManager through DatepickerUI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  it("auto opens a dialog on a narrow viewport and keeps it when resized wider", async () => {
    setViewportWidth(500);
    const p = new DatepickerUI(mountInput(), { ui: { displayMode: "auto" } });
    p.create();

    p.open();
    await flush();
    expect(document.querySelector("dialog.dp-ui__dialog")).not.toBeNull();

    setViewportWidth(1000);
    await flush();
    expect(document.querySelector("dialog.dp-ui__dialog")).not.toBeNull();
    expect(document.querySelector(".dp-ui__container--docked")).toBeNull();
  });

  it("opens a popover inside the host on the next open after widening", async () => {
    setViewportWidth(500);
    const p = new DatepickerUI(mountInput(), { ui: { displayMode: "auto" } });
    p.create();
    p.open();
    await flush();
    setViewportWidth(1000);
    p.close();
    await flush();
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();

    p.open();
    await flush();

    const popover = document.querySelector<HTMLElement>(
      ".dp-ui__container--docked[popover]",
    );
    expect(popover).not.toBeNull();
    expect(popover?.closest(".dp-ui")).not.toBeNull();
    expect(document.querySelector("dialog.dp-ui__dialog")).toBeNull();
  });

  it("opens a docked popover directly on a wide viewport", async () => {
    setViewportWidth(1200);
    const p = new DatepickerUI(mountInput(), { ui: { displayMode: "auto" } });
    p.create();
    p.open();
    await flush();
    expect(surface()).toHaveClass("dp-ui__container--docked");
  });

  it("ui.appendTo places the dialog in the target element", async () => {
    const portal = document.createElement("div");
    portal.id = "portal";
    document.body.appendChild(portal);
    const p = new DatepickerUI(mountInput(), {
      ui: { displayMode: "modal", appendTo: "#portal" },
    });
    p.create();

    p.open();
    await flush();

    const dialog = document.querySelector("dialog.dp-ui__dialog");
    expect(dialog).not.toBeNull();
    expect(dialog?.parentElement).toBe(portal);
  });

  it("without appendTo the dialog stays inside the .dp-ui host", async () => {
    const p = new DatepickerUI(mountInput(), { ui: { displayMode: "modal" } });
    p.create();
    p.open();
    await flush();
    const dialog = document.querySelector("dialog.dp-ui__dialog");
    expect(dialog?.closest(".dp-ui")).not.toBeNull();
  });
});

describe("isFullscreenRange", () => {
  it("is true only for range in a modal below the threshold", () => {
    expect(isFullscreenRange("range", "modal", 400, 600)).toBe(true);
    expect(isFullscreenRange("range", "modal", 599, 600)).toBe(true);
    expect(isFullscreenRange("range", "modal", 600, 600)).toBe(false);
    expect(isFullscreenRange("range", "docked", 400, 600)).toBe(false);
    expect(isFullscreenRange("range", "inline", 400, 600)).toBe(false);
    expect(isFullscreenRange("single", "modal", 400, 600)).toBe(false);
    expect(isFullscreenRange("multiple", "modal", 400, 600)).toBe(false);
  });

  it("uses a custom threshold", () => {
    expect(isFullscreenRange("range", "modal", 700, 840)).toBe(true);
    expect(isFullscreenRange("range", "modal", 840, 840)).toBe(false);
    expect(isFullscreenRange("range", "modal", 1024, 840)).toBe(false);
  });

  it("a threshold of 0 never goes fullscreen", () => {
    expect(isFullscreenRange("range", "modal", 400, 0)).toBe(false);
    expect(isFullscreenRange("range", "modal", 0, 0)).toBe(false);
  });
});

describe("ui.fullscreen through DatepickerUI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  const openRange = async (
    width: number,
    fullscreen: boolean | number,
  ): Promise<HTMLElement | null> => {
    setViewportWidth(width);
    const p = new DatepickerUI(mountInput(), {
      calendar: { mode: "range" },
      ui: { displayMode: "modal", fullscreen },
    });
    p.create();
    p.open();
    await flush();
    return document.querySelector<HTMLElement>(
      "dialog.dp-ui__dialog .dp-ui__container--range",
    );
  };

  it("false keeps a narrow range dialog out of fullscreen", async () => {
    const container = await openRange(400, false);
    expect(container).not.toBeNull();
    expect(container).not.toHaveClass("dp-ui__container--fullscreen");
  });

  it("a number raises the threshold", async () => {
    const container = await openRange(700, 840);
    expect(container).toHaveClass("dp-ui__container--fullscreen");
  });

  it("a number is exclusive at the threshold", async () => {
    const container = await openRange(840, 840);
    expect(container).not.toHaveClass("dp-ui__container--fullscreen");
  });
});

describe("inline colour scheme following the page", () => {
  type Listener = (event: unknown) => void;
  let added: { query: string; listener: Listener }[];
  let removed: { query: string; listener: Listener }[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
    added = [];
    removed = [];
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: (type: string, listener: Listener) => {
            if (type === "change") added.push({ query, listener });
          },
          removeEventListener: (type: string, listener: Listener) => {
            if (type === "change") removed.push({ query, listener });
          },
          addListener: () => {},
          removeListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    vi.restoreAllMocks();
    cleanupDom();
    document.body.removeAttribute("style");
    vi.useRealTimers();
  });

  const mountInline = (): { picker: DatepickerUI; inline: HTMLElement } => {
    const target = document.createElement("div");
    target.id = "inline-host";
    document.body.appendChild(target);
    const picker = new DatepickerUI(mountInput(), {
      ui: { inline: { enabled: true, container: "#inline-host" } },
    });
    picker.create();
    const inline = target.querySelector<HTMLElement>(
      ".dp-ui__container--inline",
    );
    if (!inline) throw new Error("inline container missing");
    return { picker, inline };
  };

  it("switches to dark when the page background turns dark", async () => {
    const { inline } = mountInline();
    expect(inline).toHaveAttribute("data-color-scheme", "light");
    document.body.style.backgroundColor = "rgb(0, 0, 0)";
    await flush();
    expect(inline).toHaveAttribute("data-color-scheme", "dark");
  });

  it("stops following the page after destroy and removes the listener", async () => {
    const { picker, inline } = mountInline();
    document.body.style.backgroundColor = "rgb(0, 0, 0)";
    await flush();
    expect(inline).toHaveAttribute("data-color-scheme", "dark");

    const darkListeners = added.filter((a) => a.query.includes("dark"));
    expect(darkListeners.length).toBeGreaterThan(0);

    picker.destroy();
    await flush();
    for (const { query, listener } of darkListeners) {
      expect(
        removed.some((r) => r.query === query && r.listener === listener),
      ).toBe(true);
    }

    expect(() => {
      document.body.style.backgroundColor = "rgb(255, 255, 255)";
    }).not.toThrow();
    await flush();
    expect(inline).not.toHaveAttribute("data-color-scheme", "light");
  });
});

describe("DisplayManager surface routing by calendar.mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  const openPicker = async (
    options: ConstructorParameters<typeof DatepickerUI>[1],
  ): Promise<DatepickerUI> => {
    const p = new DatepickerUI(mountInput(), options);
    p.create();
    p.open();
    await flush();
    return p;
  };

  it("range + modal at 400 px mounts the fullscreen range view in the dialog", async () => {
    setViewportWidth(400);
    await openPicker({
      calendar: { mode: "range" },
      ui: { displayMode: "modal" },
    });
    const container = document.querySelector(
      "dialog.dp-ui__dialog .dp-ui__container--range",
    );
    expect(container).not.toBeNull();
    expect(container).toHaveClass("dp-ui__container--fullscreen");
  });

  it("range + modal at 1024 px is not fullscreen", async () => {
    setViewportWidth(1024);
    await openPicker({
      calendar: { mode: "range" },
      ui: { displayMode: "modal" },
    });
    const container = document.querySelector(
      "dialog.dp-ui__dialog .dp-ui__container--range",
    );
    expect(container).not.toBeNull();
    expect(container).not.toHaveClass("dp-ui__container--fullscreen");
  });

  it("range docked mounts the range view in the popover", async () => {
    await openPicker({
      calendar: { mode: "range" },
      ui: { displayMode: "docked" },
    });
    const container = surface();
    expect(container).toHaveClass("dp-ui__container--docked");
    expect(container).toHaveClass("dp-ui__container--range");
    expect(container).not.toHaveClass("dp-ui__container--fullscreen");
  });

  it("range inline mounts the range view in the inline container", async () => {
    const target = document.createElement("div");
    target.id = "inline-host";
    document.body.appendChild(target);
    const p = new DatepickerUI(mountInput(), {
      calendar: { mode: "range" },
      ui: { inline: { enabled: true, container: "#inline-host" } },
    });
    p.create();
    await flush();
    const inline = target.querySelector(".dp-ui__container--inline");
    expect(inline).not.toBeNull();
    expect(inline).toHaveClass("dp-ui__container--range");
  });

  it("single and multiple keep the stage-1 view without --range", async () => {
    for (const mode of ["single", "multiple"] as const) {
      const p = await openPicker({
        calendar: { mode },
        ui: { displayMode: "docked" },
      });
      expect(surface()).not.toHaveClass("dp-ui__container--range");
      expect(surface()?.querySelector(".dp-ui__month-list")).toBeNull();
      p.destroy();
      await flush();
      cleanupDom();
    }
  });

  const labelOf = (): string | null | undefined =>
    surface()?.closest("[aria-label]")?.getAttribute("aria-label");

  it("labels the surface with the range title in range mode", async () => {
    await openPicker({
      calendar: { mode: "range" },
      ui: { displayMode: "docked" },
    });
    expect(labelOf()).toBe("Select dates");
  });

  it("labels a range dialog with the range title", async () => {
    await openPicker({
      calendar: { mode: "range" },
      ui: { displayMode: "modal" },
    });
    expect(
      document
        .querySelector("dialog.dp-ui__dialog")
        ?.getAttribute("aria-label"),
    ).toBe("Select dates");
  });

  it("labels the surface with the stage-1 title otherwise", async () => {
    await openPicker({ ui: { displayMode: "docked" } });
    expect(labelOf()).toBe("Select date");
  });

  it("labels the inline range group with the range title", () => {
    const target = document.createElement("div");
    target.id = "inline-host";
    document.body.appendChild(target);
    const p = new DatepickerUI(mountInput(), {
      calendar: { mode: "range" },
      ui: { inline: { enabled: true, container: "#inline-host" } },
    });
    p.create();
    expect(
      target.querySelector('[role="group"]')?.getAttribute("aria-label"),
    ).toBe("Select dates");
  });
});
