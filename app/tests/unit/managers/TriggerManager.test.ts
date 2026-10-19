import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import { TriggerManager } from "@/managers/TriggerManager";
import type { DatepickerOptions } from "@/types/options";
import type { DatepickerEventMap } from "@/types/types";
import { EventEmitter } from "@/utils/EventEmitter";
import { cleanupDom } from "../../helpers/picker";

type Source = "pointer" | "toggle" | "keyboard";

const setup = (
  options: DatepickerOptions = {},
  parent: HTMLElement = document.body,
) => {
  const host = document.createElement("div");
  host.className = "dp-ui";
  const input = document.createElement("input");
  host.appendChild(input);
  parent.appendChild(host);
  const core = new CoreState(input, host, false, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
  });
  const open = vi.fn<(source: Source) => void>();
  const manager = new TriggerManager(
    core,
    new EventEmitter<DatepickerEventMap>(),
    { open },
  );
  const controller = new AbortController();
  manager.bind(controller.signal);
  return { core, host, input, manager, open, controller };
};

const press = (
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

describe("TriggerManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupDom();
  });

  describe("input", () => {
    it("does not open on focus alone", () => {
      const { input, open } = setup();
      input.dispatchEvent(new FocusEvent("focus"));
      input.focus();
      expect(open).not.toHaveBeenCalled();
    });

    it("opens with pointer on click", () => {
      const { input, open } = setup();
      input.click();
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("pointer", "start");
    });

    it("opens with keyboard on Alt+ArrowDown", () => {
      const { input, open } = setup();
      press(input, "ArrowDown", { altKey: true });
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("keyboard", "start");
    });

    it("ignores a plain ArrowDown", () => {
      const { input, open } = setup();
      press(input, "ArrowDown");
      expect(open).not.toHaveBeenCalled();
    });
  });

  describe("toggle button", () => {
    it("sets the ARIA contract on a real button without adding a role", () => {
      const toggle = document.createElement("button");
      const { manager } = setup({ ui: { toggleButton: toggle } });
      expect(toggle).toHaveAttribute("aria-haspopup", "dialog");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAttribute("aria-label", "Choose date");
      expect(toggle).not.toHaveAttribute("role");
      manager.setExpanded(true);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("makes a span focusable, labelled and opens on Enter", () => {
      const toggle = document.createElement("span");
      const { open } = setup({ ui: { toggleButton: toggle } });
      expect(toggle).toHaveAttribute("role", "button");
      expect(toggle).toHaveAttribute("tabindex", "0");
      expect(toggle).toHaveAttribute("aria-haspopup", "dialog");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveAttribute("aria-label", "Choose date");
      const event = press(toggle, "Enter");
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("toggle", "start");
      expect(event.defaultPrevented).toBe(true);
    });

    it("opens a button toggle with the toggle source", () => {
      const host = document.createElement("div");
      host.className = "dp-ui";
      const input = document.createElement("input");
      const toggle = document.createElement("button");
      toggle.className = "cal";
      host.append(input, toggle);
      document.body.appendChild(host);
      const core = new CoreState(input, host, false, {
        ui: { toggleButton: ".cal" },
      });
      const open = vi.fn<(source: Source) => void>();
      const manager = new TriggerManager(
        core,
        new EventEmitter<DatepickerEventMap>(),
        { open },
      );
      manager.bind(new AbortController().signal);
      toggle.click();
      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith("toggle", "start");
      manager.setExpanded(true);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      manager.setExpanded(false);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("adds the date to the label after a value is set", () => {
      const host = document.createElement("div");
      host.className = "dp-ui";
      const input = document.createElement("input");
      const toggle = document.createElement("button");
      host.append(input, toggle);
      document.body.appendChild(host);
      const core = new CoreState(input, host, false, {
        calendar: { locale: "en-US" },
        ui: { toggleButton: toggle },
      });
      const manager = new TriggerManager(
        core,
        new EventEmitter<DatepickerEventMap>(),
        { open: vi.fn() },
      );
      manager.bind(new AbortController().signal);
      core.setValue({
        mode: "single",
        date: { year: 2026, month: 10, day: 17 },
      });
      manager.updateLabel();
      expect(toggle).toHaveAttribute(
        "aria-label",
        "Choose date, Saturday, October 17, 2026",
      );
      core.setValue({ mode: "single", date: null });
      manager.updateLabel();
      expect(toggle).toHaveAttribute("aria-label", "Choose date");
    });

    it("opens only its own instance when two hosts each contain .cal", () => {
      const build = () => {
        const host = document.createElement("div");
        host.className = "dp-ui";
        const input = document.createElement("input");
        const toggle = document.createElement("span");
        toggle.className = "cal";
        host.append(input, toggle);
        document.body.appendChild(host);
        const core = new CoreState(input, host, false, {
          ui: { toggleButton: ".cal" },
        });
        const open = vi.fn<(source: Source) => void>();
        const manager = new TriggerManager(
          core,
          new EventEmitter<DatepickerEventMap>(),
          { open },
        );
        const controller = new AbortController();
        manager.bind(controller.signal);
        return { toggle, open, manager, controller };
      };
      const first = build();
      const second = build();
      second.toggle.click();
      expect(second.open).toHaveBeenCalledTimes(1);
      expect(first.open).not.toHaveBeenCalled();
      first.toggle.click();
      expect(first.open).toHaveBeenCalledTimes(1);
      expect(second.open).toHaveBeenCalledTimes(1);
      first.controller.abort();
      first.manager.destroy();
      second.toggle.click();
      expect(second.open).toHaveBeenCalledTimes(2);
      expect(second.toggle).toHaveAttribute("role", "button");
    });
  });

  describe("cleanup", () => {
    it("destroy removes the attributes the library added", () => {
      const host = document.createElement("div");
      host.className = "dp-ui";
      const input = document.createElement("input");
      const toggle = document.createElement("span");
      host.append(input, toggle);
      document.body.appendChild(host);
      const core = new CoreState(input, host, false, {
        ui: { toggleButton: toggle },
      });
      const manager = new TriggerManager(
        core,
        new EventEmitter<DatepickerEventMap>(),
        { open: vi.fn() },
      );
      const controller = new AbortController();
      manager.bind(controller.signal);
      manager.setExpanded(true);
      controller.abort();
      manager.destroy();
      for (const name of [
        "role",
        "tabindex",
        "aria-haspopup",
        "aria-expanded",
        "aria-label",
      ]) {
        expect(toggle).not.toHaveAttribute(name);
      }
    });

    it("keeps attributes the author set before", () => {
      const host = document.createElement("div");
      host.className = "dp-ui";
      const input = document.createElement("input");
      const toggle = document.createElement("button");
      toggle.setAttribute("aria-label", "Pick");
      host.append(input, toggle);
      document.body.appendChild(host);
      const core = new CoreState(input, host, false, {
        ui: { toggleButton: toggle },
      });
      const manager = new TriggerManager(
        core,
        new EventEmitter<DatepickerEventMap>(),
        { open: vi.fn() },
      );
      manager.bind(new AbortController().signal);
      manager.destroy();
      expect(toggle).toHaveAttribute("aria-label", "Pick");
      expect(toggle).not.toHaveAttribute("aria-haspopup");
    });

    it("re-binding with a new signal leaves a single listener", () => {
      const { input, manager, open, controller } = setup();
      controller.abort();
      manager.bind(new AbortController().signal);
      input.click();
      expect(open).toHaveBeenCalledTimes(1);
    });

    it("does not open after the signal is aborted", () => {
      const { input, open, controller } = setup();
      controller.abort();
      input.click();
      press(input, "ArrowDown", { altKey: true });
      expect(open).not.toHaveBeenCalled();
    });
  });
});
