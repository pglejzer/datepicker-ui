import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { DatepickerOptions } from "@/types/options";
import type { SwitchViewEventData } from "@/types/types";
import {
  cleanupDom,
  clickSelector,
  flush,
  mountInput,
} from "../../helpers/picker";
import { setViewportWidth } from "../../helpers/viewport";

type InlineOptions = NonNullable<
  NonNullable<DatepickerOptions["ui"]>["inline"]
>;

interface Fixture {
  picker: DatepickerUI;
  container: HTMLElement;
  onSwitch: ReturnType<typeof vi.fn<(data: SwitchViewEventData) => void>>;
}

const create = (options: DatepickerOptions = {}): Fixture => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const inline = options.ui?.inline;
  const picker = new DatepickerUI(mountInput(), {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
    ui:
      inline?.enabled === true
        ? { ...options.ui, inline: { ...inline, container } }
        : options.ui,
  });
  const onSwitch = vi.fn<(data: SwitchViewEventData) => void>();
  picker.on("switch:view", onSwitch);
  picker.create();
  return { picker, container, onSwitch };
};

const inlineUi = (
  inline: InlineOptions = {},
  ui: NonNullable<DatepickerOptions["ui"]> = {},
): NonNullable<DatepickerOptions["ui"]> => ({
  ...ui,
  inline: { enabled: true, ...inline },
});

const inputPanel = (): Element | null =>
  document.querySelector(".dp-ui__input-panel");

describe("DatepickerUI.setView and getView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 10));
    setViewportWidth(1280);
  });

  afterEach(async () => {
    DatepickerUI.destroyAll();
    await flush();
    cleanupDom();
    setViewportWidth(1024);
    vi.useRealTimers();
  });

  describe("inline single with layout: modal", () => {
    it("shows the input panel, emits switch:view once and reports the view", async () => {
      const { picker, onSwitch } = create({
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();
      expect(picker.getView()).toBe("calendar");

      picker.setView("input");
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(onSwitch).toHaveBeenCalledTimes(1);
      expect(onSwitch).toHaveBeenCalledWith({ view: "input" });
      expect(picker.getView()).toBe("input");
    });

    it("emits nothing for a repeated call", async () => {
      const { picker, onSwitch } = create({
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();

      picker.setView("input");
      picker.setView("input");
      await flush();

      expect(onSwitch).toHaveBeenCalledTimes(1);
    });

    it("goes back to the calendar and emits switch:view", async () => {
      const { picker, onSwitch } = create({
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();
      picker.setView("input");
      await flush();

      picker.setView("calendar");
      await flush();

      expect(onSwitch).toHaveBeenCalledTimes(2);
      expect(onSwitch).toHaveBeenLastCalledWith({ view: "calendar" });
      expect(picker.getView()).toBe("calendar");
      expect(document.querySelector("table.dp-ui__month-grid")).not.toBeNull();
    });

    it("works with ui.viewSwitch: false, which only hides the pencil", async () => {
      const { picker, onSwitch } = create({
        ui: inlineUi({}, { layout: "modal", viewSwitch: false }),
      });
      await flush();
      expect(
        document.querySelector(".dp-ui__icon-button--switch-view"),
      ).toBeNull();

      picker.setView("input");
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(onSwitch).toHaveBeenCalledWith({ view: "input" });
      expect(picker.getView()).toBe("input");
    });

    it("works with headline: false", async () => {
      const { picker, onSwitch } = create({
        ui: inlineUi({ headline: false }, { layout: "modal" }),
      });
      await flush();

      picker.setView("input");
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(onSwitch).toHaveBeenCalledTimes(1);
    });

    it("fires callbacks.onSwitchView", async () => {
      const onSwitchView = vi.fn();
      const { picker } = create({
        ui: inlineUi({}, { layout: "modal" }),
        callbacks: { onSwitchView },
      });
      await flush();

      picker.setView("input");
      await flush();

      expect(onSwitchView).toHaveBeenCalledTimes(1);
      expect(onSwitchView).toHaveBeenCalledWith({ view: "input" });
    });
  });

  describe("inline range", () => {
    it("switches to the input view with headline: false", async () => {
      const { picker, onSwitch } = create({
        calendar: { mode: "range" },
        ui: inlineUi({ headline: false }),
      });
      await flush();

      picker.setView("input");
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(onSwitch).toHaveBeenCalledTimes(1);
      expect(onSwitch).toHaveBeenCalledWith({ view: "input" });
      expect(picker.getView()).toBe("input");
    });
  });

  describe("no-ops", () => {
    it("a docked single picker keeps the calendar", async () => {
      const { picker, onSwitch } = create({
        ui: { displayMode: "docked" },
      });
      picker.open();
      await flush();

      picker.setView("input");
      await flush();

      expect(inputPanel()).toBeNull();
      expect(onSwitch).not.toHaveBeenCalled();
      expect(picker.getView()).toBe("calendar");
    });

    it("a closed modal picker ignores setView", async () => {
      const { picker, onSwitch } = create({ ui: { displayMode: "modal" } });

      picker.setView("input");
      await flush();

      expect(inputPanel()).toBeNull();
      expect(onSwitch).not.toHaveBeenCalled();
      expect(picker.getView()).toBe("calendar");
    });

    it("multiple mode has no input view", async () => {
      const { picker, onSwitch } = create({
        calendar: { mode: "multiple" },
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();

      picker.setView("input");
      await flush();

      expect(inputPanel()).toBeNull();
      expect(onSwitch).not.toHaveBeenCalled();
      expect(picker.getView()).toBe("calendar");
    });

    it("month precision has no input view", async () => {
      const { picker, onSwitch } = create({
        calendar: { precision: "month" },
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();

      picker.setView("input");
      await flush();

      expect(inputPanel()).toBeNull();
      expect(onSwitch).not.toHaveBeenCalled();
      expect(picker.getView()).toBe("calendar");
    });
  });

  describe("the modal pencil", () => {
    it("emits switch:view when clicked", async () => {
      setViewportWidth(1024);
      const { picker, onSwitch } = create({ ui: { displayMode: "modal" } });
      picker.open();
      await flush();

      clickSelector(".dp-ui__icon-button--switch-view");
      await flush();

      expect(onSwitch).toHaveBeenCalledTimes(1);
      expect(onSwitch).toHaveBeenCalledWith({ view: "input" });
      expect(picker.getView()).toBe("input");

      clickSelector(".dp-ui__icon-button--switch-view");
      await flush();

      expect(onSwitch).toHaveBeenLastCalledWith({ view: "calendar" });
    });
  });

  describe("ui.initialView: input", () => {
    it("opens a modal on the input view without an event", async () => {
      setViewportWidth(1024);
      const { picker, onSwitch } = create({
        ui: { displayMode: "modal", initialView: "input" },
      });

      picker.open();
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(picker.getView()).toBe("input");
      expect(onSwitch).not.toHaveBeenCalled();
    });

    it("mounts an inline picker on the input view without an event", async () => {
      const onSwitchView = vi.fn();
      const { picker, onSwitch } = create({
        ui: inlineUi({}, { layout: "modal", initialView: "input" }),
        callbacks: { onSwitchView },
      });
      await flush();

      expect(inputPanel()).not.toBeNull();
      expect(picker.getView()).toBe("input");
      expect(onSwitch).not.toHaveBeenCalled();
      expect(onSwitchView).not.toHaveBeenCalled();
    });
  });

  describe("ui.startView with navigation: caption", () => {
    it("opens the month menu on a docked inline picker with menus", async () => {
      create({ ui: inlineUi({}, { startView: "month" }) });
      await flush();

      expect(document.querySelector(".dp-ui__menu--month")).not.toBeNull();
    });

    it("opens on the days with the caption navigation", async () => {
      create({
        ui: inlineUi({ navigation: "caption" }, { startView: "month" }),
      });
      await flush();

      expect(document.querySelector(".dp-ui__menu--month")).toBeNull();
      expect(document.querySelector(".dp-ui__menu--year")).toBeNull();
      expect(
        document.querySelector(".dp-ui__navigation--caption"),
      ).not.toBeNull();
      expect(document.querySelector("table.dp-ui__month-grid")).not.toBeNull();
    });
  });

  describe("setOptions on ui.layout", () => {
    it("remounts a shown inline picker with the modal layout", async () => {
      const { picker, container } = create({ ui: inlineUi() });
      await flush();
      expect(container.querySelector(".dp-ui__header--docked")).not.toBeNull();
      expect(container.querySelector(".dp-ui__calendar--modal")).toBeNull();

      picker.setOptions({ ui: { layout: "modal" } });
      await flush();

      expect(container.querySelectorAll(".dp-ui__container")).toHaveLength(1);
      expect(container.querySelector(".dp-ui__calendar--modal")).not.toBeNull();
      expect(container.querySelector(".dp-ui__header--modal")).not.toBeNull();
      expect(container.querySelector(".dp-ui__header--docked")).toBeNull();
    });

    it("remounts back to the docked layout", async () => {
      const { picker, container } = create({
        ui: inlineUi({}, { layout: "modal" }),
      });
      await flush();
      expect(container.querySelector(".dp-ui__calendar--modal")).not.toBeNull();

      picker.setOptions({ ui: { layout: "docked" } });
      await flush();

      expect(container.querySelector(".dp-ui__calendar--modal")).toBeNull();
      expect(container.querySelector(".dp-ui__header--docked")).not.toBeNull();
    });
  });
});
