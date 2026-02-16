import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { UnifiedPickerManager } from "./pickers/UnifiedPickerManager";
import { DropdownPickerManager } from "./pickers/DropdownPickerManager";

export class PickerManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private unifiedPicker: UnifiedPickerManager;
  private dropdownPicker: DropdownPickerManager;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
    this.unifiedPicker = new UnifiedPickerManager(core, emitter);
    this.dropdownPicker = new DropdownPickerManager(core, emitter);
  }

  openMonthPicker(onClose?: () => void): void {
    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      this.unifiedPicker.open(onClose);
    } else {
      this.dropdownPicker.openMonthPicker(onClose);
    }
  }

  closeMonthPicker(callback?: () => void): void {
    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      this.unifiedPicker.close();
      if (callback) callback();
    } else {
      this.dropdownPicker.closeMonthPicker(callback);
    }
  }

  openYearPicker(onClose?: () => void): void {
    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      this.unifiedPicker.open(onClose);
    } else {
      this.dropdownPicker.openYearPicker(onClose);
    }
  }

  closeYearPicker(callback?: () => void): void {
    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      this.unifiedPicker.close();
      if (callback) callback();
    } else {
      this.dropdownPicker.closeYearPicker(callback);
    }
  }

  isUnifiedPickerOpen(): boolean {
    return this.unifiedPicker.isOpen();
  }

  closeUnifiedPicker(): void {
    this.unifiedPicker.close();
  }

  destroy(): void {
    this.unifiedPicker.destroy();
    this.dropdownPicker.destroy();
  }
}
