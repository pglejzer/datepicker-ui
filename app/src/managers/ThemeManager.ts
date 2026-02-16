import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

export class ThemeManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
    this.setInitialClasses();
  }

  private setInitialClasses(): void {
    const { element } = this.core;
    if (!element) return;

    element.classList.add("dp-ui");

    if (this.core.customId) {
      element.dataset.id = this.core.customId;
    }
  }

  setTheme(): void {
    const modal = this.core.getModalElement();
    const wrapper = this.core.getWrapper();
    if (!modal || !wrapper) return;

    const theme = this.core.options.ui.theme;
    if (theme && theme !== "basic") {
      wrapper.classList.add(theme);
    }
  }

  destroy(): void {
    const { element } = this.core;
    if (!element) return;

    element.classList.remove("dp-ui");

    if (this.core.customId) {
      delete element.dataset.id;
    }
  }
}
