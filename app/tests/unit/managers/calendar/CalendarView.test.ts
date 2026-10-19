import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMINGS } from "@/constants/timings";
import { CoreState } from "@/datepicker/CoreState";
import type { DateRules, PickerActions, SurfaceMode } from "@/types/internal";
import {
  createCalendarView,
  type CalendarShell,
} from "@/managers/calendar/CalendarView";
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

let shells: CalendarShell[] = [];

const mount = (
  mode: SurfaceMode,
  options: DatepickerOptions = {},
  parent: HTMLElement = document.body,
): Harness => {
  const host = document.createElement("div");
  const input = document.createElement("input");
  host.appendChild(input);
  document.body.appendChild(host);
  const core = new CoreState(input, host, false, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
  });
  core.resetSession();
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
  };
  const shell = createCalendarView({
    core,
    actions,
    rules,
    mode,
    fullscreen: false,
  });
  shells.push(shell);
  parent.appendChild(shell.element);
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

const focusedCell = (shell: CalendarShell): HTMLElement =>
  query(shell, 'td.dp-ui__date[tabindex="0"]');

const press = (
  target: Element,
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

describe("createCalendarView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    for (const shell of shells) {
      shell.destroy();
    }
    shells = [];
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  describe("forms", () => {
    it("creates only type=button buttons and never submits a form", async () => {
      const form = document.createElement("form");
      document.body.appendChild(form);
      const onSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      form.addEventListener("submit", onSubmit);
      const { shell, core } = mount(
        "modal",
        { ui: { todayButton: true, clearButton: true } },
        form,
      );
      core.setPanel("month-menu");
      await vi.advanceTimersByTimeAsync(1000);
      core.setPanel("days");
      await vi.advanceTimersByTimeAsync(1000);

      const buttons = Array.from(shell.element.querySelectorAll("button"));
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button).toHaveAttribute("type", "button");
        button.click();
      }
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("docked header", () => {
    it("shows the short month and the year", () => {
      const { shell } = mount("docked");

      expect(
        query(shell, ".dp-ui__menu-button--month .dp-ui__menu-button-label")
          .textContent,
      ).toBe("Oct");
      expect(
        query(shell, ".dp-ui__menu-button--year .dp-ui__menu-button-label")
          .textContent,
      ).toBe("2026");
    });

    it("calls page(1, 'button') from the next-month button", () => {
      const { shell, actions } = mount("docked");

      query(shell, ".dp-ui__icon-button--next-month").click();

      expect(actions.page).toHaveBeenCalledWith(1, "button");
    });

    it("updates the month label at slide start and announces the month", async () => {
      const { shell, core } = mount("docked");

      core.setView({ year: 2026, month: 11 }, 1, "button");

      expect(
        query(shell, ".dp-ui__menu-button--month .dp-ui__menu-button-label")
          .textContent,
      ).toBe("Nov");

      await vi.advanceTimersByTimeAsync(TIMINGS.PAGER_SETTLE + 100);
      expect(query(shell, ".dp-ui__live-region").textContent).toBe(
        "November 2026",
      );
    });
  });

  describe("menus", () => {
    it("jumps to the picked month", async () => {
      const { shell, core, actions } = mount("docked");

      core.setPanel("month-menu");
      await vi.advanceTimersByTimeAsync(1000);
      const items = shell.element.querySelectorAll<HTMLElement>(
        ".dp-ui__menu--month .dp-ui__menu-item",
      );
      expect(items).toHaveLength(12);
      items[2].click();

      expect(actions.jumpTo).toHaveBeenCalledWith(
        { year: 2026, month: 3 },
        "menu",
      );
    });

    it("disables the year button while the month menu is open", async () => {
      const { shell, core } = mount("docked");
      expect(query(shell, ".dp-ui__menu-button--year")).not.toBeDisabled();

      core.setPanel("month-menu");
      await vi.advanceTimersByTimeAsync(1000);

      expect(query(shell, ".dp-ui__menu-button--year")).toBeDisabled();
    });

    it("closes the open month menu on Escape without cancelling", async () => {
      const { shell, core, actions } = mount("docked");
      core.setPanel("month-menu");
      await vi.advanceTimersByTimeAsync(1000);

      const event = press(query(shell, ".dp-ui__menu--month"), "Escape");
      await vi.advanceTimersByTimeAsync(1000);

      expect(event.defaultPrevented).toBe(true);
      expect(core.panel).toBe("days");
      expect(actions.cancel).not.toHaveBeenCalled();
      expect(shell.element.querySelector(".dp-ui__menu--month")).toBeNull();
      expect(shell.element.querySelector(".dp-ui__pager")).not.toBeNull();
    });

    it("leaves Escape alone when no menu is open", () => {
      const { shell } = mount("docked");

      const event = press(focusedCell(shell), "Escape");

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("modal headline", () => {
    it("shows the formatted draft and the no-date label", async () => {
      const { shell, core } = mount("modal");
      core.setDraft({
        mode: "single",
        date: { year: 2026, month: 10, day: 17 },
      });
      await vi.advanceTimersByTimeAsync(TIMINGS.HEADLINE_FADE * 4);
      expect(query(shell, ".dp-ui__headline").textContent).toBe("Sat, Oct 17");

      core.setDraft({ mode: "single", date: null });
      await vi.advanceTimersByTimeAsync(TIMINGS.HEADLINE_FADE * 4);
      expect(query(shell, ".dp-ui__headline").textContent).toBe(
        "No date selected",
      );
    });
  });

  describe("grid keyboard", () => {
    it("moves focus with ArrowRight through actions.focusDate", () => {
      const { shell, actions } = mount("docked");

      press(focusedCell(shell), "ArrowRight");

      expect(actions.focusDate).toHaveBeenCalledWith({
        year: 2026,
        month: 10,
        day: 18,
      });
    });

    it("selects an unselected cell on Enter", () => {
      const { shell, actions } = mount("docked");

      press(focusedCell(shell), "Enter");

      expect(actions.select).toHaveBeenCalledWith({
        year: 2026,
        month: 10,
        day: 17,
      });
    });
  });

  describe("outside days and fixed weeks", () => {
    const ACTIVE_PAGE = ".dp-ui__page:not([inert])";
    const SEP_27 = { year: 2026, month: 9, day: 27 };

    it("selects an outside day when outsideDays is true", () => {
      const { shell, actions } = mount("docked", {
        ui: { outsideDays: true },
        calendar: { weekStart: "sunday" },
      });
      const outside = query(shell, `${ACTIVE_PAGE} td[data-date="2026-09-27"]`);
      expect(outside).toHaveClass("dp-ui__date--outside-month");
      expect(outside).not.toHaveAttribute("aria-disabled");

      outside.click();

      expect(actions.select).toHaveBeenCalledWith(SEP_27);
    });

    it("ignores clicks on outside days when selectable is false", () => {
      const { shell, core, actions } = mount("docked", {
        ui: { outsideDays: { selectable: false } },
        calendar: { weekStart: "sunday" },
      });
      const draft = core.draft;
      const outside = query(shell, `${ACTIVE_PAGE} td[data-date="2026-09-27"]`);
      expect(outside).toHaveAttribute("aria-disabled", "true");
      expect(outside).toHaveClass("dp-ui__date--disabled");

      outside.click();

      expect(actions.select).not.toHaveBeenCalled();
      expect(core.draft).toBe(draft);
    });

    it("still selects in-month days when outside days are inert", () => {
      const { shell, actions } = mount("docked", {
        ui: { outsideDays: { selectable: false } },
        calendar: { weekStart: "sunday" },
      });

      query(shell, 'td[data-date="2026-10-20"]').click();

      expect(actions.select).toHaveBeenCalledWith({
        year: 2026,
        month: 10,
        day: 20,
      });
    });

    const weekRows = (shell: CalendarShell): number =>
      query(shell, `${ACTIVE_PAGE} table.dp-ui__month-grid`).querySelectorAll(
        "tbody tr",
      ).length;

    it("renders six rows for February 2026 with ui.fixedWeeks", () => {
      const options: DatepickerOptions = {
        calendar: { weekStart: "sunday" },
      };
      vi.setSystemTime(new Date(2026, 1, 10, 10));
      const plain = mount("docked", options);
      expect(plain.core.view).toEqual({ year: 2026, month: 2 });
      expect(weekRows(plain.shell)).toBe(4);

      const fixed = mount("docked", { ...options, ui: { fixedWeeks: true } });
      expect(weekRows(fixed.shell)).toBe(6);
    });
  });

  describe("footer", () => {
    it("is hidden for inline unless ui.footer is true", () => {
      const inline = mount("inline");
      expect(query(inline.shell, ".dp-ui__actions").hidden).toBe(true);

      const withFooter = mount("inline", { ui: { footer: true } });
      expect(query(withFooter.shell, ".dp-ui__actions").hidden).toBe(false);
    });

    it("is shown for docked by default", () => {
      const { shell } = mount("docked");

      expect(query(shell, ".dp-ui__actions").hidden).toBe(false);
    });
  });
});
