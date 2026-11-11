import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import {
  createCalendarView,
  type CalendarShell,
} from "@/managers/calendar/CalendarView";
import type {
  CalendarLayout,
  DateRules,
  PickerActions,
} from "@/types/internal";
import type { DatepickerOptions } from "@/types/options";

const rules: DateRules = {
  isDisabled: () => false,
  unavailableReason: () => null,
  isMonthDisabled: () => false,
  yearBounds: () => ({ min: 1926, max: 2046 }),
  isSelectable: () => true,
};

interface Harness {
  core: CoreState;
  actions: { [K in keyof PickerActions]: ReturnType<typeof vi.fn> };
  shell: CalendarShell;
}

const ACTIVE_PAGE = ".dp-ui__page:not([inert])";

let shells: CalendarShell[] = [];

const mountInline = (
  layout: CalendarLayout,
  inline: NonNullable<NonNullable<DatepickerOptions["ui"]>["inline"]> = {},
  ui: NonNullable<DatepickerOptions["ui"]> = {},
): Harness => {
  const host = document.createElement("div");
  const input = document.createElement("input");
  host.appendChild(input);
  document.body.appendChild(host);
  const core = new CoreState(input, host, false, {
    calendar: { locale: "en-US", weekStart: "sunday" },
    ui: { ...ui, layout, inline },
  });
  core.resetSession();
  core.setCalendarLayout(layout);
  const actions = {
    select: vi.fn(),
    focusDate: vi.fn(),
    navigate: vi.fn(),
    page: vi.fn(),
    selectRange: vi.fn(),
    jumpTo: vi.fn(),
    showPanel: vi.fn((panel: Parameters<PickerActions["showPanel"]>[0]) => {
      core.setPanel(panel);
    }),
    confirm: vi.fn(),
    cancel: vi.fn(),
    today: vi.fn(),
    clear: vi.fn(),
    typeDraft: vi.fn(),
    submitDraft: vi.fn(),
    renderedMonths: vi.fn(),
  };
  const shell = createCalendarView({
    core,
    actions,
    rules,
    mode: "inline",
    fullscreen: false,
  });
  shells.push(shell);
  document.body.appendChild(shell.element);
  shell.update();
  return { core, actions, shell };
};

const query = (shell: CalendarShell, selector: string): HTMLElement => {
  const found = shell.element.querySelector<HTMLElement>(selector);
  if (!found) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return found;
};

const bodyRows = (shell: CalendarShell): number =>
  query(shell, `${ACTIVE_PAGE} table.dp-ui__month-grid`).querySelectorAll(
    "tbody tr",
  ).length;

const press = (
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): void => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
};

const focusedCell = (shell: CalendarShell): HTMLElement =>
  query(shell, 'td.dp-ui__date[tabindex="0"]');

describe("createCalendarView, inline layouts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
  });

  afterEach(() => {
    for (const shell of shells) {
      shell.destroy();
    }
    shells = [];
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  describe("default (docked)", () => {
    it("keeps the docked header and no page navigation row", () => {
      const { shell } = mountInline("docked");

      expect(shell.element).not.toHaveClass("dp-ui__calendar--modal");
      expect(shell.element.querySelector(".dp-ui__header--docked")).not.toBe(
        null,
      );
      expect(shell.element.querySelector(".dp-ui__header--modal")).toBeNull();
      expect(shell.element.querySelector(".dp-ui__navigation")).toBeNull();
    });
  });

  describe('layout: "modal"', () => {
    it("renders the modal header and a navigation row on the active page", () => {
      const { shell } = mountInline("modal");

      expect(shell.element).toHaveClass("dp-ui__calendar--modal");
      expect(shell.element.querySelector(".dp-ui__header--docked")).toBeNull();
      expect(shell.element.querySelector(".dp-ui__header--modal")).not.toBe(
        null,
      );
      expect(
        shell.element.querySelector(`${ACTIVE_PAGE} .dp-ui__navigation`),
      ).not.toBeNull();
      expect(
        shell.element.querySelector(
          `${ACTIVE_PAGE} .dp-ui__menu-button--year-grid`,
        ),
      ).not.toBeNull();
    });

    it("shows 5 body rows in October 2026 and 6 with ui.fixedWeeks", () => {
      expect(bodyRows(mountInline("modal").shell)).toBe(5);
      expect(
        bodyRows(mountInline("modal", {}, { fixedWeeks: true }).shell),
      ).toBe(6);
    });

    it("opens the year grid on Shift+Y and nothing on Shift+M", () => {
      const { shell, core, actions } = mountInline("modal");

      press(focusedCell(shell), "M", { shiftKey: true });
      expect(actions.showPanel).not.toHaveBeenCalled();

      press(focusedCell(shell), "Y", { shiftKey: true });
      expect(actions.showPanel).toHaveBeenCalledWith("year-grid");
      expect(core.panel).toBe("year-grid");
    });

    it("renders no modal header with headline: false", () => {
      const { shell } = mountInline("modal", { headline: false });

      expect(shell.element.querySelector(".dp-ui__header")).toBeNull();
      expect(shell.element.querySelector(".dp-ui__header--modal")).toBeNull();
      expect(
        shell.element.querySelector(`${ACTIVE_PAGE} .dp-ui__navigation`),
      ).not.toBeNull();
    });
  });

  describe('navigation: "caption"', () => {
    it("docked: one caption row with the month, two arrows and no menus", () => {
      const { shell } = mountInline("docked", { navigation: "caption" });

      expect(
        shell.element.querySelectorAll(".dp-ui__navigation--caption"),
      ).toHaveLength(1);
      expect(
        shell.element.querySelector(":scope > .dp-ui__navigation--caption"),
      ).not.toBeNull();
      expect(query(shell, ".dp-ui__caption").textContent).toBe("October 2026");
      expect(
        shell.element.querySelectorAll(
          ".dp-ui__navigation--caption .dp-ui__icon-button",
        ),
      ).toHaveLength(2);
      expect(
        shell.element.querySelector(".dp-ui__icon-button--prev-month"),
      ).not.toBeNull();
      expect(
        shell.element.querySelector(".dp-ui__icon-button--next-month"),
      ).not.toBeNull();
      expect(shell.element.querySelector(".dp-ui__menu-button")).toBeNull();
      expect(shell.element.querySelector(".dp-ui__header--docked")).toBeNull();
    });

    it("docked: next pages the month, the caption follows the view", () => {
      const { shell, core, actions } = mountInline("docked", {
        navigation: "caption",
      });

      query(shell, ".dp-ui__icon-button--next-month").click();
      expect(actions.page).toHaveBeenCalledWith(1, "button");

      core.setView({ year: 2026, month: 11 }, 1, "button");
      expect(query(shell, ".dp-ui__caption").textContent).toBe("November 2026");
    });

    it("docked: Shift+M and Shift+Y open nothing", () => {
      const { shell, actions } = mountInline("docked", {
        navigation: "caption",
      });

      press(focusedCell(shell), "M", { shiftKey: true });
      press(focusedCell(shell), "Y", { shiftKey: true });

      expect(actions.showPanel).not.toHaveBeenCalled();
    });

    it("modal: the page row is a caption row without the year-grid button", () => {
      const { shell } = mountInline("modal", { navigation: "caption" });

      const row = query(shell, `${ACTIVE_PAGE} .dp-ui__navigation`);
      expect(row).toHaveClass("dp-ui__navigation--caption");
      expect(
        shell.element.querySelector(".dp-ui__menu-button--year-grid"),
      ).toBeNull();
      expect(row.querySelector(".dp-ui__caption")?.textContent).toBe(
        "October 2026",
      );
    });

    it("modal: Shift+Y opens nothing", () => {
      const { shell, actions } = mountInline("modal", {
        navigation: "caption",
      });

      press(focusedCell(shell), "Y", { shiftKey: true });

      expect(actions.showPanel).not.toHaveBeenCalled();
    });
  });
});
