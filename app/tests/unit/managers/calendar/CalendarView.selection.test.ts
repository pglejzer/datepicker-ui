import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import {
  cleanupDom,
  clickDate,
  clickSelector,
  flush,
  mountInput,
  surface,
} from "../../../helpers/picker";

const SWITCH = "button.dp-ui__icon-button--switch-view";
const INPUT_PANEL = ".dp-ui__input-panel";
const FIELD = ".dp-ui__text-field-input";

const open = async (options: DatepickerOptions): Promise<DatepickerUI> => {
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
    ui: { format: "MM/dd/yyyy", ...options.ui },
  });
  picker.create();
  picker.open();
  await flush();
  return picker;
};

const selectedIsos = (): (string | undefined)[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>("td.dp-ui__date--selected"),
  ).map((cell) => cell.dataset.date);

const headline = (): string | null =>
  document.querySelector(".dp-ui__headline")?.textContent ?? null;

const switchButton = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(SWITCH);

const enabledOtherDay = (iso: string): HTMLElement => {
  const cell = document.querySelector<HTMLElement>(
    `td.dp-ui__date[data-date="${iso}"]`,
  );
  if (!cell) {
    throw new Error(`No date cell for ${iso}`);
  }
  return cell;
};

describe("CalendarView selection modes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("multiple", () => {
    it("marks every picked day and unselects a day clicked again", async () => {
      await open({
        calendar: { mode: "multiple" },
        ui: { displayMode: "docked" },
      });

      clickDate("2026-10-05");
      clickDate("2026-10-12");
      clickDate("2026-10-20");
      await flush();
      expect(selectedIsos()).toEqual([
        "2026-10-05",
        "2026-10-12",
        "2026-10-20",
      ]);

      clickDate("2026-10-12");
      await flush();
      expect(selectedIsos()).toEqual(["2026-10-05", "2026-10-20"]);
    });

    it("shows the count in the modal headline", async () => {
      await open({
        calendar: { mode: "multiple" },
        ui: { displayMode: "modal" },
      });

      clickDate("2026-10-05");
      clickDate("2026-10-12");
      await flush();

      expect(headline()).toBe("2 selected");
    });

    it("disables the other days once calendar.multiple.max is reached", async () => {
      await open({
        calendar: { mode: "multiple", multiple: { max: 2 } },
        ui: { displayMode: "docked" },
      });

      clickDate("2026-10-05");
      clickDate("2026-10-12");
      await flush();

      expect(enabledOtherDay("2026-10-20")).toHaveClass(
        "dp-ui__date--disabled",
      );
      expect(enabledOtherDay("2026-10-05")).not.toHaveClass(
        "dp-ui__date--disabled",
      );
      expect(enabledOtherDay("2026-10-12")).not.toHaveClass(
        "dp-ui__date--disabled",
      );

      clickDate("2026-10-12");
      await flush();
      expect(enabledOtherDay("2026-10-20")).not.toHaveClass(
        "dp-ui__date--disabled",
      );
    });
  });

  describe("live region announcements", () => {
    const liveText = (): string =>
      document.querySelector(".dp-ui__live-region")?.textContent ?? "";

    it("announces the picked date for a single picker", async () => {
      await open({ ui: { displayMode: "modal" } });

      clickDate("2026-10-05");
      await flush();

      expect(liveText()).not.toBe("");
      expect(liveText()).toBe(headline());
      expect(liveText()).toContain("Oct");
    });

    it("announces the picked date for a docked single picker", async () => {
      await open({ ui: { displayMode: "docked" } });

      clickDate("2026-10-05");
      await flush();

      expect(liveText()).toContain("Oct");
      expect(liveText()).toContain("5");
    });

    it("announces the count for a multiple picker", async () => {
      await open({
        calendar: { mode: "multiple" },
        ui: { displayMode: "docked" },
      });

      clickDate("2026-10-05");
      clickDate("2026-10-12");
      await flush();

      expect(liveText()).toBe("2 selected");
    });
  });

  describe("view switch", () => {
    it("offers the switch on a single modal picker with a text-input label", async () => {
      await open({ ui: { displayMode: "modal" } });

      const button = switchButton();
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute("aria-label", "Switch to text input");
      expect(document.querySelector(INPUT_PANEL)).toBeNull();
    });

    it("toggles between the grid and the input panel and updates the headline from typed text", async () => {
      await open({ ui: { displayMode: "modal" } });

      clickSelector(SWITCH);
      await flush();

      expect(document.querySelector(INPUT_PANEL)).not.toBeNull();
      expect(surface()).toHaveClass("dp-ui__container--input");
      expect(switchButton()).toHaveAttribute(
        "aria-label",
        "Switch to calendar",
      );

      const field = document.querySelector<HTMLInputElement>(FIELD);
      expect(field).not.toBeNull();
      field!.value = "10/20/2026";
      field!.dispatchEvent(new Event("change", { bubbles: true }));
      await flush();
      expect(headline()).toContain("20");

      clickSelector(SWITCH);
      await flush();

      expect(document.querySelector(INPUT_PANEL)).toBeNull();
      expect(surface()).not.toHaveClass("dp-ui__container--input");
      expect(document.querySelector("td.dp-ui__date")).not.toBeNull();
      expect(switchButton()).toHaveAttribute(
        "aria-label",
        "Switch to text input",
      );
      expect(selectedIsos()).toEqual(["2026-10-20"]);
    });

    it("omits the switch when ui.viewSwitch is false", async () => {
      await open({ ui: { displayMode: "modal", viewSwitch: false } });

      expect(switchButton()).toBeNull();
    });

    it("omits the switch on a docked picker", async () => {
      await open({ ui: { displayMode: "docked" } });

      expect(switchButton()).toBeNull();
    });

    it("omits the switch on a multiple modal picker", async () => {
      await open({
        calendar: { mode: "multiple" },
        ui: { displayMode: "modal" },
      });

      expect(switchButton()).toBeNull();
    });

    it("starts on the input panel with ui.initialView 'input'", async () => {
      await open({ ui: { displayMode: "modal", initialView: "input" } });

      expect(document.querySelector(INPUT_PANEL)).not.toBeNull();
      expect(surface()).toHaveClass("dp-ui__container--input");
    });
  });

  describe("decorateDate", () => {
    it("renders one badge in the decorated cell", async () => {
      await open({
        ui: { displayMode: "docked" },
        calendar: {
          decorateDate: (date) =>
            date.getFullYear() === 2026 &&
            date.getMonth() === 9 &&
            date.getDate() === 20
              ? { badge: true }
              : undefined,
        },
      });

      const badges = document.querySelectorAll(".dp-ui__date-badge");
      expect(badges).toHaveLength(1);
      expect(
        enabledOtherDay("2026-10-20").querySelectorAll(".dp-ui__date-badge"),
      ).toHaveLength(1);
    });

    it("keeps the grid when decorateDate throws and rethrows asynchronously", async () => {
      const queued: (() => void)[] = [];
      vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
        queued.push(cb);
      });
      const boom = new Error("boom");

      await open({
        ui: { displayMode: "docked" },
        calendar: {
          decorateDate: () => {
            throw boom;
          },
        },
      });

      expect(
        document.querySelectorAll("td.dp-ui__date").length,
      ).toBeGreaterThan(27);
      expect(document.querySelectorAll(".dp-ui__date-badge")).toHaveLength(0);
      expect(queued.length).toBeGreaterThan(0);
      expect(() => {
        for (const task of queued) {
          task();
        }
      }).toThrow(boom);
    });
  });
});
