import type { CoreState } from "./CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { CalendarManager } from "../managers/calendar/CalendarManager";
import { ModalManager } from "../managers/ModalManager";
import { InputManager } from "../managers/InputManager";
import { AnimationManager } from "../managers/AnimationManager";
import { ConfigManager } from "../managers/ConfigManager";
import { ThemeManager } from "../managers/ThemeManager";
import { ValidationManager } from "../managers/ValidationManager";
import { PickerManager } from "../managers/PickerManager";
import { NavigationManager } from "../managers/NavigationManager";
import { EventManager } from "../managers/EventManager";
import { MaskManager } from "../managers/MaskManager";
import { InputToggleManager } from "../managers/InputToggleManager";
import { RangeManager } from "../managers/RangeManager";
import { SwipeManager } from "../managers/swipe";

export class Managers {
  public readonly calendar: CalendarManager;
  public readonly modal: ModalManager;
  public readonly input: InputManager;
  public readonly animation: AnimationManager;
  public readonly config: ConfigManager;
  public readonly theme: ThemeManager;
  public readonly validation: ValidationManager;
  public readonly events: EventManager;
  public readonly picker: PickerManager;
  public readonly navigation: NavigationManager;
  public readonly mask: MaskManager;
  public readonly inputToggle: InputToggleManager;
  public readonly range: RangeManager;
  public readonly swipe: SwipeManager;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.picker = new PickerManager(core, emitter);
    this.navigation = new NavigationManager(core, emitter);
    this.animation = new AnimationManager(core, emitter);
    this.modal = new ModalManager(core, emitter);
    this.swipe = new SwipeManager(core, emitter);
    this.calendar = new CalendarManager(
      core,
      emitter,
      this.picker,
      this.navigation,
      this.animation,
      this.modal,
    );
    this.input = new InputManager(core, emitter);
    this.config = new ConfigManager(core, emitter);
    this.theme = new ThemeManager(core, emitter);
    this.validation = new ValidationManager(core, emitter);
    this.events = new EventManager(core, emitter);
    this.mask = new MaskManager(core, emitter);
    this.inputToggle = new InputToggleManager(core, emitter);
    this.range = new RangeManager(core, emitter);
  }

  destroy(): void {
    this.events.destroy();
    this.animation.destroy();
    this.calendar.destroy();
    this.modal.destroy();
    this.input.destroy();
    this.theme.destroy();
    this.validation.destroy();
    this.config.destroy();
    this.picker.destroy();
    this.navigation.destroy();
    this.mask.destroy();
    this.inputToggle.destroy();
    this.range.destroy();
    this.swipe.destroy();
  }
}
