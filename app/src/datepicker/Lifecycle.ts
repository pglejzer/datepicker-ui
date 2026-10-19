import type { PlainDate, YearMonth } from "../types/date";
import type { DatepickerOptions } from "../types/options";
import type { RangeEnd, Selection } from "../types/selection";
import type {
  DatepickerEventMap,
  PickerValue,
  PickerValueInput,
} from "../types/types";
import type { EventEmitter } from "../utils/EventEmitter";
import type { CoreState } from "./CoreState";
import type {
  CancelReason,
  NavigateSource,
  Panel,
  PickerActions,
} from "../types/internal";
import { PickerActionHandler } from "./lifecycle/actions";
import { CallbackBridge } from "./lifecycle/callbacks";
import type { LifecycleContext, LifecycleStatus } from "./lifecycle/context";
import { InstanceLifecycle } from "./lifecycle/instance";
import { OptionUpdates } from "./lifecycle/options";
import { SurfaceSession } from "./lifecycle/session";
import type { OpenSource } from "./lifecycle/session";
import { TriggerBinding } from "./lifecycle/triggers";
import { ValueController } from "./lifecycle/value";
import type { Managers } from "./Managers";

export class Lifecycle implements PickerActions {
  private readonly status: LifecycleStatus = {
    created: false,
    destroyed: false,
  };
  private readonly session: SurfaceSession;
  private readonly values: ValueController;
  private readonly actions: PickerActionHandler;
  private readonly instance: InstanceLifecycle;
  private readonly updates: OptionUpdates;

  constructor(
    core: CoreState,
    emitter: EventEmitter<DatepickerEventMap>,
    managers: Managers,
  ) {
    const context: LifecycleContext = {
      core,
      emitter,
      managers,
      status: this.status,
    };
    const callbacks = new CallbackBridge(context);
    const triggers = new TriggerBinding(context);
    this.session = new SurfaceSession(context);
    this.values = new ValueController(context, this.session);
    this.actions = new PickerActionHandler(context, this.session, this.values);
    this.instance = new InstanceLifecycle(
      context,
      this.session,
      callbacks,
      triggers,
    );
    this.updates = new OptionUpdates(
      context,
      this.session,
      callbacks,
      triggers,
    );
    managers.connect(this);
  }

  get created(): boolean {
    return this.status.created;
  }

  get destroyed(): boolean {
    return this.status.destroyed;
  }

  create(): void {
    this.instance.create();
  }

  open(source: OpenSource, end?: RangeEnd): void {
    this.session.open(source, end);
  }

  close(): Promise<void> {
    return this.session.close();
  }

  destroy(keepInputValue: boolean): void {
    this.instance.destroy(keepInputValue);
  }

  setOptions(patch: DatepickerOptions): void {
    this.updates.apply(patch);
  }

  getValue(): PickerValue | null {
    return this.values.get();
  }

  setValue(input: PickerValueInput | null): void {
    this.values.set(input);
  }

  setActiveEnd(end: RangeEnd): void {
    this.values.setActiveEnd(end);
  }

  applyTyped(selection: Selection): void {
    this.values.applyTyped(selection);
  }

  select(date: PlainDate): void {
    this.actions.select(date);
  }

  selectRange(start: PlainDate, end: PlainDate): void {
    this.actions.selectRange(start, end);
  }

  typeDraft(selection: Selection): void {
    this.actions.typeDraft(selection);
  }

  focusDate(date: PlainDate): void {
    this.actions.focusDate(date);
  }

  navigate(delta: number, source: NavigateSource): void {
    this.actions.navigate(delta, source);
  }

  page(direction: -1 | 1, source: NavigateSource): void {
    this.actions.page(direction, source);
  }

  jumpTo(view: YearMonth, source: NavigateSource): void {
    this.actions.jumpTo(view, source);
  }

  showPanel(panel: Panel): void {
    this.actions.showPanel(panel);
  }

  confirm(): void {
    this.actions.confirm();
  }

  cancel(reason: CancelReason): void {
    this.actions.cancel(reason);
  }

  today(): void {
    this.actions.today();
  }

  clear(): void {
    this.actions.clear();
  }
}
