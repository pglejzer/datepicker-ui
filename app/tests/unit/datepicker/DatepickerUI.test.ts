import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DatepickerUI from "@/datepicker/DatepickerUI";
import type { CoreState } from "@/datepicker/CoreState";
import type { Panel } from "@/types/internal";
import type { DateValue, ErrorEventData, RangeValue } from "@/types/types";
import {
  cleanupDom,
  clickCancel,
  clickConfirm,
  clickDate,
  clickSelector,
  flush,
  mountInput,
  selectedCell,
  surface,
  surfaces,
} from "../../helpers/picker";

const monthLabel = (): string | null =>
  document.querySelector(".dp-ui__menu-button--month .dp-ui__menu-button-label")
    ?.textContent ?? null;

describe("DatepickerUI", () => {
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

  describe("§12.1 repeated open/close cycles", () => {
    it("emits confirm once after several open/close cycles", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        calendar: { locale: "en-US" },
      });
      p.create();
      const spy = vi.fn();
      p.on("confirm", spy);

      for (let i = 0; i < 3; i++) {
        p.open();
        await flush();
        p.close();
        await flush();
      }
      p.open();
      await flush();
      clickDate("2026-10-20");
      clickConfirm();
      await flush();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(surfaces()).toHaveLength(0);
    });
  });

  describe("§12.2 closeOnCancel false", () => {
    it("keeps the picker open after Cancel and emits close once on a later close", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        behavior: { closeOnCancel: false },
      });
      p.create();
      const cancel = vi.fn();
      const close = vi.fn();
      p.on("cancel", cancel);
      p.on("close", close);

      p.open();
      await flush();
      clickCancel();
      await flush();

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(surfaces()).toHaveLength(1);
      expect(close).not.toHaveBeenCalled();

      p.close();
      await flush();

      expect(close).toHaveBeenCalledTimes(1);
      expect(surfaces()).toHaveLength(0);
    });
  });

  describe("§12.5 / §12.6 value round trip", () => {
    it("setValue is read back by getValue and shown as selected on every open", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
      });
      p.create();

      p.setValue("2026-03-04");
      const value = p.getValue() as DateValue | null;
      expect(value?.value).toBe("2026-03-04");
      expect(value?.date.getDate()).toBe(4);
      expect(value?.date.getMonth()).toBe(2);

      p.open();
      await flush();
      expect(selectedCell()?.dataset.date).toBe("2026-03-04");
      p.close();
      await flush();

      p.open();
      await flush();
      expect(selectedCell()?.dataset.date).toBe("2026-03-04");
    });

    it("setValue(null) clears the value and getValue returns null", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      p.setValue("2026-03-04");
      p.setValue(null);
      expect(p.getValue()).toBeNull();
    });

    it("setValue does not dispatch input or change events", () => {
      const input = mountInput();
      const p = new DatepickerUI(input);
      p.create();
      const spy = vi.fn();
      input.addEventListener("input", spy);
      input.addEventListener("change", spy);
      p.setValue("2026-03-04");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("§12.3 navigation after a quick close", () => {
    it("next-month still advances after close right after navigating", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        calendar: { locale: "en-US" },
      });
      p.create();

      p.open();
      await flush();
      clickSelector(".dp-ui__icon-button--next-month");
      p.close();
      await flush();

      p.open();
      await flush();
      expect(monthLabel()).toBe("Oct");
      clickSelector(".dp-ui__icon-button--next-month");
      await flush();
      expect(monthLabel()).toBe("Nov");
    });
  });

  describe("§12.3b month menu left open", () => {
    it("reopens on the days panel with working arrows", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "docked" },
        calendar: { locale: "en-US" },
      });
      p.create();

      p.open();
      await flush();
      clickSelector(".dp-ui__menu-button--month");
      await flush();
      expect(surface()).toHaveClass("dp-ui__container--menu-open");
      p.close();
      await flush();

      p.open();
      await flush();
      expect(surface()).not.toHaveClass("dp-ui__container--menu-open");
      expect(
        document.querySelector('.dp-ui__pager[data-panel="days"]'),
      ).not.toBeNull();
      clickSelector(".dp-ui__icon-button--next-month");
      await flush();
      expect(monthLabel()).toBe("Nov");
    });
  });

  describe("§12.9 modal focus", () => {
    it("opens a dialog and focuses the today cell without a value", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "modal" },
      });
      p.create();
      p.open();
      await flush();

      const dialog = document.querySelector<HTMLDialogElement>(
        "dialog.dp-ui__dialog",
      );
      expect(dialog).not.toBeNull();
      expect(dialog?.open).toBe(true);
      expect(document.activeElement).toBe(
        document.querySelector("td.dp-ui__date--today"),
      );
    });

    it("focuses the selected cell when there is a value", async () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode: "modal" },
      });
      p.create();
      p.setValue("2026-10-05");
      p.open();
      await flush();

      expect(document.activeElement).toBe(selectedCell());
      expect(selectedCell()?.dataset.date).toBe("2026-10-05");
    });
  });

  describe("§12.10 inline", () => {
    it("renders the grid right after create()", () => {
      const container = document.createElement("div");
      container.id = "inline-host";
      document.body.appendChild(container);

      const p = new DatepickerUI(mountInput(), {
        ui: { inline: { enabled: true, container: "#inline-host" } },
      });
      p.create();

      const inline = container.querySelector(".dp-ui__container--inline");
      expect(inline).not.toBeNull();
      expect(inline?.querySelector("table.dp-ui__month-grid")).not.toBeNull();
    });
  });

  describe("§12.11 two instances", () => {
    const buildHost = (): { host: HTMLElement; toggle: HTMLButtonElement } => {
      const host = document.createElement("div");
      const input = document.createElement("input");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "cal";
      host.append(input, toggle);
      document.body.appendChild(host);
      return { host, toggle };
    };

    it("each toggle opens only its own picker", async () => {
      const a = buildHost();
      const b = buildHost();
      const options = {
        ui: { displayMode: "docked", toggleButton: ".cal" },
      } as const;
      new DatepickerUI(a.host, options).create();
      new DatepickerUI(b.host, options).create();

      b.toggle.click();
      await flush();
      expect(surfaces()).toHaveLength(1);
      expect(b.host.contains(surface())).toBe(true);
      expect(a.host.querySelector(".dp-ui__container")).toBeNull();
    });

    it("destroying A leaves B's host, surface and listeners intact", async () => {
      const a = buildHost();
      const b = buildHost();
      const options = {
        ui: { displayMode: "docked", toggleButton: ".cal" },
      } as const;
      const pa = new DatepickerUI(a.host, options);
      const pb = new DatepickerUI(b.host, options);
      pa.create();
      pb.create();

      pb.open();
      await flush();
      pa.destroy();
      await flush();

      expect(document.body.contains(b.host)).toBe(true);
      expect(b.host.querySelector(".dp-ui__container")).not.toBeNull();

      pb.close();
      await flush();
      b.toggle.click();
      await flush();
      expect(b.host.querySelector(".dp-ui__container")).not.toBeNull();

      a.toggle.click();
      await flush();
      expect(a.host.querySelector(".dp-ui__container")).toBeNull();
    });
  });

  describe("registry", () => {
    it("getById finds an instance whose id contains a quote", () => {
      const p = new DatepickerUI(mountInput(), {
        behavior: { id: 'a"b' },
      });
      p.create();

      expect(p.instanceId).toMatch(/^[\w-]+$/);
      expect(DatepickerUI.getById('a"b')).toBe(p);
      expect(DatepickerUI.getById(p.instanceId)).toBe(p);
    });

    it("getById returns undefined for unknown ids", () => {
      expect(DatepickerUI.getById("nope")).toBeUndefined();
    });

    it("destroyAll destroys every instance and empties the registry", () => {
      const a = new DatepickerUI(mountInput());
      const b = new DatepickerUI(mountInput());
      a.create();
      b.create();
      expect(DatepickerUI.getAllInstances()).toEqual(
        expect.arrayContaining([a, b]),
      );

      DatepickerUI.destroyAll();

      expect(DatepickerUI.getAllInstances()).toEqual([]);
      expect(a.isDestroyed).toBe(true);
      expect(b.isDestroyed).toBe(true);
    });
  });

  describe("subscriptions", () => {
    it("on() returns an unsubscribe function", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      const spy = vi.fn();
      const unsubscribe = p.on("update", spy);

      p.setOptions({ ui: { theme: "m2" } });
      unsubscribe();
      p.setOptions({ ui: { theme: "basic" } });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("once() fires a single time", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      const spy = vi.fn();
      p.once("update", spy);

      p.setOptions({ ui: { theme: "m2" } });
      p.setOptions({ ui: { theme: "basic" } });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("off(event, handler) removes only that handler", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      const removed = vi.fn();
      const kept = vi.fn();
      p.on("update", removed);
      p.on("update", kept);

      p.off("update", removed);
      p.setOptions({ ui: { theme: "m2" } });

      expect(removed).not.toHaveBeenCalled();
      expect(kept).toHaveBeenCalledTimes(1);
    });

    it("off(event) removes every handler of the event", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      const first = vi.fn();
      const second = vi.fn();
      p.on("update", first);
      p.once("update", second);

      p.off("update");
      p.setOptions({ ui: { theme: "m2" } });

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });

    it("on() and once() after destroy return a no-op and never fire", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      p.destroy();
      const onSpy = vi.fn();
      const onceSpy = vi.fn();

      const offOn = p.on("update", onSpy);
      const offOnce = p.once("update", onceSpy);
      p.setOptions({ ui: { theme: "m2" } });

      expect(typeof offOn).toBe("function");
      expect(typeof offOnce).toBe("function");
      expect(() => {
        offOn();
        offOnce();
      }).not.toThrow();
      expect(onSpy).not.toHaveBeenCalled();
      expect(onceSpy).not.toHaveBeenCalled();
    });

    it("off() after destroy does not throw", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      p.destroy();

      expect(() => {
        p.off("update");
        p.off("update", () => {});
      }).not.toThrow();
    });
  });

  describe("read-only getters", () => {
    it("reflect the lifecycle", () => {
      const p = new DatepickerUI(mountInput());
      expect(p.isInitialized).toBe(false);
      expect(p.isDestroyed).toBe(false);

      p.create();
      expect(p.isInitialized).toBe(true);
      expect(p.isDestroyed).toBe(false);

      p.destroy();
      expect(p.isDestroyed).toBe(true);
    });

    it("instanceId is unique per instance and follows behavior.id", () => {
      const a = new DatepickerUI(mountInput());
      const b = new DatepickerUI(mountInput());
      const named = new DatepickerUI(mountInput(), {
        behavior: { id: "my-picker" },
      });

      expect(a.instanceId).not.toBe(b.instanceId);
      expect(named.instanceId).toBe("my-picker");
      expect(DatepickerUI.getById("my-picker")).toBe(named);
    });

    it("options returns the raw options and follows setOptions", () => {
      const p = new DatepickerUI(mountInput(), {
        ui: { theme: "crane" },
        calendar: { locale: "en-US" },
      });
      p.create();
      expect(p.options.ui?.theme).toBe("crane");
      expect(p.options.calendar?.locale).toBe("en-US");

      p.setOptions({ ui: { theme: "m2" } });

      expect(p.options.ui?.theme).toBe("m2");
      expect(p.options.calendar?.locale).toBe("en-US");
    });

    it("destroy removes only that instance from the registry", () => {
      const a = new DatepickerUI(mountInput());
      const b = new DatepickerUI(mountInput());
      a.create();
      b.create();

      a.destroy();

      const instances = DatepickerUI.getAllInstances();
      expect(instances).toContain(b);
      expect(instances).not.toContain(a);
    });
  });

  describe("invalid calendar.locale", () => {
    it("create() does not throw and emits invalid-option", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { locale: "en_US" },
      });
      const errors: ErrorEventData[] = [];
      p.on("error", (data) => errors.push(data));

      expect(() => {
        p.create();
      }).not.toThrow();

      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe("invalid-option");
      expect(errors[0]?.option).toBe("calendar.locale");
    });

    it("still opens and renders a calendar", async () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { locale: "en_US" },
        ui: { displayMode: "docked" },
      });
      p.create();

      p.open();
      await flush();

      expect(surface()).not.toBeNull();
      expect(monthLabel()).toBe("Oct");
    });

    it("a valid locale emits no error on create()", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { locale: "pl-PL" },
      });
      const errors: ErrorEventData[] = [];
      p.on("error", (data) => errors.push(data));

      p.create();

      expect(errors).toEqual([]);
    });
  });

  describe("destroy on a bare input", () => {
    it("unwraps .dp-ui and restores original attributes and classes", () => {
      const root = document.createElement("div");
      document.body.appendChild(root);
      const input = mountInput(
        {
          id: "when",
          class: "form-control big",
          placeholder: "Pick",
          autocomplete: "off",
        },
        root,
      );
      const before = root.innerHTML;

      const p = new DatepickerUI(input);
      p.create();
      expect(root.querySelector(".dp-ui")).not.toBeNull();
      expect(root.querySelector(".dp-ui")?.contains(input)).toBe(true);

      p.destroy();

      expect(root.querySelector(".dp-ui")).toBeNull();
      expect(input.parentElement).toBe(root);
      expect(root.innerHTML).toBe(before);
      expect(input.className).toBe("form-control big");
      expect(input.getAttribute("placeholder")).toBe("Pick");
    });

    it("keeps the typed text with keepInputValue", () => {
      const input = mountInput();
      const p = new DatepickerUI(input);
      p.create();
      p.setValue("2026-03-04");
      const text = input.value;
      expect(text).not.toBe("");

      p.destroy({ keepInputValue: true });

      expect(input.value).toBe(text);
    });
  });

  describe("selection modes: getValue / setValue", () => {
    const inForm = (
      attrs: Record<string, string> = { name: "when" },
    ): { form: HTMLFormElement; input: HTMLInputElement } => {
      const form = document.createElement("form");
      document.body.appendChild(form);
      return { form, input: mountInput(attrs, form) };
    };

    const hiddenOf = (form: HTMLElement): string | undefined =>
      form.querySelector<HTMLInputElement>('input[type="hidden"]')?.value;

    it("single: getValue is a DateValue, null when empty", () => {
      const p = new DatepickerUI(mountInput());
      p.create();
      expect(p.getValue()).toBeNull();
      p.setValue("2026-10-20");
      expect((p.getValue() as DateValue).value).toBe("2026-10-20");
    });

    it("range: getValue is { start, end } and null while empty", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      expect(p.getValue()).toBeNull();
      p.setValue({ start: "2026-10-20", end: "2026-10-28" });
      const value = p.getValue() as RangeValue;
      expect(value.start.value).toBe("2026-10-20");
      expect(value.start.date.getDate()).toBe(20);
      expect(value.end.value).toBe("2026-10-28");
      p.setValue(null);
      expect(p.getValue()).toBeNull();
    });

    it("multiple: getValue is an ascending DateValue array, null when empty", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { mode: "multiple" },
      });
      p.create();
      expect(p.getValue()).toBeNull();
      p.setValue(["2026-10-20", "2026-10-05"]);
      const value = p.getValue() as DateValue[];
      expect(value.map((item) => item.value)).toEqual([
        "2026-10-05",
        "2026-10-20",
      ]);
    });

    it("range: setValue writes the input text and the hidden form value", () => {
      const { form, input } = inForm();
      const p = new DatepickerUI(input, {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      p.setValue({ start: "2026-10-20", end: "2026-10-28" });

      expect(input.value).toBe("10/20/2026 – 10/28/2026");
      expect(hiddenOf(form)).toBe("2026-10-20/2026-10-28");
    });

    it("range: a single date is rejected with invalid-date and keeps the value", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      const errors: ErrorEventData[] = [];
      p.on("error", (data) => errors.push(data));
      p.setValue({ start: "2026-10-20", end: "2026-10-28" });

      p.setValue("2026-10-20");

      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe("invalid-date");
      const value = p.getValue() as RangeValue;
      expect(value.start.value).toBe("2026-10-20");
      expect(value.end.value).toBe("2026-10-28");
    });

    it("multiple: setValue writes a sorted comma separated hidden value", () => {
      const { form, input } = inForm();
      const p = new DatepickerUI(input, { calendar: { mode: "multiple" } });
      p.create();
      p.setValue(["2026-10-20", "2026-10-05"]);

      expect(hiddenOf(form)).toBe("2026-10-05,2026-10-20");
    });

    it("range: typed text in the host input is parsed on blur", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      const input = p.getElement().querySelector("input");
      expect(input).not.toBeNull();
      if (!input) return;

      input.value = "10/20/2026 – 10/28/2026";
      input.dispatchEvent(new FocusEvent("blur"));

      const value = p.getValue() as RangeValue;
      expect(value.start.value).toBe("2026-10-20");
      expect(value.end.value).toBe("2026-10-28");
      expect(input).not.toHaveAttribute("aria-invalid");
    });

    it("range: a reversed typed range is rejected with aria-invalid", () => {
      const p = new DatepickerUI(mountInput(), {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      const input = p.getElement().querySelector("input");
      expect(input).not.toBeNull();
      if (!input) return;

      input.value = "10/28/2026 – 10/20/2026";
      input.dispatchEvent(new FocusEvent("blur"));

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(p.getValue()).toBeNull();
    });

    it("range: a form reset restores the initial range", async () => {
      const { form, input } = inForm({
        name: "when",
        value: "2026-10-20/2026-10-28",
      });
      const p = new DatepickerUI(input, {
        calendar: { mode: "range", locale: "en-US" },
      });
      p.create();
      expect((p.getValue() as RangeValue).start.value).toBe("2026-10-20");
      p.setValue({ start: "2026-11-02", end: "2026-11-05" });
      expect(hiddenOf(form)).toBe("2026-11-02/2026-11-05");

      form.reset();
      await flush();

      const value = p.getValue() as RangeValue;
      expect(value.start.value).toBe("2026-10-20");
      expect(value.end.value).toBe("2026-10-28");
      expect(hiddenOf(form)).toBe("2026-10-20/2026-10-28");
    });
  });

  describe("selection modes: initialView", () => {
    const panelAfterOpen = async (
      displayMode: "modal" | "docked",
    ): Promise<Panel> => {
      const p = new DatepickerUI(mountInput(), {
        ui: { displayMode, initialView: "input" },
      });
      p.create();
      p.open();
      await flush();
      return (p as unknown as { core: CoreState }).core.panel;
    };

    it("opens a modal single picker on the input panel", async () => {
      expect(await panelAfterOpen("modal")).toBe("input");
    });

    it("keeps a docked single picker on the days panel", async () => {
      expect(await panelAfterOpen("docked")).toBe("days");
    });
  });

  describe("Review Focus 1: picker inside a form", () => {
    const setup = (
      displayMode: "docked" | "modal",
    ): { p: DatepickerUI; input: HTMLInputElement; submit: () => number } => {
      const form = document.createElement("form");
      const submit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      form.addEventListener("submit", submit);
      document.body.appendChild(form);
      const input = mountInput({}, form);
      const p = new DatepickerUI(input, {
        ui: { displayMode },
        calendar: { locale: "en-US" },
      });
      p.create();
      return { p, input, submit: () => submit.mock.calls.length };
    };

    it.each(["docked", "modal"] as const)(
      "%s: prev, next, cancel, confirm never submit the form",
      async (mode) => {
        const { p, submit } = setup(mode);

        p.open();
        await flush();
        const buttons = document.querySelectorAll<HTMLButtonElement>(
          ".dp-ui__container button",
        );
        expect(buttons.length).toBeGreaterThan(0);
        for (const button of buttons) {
          expect(button.type).toBe("button");
        }

        clickSelector(".dp-ui__icon-button--prev-month");
        clickSelector(".dp-ui__icon-button--next-month");
        await flush();
        clickCancel();
        await flush();

        p.open();
        await flush();
        clickDate("2026-10-20");
        clickConfirm();
        await flush();

        expect(submit()).toBe(0);
      },
    );

    it("pressing Enter in the input while open does not submit", async () => {
      const { p, input, submit } = setup("docked");
      p.open();
      await flush();

      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      await flush();

      expect(event.defaultPrevented).toBe(true);
      expect(submit()).toBe(0);
    });
  });
});
