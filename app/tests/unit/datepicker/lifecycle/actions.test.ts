import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type {
  ConfirmEventData,
  SelectDayEventData,
  SelectMonthEventData,
  SelectYearEventData,
} from "@/types/types";
import type { DatepickerOptions } from "@/types/options";
import {
  cleanupDom,
  clickSelector,
  flush,
  mountInput,
  selectedCell,
  surfaces,
} from "../../../helpers/picker";
import { setViewportWidth } from "../../../helpers/viewport";

const openPicker = async (
  options: DatepickerOptions,
  value?: string,
): Promise<{ picker: DatepickerUI; input: HTMLInputElement }> => {
  const input = mountInput();
  const picker = new DatepickerUI(input, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
  });
  picker.create();
  if (value !== undefined) picker.setValue(value);
  picker.open();
  await flush();
  return { picker, input };
};

const focusedDate = (): string | undefined =>
  document.querySelector<HTMLElement>('td.dp-ui__date[tabindex="0"]')?.dataset
    .date;

describe("PickerActionHandler", () => {
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

  describe("today", () => {
    it("selects today into the draft without committing", async () => {
      const { picker } = await openPicker({
        ui: { displayMode: "docked", todayButton: true },
      });
      const picked: SelectDayEventData[] = [];
      picker.on("select:day", (data) => picked.push(data));

      clickSelector(".dp-ui__text-button--today");

      expect(picked).toHaveLength(1);
      expect(picked[0]?.value.value).toBe("2026-10-17");
      expect(picked[0]?.selected).toBe(true);
      expect(selectedCell()?.dataset.date).toBe("2026-10-17");
      expect(picker.getValue()).toBeNull();
    });

    it("selects nothing and moves focus to today when today is disabled", async () => {
      const { picker } = await openPicker(
        {
          ui: { displayMode: "docked", todayButton: true },
          calendar: { disabledDates: ["2026-10-17"] },
        },
        "2026-10-05",
      );
      const picked = vi.fn();
      picker.on("select:day", picked);
      expect(focusedDate()).toBe("2026-10-05");

      clickSelector(".dp-ui__text-button--today");

      expect(picked).not.toHaveBeenCalled();
      expect(selectedCell()?.dataset.date).toBe("2026-10-05");
      expect(focusedDate()).toBe("2026-10-17");
    });

    it("selects nothing when today is before minDate", async () => {
      const { picker } = await openPicker({
        ui: { displayMode: "docked", todayButton: true },
        calendar: { minDate: "2026-10-20" },
      });
      const picked = vi.fn();
      picker.on("select:day", picked);

      clickSelector(".dp-ui__text-button--today");

      expect(picked).not.toHaveBeenCalled();
      expect(selectedCell()).toBeNull();
    });
  });

  describe("clear", () => {
    it("clears the draft and keeps the picker open without clearInput", async () => {
      const { picker, input } = await openPicker(
        {
          ui: {
            displayMode: "docked",
            clearButton: { clearInput: false },
          },
        },
        "2026-10-05",
      );
      const confirm = vi.fn();
      picker.on("confirm", confirm);
      const value = input.value;
      expect(selectedCell()?.dataset.date).toBe("2026-10-05");

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(selectedCell()).toBeNull();
      expect(surfaces()).toHaveLength(1);
      expect(confirm).not.toHaveBeenCalled();
      expect(input.value).toBe(value);
      expect(picker.getValue()).not.toBeNull();
    });

    it("commits null, empties the input and closes with clearInput", async () => {
      const { picker, input } = await openPicker(
        { ui: { displayMode: "docked", clearButton: true } },
        "2026-10-05",
      );
      const confirms: ConfirmEventData[] = [];
      const close = vi.fn();
      picker.on("confirm", (data) => confirms.push(data));
      picker.on("close", close);
      expect(input.value).not.toBe("");

      clickSelector(".dp-ui__text-button--clear");
      await flush();

      expect(confirms).toEqual([{ value: null, autoCommit: false }]);
      expect(close).toHaveBeenCalledTimes(1);
      expect(picker.getValue()).toBeNull();
      expect(input.value).toBe("");
      expect(surfaces()).toHaveLength(0);
    });
  });

  describe("month and year picks", () => {
    it("emits select:month from the month menu", async () => {
      const { picker } = await openPicker({ ui: { displayMode: "docked" } });
      const picked: SelectMonthEventData[] = [];
      picker.on("select:month", (data) => picked.push(data));

      clickSelector(".dp-ui__menu-button--month");
      await flush();
      const items = document.querySelectorAll<HTMLElement>(
        ".dp-ui__menu--month li",
      );
      items[2].click();
      await flush();

      expect(picked).toEqual([{ year: 2026, month: 3 }]);
      expect(document.querySelector(".dp-ui__menu--month")).toBeNull();
    });

    it("emits select:year from the docked year menu", async () => {
      const { picker } = await openPicker({ ui: { displayMode: "docked" } });
      const picked: SelectYearEventData[] = [];
      picker.on("select:year", (data) => picked.push(data));

      clickSelector(".dp-ui__menu-button--year");
      await flush();
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(".dp-ui__menu--year li"),
      ).find((item) => item.textContent.includes("2028"));
      target?.click();
      await flush();

      expect(picked).toEqual([{ year: 2028 }]);
      expect(document.querySelector(".dp-ui__menu--year")).toBeNull();
    });

    it("emits select:year from the modal year grid", async () => {
      const { picker } = await openPicker({ ui: { displayMode: "modal" } });
      const picked: SelectYearEventData[] = [];
      picker.on("select:year", (data) => picked.push(data));

      clickSelector(".dp-ui__menu-button--year-grid");
      await flush();
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(".dp-ui__year-selection-item"),
      ).find((item) => item.textContent === "2024");
      target?.click();
      await flush();

      expect(picked).toEqual([{ year: 2024 }]);
      expect(document.querySelector(".dp-ui__year-selection")).toBeNull();
    });
  });

  describe("several months", () => {
    const press = (key: string): void => {
      const cell = document.querySelector<HTMLElement>(
        'td.dp-ui__date[tabindex="0"]',
      );
      cell?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    };

    const firstMonthLabel = (): string | undefined =>
      document.querySelector(
        ".dp-ui__menu-button--month .dp-ui__menu-button-label",
      )?.textContent;

    beforeEach(() => {
      setViewportWidth(1280);
    });

    afterEach(() => {
      setViewportWidth(1024);
    });

    const open = (
      pageBy: "month" | "view",
      value: string,
    ): Promise<{ picker: DatepickerUI; input: HTMLInputElement }> =>
      openPicker(
        {
          ui: { displayMode: "docked" },
          calendar: { months: 2, pageBy },
        },
        value,
      );

    it("keeps the first month while focus moves into the second one", async () => {
      const { picker } = await open("view", "2026-10-31");
      const navigate = vi.fn();
      picker.on("navigate", navigate);
      expect(focusedDate()).toBe("2026-10-31");

      press("ArrowRight");

      expect(focusedDate()).toBe("2026-11-01");
      expect(firstMonthLabel()).toBe("Oct");
      expect(navigate).not.toHaveBeenCalled();
    });

    it("pages by the whole view when focus leaves the window", async () => {
      const { picker } = await open("view", "2026-10-31");
      const navigate = vi.fn();
      picker.on("navigate", navigate);
      press("ArrowRight");
      for (let week = 0; week < 4; week += 1) press("ArrowDown");
      press("ArrowRight");
      expect(focusedDate()).toBe("2026-11-30");
      expect(navigate).not.toHaveBeenCalled();

      press("ArrowRight");
      await flush();

      expect(focusedDate()).toBe("2026-12-01");
      expect(firstMonthLabel()).toBe("Dec");
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(navigate.mock.calls[0]?.[0]).toMatchObject({
        year: 2026,
        month: 12,
        direction: 1,
        source: "keyboard",
      });
    });

    it("shifts by one month with pageBy month", async () => {
      const { picker } = await open("month", "2026-10-31");
      const navigate = vi.fn();
      picker.on("navigate", navigate);
      press("ArrowRight");
      for (let week = 0; week < 4; week += 1) press("ArrowDown");
      press("ArrowRight");

      press("ArrowRight");
      await flush();

      expect(focusedDate()).toBe("2026-12-01");
      expect(firstMonthLabel()).toBe("Nov");
      expect(navigate.mock.calls[0]?.[0]).toMatchObject({
        year: 2026,
        month: 11,
        direction: 1,
      });
    });

    it("steps two months with the next button and pageBy view", async () => {
      const { picker } = await open("view", "2026-10-05");
      const navigate = vi.fn();
      picker.on("navigate", navigate);

      clickSelector(".dp-ui__icon-button--next-month");
      await flush();

      expect(navigate.mock.calls[0]?.[0]).toMatchObject({
        year: 2026,
        month: 12,
        direction: 1,
        source: "button",
      });
      expect(firstMonthLabel()).toBe("Dec");

      clickSelector(".dp-ui__icon-button--prev-month");
      await flush();

      expect(navigate.mock.calls[1]?.[0]).toMatchObject({
        year: 2026,
        month: 10,
        direction: -1,
      });
    });

    it("steps one month with the next button and pageBy month", async () => {
      const { picker } = await open("month", "2026-10-05");
      const navigate = vi.fn();
      picker.on("navigate", navigate);

      clickSelector(".dp-ui__icon-button--next-month");
      await flush();

      expect(navigate.mock.calls[0]?.[0]).toMatchObject({
        year: 2026,
        month: 11,
        direction: 1,
      });
      expect(firstMonthLabel()).toBe("Nov");
    });
  });

  describe("cancel and confirm guards", () => {
    it("confirm does nothing while a range has only its start", async () => {
      const { picker } = await openPicker({
        calendar: { mode: "range" },
        ui: { displayMode: "docked" },
      });
      const confirm = vi.fn();
      picker.on("confirm", confirm);
      clickSelector('td.dp-ui__date[data-date="2026-10-20"]');
      await flush();

      const button = document.querySelector<HTMLButtonElement>(
        ".dp-ui__text-button--confirm",
      );
      expect(button).toBeDisabled();
      button?.click();
      await flush();

      expect(confirm).not.toHaveBeenCalled();
      expect(surfaces()).toHaveLength(1);
    });

    it("an inline picker keeps its surface after cancel and resets the draft", async () => {
      const container = document.createElement("div");
      container.id = "inline-host";
      document.body.append(container);
      const picker = new DatepickerUI(mountInput(), {
        ui: { inline: { enabled: true, container: "#inline-host" } },
        calendar: { locale: "en-US" },
      });
      picker.create();
      picker.setValue("2026-10-05");
      const cancel = vi.fn();
      picker.on("cancel", cancel);

      document
        .querySelector<HTMLElement>('td.dp-ui__date[data-date="2026-10-20"]')
        ?.click();
      expect(selectedCell()?.dataset.date).toBe("2026-10-20");
      document
        .querySelector<HTMLElement>(".dp-ui__text-button--cancel")
        ?.click();
      await flush();

      expect(cancel).toHaveBeenCalledWith({ reason: "button" });
      expect(
        container.querySelector(".dp-ui__container--inline"),
      ).not.toBeNull();
      expect(selectedCell()?.dataset.date).toBe("2026-10-05");
    });
  });
});
