import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogHost } from "@/managers/renderers/DialogHost";
import { InlineHost } from "@/managers/renderers/InlineHost";
import { PopoverHost } from "@/managers/renderers/PopoverHost";
import type { SurfaceHost } from "@/managers/renderers/SurfaceHost";

interface Fixture {
  readonly wrapper: HTMLElement;
  readonly host: HTMLElement;
  readonly input: HTMLInputElement;
}

const createFixture = (parent: HTMLElement = document.body): Fixture => {
  const wrapper = document.createElement("div");
  const host = document.createElement("div");
  host.className = "dp-ui";
  const input = document.createElement("input");
  host.append(input);
  wrapper.append(host);
  parent.append(wrapper);
  return { wrapper, host, input };
};

const pointerDown = (target: EventTarget): void => {
  target.dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true, composed: true }),
  );
};

const click = (target: EventTarget): void => {
  target.dispatchEvent(
    new MouseEvent("click", { bubbles: true, composed: true }),
  );
};

const setCssSupports = (supports: boolean | null): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    writable: true,
    value: supports === null ? undefined : { supports: () => supports },
  });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, "CSS", descriptor);
    else Reflect.deleteProperty(globalThis, "CSS");
  };
};

describe("surface hosts", () => {
  const hosts: SurfaceHost[] = [];
  let restoreCss: (() => void) | null = null;

  const track = <T extends SurfaceHost>(host: T): T => {
    hosts.push(host);
    return host;
  };

  beforeEach(() => {
    document.documentElement.style.overflow = "";
  });

  afterEach(() => {
    hosts.splice(0).forEach((host) => {
      host.destroy();
    });
    restoreCss?.();
    restoreCss = null;
    document.body.innerHTML = "";
    document.documentElement.style.overflow = "";
    vi.restoreAllMocks();
  });

  describe("PopoverHost", () => {
    const createPopover = (
      fixture: Fixture,
      overrides: { ignoreOutsideClick?: boolean } = {},
    ) => {
      const onOutside = vi.fn();
      const onEscape = vi.fn();
      const popover = track(
        new PopoverHost({
          host: fixture.host,
          anchor: fixture.input,
          instanceId: "dp-ui-test",
          rtl: false,
          label: "Choose date",
          inside: [],
          ignoreOutsideClick: overrides.ignoreOutsideClick ?? false,
          onOutside,
          onEscape,
        }),
      );
      return { popover, onOutside, onEscape };
    };

    it("mounts the popover root inside the host with popover=manual", async () => {
      const fixture = createFixture();
      const { popover } = createPopover(fixture);
      await popover.open();
      expect(popover.root.parentElement).toBe(fixture.host);
      expect(popover.root.parentElement).not.toBe(document.body);
      expect(popover.root).toHaveAttribute("popover", "manual");
      expect(popover.root.classList.contains("dp-ui__container")).toBe(true);
    });

    it("calls showPopover on open", async () => {
      const fixture = createFixture();
      const { popover } = createPopover(fixture);
      const spy = vi.spyOn(popover.root, "showPopover");
      await popover.open();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("reports a pointerdown outside exactly once", async () => {
      const fixture = createFixture();
      const { popover, onOutside } = createPopover(fixture);
      await popover.open();
      pointerDown(document.body);
      expect(onOutside).toHaveBeenCalledTimes(1);
    });

    it("ignores pointerdown inside the root and on the anchor", async () => {
      const fixture = createFixture();
      const { popover, onOutside } = createPopover(fixture);
      await popover.open();
      pointerDown(popover.body);
      pointerDown(popover.root);
      pointerDown(fixture.input);
      expect(onOutside).not.toHaveBeenCalled();
    });

    it("never reports outside clicks with ignoreOutsideClick", async () => {
      const fixture = createFixture();
      const { popover, onOutside } = createPopover(fixture, {
        ignoreOutsideClick: true,
      });
      await popover.open();
      pointerDown(document.body);
      expect(onOutside).not.toHaveBeenCalled();
    });

    it("stops reporting outside clicks after destroy", async () => {
      const fixture = createFixture();
      const { popover, onOutside } = createPopover(fixture);
      await popover.open();
      popover.destroy();
      pointerDown(document.body);
      expect(onOutside).not.toHaveBeenCalled();
    });

    it("removes the root on destroy and leaves no anchor-name on the input", async () => {
      restoreCss = setCssSupports(true);
      const fixture = createFixture();
      const { popover } = createPopover(fixture);
      await popover.open();
      popover.destroy();
      expect(fixture.host.querySelector(".dp-ui__container")).toBeNull();
      expect(fixture.input.style.getPropertyValue("anchor-name")).toBe("");
      expect(fixture.input.getAttribute("style") ?? "").not.toContain(
        "anchor-name",
      );
    });

    it("works without CSS.supports (fallback positioning path)", async () => {
      restoreCss = setCssSupports(null);
      const fixture = createFixture();
      const { popover } = createPopover(fixture);
      await expect(popover.open()).resolves.toBeUndefined();
      expect(popover.root.parentElement).toBe(fixture.host);
      await expect(popover.close()).resolves.toBeUndefined();
    });

    it("stays inside its host when the input lives in a page dialog", async () => {
      const pageDialog = document.createElement("dialog");
      pageDialog.setAttribute("open", "");
      document.body.append(pageDialog);
      const fixture = createFixture(pageDialog);
      const { popover } = createPopover(fixture);
      await popover.open();
      expect(popover.root.parentElement).toBe(fixture.host);
      expect(popover.root.closest("dialog")).toBe(pageDialog);
      expect(
        document.body.querySelector(":scope > .dp-ui__container"),
      ).toBeNull();
    });

    it("close resolves when called twice", async () => {
      const fixture = createFixture();
      const { popover } = createPopover(fixture);
      await popover.open();
      await popover.close();
      await expect(popover.close()).resolves.toBeUndefined();
    });
  });

  describe("DialogHost", () => {
    const createDialog = (
      fixture: Fixture,
      allowPageScroll = false,
    ): { dialog: DialogHost; onCancel: ReturnType<typeof vi.fn> } => {
      const onCancel = vi.fn();
      const dialog = track(
        new DialogHost({
          parent: fixture.host,
          label: "Select date",
          allowPageScroll,
          onCancel,
        }),
      );
      return { dialog, onCancel };
    };

    it("opens a modal dialog and locks page scroll", async () => {
      const fixture = createFixture();
      const { dialog } = createDialog(fixture);
      await dialog.open();
      expect(dialog.root).toBeInstanceOf(HTMLDialogElement);
      expect(dialog.root instanceof HTMLDialogElement && dialog.root.open).toBe(
        true,
      );
      expect(dialog.root.classList.contains("dp-ui__dialog")).toBe(true);
      expect(document.documentElement.style.overflow).toBe("hidden");
    });

    it("does not lock scroll with allowPageScroll", async () => {
      const fixture = createFixture();
      const { dialog } = createDialog(fixture, true);
      await dialog.open();
      expect(document.documentElement.style.overflow).not.toBe("hidden");
    });

    it("maps the cancel event to onCancel('escape')", async () => {
      const fixture = createFixture();
      const { dialog, onCancel } = createDialog(fixture);
      await dialog.open();
      const event = new Event("cancel", { cancelable: true });
      dialog.root.dispatchEvent(event);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledWith("escape");
      expect(event.defaultPrevented).toBe(true);
    });

    it("maps pointerdown + click on the dialog element to onCancel('outside')", async () => {
      const fixture = createFixture();
      const { dialog, onCancel } = createDialog(fixture);
      await dialog.open();
      pointerDown(dialog.root);
      click(dialog.root);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledWith("outside");
    });

    it("ignores a click on the dialog when the press started inside", async () => {
      const fixture = createFixture();
      const { dialog, onCancel } = createDialog(fixture);
      await dialog.open();
      pointerDown(dialog.body);
      click(dialog.root);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it("ignores a click inside the container", async () => {
      const fixture = createFixture();
      const { dialog, onCancel } = createDialog(fixture);
      await dialog.open();
      pointerDown(dialog.body);
      click(dialog.body);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it("restores overflow on close and resolves a second close", async () => {
      const fixture = createFixture();
      document.documentElement.style.overflow = "scroll";
      const { dialog } = createDialog(fixture);
      await dialog.open();
      expect(document.documentElement.style.overflow).toBe("hidden");
      await dialog.close();
      expect(document.documentElement.style.overflow).toBe("scroll");
      expect(dialog.root instanceof HTMLDialogElement && dialog.root.open).toBe(
        false,
      );
      await expect(dialog.close()).resolves.toBeUndefined();
      expect(document.documentElement.style.overflow).toBe("scroll");
    });

    it("restores overflow and removes the root on destroy while open", async () => {
      const fixture = createFixture();
      const { dialog } = createDialog(fixture);
      await dialog.open();
      const { root } = dialog;
      dialog.destroy();
      expect(root.isConnected).toBe(false);
      expect(document.documentElement.style.overflow).not.toBe("hidden");
    });
  });

  describe("InlineHost", () => {
    it("renders into the container and opens immediately", async () => {
      const container = document.createElement("div");
      document.body.append(container);
      const inline = track(new InlineHost({ container, label: "Date" }));
      await expect(inline.open()).resolves.toBeUndefined();
      expect(inline.root.parentElement).toBe(container);
      expect(inline.root.classList.contains("dp-ui__container")).toBe(true);
      expect(inline.root).toHaveAttribute("role", "group");
      expect(inline.root).toHaveAttribute("aria-label", "Date");
    });

    it("removes its root on destroy", () => {
      const container = document.createElement("div");
      document.body.append(container);
      const inline = track(new InlineHost({ container, label: "Date" }));
      inline.destroy();
      expect(container.querySelector(".dp-ui__container")).toBeNull();
    });
  });
});
