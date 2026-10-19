import type { CoreState } from "../datepicker/CoreState";
import type { PlainDate } from "../types/date";
import type { RangeEnd, Selection } from "../types/selection";
import { formatPeriod, periodISO } from "../utils/date/period";
import { emptySelection } from "../utils/selection/model";
import { formatSelection, serializeSelection } from "../utils/selection/text";

const FORM_VALUE_CLASS = "dp-ui__form-value";

interface BoundField {
  readonly input: HTMLInputElement;
  readonly name: string;
  readonly hidden: HTMLInputElement;
  readonly end: RangeEnd | null;
}

export class FormManager {
  private readonly core: CoreState;
  private fields: BoundField[] = [];
  private initial: Selection;

  constructor(core: CoreState) {
    this.core = core;
    this.initial = core.value;
  }

  bind(signal: AbortSignal): void {
    const { input } = this.core;
    this.initial = this.core.value;
    const endInput = this.splitEnd();
    this.bindField(input, endInput === null ? null : "start");
    if (endInput !== null) {
      this.bindField(endInput, "end");
    }
    if (this.fields.length === 0) {
      return;
    }
    input.form?.addEventListener(
      "reset",
      () => {
        setTimeout(() => {
          this.handleReset();
        }, 0);
      },
      { signal },
    );
  }

  sync(): void {
    for (const field of this.fields) {
      field.hidden.value = this.valueOf(field.end);
    }
  }

  dispatchCommit(): void {
    const { input } = this.core;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  restore(): void {
    for (const field of this.fields) {
      field.hidden.remove();
      field.input.setAttribute("name", field.name);
    }
    this.fields = [];
  }

  private splitEnd(): HTMLInputElement | null {
    return this.core.options.mode === "range" ? this.core.endInput : null;
  }

  private bindField(input: HTMLInputElement, end: RangeEnd | null): void {
    const name = input.getAttribute("name");
    if (name === null || name === "") {
      return;
    }
    input.removeAttribute("name");
    this.fields.push({
      input,
      name,
      hidden: this.createHidden(input, name),
      end,
    });
  }

  private valueOf(end: RangeEnd | null): string {
    const { value, options } = this.core;
    if (end === null || value.mode !== "range") {
      return serializeSelection(value, options.precision);
    }
    const date = end === "start" ? value.start : value.end;
    return date === null ? "" : periodISO(date, "day");
  }

  private createHidden(
    input: HTMLInputElement,
    name: string,
  ): HTMLInputElement {
    const hidden = input.ownerDocument.createElement("input");
    hidden.type = "hidden";
    hidden.name = name;
    hidden.classList.add(FORM_VALUE_CLASS);
    input.insertAdjacentElement("afterend", hidden);
    return hidden;
  }

  private writeFields(selection: Selection): void {
    const { core } = this;
    const { pattern, precision } = core.options;
    const endInput = this.splitEnd();
    if (endInput === null || selection.mode !== "range") {
      core.input.value = formatSelection(selection, pattern, precision);
      return;
    }
    const format = (date: PlainDate | null): string =>
      date === null ? "" : formatPeriod(date, pattern, "day");
    core.input.value = format(selection.start);
    endInput.value = format(selection.end);
  }

  private handleReset(): void {
    const { core } = this;
    const { mode } = core.options;
    const initial =
      this.initial.mode === mode ? this.initial : emptySelection(mode);
    core.setValue(initial);
    this.writeFields(initial);
    this.sync();
  }
}
