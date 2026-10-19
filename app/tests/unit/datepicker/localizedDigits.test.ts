import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import {
  cleanupDom,
  clickSelector,
  flush,
  mountInput,
} from "../../helpers/picker";

const ARABIC_INDIC = /^[٠-٩]+$/;

const openPicker = async (
  options: DatepickerOptions,
): Promise<DatepickerUI> => {
  const picker = new DatepickerUI(mountInput(), options);
  picker.create();
  picker.open();
  await flush();
  return picker;
};

const texts = (selector: string): string[] =>
  Array.from(document.querySelectorAll(selector)).map(
    (element) => element.textContent,
  );

describe("localized digits through DatepickerUI", () => {
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

  it("shows Arabic-Indic day numbers for ar-EG and keeps data-date ISO", async () => {
    await openPicker({
      calendar: { locale: "ar-EG" },
      ui: { displayMode: "docked" },
    });

    const cell = document.querySelector<HTMLElement>(
      'td.dp-ui__date[data-date="2026-10-17"]',
    );
    expect(cell).not.toBeNull();
    expect(cell?.dataset.date).toBe("2026-10-17");
    expect(cell?.querySelector(".dp-ui__date-indicator")?.textContent).toBe(
      "١٧",
    );
    const days = texts(".dp-ui__date-indicator");
    expect(days.length).toBeGreaterThan(27);
    for (const day of days) {
      expect(day).toMatch(ARABIC_INDIC);
    }
  });

  it("shows Latin day numbers with a latn numbering-system locale", async () => {
    await openPicker({
      calendar: { locale: "ar-EG-u-nu-latn" },
      ui: { displayMode: "docked" },
    });

    expect(
      document.querySelector(
        'td.dp-ui__date[data-date="2026-10-17"] .dp-ui__date-indicator',
      )?.textContent,
    ).toBe("17");
  });

  it("shows Arabic-Indic week numbers", async () => {
    await openPicker({
      calendar: { locale: "ar-EG" },
      ui: { displayMode: "docked", weekNumbers: true },
    });

    const numbers = texts(".dp-ui__week-number");
    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) {
      expect(number).toMatch(ARABIC_INDIC);
    }
  });

  it("shows the year in Arabic-Indic digits on the docked year button and menu", async () => {
    await openPicker({
      calendar: { locale: "ar-EG" },
      ui: { displayMode: "docked" },
    });

    expect(
      document.querySelector(
        ".dp-ui__menu-button--year .dp-ui__menu-button-label",
      )?.textContent,
    ).toBe("٢٠٢٦");

    clickSelector(".dp-ui__menu-button--year");
    await flush();

    const items = texts(".dp-ui__menu--year li");
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((text) => text.includes("٢٠٢٦"))).toBe(true);
    expect(items.some((text) => text.includes("2026"))).toBe(false);
  });

  it("shows Arabic-Indic years in the modal year grid", async () => {
    await openPicker({
      calendar: { locale: "ar-EG" },
      ui: { displayMode: "modal" },
    });

    clickSelector(".dp-ui__menu-button--year-grid");
    await flush();

    const years = texts(".dp-ui__year-selection-item");
    expect(years.length).toBeGreaterThan(0);
    for (const year of years) {
      expect(year.trim()).toMatch(ARABIC_INDIC);
    }
    expect(years.map((year) => year.trim())).toContain("٢٠٢٦");
  });
});
