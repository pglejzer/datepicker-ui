import type { CoreState } from "../datepicker/CoreState";
import type { DateRules } from "../types/internal";
import type { Selection } from "../types/selection";
import type { DatepickerEventMap, UnavailableReason } from "../types/types";
import type { EventEmitter } from "../utils/EventEmitter";
import { maskDateText } from "../utils/date/mask";
import { hintLetters } from "../utils/date/format";
import { periodHint } from "../utils/date/period";
import { selectionIssue } from "../utils/selection/constraints";
import { unavailableMessage } from "../utils/selection/messages";
import { emptySelection, isEmptySelection } from "../utils/selection/model";
import {
  formatSelection,
  parseSelection,
  parseSerialized,
} from "../utils/selection/text";
import { describeField, type FieldDescription } from "./input/fieldDescription";
import { clearField, markField } from "./input/fieldError";
import { SplitFields } from "./input/SplitFields";
import { panelId } from "./renderers/shellButtons";

export type TypedResult =
  | { readonly kind: "empty" }
  | { readonly kind: "valid"; readonly selection: Selection }
  | { readonly kind: "invalid" }
  | {
      readonly kind: "unavailable";
      readonly selection: Selection;
      readonly reason: UnavailableReason;
    };

export interface InputManagerDeps {
  readonly rules: DateRules;
  onTyped(selection: Selection): void;
}

export class InputManager {
  private readonly split: SplitFields;
  private readonly descriptions = new Map<HTMLInputElement, FieldDescription>();

  constructor(
    private readonly core: CoreState,
    private readonly emitter: EventEmitter<DatepickerEventMap>,
    private readonly deps: InputManagerDeps,
  ) {
    this.split = new SplitFields(core, emitter, {
      rules: deps.rules,
      onTyped: (selection) => {
        deps.onTyped(selection);
      },
      describe: (field, message) => {
        this.describe(field, message);
      },
    });
  }

  bind(signal: AbortSignal): void {
    this.describeFields(signal);
    if (this.split.end !== null) {
      this.split.bind(signal);
      return;
    }
    const { input } = this.core;
    input.addEventListener(
      "blur",
      () => {
        this.commit();
      },
      { signal },
    );
    input.addEventListener(
      "input",
      () => {
        this.applyMask();
      },
      { signal },
    );
    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        this.commit();
      },
      { signal },
    );
  }

  write(selection: Selection): void {
    if (this.split.end !== null) {
      this.split.write(selection);
      return;
    }
    this.core.input.value = formatSelection(
      selection,
      this.core.options.pattern,
      this.core.options.precision,
    );
    this.clearError();
  }

  readInitial(): Selection {
    if (this.split.end !== null) {
      return this.split.readInitial();
    }
    const { mode, pattern, precision } = this.core.options;
    const text = this.core.input.value;
    return (
      parseSerialized(text, mode, precision) ??
      parseSelection(text, mode, pattern, precision) ??
      emptySelection(mode)
    );
  }

  evaluate(text: string): TypedResult {
    const { mode, pattern, limits, precision } = this.core.options;
    const selection = parseSelection(text, mode, pattern, precision);
    if (selection === null) return { kind: "invalid" };
    if (isEmptySelection(selection)) return { kind: "empty" };
    const reason = selectionIssue(selection, limits, (date) =>
      this.deps.rules.unavailableReason(date),
    );
    if (reason !== null) return { kind: "unavailable", selection, reason };
    return { kind: "valid", selection };
  }

  markInvalid(message: string): void {
    if (this.split.end !== null) {
      this.split.markInvalid(message);
      return;
    }
    this.showError(message);
    this.emitter.emit("error", { code: "invalid-value", message });
  }

  destroy(): void {
    this.clearError();
    this.split.clearError();
    this.descriptions.forEach((description) => {
      description.destroy();
    });
    this.descriptions.clear();
  }

  private describeFields(signal: AbortSignal): void {
    const { input, host, instanceId } = this.core;
    const { end } = this.split;
    const hint = (): string => {
      const { pattern, precision, labels } = this.core.options;
      return periodHint(pattern, precision, hintLetters(labels));
    };
    const fields: [HTMLInputElement, string][] = [[input, "input-description"]];
    if (end !== null) fields.push([end, "end-input-description"]);
    for (const [field, key] of fields) {
      const id = panelId(instanceId, key);
      this.descriptions.set(field, describeField(field, host, id, hint()));
    }
    this.core.events.on(
      "change:options",
      () => {
        const next = hint();
        this.descriptions.forEach((description) => {
          description.setHint(next);
        });
      },
      signal,
    );
  }

  private describe(field: HTMLInputElement, message: string | null): void {
    this.descriptions.get(field)?.setError(message);
  }

  private applyMask(): void {
    const { input, options } = this.core;
    if (!options.mask || options.mode !== "single") return;
    if (options.precision !== "day") return;
    const masked = maskDateText(input.value, options.pattern);
    if (masked === input.value) return;
    input.value = masked;
    input.setSelectionRange(masked.length, masked.length);
  }

  private commit(): void {
    const text = this.core.input.value;
    const result = this.evaluate(text);
    if (result.kind === "empty") {
      this.clearError();
      this.deps.onTyped(emptySelection(this.core.options.mode));
    } else if (result.kind === "valid") {
      this.write(result.selection);
      this.deps.onTyped(result.selection);
    } else if (result.kind === "invalid") {
      const message = this.core.options.labels.invalidDate;
      this.showError(message);
      this.emitter.emit("error", {
        code: "invalid-date",
        message,
        input: text,
      });
    } else {
      const { reason } = result;
      const message = unavailableMessage(reason, this.core.options);
      this.showError(message);
      this.emitter.emit("error", {
        code: "unavailable-date",
        message,
        input: text,
        reason,
      });
    }
  }

  private showError(message: string): void {
    markField(this.core.input, this.core.host, message);
    this.describe(this.core.input, message);
  }

  private clearError(): void {
    clearField(this.core.input, this.core.host);
    this.describe(this.core.input, null);
  }
}
