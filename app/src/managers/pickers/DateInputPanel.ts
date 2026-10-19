import type { ResolvedOptions } from "@/datepicker/options/types";
import { panelId } from "@/managers/renderers/shellButtons";
import type { DateRules } from "@/types/internal";
import type { PlainDate } from "@/types/date";
import type { Selection, SelectionLimits } from "@/types/selection";
import type { UnavailableReason } from "@/types/types";
import {
  formatDate,
  formatHint,
  hintLetters,
  type FormatPattern,
} from "@/utils/date/format";
import { parseDate } from "@/utils/date/parse";
import { compareDates } from "@/utils/date/plainDate";
import { createElement } from "@/utils/dom";
import { isCompleteSelection } from "@/utils/selection/model";
import { selectionIssue } from "@/utils/selection/constraints";
import { createTextField, type TextField } from "./textField";

export interface DateInputPanelOptions {
  readonly instanceId: string;
  readonly draft: Selection;
  readonly pattern: FormatPattern;
  readonly labels: ResolvedOptions["labels"];
  readonly rules: DateRules;
  readonly limits: SelectionLimits;
  messageFor(reason: UnavailableReason): string;
  onDraft(selection: Selection): void;
  onSubmit(): void;
}

interface ParsedField {
  readonly date: PlainDate | null;
  readonly failed: boolean;
}

function singleDate(s: Selection): PlainDate | null {
  return s.mode === "single" ? s.date : null;
}

function isEmptySelection(s: Selection): boolean {
  if (s.mode === "single") return s.date === null;
  if (s.mode === "range") return s.start === null;
  return s.dates.length === 0;
}

export function createDateInputPanel(
  options: DateInputPanelOptions,
): HTMLDivElement {
  const { instanceId, draft, pattern, labels, rules } = options;
  const panel = createElement("div", "dp-ui__input-panel", {
    "data-panel": "input",
    id: panelId(instanceId, "input"),
  });

  const hint = formatHint(pattern, hintLetters(labels));
  const makeField = (key: string, label: string, date: PlainDate | null) =>
    createTextField({
      id: `${instanceId}-input-${key}`,
      label,
      placeholder: hint,
      hint,
      value: date ? formatDate(date, pattern) : "",
    });

  const isRange = draft.mode === "range";
  const first = makeField(
    isRange ? "start" : "date",
    isRange ? labels.startDateField : labels.dateField,
    draft.mode === "range" ? draft.start : singleDate(draft),
  );
  const second = isRange
    ? makeField("end", labels.endDateField, draft.end)
    : null;
  const fields = second ? [first, second] : [first];

  const parseField = (field: TextField): ParsedField => {
    const text = field.getValue().trim();
    if (text === "") {
      field.setError(null);
      return { date: null, failed: false };
    }
    const date = parseDate(text, pattern);
    if (date === null) {
      field.setError(labels.invalidDate);
      return { date: null, failed: true };
    }
    const reason = rules.unavailableReason(date);
    if (reason !== null) {
      field.setError(options.messageFor(reason));
      return { date: null, failed: true };
    }
    field.setError(null);
    field.setValue(formatDate(date, pattern));
    return { date, failed: false };
  };

  const validate = (): Selection | null => {
    const start = parseField(first);
    if (!second) {
      if (start.failed) return null;
      return { mode: "single", date: start.date };
    }
    const end = parseField(second);
    let endDate = end.date;
    let failed = start.failed || end.failed;
    if (start.date && endDate && compareDates(endDate, start.date) < 0) {
      second.setError(labels.invalidRange);
      endDate = null;
      failed = true;
    }
    if (failed) return null;
    return { mode: "range", start: start.date, end: endDate };
  };

  const isAllowed = (s: Selection): boolean => {
    const issue = selectionIssue(s, options.limits, (date) =>
      rules.unavailableReason(date),
    );
    if (issue === null) return true;
    (second ?? first).setError(options.messageFor(issue));
    return false;
  };

  fields.forEach((field) => {
    field.input.addEventListener("change", () => {
      const selection = validate();
      if (selection && isAllowed(selection)) options.onDraft(selection);
    });
    field.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const selection = validate();
      if (
        selection &&
        isAllowed(selection) &&
        isCompleteSelection(selection) &&
        !isEmptySelection(selection)
      ) {
        options.onDraft(selection);
        options.onSubmit();
      }
    });
  });

  panel.append(...fields.map((field) => field.element));
  return panel;
}
