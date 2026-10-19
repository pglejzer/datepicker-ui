import type { PlainDate, YearMonth } from "../../types/date";
import type { Selection } from "../../types/selection";
import { addMonths, todayDate } from "../../utils/date/plainDate";
import { homePanel } from "../../utils/surface";
import {
  emptySelection,
  isCompleteSelection,
} from "../../utils/selection/model";
import type {
  CancelReason,
  NavigateSource,
  Panel,
  PickerActions,
} from "../../types/internal";
import type { LifecycleContext } from "./context";
import { moveFocus, showMonth } from "./navigation";
import { DateSelector } from "./selectDate";
import type { SurfaceSession } from "./session";
import type { ValueController } from "./value";

export class PickerActionHandler implements PickerActions {
  private readonly selector: DateSelector;

  constructor(
    private readonly context: LifecycleContext,
    private readonly session: SurfaceSession,
    private readonly values: ValueController,
  ) {
    this.selector = new DateSelector(context, session, values);
  }

  private isOpen(): boolean {
    return this.session.active;
  }

  select(date: PlainDate): void {
    this.selector.select(date);
  }

  selectRange(start: PlainDate, end: PlainDate): void {
    this.selector.selectRange(start, end);
  }

  typeDraft(selection: Selection): void {
    this.selector.typeDraft(selection);
  }

  focusDate(date: PlainDate): void {
    if (this.session.active) {
      moveFocus(this.context, date, "keyboard");
    }
  }

  navigate(delta: number, source: NavigateSource): void {
    if (this.session.active) {
      showMonth(this.context, addMonths(this.context.core.view, delta), source);
    }
  }

  page(direction: -1 | 1, source: NavigateSource): void {
    const { core } = this.context;
    const step = core.options.pageBy === "view" ? core.layout.months : 1;
    this.navigate(direction * step, source);
  }

  jumpTo(view: YearMonth, source: NavigateSource): void {
    if (!this.session.active) {
      return;
    }
    const { core } = this.context;
    const panel = core.panel;
    const shown = showMonth(this.context, view, source);
    if (source !== "menu") {
      return;
    }
    core.setPanel(homePanel(core.options.precision));
    this.announcePick(panel, shown);
  }

  showPanel(panel: Panel): void {
    if (this.session.active) {
      this.context.core.setPanel(panel);
    }
  }

  confirm(): void {
    if (!this.session.active || !isCompleteSelection(this.context.core.draft)) {
      return;
    }
    this.values.commit(false);
    void this.session.close();
  }

  cancel(reason: CancelReason): void {
    if (!this.session.active) {
      return;
    }
    const { core, emitter } = this.context;
    emitter.emit("cancel", { reason });
    if (!this.isOpen()) {
      return;
    }
    const closes = core.options.behavior.closeOnCancel || reason !== "button";
    if (closes && core.mode !== "inline") {
      void this.session.close();
      return;
    }
    core.setDraft(core.value);
  }

  today(): void {
    if (!this.session.active) {
      return;
    }
    const { core, managers } = this.context;
    const date = todayDate();
    if (!managers.validation.isSelectable(date, core.draft)) {
      moveFocus(this.context, date, "button");
      return;
    }
    this.select(date);
  }

  clear(): void {
    if (!this.session.active) {
      return;
    }
    const { core } = this.context;
    core.setDraft(emptySelection(core.options.mode));
    const { clearButton } = core.options;
    if (clearButton === false || !clearButton.clearInput) {
      return;
    }
    this.values.commit(false);
    void this.session.close();
  }

  private announcePick(panel: Panel, view: YearMonth): void {
    const { emitter } = this.context;
    if (panel === "month-menu" || panel === "month-grid") {
      emitter.emit("select:month", { year: view.year, month: view.month });
      return;
    }
    if (panel === "year-menu" || panel === "year-grid") {
      emitter.emit("select:year", { year: view.year });
    }
  }
}
