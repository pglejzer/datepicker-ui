import type { PlainDate } from "../../types/date";
import type { RangeEnd, Selection } from "../../types/selection";
import type {
  DateValue,
  PickerValue,
  PickerValueInput,
} from "../../types/types";
import { formatPeriod, periodISO } from "../../utils/date/period";
import { toDate } from "../../utils/date/plainDate";
import { anchorDate, sameSelection } from "../../utils/selection/model";
import { toPickerValue, toSelection } from "../../utils/selection/value";
import type { LifecycleContext } from "./context";
import { moveFocus } from "./navigation";
import type { SurfaceSession } from "./session";

const RANGE_ENDS: readonly RangeEnd[] = ["start", "end"];

export class ValueController {
  constructor(
    private readonly context: LifecycleContext,
    private readonly session: SurfaceSession,
  ) {}

  readonly describe = (date: PlainDate): DateValue => {
    const { pattern, precision } = this.context.core.options;
    return {
      value: periodISO(date, precision),
      date: toDate(date),
      formatted: formatPeriod(date, pattern, precision),
    };
  };

  get(): PickerValue | null {
    return this.present(this.context.core.value);
  }

  set(input: PickerValueInput | null): void {
    const { core, emitter, managers, status } = this.context;
    if (status.destroyed) {
      return;
    }
    const selection = toSelection(
      input,
      core.options.mode,
      core.options.precision,
    );
    if (selection === null) {
      emitter.emit("error", {
        code: "invalid-date",
        message:
          "setValue() received a value that is not a valid date for calendar.mode",
        input: typeof input === "string" ? input : undefined,
      });
      return;
    }
    core.setValue(selection);
    managers.input.write(selection);
    if (status.created) {
      managers.form.sync();
    }
    this.follow();
    this.validate(selection);
  }

  setActiveEnd(end: RangeEnd): void {
    const { core, status } = this.context;
    const ends: readonly string[] = RANGE_ENDS;
    if (
      status.destroyed ||
      core.options.mode !== "range" ||
      !ends.includes(end)
    ) {
      return;
    }
    core.controlActiveEnd();
    core.setActiveEnd(end);
  }

  applyTyped(selection: Selection): void {
    const { core, emitter, managers } = this.context;
    const changed = !sameSelection(core.value, selection);
    core.setValue(selection);
    managers.form.sync();
    this.follow();
    if (changed) {
      emitter.emit("confirm", {
        value: this.present(selection),
        autoCommit: true,
      });
    }
    this.validate(selection);
  }

  commit(autoCommit: boolean): void {
    const { core, emitter, managers } = this.context;
    const value = core.draft;
    core.setValue(value);
    managers.input.write(value);
    managers.form.sync();
    managers.form.dispatchCommit();
    emitter.emit("confirm", { value: this.present(value), autoCommit });
    this.validate(value);
  }

  private validate(selection: Selection): void {
    const { core, managers } = this.context;
    const { validate } = core.options;
    if (validate === null) {
      return;
    }
    const message = validate(this.present(selection));
    if (message !== null) {
      managers.input.markInvalid(message);
    }
  }

  private present(selection: Selection): PickerValue | null {
    return toPickerValue(selection, this.describe);
  }

  private follow(): void {
    if (!this.session.active) {
      return;
    }
    const { core } = this.context;
    const value = core.value;
    core.setDraft(value);
    const anchor = anchorDate(value);
    if (anchor !== null) {
      moveFocus(this.context, anchor, "api");
    }
  }
}
