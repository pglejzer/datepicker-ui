import type { PlainDate } from "../../types/date";
import type { Selection } from "../../types/selection";
import { normalizePeriod } from "../../utils/date/period";
import {
  isSelectionAllowed,
  selectionIssue,
} from "../../utils/selection/constraints";
import { anchorDate, isDateSelected } from "../../utils/selection/model";
import { draftForEnd, nextEnd, pickDate } from "../../utils/selection/pick";
import type { LifecycleContext } from "./context";
import { moveFocus } from "./navigation";
import type { SurfaceSession } from "./session";
import type { ValueController } from "./value";

export class DateSelector {
  constructor(
    private readonly context: LifecycleContext,
    private readonly session: SurfaceSession,
    private readonly values: ValueController,
  ) {}

  private isOpen(): boolean {
    return this.session.active;
  }

  select(picked: PlainDate): void {
    const { core, managers } = this.context;
    const date = normalizePeriod(picked, core.options.precision);
    const active = core.followsActiveEnd ? core.activeEnd : nextEnd(core.draft);
    if (
      !this.session.active ||
      !managers.validation.isSelectable(date, draftForEnd(core.draft, active))
    ) {
      return;
    }
    moveFocus(this.context, date, "button");
    const next = pickDate(core.draft, date, core.options.limits, active);
    core.setDraft(next);
    core.setActiveEnd(nextEnd(next));
    this.announce(next, date);
    if (this.isOpen()) {
      this.autoCommit(next);
    }
  }

  selectRange(start: PlainDate, end: PlainDate): void {
    const { core, managers } = this.context;
    const { mode, limits } = core.options;
    if (!this.session.active || mode !== "range") {
      return;
    }
    const next: Selection = { mode: "range", start, end };
    const issue = selectionIssue(next, limits, (date) =>
      managers.validation.unavailableReason(date),
    );
    if (issue !== null) {
      return;
    }
    core.setDraft(next);
    core.setActiveEnd("start");
    moveFocus(this.context, start, "api");
    this.emitRangeEnd(start, end);
    if (this.isOpen()) {
      this.autoCommit(next);
    }
  }

  typeDraft(selection: Selection): void {
    const { core, managers } = this.context;
    const { mode, limits } = core.options;
    const allowed =
      selection.mode === mode &&
      isSelectionAllowed(selection, limits, (date) =>
        managers.validation.isDisabled(date),
      );
    if (!this.session.active || !allowed) {
      return;
    }
    core.setDraft(selection);
    const anchor = anchorDate(selection);
    if (anchor !== null) {
      moveFocus(this.context, anchor, "api");
    }
  }

  private announce(next: Selection, date: PlainDate): void {
    const { emitter } = this.context;
    const { describe } = this.values;
    emitter.emit("select:day", {
      value: describe(date),
      selected: isDateSelected(next, date),
    });
    if (next.mode !== "range") {
      return;
    }
    if (next.start === null || next.end === null) {
      emitter.emit("range:start", { value: describe(date) });
      return;
    }
    this.emitRangeEnd(next.start, next.end);
  }

  private emitRangeEnd(start: PlainDate, end: PlainDate): void {
    const { describe } = this.values;
    this.context.emitter.emit("range:end", {
      start: describe(start),
      end: describe(end),
    });
  }

  private autoCommit(next: Selection): void {
    if (next.mode === "range" && next.end === null) {
      return;
    }
    const { closeOnSelect, commitOnChange } =
      this.context.core.options.behavior;
    const closes = closeOnSelect && next.mode !== "multiple";
    if (closes || commitOnChange) {
      this.values.commit(true);
    }
    if (closes) {
      void this.session.close();
    }
  }
}
