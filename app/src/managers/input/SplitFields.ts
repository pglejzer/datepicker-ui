import type { CoreState } from "../../datepicker/CoreState";
import type { PlainDate } from "../../types/date";
import type { DateRules } from "../../types/internal";
import type { RangeEnd, Selection } from "../../types/selection";
import type { DatepickerEventMap, UnavailableReason } from "../../types/types";
import type { EventEmitter } from "../../utils/EventEmitter";
import { maskDateText } from "../../utils/date/mask";
import { formatPeriod } from "../../utils/date/period";
import { compareDates } from "../../utils/date/plainDate";
import { selectionIssue } from "../../utils/selection/constraints";
import { unavailableMessage } from "../../utils/selection/messages";
import { emptySelection } from "../../utils/selection/model";
import { parseSplit } from "../../utils/selection/splitText";
import { parseSelection, parseSerialized } from "../../utils/selection/text";
import { clearField, markField } from "./fieldError";

export interface SplitFieldsDeps {
  readonly rules: DateRules;
  onTyped(selection: Selection): void;
  describe(field: HTMLInputElement, message: string | null): void;
}

export class SplitFields {
  private dirty = false;

  constructor(
    private readonly core: CoreState,
    private readonly emitter: EventEmitter<DatepickerEventMap>,
    private readonly deps: SplitFieldsDeps,
  ) {}

  get end(): HTMLInputElement | null {
    return this.core.options.mode === "range" ? this.core.endInput : null;
  }

  bind(signal: AbortSignal): void {
    const { end } = this;
    if (end === null) return;
    for (const field of [this.core.input, end]) {
      field.addEventListener(
        "blur",
        () => {
          this.commit();
        },
        { signal },
      );
      field.addEventListener(
        "input",
        () => {
          this.dirty = true;
          this.applyMask(field);
        },
        { signal },
      );
      field.addEventListener(
        "keydown",
        (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          this.commit();
        },
        { signal },
      );
    }
  }

  write(selection: Selection): void {
    const { end } = this;
    if (end === null) return;
    const range = selection.mode === "range" ? selection : null;
    this.core.input.value = this.format(range?.start ?? null);
    end.value = this.format(range?.end ?? null);
    this.dirty = false;
    this.clearError();
  }

  readInitial(): Selection {
    const { end } = this;
    const empty = emptySelection("range");
    if (end === null) return empty;
    const start = this.readDate(this.core.input.value);
    const stop = this.readDate(end.value);
    if (start === null || stop === null || compareDates(start, stop) > 0) {
      return empty;
    }
    return { mode: "range", start, end: stop };
  }

  markInvalid(message: string): void {
    const { end } = this;
    if (end === null) return;
    const { input, host } = this.core;
    markField(input, host, message);
    markField(end, host, message);
    this.deps.describe(input, message);
    this.deps.describe(end, message);
    this.emitter.emit("error", { code: "invalid-value", message });
  }

  clearError(): void {
    const { end } = this;
    if (end === null) return;
    const { input, host } = this.core;
    clearField(input, host);
    clearField(end, host);
    this.deps.describe(input, null);
    this.deps.describe(end, null);
  }

  private format(date: PlainDate | null): string {
    if (date === null) return "";
    return formatPeriod(date, this.core.options.pattern, "day");
  }

  private readDate(text: string): PlainDate | null {
    const { pattern } = this.core.options;
    const parsed =
      parseSerialized(text, "single", "day") ??
      parseSelection(text, "single", pattern, "day");
    return parsed?.mode === "single" ? parsed.date : null;
  }

  private applyMask(field: HTMLInputElement): void {
    const { options } = this.core;
    if (!options.mask) return;
    const masked = maskDateText(field.value, options.pattern);
    if (masked === field.value) return;
    field.value = masked;
    field.setSelectionRange(masked.length, masked.length);
  }

  private commit(): void {
    const { end } = this;
    if (end === null || !this.dirty) return;
    const { options, input } = this.core;
    const result = parseSplit(input.value, end.value, options.pattern);
    if (result.kind === "partial") return;
    if (result.kind === "empty") {
      this.settle(emptySelection("range"));
    } else if (result.kind === "invalid") {
      this.fail(result.field, "invalid-date", options.labels.invalidDate);
    } else if (result.kind === "reversed") {
      this.fail("end", "invalid-date", options.labels.invalidRange);
    } else {
      this.commitRange(result.start, result.end);
    }
  }

  private commitRange(start: PlainDate, end: PlainDate): void {
    const { options } = this.core;
    const selection: Selection = { mode: "range", start, end };
    const reasonOf = (date: PlainDate): UnavailableReason | null =>
      this.deps.rules.unavailableReason(date);
    const reason = selectionIssue(selection, options.limits, reasonOf);
    if (reason === null) {
      this.settle(selection);
      return;
    }
    const field: RangeEnd = reasonOf(start) === null ? "end" : "start";
    this.fail(
      field,
      "unavailable-date",
      unavailableMessage(reason, options),
      reason,
    );
  }

  private settle(selection: Selection): void {
    this.write(selection);
    this.deps.onTyped(selection);
  }

  private fail(
    field: RangeEnd,
    code: "invalid-date" | "unavailable-date",
    message: string,
    reason?: UnavailableReason,
  ): void {
    const target = field === "start" ? this.core.input : this.end;
    if (target === null) return;
    this.clearError();
    markField(target, this.core.host, message);
    this.deps.describe(target, message);
    const input = target.value;
    if (reason === undefined) {
      this.emitter.emit("error", { code, message, input });
    } else {
      this.emitter.emit("error", { code, message, input, reason });
    }
  }
}
