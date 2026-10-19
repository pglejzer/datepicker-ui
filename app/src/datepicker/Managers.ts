import { DisplayManager } from "../managers/DisplayManager";
import { FormManager } from "../managers/FormManager";
import { InputManager } from "../managers/InputManager";
import { ThemeManager } from "../managers/ThemeManager";
import { TriggerManager } from "../managers/TriggerManager";
import { ValidationManager } from "../managers/ValidationManager";
import type { PlainDate, YearMonth } from "../types/date";
import type { RangeEnd, Selection } from "../types/selection";
import type { DatepickerEventMap } from "../types/types";
import type { EventEmitter } from "../utils/EventEmitter";
import type { CoreState } from "./CoreState";
import type {
  CancelReason,
  NavigateSource,
  Panel,
  PickerActions,
} from "../types/internal";
import type { OpenSource } from "./lifecycle/session";

export type LifecycleTarget = PickerActions & {
  open(source: OpenSource, end?: RangeEnd): void;
  applyTyped(selection: Selection): void;
};

class LifecycleRelay implements PickerActions {
  private target: LifecycleTarget | null = null;

  readonly select = (date: PlainDate): void => {
    this.target?.select(date);
  };

  readonly selectRange = (start: PlainDate, end: PlainDate): void => {
    this.target?.selectRange(start, end);
  };

  readonly typeDraft = (selection: Selection): void => {
    this.target?.typeDraft(selection);
  };

  readonly focusDate = (date: PlainDate): void => {
    this.target?.focusDate(date);
  };

  readonly navigate = (delta: number, source: NavigateSource): void => {
    this.target?.navigate(delta, source);
  };

  readonly page = (direction: -1 | 1, source: NavigateSource): void => {
    this.target?.page(direction, source);
  };

  readonly jumpTo = (view: YearMonth, source: NavigateSource): void => {
    this.target?.jumpTo(view, source);
  };

  readonly showPanel = (panel: Panel): void => {
    this.target?.showPanel(panel);
  };

  readonly confirm = (): void => {
    this.target?.confirm();
  };

  readonly cancel = (reason: CancelReason): void => {
    this.target?.cancel(reason);
  };

  readonly today = (): void => {
    this.target?.today();
  };

  readonly clear = (): void => {
    this.target?.clear();
  };

  readonly open = (source: OpenSource, end?: RangeEnd): void => {
    this.target?.open(source, end);
  };

  readonly typed = (selection: Selection): void => {
    this.target?.applyTyped(selection);
  };

  connect(target: LifecycleTarget | null): void {
    this.target = target;
  }
}

export class Managers {
  readonly validation: ValidationManager;
  readonly theme: ThemeManager;
  readonly display: DisplayManager;
  readonly input: InputManager;
  readonly triggers: TriggerManager;
  readonly form: FormManager;
  private readonly relay = new LifecycleRelay();

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.validation = new ValidationManager(core, emitter);
    this.theme = new ThemeManager(core);
    this.display = new DisplayManager(core, emitter, {
      actions: this.relay,
      rules: this.validation,
      theme: this.theme,
    });
    this.input = new InputManager(core, emitter, {
      rules: this.validation,
      onTyped: this.relay.typed,
    });
    this.triggers = new TriggerManager(core, emitter, {
      open: this.relay.open,
    });
    this.form = new FormManager(core);
  }

  connect(target: LifecycleTarget | null): void {
    this.relay.connect(target);
  }

  destroy(): void {
    this.relay.connect(null);
    this.display.destroy();
    this.triggers.destroy();
    this.input.destroy();
    this.form.restore();
    this.theme.destroy();
    this.validation.destroy();
  }
}
