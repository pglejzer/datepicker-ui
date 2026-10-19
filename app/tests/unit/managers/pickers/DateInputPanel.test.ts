import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDateInputPanel } from "@/managers/pickers/DateInputPanel";
import { DEFAULT_LABELS } from "@/datepicker/options/defaults";
import type { DateRules } from "@/types/internal";
import type { PlainDate } from "@/types/date";
import type { Selection, SelectionLimits } from "@/types/selection";
import type { UnavailableReason } from "@/types/types";
import { resolvePattern } from "@/utils/date/format";
import { unavailableMessage } from "@/utils/selection/messages";
import { limits, NO_LIMITS, oct } from "../../../helpers/selection";

const pattern = resolvePattern("auto", "en-US");
const labels = DEFAULT_LABELS;

const single = (date: PlainDate | null): Selection => ({
  mode: "single",
  date,
});
const range = (start: PlainDate | null, end: PlainDate | null): Selection => ({
  mode: "range",
  start,
  end,
});

const MIN_DATE = oct(10);

const reasonOf = (
  date: PlainDate,
  disabledDay: number | null,
  minDay: number | null,
): UnavailableReason | null => {
  if (minDay !== null && date.month === 10 && date.day < minDay) return "min";
  return date.day === disabledDay ? "disabled" : null;
};

const makeRules = (
  disabledDay: number | null = null,
  minDay: number | null = null,
): DateRules => ({
  isDisabled: (date) => reasonOf(date, disabledDay, minDay) !== null,
  unavailableReason: (date) => reasonOf(date, disabledDay, minDay),
  isMonthDisabled: () => false,
  yearBounds: () => ({ min: 1900, max: 2100 }),
  isSelectable: () => true,
});

const messageFor = (reason: UnavailableReason): string =>
  unavailableMessage(reason, {
    labels,
    pattern,
    minDate: MIN_DATE,
    maxDate: null,
    precision: "day",
  });

const setup = (
  draft: Selection,
  options: {
    instanceId?: string;
    disabledDay?: number | null;
    minDay?: number | null;
    limits?: SelectionLimits;
    labels?: typeof DEFAULT_LABELS;
  } = {},
) => {
  const onDraft = vi.fn();
  const onSubmit = vi.fn();
  const panel = createDateInputPanel({
    instanceId: options.instanceId ?? "dp-1",
    draft,
    pattern,
    labels: options.labels ?? labels,
    rules: makeRules(options.disabledDay ?? null, options.minDay ?? null),
    limits: options.limits ?? NO_LIMITS,
    messageFor,
    onDraft,
    onSubmit,
  });
  document.body.append(panel);
  const inputs = [
    ...panel.querySelectorAll<HTMLInputElement>(
      "input.dp-ui__text-field-input",
    ),
  ];
  const fields = [...panel.querySelectorAll<HTMLElement>(".dp-ui__text-field")];
  const supporting = [
    ...panel.querySelectorAll<HTMLElement>(".dp-ui__text-field-supporting"),
  ];
  return { panel, inputs, fields, supporting, onDraft, onSubmit };
};

const type = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const enter = (input: HTMLInputElement): void => {
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
};

describe("createDateInputPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the panel root per the DOM contract", () => {
    const { panel } = setup(single(null));
    expect(panel).toHaveClass("dp-ui__input-panel");
    expect(panel).toHaveAttribute("data-panel", "input");
  });

  it("renders one labelled field for a single selection", () => {
    const { panel, inputs } = setup(single(null));
    expect(inputs).toHaveLength(1);
    expect(
      panel.querySelector("label.dp-ui__text-field-label"),
    ).toHaveTextContent("Date");
  });

  it("renders start and end fields for a range", () => {
    const { panel, inputs } = setup(range(null, null));
    expect(inputs).toHaveLength(2);
    const texts = [
      ...panel.querySelectorAll("label.dp-ui__text-field-label"),
    ].map((l) => l.textContent);
    expect(texts).toEqual(["Start date", "End date"]);
  });

  it("prefills the fields from the draft", () => {
    expect(setup(single(oct(20))).inputs[0].value).toBe("10/20/2026");
    const r = setup(range(oct(20), oct(28))).inputs;
    expect(r.map((i) => i.value)).toEqual(["10/20/2026", "10/28/2026"]);
  });

  it("sets placeholder and input attributes", () => {
    const { inputs } = setup(single(null));
    expect(inputs[0]).toHaveAttribute("placeholder", "mm/dd/yyyy");
    expect(inputs[0]).toHaveAttribute("inputmode", "numeric");
    expect(inputs[0]).toHaveAttribute("autocomplete", "off");
    expect(inputs[0]).toHaveAttribute("type", "text");
  });

  it("shows the localized hint letters as placeholder and supporting text", () => {
    const polish = {
      ...DEFAULT_LABELS,
      hintDay: "dd",
      hintMonth: "mm",
      hintYear: "rrrr",
    };
    const { inputs, supporting } = setup(single(null), { labels: polish });
    expect(inputs[0]).toHaveAttribute("placeholder", "mm/dd/rrrr");
    expect(supporting[0]).toHaveTextContent("mm/dd/rrrr");
  });

  it("shows invalidDate for an impossible date and skips onDraft", () => {
    const { inputs, fields, supporting, onDraft } = setup(single(null));
    type(inputs[0], "02/31/2026");
    expect(fields[0]).toHaveClass("dp-ui__text-field--error");
    expect(inputs[0]).toHaveAttribute("aria-invalid", "true");
    expect(supporting[0]).toHaveTextContent(labels.invalidDate);
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("shows unavailableDate for a disabled day", () => {
    const { inputs, fields, supporting, onDraft } = setup(single(null), {
      disabledDay: 21,
    });
    type(inputs[0], "10/21/2026");
    expect(fields[0]).toHaveClass("dp-ui__text-field--error");
    expect(supporting[0]).toHaveTextContent(labels.unavailableDate);
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("shows the beforeMinDate text for a start before minDate", () => {
    const { inputs, fields, supporting, onDraft } = setup(single(null), {
      minDay: 10,
    });
    type(inputs[0], "10/05/2026");
    expect(fields[0]).toHaveClass("dp-ui__text-field--error");
    expect(inputs[0]).toHaveAttribute("aria-invalid", "true");
    expect(supporting[0]).toHaveTextContent(
      "Enter a date on or after 10/10/2026",
    );
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("shows the beforeMinDate text for a range start before minDate", () => {
    const { inputs, fields, supporting, onDraft } = setup(range(null, null), {
      minDay: 10,
    });
    type(inputs[0], "10/05/2026");
    expect(fields[0]).toHaveClass("dp-ui__text-field--error");
    expect(supporting[0]).toHaveTextContent(
      "Enter a date on or after 10/10/2026",
    );
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("shows the range message on the end field when the limits refuse the range", () => {
    const { inputs, fields, supporting, onDraft } = setup(
      range(oct(20), null),
      {
        limits: limits({ maxLength: 3 }),
      },
    );
    type(inputs[1], "10/28/2026");
    expect(fields[1]).toHaveClass("dp-ui__text-field--error");
    expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
    expect(supporting[1]).toHaveTextContent(labels.invalidRange);
    expect(fields[0]).not.toHaveClass("dp-ui__text-field--error");
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("shows invalidRange on the end field when it precedes the start", () => {
    const { inputs, fields, supporting, onDraft } = setup(range(oct(20), null));
    type(inputs[1], "10/15/2026");
    expect(fields[1]).toHaveClass("dp-ui__text-field--error");
    expect(inputs[1]).toHaveAttribute("aria-invalid", "true");
    expect(supporting[1]).toHaveTextContent(labels.invalidRange);
    expect(fields[0]).not.toHaveClass("dp-ui__text-field--error");
    expect(onDraft).not.toHaveBeenCalled();
  });

  it("emits a range draft with only a valid start", () => {
    const { inputs, fields, onDraft } = setup(range(null, null));
    type(inputs[0], "10/20/2026");
    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onDraft).toHaveBeenCalledWith({
      mode: "range",
      start: oct(20),
      end: null,
    });
    expect(fields[0]).not.toHaveClass("dp-ui__text-field--error");
    expect(inputs[0]).not.toHaveAttribute("aria-invalid", "true");
  });

  it("calls onDraft then onSubmit on Enter with a complete valid value", () => {
    const { inputs, onDraft, onSubmit } = setup(single(null));
    inputs[0].value = "10/20/2026";
    enter(inputs[0]);
    expect(onDraft).toHaveBeenCalledWith({ mode: "single", date: oct(20) });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onDraft.mock.invocationCallOrder[0]).toBeLessThan(
      onSubmit.mock.invocationCallOrder[0],
    );
  });

  it("does not submit on Enter with an invalid value", () => {
    const { inputs, fields, supporting, onSubmit } = setup(single(null));
    inputs[0].value = "02/31/2026";
    enter(inputs[0]);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(fields[0]).toHaveClass("dp-ui__text-field--error");
    expect(supporting[0]).toHaveTextContent(labels.invalidDate);
  });

  it("rewrites a parsed value to the normalised text", () => {
    const { inputs } = setup(single(null));
    type(inputs[0], "10/5/2026");
    expect(inputs[0].value).toBe("10/05/2026");
  });

  describe("format hint as supporting text", () => {
    it("shows the hint at start", () => {
      const { supporting } = setup(single(null));
      expect(supporting[0]).toHaveTextContent("mm/dd/yyyy");
    });

    it("shows the hint under both range fields", () => {
      const { supporting } = setup(range(null, null));
      expect(supporting.map((s) => s.textContent)).toEqual([
        "mm/dd/yyyy",
        "mm/dd/yyyy",
      ]);
    });

    it("replaces the hint with the error and brings it back once corrected", () => {
      const { inputs, supporting } = setup(single(null));
      type(inputs[0], "02/31/2026");
      expect(supporting[0]).toHaveTextContent(labels.invalidDate);
      type(inputs[0], "10/20/2026");
      expect(supporting[0].textContent).toBe("mm/dd/yyyy");
      expect(inputs[0]).toHaveAttribute("aria-invalid", "false");
    });

    it("brings the hint back when the field is cleared", () => {
      const { inputs, supporting } = setup(single(null));
      type(inputs[0], "nope");
      type(inputs[0], "");
      expect(supporting[0].textContent).toBe("mm/dd/yyyy");
    });

    it("does not rewrite the text node when the text is unchanged", () => {
      const { inputs, supporting } = setup(single(null));
      const hintNode = supporting[0].firstChild;
      type(inputs[0], "10/20/2026");
      expect(supporting[0].firstChild).toBe(hintNode);

      type(inputs[0], "02/31/2026");
      const errorNode = supporting[0].firstChild;
      expect(errorNode).not.toBe(hintNode);
      type(inputs[0], "02/30/2026");
      expect(supporting[0].firstChild).toBe(errorNode);
    });
  });

  it("keeps ids unique across instances and links labels and hints", () => {
    const a = setup(range(null, null), { instanceId: "dp-a" });
    const b = setup(range(null, null), { instanceId: "dp-b" });
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of [a, b]) {
      p.inputs.forEach((input, i) => {
        const label = p.panel.querySelectorAll("label")[i];
        expect(label).toHaveAttribute("for", input.id);
        expect(input.id).not.toBe("");
        expect(input.getAttribute("aria-describedby")).toBe(p.supporting[i].id);
        expect(p.supporting[i].id).not.toBe("");
      });
    }
  });
});
