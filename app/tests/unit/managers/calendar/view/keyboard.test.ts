import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoreState } from "@/datepicker/CoreState";
import { bindKeyboard } from "@/managers/calendar/view/keyboard";
import type { KeyboardDeps } from "@/managers/calendar/view/keyboard";
import type { DateCell, Layout } from "@/managers/calendar/view/types";
import type { Panel, PickerActions } from "@/types/internal";
import type { Selection } from "@/types/selection";
import { oct } from "../../../../helpers/selection";

interface Setup {
  root: HTMLElement;
  cell: HTMLElement;
  actions: { [K in keyof PickerActions]: ReturnType<typeof vi.fn> };
  press: (key: string, init?: KeyboardEventInit) => KeyboardEvent;
  pressOn: (
    target: HTMLElement,
    key: string,
    init?: KeyboardEventInit,
  ) => KeyboardEvent;
}

const setup = (
  config: {
    layout?: Layout;
    panel?: Panel;
    mode?: "single" | "range" | "multiple";
    draft?: Selection;
    rtl?: boolean;
    home?: Panel;
  } = {},
): Setup => {
  const root = document.createElement("div");
  const cell = document.createElement("td");
  root.append(cell);
  document.body.append(root);
  const dateCell: DateCell = { element: cell, date: oct(17) };
  const core = {
    panel: config.panel ?? "days",
    options: { mode: config.mode ?? "single" },
    draft: config.draft ?? { mode: "single", date: null },
  } as unknown as CoreState;
  const actions = {
    select: vi.fn(),
    focusDate: vi.fn(),
    navigate: vi.fn(),
    page: vi.fn(),
    selectRange: vi.fn(),
    jumpTo: vi.fn(),
    showPanel: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    today: vi.fn(),
    clear: vi.fn(),
    typeDraft: vi.fn(),
  };
  const deps: KeyboardDeps = {
    core,
    actions,
    layout: config.layout ?? "docked",
    home: config.home ?? "days",
    cellAt: (target) => (target === cell ? dateCell : null),
    isRtl: () => config.rtl ?? false,
  };
  bindKeyboard(root, new AbortController().signal, deps);
  const pressOn = (
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
  return {
    root,
    cell,
    actions,
    pressOn,
    press: (key, init) => pressOn(cell, key, init),
  };
};

describe("bindKeyboard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("Escape", () => {
    it.each(["month-menu", "year-menu", "year-grid"] as const)(
      "closes the %s panel without bubbling further",
      (panel) => {
        const { root, press, actions } = setup({ panel });
        const outer = vi.fn();
        document.body.addEventListener("keydown", outer);

        const event = press("Escape");

        expect(event.defaultPrevented).toBe(true);
        expect(actions.showPanel).toHaveBeenCalledWith("days");
        expect(outer).not.toHaveBeenCalled();
        expect(root.isConnected).toBe(true);
      },
    );

    it.each(["days", "input"] as const)("is left alone on %s", (panel) => {
      const { press, actions } = setup({ panel });

      const event = press("Escape");

      expect(event.defaultPrevented).toBe(false);
      expect(actions.showPanel).not.toHaveBeenCalled();
    });
  });

  describe("Shift+M and Shift+Y", () => {
    it("opens the month menu in docked on the days panel", () => {
      const { press, actions } = setup();

      const event = press("M", { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(actions.showPanel).toHaveBeenCalledWith("month-menu");
      expect(actions.select).not.toHaveBeenCalled();
    });

    it("opens the year menu in docked on the days panel", () => {
      const { press, actions } = setup();

      press("Y", { shiftKey: true });

      expect(actions.showPanel).toHaveBeenCalledWith("year-menu");
    });

    it.each(["modal", "range"] as const)("does nothing in %s", (layout) => {
      const { press, actions } = setup({ layout });

      const event = press("M", { shiftKey: true });

      expect(event.defaultPrevented).toBe(false);
      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("does nothing while another panel is open", () => {
      const { press, actions } = setup({ panel: "month-menu" });

      press("Y", { shiftKey: true });

      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("needs Shift", () => {
      const { press, actions } = setup();

      press("m");

      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("opens no menu from the docked month-grid home", () => {
      const { press, actions } = setup({
        home: "month-grid",
        panel: "month-grid",
      });

      press("M", { shiftKey: true });
      press("Y", { shiftKey: true });

      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("ignores the shortcuts in the range layout", () => {
      const { press, actions } = setup({ layout: "range" });

      const m = press("M", { shiftKey: true });
      const y = press("Y", { shiftKey: true });

      expect(m.defaultPrevented).toBe(false);
      expect(y.defaultPrevented).toBe(false);
      expect(actions.showPanel).not.toHaveBeenCalled();
    });
  });

  describe("Shift+Y in the modal", () => {
    it.each([
      ["Y", "single"],
      ["y", "single"],
      ["Y", "multiple"],
      ["y", "multiple"],
    ] as const)("opens the year grid for %s in %s mode", (key, mode) => {
      const { press, actions } = setup({ layout: "modal", mode });

      const event = press(key, { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(actions.showPanel).toHaveBeenCalledTimes(1);
      expect(actions.showPanel).toHaveBeenCalledWith("year-grid");
    });

    it("does not open anything for Shift+M", () => {
      const { press, actions } = setup({ layout: "modal" });

      const event = press("M", { shiftKey: true });

      expect(event.defaultPrevented).toBe(false);
      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it.each(["year-grid", "input"] as const)(
      "does nothing on the %s panel",
      (panel) => {
        const { press, actions } = setup({ layout: "modal", panel });

        press("Y", { shiftKey: true });

        expect(actions.showPanel).not.toHaveBeenCalled();
      },
    );

    it("opens the year grid from the month-grid home (month precision)", () => {
      const { press, actions } = setup({
        layout: "modal",
        home: "month-grid",
        panel: "month-grid",
      });

      press("Y", { shiftKey: true });

      expect(actions.showPanel).toHaveBeenCalledWith("year-grid");
    });

    it("does nothing at year precision (home year-grid)", () => {
      const { press, actions } = setup({
        layout: "modal",
        home: "year-grid",
        panel: "year-grid",
      });

      press("Y", { shiftKey: true });

      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("needs Shift", () => {
      const { press, actions } = setup({ layout: "modal" });

      press("y");

      expect(actions.showPanel).not.toHaveBeenCalled();
    });
  });

  describe("modifiers and handled events", () => {
    it.each([{ ctrlKey: true }, { altKey: true }, { metaKey: true }])(
      "ignores a command modifier %o",
      (init) => {
        const { press, actions } = setup();

        press("Enter", init);
        press("ArrowRight", init);
        press("M", { shiftKey: true, ...init });

        expect(actions.select).not.toHaveBeenCalled();
        expect(actions.focusDate).not.toHaveBeenCalled();
        expect(actions.showPanel).not.toHaveBeenCalled();
      },
    );

    it.each([{ ctrlKey: true }, { altKey: true }, { metaKey: true }])(
      "ignores Shift+Y with a command modifier %o in the modal",
      (init) => {
        const { press, actions } = setup({ layout: "modal" });

        const event = press("Y", { shiftKey: true, ...init });

        expect(event.defaultPrevented).toBe(false);
        expect(actions.showPanel).not.toHaveBeenCalled();
      },
    );

    it("ignores an event another handler already prevented", () => {
      const { cell, root, actions } = setup();
      cell.addEventListener("keydown", (event) => {
        event.preventDefault();
      });
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });

      cell.dispatchEvent(event);

      expect(actions.select).not.toHaveBeenCalled();
      expect(root.isConnected).toBe(true);
    });

    it("ignores keys that are not on a date cell", () => {
      const { root, pressOn, actions } = setup();

      const event = pressOn(root, "Enter");

      expect(event.defaultPrevented).toBe(false);
      expect(actions.select).not.toHaveBeenCalled();
    });
  });

  describe("Enter and Space", () => {
    it("selects the focused date on Enter in docked", () => {
      const { press, actions } = setup();

      const event = press("Enter");

      expect(event.defaultPrevented).toBe(true);
      expect(actions.select).toHaveBeenCalledWith(oct(17));
      expect(actions.confirm).not.toHaveBeenCalled();
    });

    it("selects the focused date on Space", () => {
      const { press, actions } = setup({ layout: "modal" });

      const event = press(" ");

      expect(event.defaultPrevented).toBe(true);
      expect(actions.select).toHaveBeenCalledWith(oct(17));
    });

    it("selects an unselected date on Enter in modal single", () => {
      const { press, actions } = setup({ layout: "modal" });

      press("Enter");

      expect(actions.select).toHaveBeenCalledWith(oct(17));
      expect(actions.confirm).not.toHaveBeenCalled();
    });

    it("confirms on Enter over the selected date in modal single", () => {
      const { press, actions } = setup({
        layout: "modal",
        draft: { mode: "single", date: oct(17) },
      });

      press("Enter");

      expect(actions.confirm).toHaveBeenCalledTimes(1);
      expect(actions.select).not.toHaveBeenCalled();
    });

    it("selects on Space even over the selected date in modal single", () => {
      const { press, actions } = setup({
        layout: "modal",
        draft: { mode: "single", date: oct(17) },
      });

      press(" ");

      expect(actions.select).toHaveBeenCalledWith(oct(17));
      expect(actions.confirm).not.toHaveBeenCalled();
    });

    it("does not confirm on Enter in docked even over the selected date", () => {
      const { press, actions } = setup({
        draft: { mode: "single", date: oct(17) },
      });

      press("Enter");

      expect(actions.confirm).not.toHaveBeenCalled();
      expect(actions.select).toHaveBeenCalledWith(oct(17));
    });

    it("does not confirm on Enter in range mode", () => {
      const { press, actions } = setup({
        layout: "modal",
        mode: "range",
        draft: { mode: "range", start: oct(17), end: null },
      });

      press("Enter");

      expect(actions.confirm).not.toHaveBeenCalled();
      expect(actions.select).toHaveBeenCalledWith(oct(17));
    });
  });

  describe("arrow keys", () => {
    it.each([
      ["ArrowRight", {}, oct(18)],
      ["ArrowLeft", {}, oct(16)],
      ["ArrowDown", {}, oct(24)],
      ["ArrowUp", {}, oct(10)],
      ["Home", {}, oct(1)],
      ["End", {}, oct(31)],
      ["PageDown", {}, { year: 2026, month: 11, day: 17 }],
      ["PageUp", { shiftKey: true }, { year: 2025, month: 10, day: 17 }],
    ])("%s moves focus", (key, init, expected) => {
      const { press, actions } = setup();

      const event = press(key, init);

      expect(event.defaultPrevented).toBe(true);
      expect(actions.focusDate).toHaveBeenCalledWith(expected);
    });

    it("flips ArrowLeft and ArrowRight in RTL", () => {
      const { press, actions } = setup({ rtl: true });

      press("ArrowRight");
      press("ArrowLeft");

      expect(actions.focusDate).toHaveBeenNthCalledWith(1, oct(16));
      expect(actions.focusDate).toHaveBeenNthCalledWith(2, oct(18));
    });

    it("leaves other keys unhandled", () => {
      const { press, actions } = setup();

      const event = press("a");

      expect(event.defaultPrevented).toBe(false);
      expect(actions.focusDate).not.toHaveBeenCalled();
      expect(actions.select).not.toHaveBeenCalled();
    });
  });

  it("stops listening when the signal aborts", () => {
    const root = document.createElement("div");
    const controller = new AbortController();
    const focusDate = vi.fn();
    const cell = document.createElement("td");
    root.append(cell);
    bindKeyboard(root, controller.signal, {
      core: { panel: "days" } as unknown as CoreState,
      actions: { focusDate } as unknown as PickerActions,
      layout: "docked",
      home: "days",
      cellAt: () => ({ element: cell, date: oct(17) }),
      isRtl: () => false,
    });
    controller.abort();

    cell.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );

    expect(focusDate).not.toHaveBeenCalled();
  });
});
