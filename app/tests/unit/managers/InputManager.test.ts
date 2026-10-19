import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoreState } from "@/datepicker/CoreState";
import { InputManager } from "@/managers/InputManager";
import { ValidationManager } from "@/managers/ValidationManager";
import type { PlainDate } from "@/types/date";
import type { DatepickerOptions } from "@/types/options";
import type { Selection } from "@/types/selection";
import type { DatepickerEventMap, ErrorEventData } from "@/types/types";
import { EventEmitter } from "@/utils/EventEmitter";
import { cleanupDom } from "../../helpers/picker";
import { oct } from "../../helpers/selection";

const OCT_20: PlainDate = { year: 2026, month: 10, day: 20 };

const single = (date: PlainDate | null): Selection => ({
  mode: "single",
  date,
});
const range = (start: PlainDate | null, end: PlainDate | null): Selection => ({
  mode: "range",
  start,
  end,
});

interface SetupExtras {
  describedBy?: string;
  withEnd?: boolean;
  bind?: boolean;
}

const setup = (
  options: DatepickerOptions = {},
  initialValue = "",
  extras: SetupExtras = {},
) => {
  const host = document.createElement("div");
  host.className = "dp-ui";
  const input = document.createElement("input");
  input.type = "text";
  input.value = initialValue;
  if (extras.describedBy !== undefined) {
    input.setAttribute("aria-describedby", extras.describedBy);
  }
  host.appendChild(input);
  document.body.appendChild(host);
  const core = new CoreState(input, host, false, {
    ...options,
    calendar: { locale: "en-US", ...options.calendar },
    ui: { format: "dd/MM/yyyy", ...options.ui },
  });
  const end = document.createElement("input");
  end.type = "text";
  if (extras.withEnd === true) {
    host.appendChild(end);
    core.setEndInput(end);
  }
  const emitter = new EventEmitter<DatepickerEventMap>();
  const onTyped = vi.fn<(selection: Selection) => void>();
  const manager = new InputManager(core, emitter, {
    rules: new ValidationManager(core, emitter),
    onTyped,
  });
  const controller = new AbortController();
  if (extras.bind !== false) manager.bind(controller.signal);
  const errors: ErrorEventData[] = [];
  emitter.on("error", (data) => errors.push(data));
  return { core, host, input, end, manager, onTyped, errors, controller };
};

const type = (input: HTMLInputElement, text: string): void => {
  input.value = text;
};

const blur = (input: HTMLInputElement): void => {
  input.dispatchEvent(new FocusEvent("blur"));
};

const pressEnter = (input: HTMLInputElement): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  return event;
};

describe("InputManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanupDom();
  });

  describe("invalid and unavailable text", () => {
    it("flags an impossible date on blur and keeps the value", () => {
      const { core, host, input, errors, onTyped } = setup();
      core.setValue(single(OCT_20));
      type(input, "31/02/2026");
      blur(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(host).toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(true);
      expect(input.validationMessage).toBe("Enter a valid date");
      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe("invalid-date");
      expect(errors[0]?.input).toBe("31/02/2026");
      expect(core.value).toEqual(single(OCT_20));
      expect(onTyped).not.toHaveBeenCalled();
    });

    it("reports a date before minDate as unavailable-date", () => {
      const { input, errors, onTyped } = setup({
        calendar: { minDate: "2026-10-01" },
      });
      type(input, "30/09/2026");
      blur(input);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        code: "unavailable-date",
        reason: "min",
        message: "Enter a date on or after 01/10/2026",
        input: "30/09/2026",
      });
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.validationMessage).toBe(
        "Enter a date on or after 01/10/2026",
      );
      expect(onTyped).not.toHaveBeenCalled();
    });

    it("reports a date after maxDate with the afterMaxDate message", () => {
      const { input, errors } = setup({ calendar: { maxDate: "2026-10-31" } });
      type(input, "01/11/2026");
      blur(input);
      expect(errors[0]?.reason).toBe("max");
      expect(input.validationMessage).toBe(
        "Enter a date on or before 31/10/2026",
      );
    });

    it("keeps the generic message for a disabled date", () => {
      const { input, errors } = setup({
        calendar: { disabledDates: ["2026-10-24"] },
      });
      type(input, "24/10/2026");
      blur(input);
      expect(errors[0]?.reason).toBe("disabled");
      expect(input.validationMessage).toBe("This date is not available");
    });

    it("clears the error state once valid text is entered", () => {
      const { host, input, onTyped } = setup();
      type(input, "31/02/2026");
      blur(input);
      type(input, "05/03/2026");
      blur(input);
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(host).not.toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(false);
      expect(onTyped).toHaveBeenCalledWith(
        single({ year: 2026, month: 3, day: 5 }),
      );
    });

    it("write(empty) clears the error state", () => {
      const { host, input, manager } = setup();
      type(input, "abc");
      blur(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      manager.write(single(null));
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(host).not.toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(false);
      expect(input.value).toBe("");
    });
  });

  describe("valid text", () => {
    it("normalises the text, calls onTyped and prevents the Enter default", () => {
      const { input, onTyped } = setup();
      type(input, "4-3-2026");
      const event = pressEnter(input);
      expect(input.value).toBe("04/03/2026");
      expect(onTyped).toHaveBeenCalledTimes(1);
      expect(onTyped).toHaveBeenCalledWith(
        single({ year: 2026, month: 3, day: 4 }),
      );
      expect(event.defaultPrevented).toBe(true);
    });

    it("prevents the Enter default even when the text is invalid", () => {
      const { input } = setup();
      type(input, "nonsense");
      expect(pressEnter(input).defaultPrevented).toBe(true);
    });

    it("calls onTyped with an empty selection for empty text", () => {
      const { input, onTyped, errors } = setup();
      type(input, "   ");
      blur(input);
      expect(onTyped).toHaveBeenCalledWith(single(null));
      expect(errors).toHaveLength(0);
    });
  });

  describe("range mode", () => {
    const rangeSetup = (initialText = "", options: DatepickerOptions = {}) =>
      setup(
        { ...options, calendar: { mode: "range", ...options.calendar } },
        initialText,
      );

    it("parses a typed range on blur and normalises the text", () => {
      const { input, onTyped, errors } = rangeSetup();
      type(input, "20/10/2026 - 28/10/2026");
      blur(input);
      expect(errors).toHaveLength(0);
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(input.value).toBe("20/10/2026 – 28/10/2026");
      expect(onTyped).toHaveBeenCalledWith(range(oct(20), oct(28)));
    });

    it("rejects a reversed range with aria-invalid and keeps the value", () => {
      const { core, host, input, errors, onTyped } = rangeSetup();
      core.setValue(range(oct(1), oct(2)));
      type(input, "28/10/2026 – 20/10/2026");
      blur(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(host).toHaveClass("dp-ui--error");
      expect(errors).toHaveLength(1);
      expect(onTyped).not.toHaveBeenCalled();
      expect(core.value).toEqual(range(oct(1), oct(2)));
    });

    it("reports a range containing a disabled day as unavailable-date", () => {
      const { input, errors, onTyped } = rangeSetup("", {
        calendar: { disabledDates: ["2026-10-24"] },
      });
      type(input, "20/10/2026 – 28/10/2026");
      blur(input);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.code).toBe("unavailable-date");
      expect(errors[0]?.reason).toBe("disabled");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(onTyped).not.toHaveBeenCalled();
    });

    it("write formats both ends joined by the en dash separator", () => {
      const { input, manager } = rangeSetup();
      manager.write(range(oct(20), oct(28)));
      expect(input.value).toBe("20/10/2026 – 28/10/2026");
    });

    it("readInitial reads the serialized form and the typed form", () => {
      expect(rangeSetup("2026-10-20/2026-10-28").manager.readInitial()).toEqual(
        range(oct(20), oct(28)),
      );
      expect(
        rangeSetup("20/10/2026 – 28/10/2026").manager.readInitial(),
      ).toEqual(range(oct(20), oct(28)));
    });
  });

  describe("multiple mode", () => {
    it("parses typed dates sorted and unique", () => {
      const { input, onTyped } = setup({ calendar: { mode: "multiple" } });
      type(input, "20/10/2026, 05/10/2026");
      blur(input);
      expect(onTyped).toHaveBeenCalledWith({
        mode: "multiple",
        dates: [oct(5), oct(20)],
      });
    });
  });

  describe("mask", () => {
    const typeAndInput = (input: HTMLInputElement, text: string): void => {
      input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    it("formats typed digits and parks the caret at the end", () => {
      const { input } = setup({ ui: { mask: true } });
      typeAndInput(input, "17102026");
      expect(input.value).toBe("17/10/2026");
      expect(input.selectionStart).toBe(10);
      expect(input.selectionEnd).toBe(10);
    });

    it("leaves the text alone when ui.mask is false", () => {
      const { input } = setup({ ui: { mask: false } });
      typeAndInput(input, "17102026");
      expect(input.value).toBe("17102026");
    });

    it("leaves the text alone in range mode even with ui.mask", () => {
      const { input } = setup({
        ui: { mask: true },
        calendar: { mode: "range" },
      });
      typeAndInput(input, "17102026");
      expect(input.value).toBe("17102026");
    });
  });

  describe("evaluate", () => {
    it("classifies text", () => {
      const { manager } = setup({ calendar: { minDate: "2026-10-01" } });
      expect(manager.evaluate("")).toEqual({ kind: "empty" });
      expect(manager.evaluate("31/02/2026")).toEqual({ kind: "invalid" });
      expect(manager.evaluate("20/10/2026")).toEqual({
        kind: "valid",
        selection: single(OCT_20),
      });
      expect(manager.evaluate("01/09/2026")).toEqual({
        kind: "unavailable",
        selection: single({ year: 2026, month: 9, day: 1 }),
        reason: "min",
      });
    });
  });

  describe("markInvalid", () => {
    it("flags the input with a custom message and emits invalid-value", () => {
      const { host, input, manager, errors } = setup();
      manager.markInvalid("x");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(host).toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(true);
      expect(input.validationMessage).toBe("x");
      expect(errors).toEqual([{ code: "invalid-value", message: "x" }]);
    });

    it("is cleared by a later valid write", () => {
      const { host, input, manager } = setup();
      manager.markInvalid("x");
      manager.write(single(OCT_20));
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(host).not.toHaveClass("dp-ui--error");
      expect(input.validationMessage).toBe("");
    });

    it("is cleared by destroy", () => {
      const { host, input, manager } = setup();
      manager.markInvalid("x");
      manager.destroy();
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(host).not.toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(false);
    });
  });

  describe("write and readInitial", () => {
    it("writes the formatted date and clears with an empty selection", () => {
      const { input, manager } = setup();
      manager.write(single({ year: 2026, month: 3, day: 4 }));
      expect(input.value).toBe("04/03/2026");
      manager.write(single(null));
      expect(input.value).toBe("");
    });

    it("reads an ISO value first, then the pattern", () => {
      expect(setup({}, "2026-10-20").manager.readInitial()).toEqual(
        single(OCT_20),
      );
      expect(setup({}, "20/10/2026").manager.readInitial()).toEqual(
        single(OCT_20),
      );
      expect(setup({}, "").manager.readInitial()).toEqual(single(null));
    });
  });

  describe("field description", () => {
    const descriptionOf = (field: HTMLInputElement): HTMLElement => {
      const id = field.getAttribute("aria-describedby")?.split(" ").pop();
      const element = id ? document.getElementById(id) : null;
      if (!element) throw new Error("The field has no description");
      return element;
    };
    const liveOf = (description: HTMLElement): HTMLElement => {
      const live = description.querySelector<HTMLElement>("[aria-live]");
      if (!live) throw new Error("No live span");
      return live;
    };

    it("describes the page input with the format hint after bind", () => {
      const { host, input } = setup();
      const description = descriptionOf(input);
      expect(description.parentElement).toBe(host);
      expect(description).toHaveClass("dp-ui__visually-hidden");
      expect(description).toHaveTextContent("dd/mm/yyyy");
      expect(liveOf(description).textContent).toBe("");
    });

    it("touches no DOM before bind", () => {
      const { host, input } = setup({}, "", { bind: false });
      expect(input).not.toHaveAttribute("aria-describedby");
      expect(host.querySelector(".dp-ui__visually-hidden")).toBeNull();
    });

    it("puts invalidDate in the live span on an invalid blur", () => {
      const { core, input } = setup();
      type(input, "31/02/2026");
      blur(input);
      expect(liveOf(descriptionOf(input))).toHaveTextContent(
        core.options.labels.invalidDate,
      );
    });

    it("clears the live span after a later valid commit", () => {
      const { input } = setup();
      type(input, "31/02/2026");
      blur(input);
      type(input, "05/03/2026");
      blur(input);
      expect(liveOf(descriptionOf(input)).textContent).toBe("");
      expect(descriptionOf(input)).toHaveTextContent("dd/mm/yyyy");
    });

    it("puts the unavailable message in the live span", () => {
      const { input } = setup({ calendar: { minDate: "2026-10-01" } });
      type(input, "30/09/2026");
      blur(input);
      expect(liveOf(descriptionOf(input))).toHaveTextContent(
        "Enter a date on or after 01/10/2026",
      );
    });

    it("describes a markInvalid message and clears it on write", () => {
      const { input, manager } = setup();
      manager.markInvalid("Custom problem");
      expect(liveOf(descriptionOf(input))).toHaveTextContent("Custom problem");
      manager.write(single(OCT_20));
      expect(liveOf(descriptionOf(input)).textContent).toBe("");
    });

    it("updates the hint after setOptions changes the format", () => {
      const { core, input } = setup();
      core.setOptions({ ui: { format: "MM/dd/yyyy" } });
      expect(descriptionOf(input)).toHaveTextContent("mm/dd/yyyy");
    });

    it("uses the localized hint letters", () => {
      const { input } = setup({
        ui: { format: "dd.MM.yyyy" },
        labels: { hintDay: "dd", hintMonth: "mm", hintYear: "rrrr" },
      });
      expect(descriptionOf(input)).toHaveTextContent("dd.mm.rrrr");
    });

    it("updates the hint after setOptions changes the hint labels", () => {
      const { core, input } = setup({
        ui: { format: "dd.MM.yyyy" },
        labels: { hintYear: "rrrr" },
      });
      core.setOptions({ labels: { hintYear: "jjjj" } });
      expect(descriptionOf(input)).toHaveTextContent("dd.mm.jjjj");
    });

    it("gives mm/yyyy at month precision", () => {
      const { input } = setup({ calendar: { precision: "month" } });
      expect(descriptionOf(input)).toHaveTextContent("mm/yyyy");
    });

    it("gives yyyy at year precision", () => {
      const { input } = setup({ calendar: { precision: "year" } });
      expect(descriptionOf(input).textContent.trim()).toBe("yyyy");
    });

    it("keeps the ids the page set next to the description", () => {
      const { input } = setup({}, "", { describedBy: "help" });
      const tokens = input.getAttribute("aria-describedby")?.split(" ");
      expect(tokens).toHaveLength(2);
      expect(tokens?.[0]).toBe("help");
    });

    describe("with ui.endInput", () => {
      const rangeSetup = () =>
        setup({ calendar: { mode: "range" } }, "", { withEnd: true });

      it("describes both fields with different ids", () => {
        const { input, end } = rangeSetup();
        const first = descriptionOf(input);
        const second = descriptionOf(end);
        expect(first).not.toBe(second);
        expect(first).toHaveTextContent("dd/mm/yyyy");
        expect(second).toHaveTextContent("dd/mm/yyyy");
      });

      it("puts the error on the failing field only", () => {
        const { input, end } = rangeSetup();
        input.value = "20/10/2026";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        end.value = "31/02/2026";
        end.dispatchEvent(new Event("input", { bubbles: true }));
        blur(end);
        expect(liveOf(descriptionOf(end))).toHaveTextContent(
          "Enter a valid date",
        );
        expect(liveOf(descriptionOf(input)).textContent).toBe("");
      });

      it("clears the error once the range is valid", () => {
        const { input, end } = rangeSetup();
        input.value = "20/10/2026";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        end.value = "31/02/2026";
        end.dispatchEvent(new Event("input", { bubbles: true }));
        blur(end);
        end.value = "28/10/2026";
        end.dispatchEvent(new Event("input", { bubbles: true }));
        blur(end);
        expect(liveOf(descriptionOf(end)).textContent).toBe("");
      });

      it("restores both fields on destroy", () => {
        const { input, end, manager } = setup(
          { calendar: { mode: "range" } },
          "",
          { withEnd: true, describedBy: "help" },
        );
        manager.destroy();
        expect(input).toHaveAttribute("aria-describedby", "help");
        expect(end).not.toHaveAttribute("aria-describedby");
        expect(document.querySelector(".dp-ui__visually-hidden")).toBeNull();
      });
    });

    it("restores aria-describedby on destroy when the page set none", () => {
      const { input, manager } = setup();
      manager.destroy();
      expect(input).not.toHaveAttribute("aria-describedby");
      expect(document.querySelector(".dp-ui__visually-hidden")).toBeNull();
    });

    it("restores the page's own ids on destroy", () => {
      const { input, manager } = setup({}, "", { describedBy: "a b" });
      manager.destroy();
      expect(input).toHaveAttribute("aria-describedby", "a b");
    });
  });

  describe("cleanup", () => {
    it("stops reacting after the signal is aborted", () => {
      const { input, onTyped, controller } = setup();
      controller.abort();
      type(input, "04/03/2026");
      blur(input);
      pressEnter(input);
      expect(onTyped).not.toHaveBeenCalled();
    });

    it("destroy removes the error state", () => {
      const { host, input, manager } = setup();
      type(input, "abc");
      blur(input);
      manager.destroy();
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(host).not.toHaveClass("dp-ui--error");
      expect(input.validity.customError).toBe(false);
    });
  });
});
