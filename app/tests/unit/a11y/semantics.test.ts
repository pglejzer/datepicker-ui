import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import { cleanupDom, flush, mountInput, surface } from "../../helpers/picker";

const query = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return element;
};

const press = (target: Element, key: string): void => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
};

const openPicker = async (mode: "docked" | "modal"): Promise<DatepickerUI> => {
  const p = new DatepickerUI(mountInput(), {
    ui: { displayMode: mode },
    calendar: { locale: "en-US" },
  });
  p.create();
  p.open();
  await flush();
  return p;
};

describe("accessibility semantics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    vi.useRealTimers();
  });

  describe("docked header buttons", () => {
    beforeEach(async () => {
      await openPicker("docked");
    });

    it.each([
      [
        ".dp-ui__icon-button--prev-month",
        "Previous month",
        "(Page Up)",
        "PageUp",
      ],
      [
        ".dp-ui__icon-button--next-month",
        "Next month",
        "(Page Down)",
        "PageDown",
      ],
      [
        ".dp-ui__icon-button--prev-year",
        "Previous year",
        "(Shift+Page Up)",
        "Shift+PageUp",
      ],
      [
        ".dp-ui__icon-button--next-year",
        "Next year",
        "(Shift+Page Down)",
        "Shift+PageDown",
      ],
    ])(
      "%s has label, title shortcut and aria-keyshortcuts",
      (selector, label, hint, keys) => {
        const button = query(selector);
        expect(button.getAttribute("aria-label")).toBe(label);
        expect(button.getAttribute("title")).toContain(hint);
        expect(button.getAttribute("aria-keyshortcuts")).toBe(keys);
      },
    );

    it("surface is labelled Select date", () => {
      expect(surface()?.getAttribute("aria-label")).toBe("Select date");
    });
  });

  describe("month and year menu buttons", () => {
    beforeEach(async () => {
      await openPicker("docked");
    });

    it.each([
      [".dp-ui__menu-button--month", "Shift+M", ".dp-ui__menu--month"],
      [
        ".dp-ui__menu-button--year",
        "Shift+Y",
        ".dp-ui__year-selection, .dp-ui__menu--year",
      ],
    ])(
      "%s toggles aria-expanded and points at its popup",
      async (selector, keys, popup) => {
        const button = query(selector);
        expect(button.getAttribute("aria-haspopup")).toBe("listbox");
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(button.getAttribute("aria-keyshortcuts")).toBe(keys);

        button.click();
        await flush();

        expect(button.getAttribute("aria-expanded")).toBe("true");
        const controls = button.getAttribute("aria-controls");
        expect(controls).toBeTruthy();
        const target = surface()?.querySelector(`[id="${controls ?? ""}"]`);
        expect(target).not.toBeNull();
        expect(target?.matches(popup)).toBe(true);
      },
    );

    it("Escape in an open month menu closes only the menu and focuses its button", async () => {
      const button = query(".dp-ui__menu-button--month");
      button.click();
      await flush();
      expect(button.getAttribute("aria-expanded")).toBe("true");

      const item = query(".dp-ui__menu--month .dp-ui__menu-item");
      item.focus();
      press(item, "Escape");
      await flush();

      expect(surface()).not.toBeNull();
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(button);
    });
  });

  describe("grid roving tabindex", () => {
    it.each(["ArrowRight", "ArrowDown", "PageDown"])(
      "keeps exactly one tabindex=0 cell after %s",
      async (key) => {
        await openPicker("docked");
        const start = query('td.dp-ui__date[tabindex="0"]');
        start.focus();

        press(start, key);
        await flush();

        const focused = document.activeElement;
        const grid = focused?.closest("table");
        expect(grid).not.toBeNull();
        expect(grid?.querySelectorAll('td[tabindex="0"]')).toHaveLength(1);
      },
    );
  });

  describe("localized shortcut key names", () => {
    it("shows the custom names in titles and keeps the key codes", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        calendar: { locale: "en-US" },
        labels: { pageUpKey: "Bild auf", shiftKey: "Umschalt" },
      });
      p.create();
      p.open();
      await flush();

      const previousMonth = query(".dp-ui__icon-button--prev-month");
      expect(previousMonth.getAttribute("title")).toBe(
        "Previous month (Bild auf)",
      );
      expect(previousMonth.getAttribute("aria-keyshortcuts")).toBe("PageUp");

      const previousYear = query(".dp-ui__icon-button--prev-year");
      expect(previousYear.getAttribute("title")).toBe(
        "Previous year (Umschalt+Bild auf)",
      );
      expect(previousYear.getAttribute("aria-keyshortcuts")).toBe(
        "Shift+PageUp",
      );

      const month = query(".dp-ui__menu-button--month");
      expect(month.getAttribute("title")).toBe("Choose month (Umschalt+M)");
      expect(month.getAttribute("aria-keyshortcuts")).toBe("Shift+M");
      expect(
        query(".dp-ui__icon-button--next-month").getAttribute("title"),
      ).toBe("Next month (Page Down)");
    });
  });

  describe("modal year-grid menu button", () => {
    const yearButton = (): HTMLElement =>
      query(".dp-ui__menu-button--year-grid");

    it("carries Shift+Y and a title on the days panel", async () => {
      await openPicker("modal");
      expect(yearButton().getAttribute("aria-keyshortcuts")).toBe("Shift+Y");
      expect(yearButton().getAttribute("title")).toBe("Choose year (Shift+Y)");
    });

    it("carries Shift+Y on the month-grid home", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "modal" },
        calendar: { locale: "en-US", precision: "month" },
      });
      p.create();
      p.open();
      await flush();

      expect(yearButton().getAttribute("aria-keyshortcuts")).toBe("Shift+Y");
      expect(yearButton().getAttribute("title")).toBe("Choose year (Shift+Y)");
    });

    it("has neither in the open year-grid header", async () => {
      await openPicker("modal");
      yearButton().click();
      await flush();

      const header = query(".dp-ui__navigation--year-grid");
      const button = header.querySelector(".dp-ui__menu-button--year-grid");
      expect(button).not.toBeNull();
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(button).not.toHaveAttribute("aria-keyshortcuts");
      expect(button).not.toHaveAttribute("title");
    });

    it("moves focus into the year grid on Shift+Y", async () => {
      await openPicker("modal");
      const cell = query('td.dp-ui__date[tabindex="0"]');
      cell.focus();

      cell.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Y",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await flush();

      const controls = yearButton().getAttribute("aria-controls") ?? "";
      const grid = surface()?.querySelector(`[id="${controls}"]`);
      expect(grid).not.toBeNull();
      expect(grid?.contains(document.activeElement)).toBe(true);
    });
  });

  describe("range day labels", () => {
    const openRange = async (
      labels: { inRange?: string } = {},
    ): Promise<DatepickerUI> => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        calendar: { locale: "en-US", mode: "range" },
        labels,
      });
      p.create();
      p.open();
      await flush();
      return p;
    };

    const labelOf = (iso: string): string =>
      query(`td.dp-ui__date[data-date="${iso}"]`).getAttribute("aria-label") ??
      "";

    it("names start, in-range and end days of a full range", async () => {
      const p = await openRange();
      query('td.dp-ui__date[data-date="2026-10-20"]').click();
      query('td.dp-ui__date[data-date="2026-10-24"]').click();
      await flush();

      expect(labelOf("2026-10-20")).toMatch(/, Start$/);
      expect(labelOf("2026-10-22")).toBe(
        "Thursday, October 22, 2026, In range",
      );
      expect(labelOf("2026-10-24")).toMatch(/, End$/);
      expect(labelOf("2026-10-26")).not.toMatch(/Start|End|In range/);
      p.destroy();
    });

    it("names the start of a range that has no end yet", async () => {
      const p = await openRange();
      query('td.dp-ui__date[data-date="2026-10-20"]').click();
      await flush();

      expect(labelOf("2026-10-20")).toBe("Tuesday, October 20, 2026, Start");
      expect(labelOf("2026-10-21")).not.toMatch(/In range|Start|End/);
      p.destroy();
    });

    it("uses labels.inRange", async () => {
      const p = await openRange({ inRange: "W zakresie" });
      query('td.dp-ui__date[data-date="2026-10-20"]').click();
      query('td.dp-ui__date[data-date="2026-10-24"]').click();
      await flush();

      expect(labelOf("2026-10-22")).toMatch(/, W zakresie$/);
      p.destroy();
    });

    it("adds no In range label for a single picker", async () => {
      await openPicker("docked");

      expect(labelOf("2026-10-20")).not.toMatch(/Start|End|In range/);
      expect(surface()?.innerHTML).not.toContain("In range");
    });
  });

  describe("modal dialog", () => {
    it("is labelled Select date and opened with showModal", async () => {
      await openPicker("modal");
      const dialog = query("dialog.dp-ui__dialog");
      expect(dialog.getAttribute("aria-label")).toBe("Select date");
      expect(dialog).toHaveAttribute("open");
      expect(dialog).toHaveAttribute("data-test-modal");
    });

    it("contains its action buttons so native modal focus wrapping covers them", async () => {
      await openPicker("modal");
      const dialog = query("dialog.dp-ui__dialog");
      expect(dialog.contains(query(".dp-ui__text-button--confirm"))).toBe(true);
      expect(dialog.contains(query(".dp-ui__text-button--cancel"))).toBe(true);
    });
  });
});
