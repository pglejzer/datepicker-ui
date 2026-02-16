import { isDocument } from "../utils/node";
import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";

export class EventManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private cleanupHandlers: Array<() => void> = [];

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  handleOpenOnClick(): void {
    const displayMode = this.core.options.ui?.displayMode;
    if (displayMode !== "modal") return;

    const input = this.core.getInput();
    if (!input) return;

    const handler = (): void => {
      if (this.core.isDestroyed) return;
      this.emitShow("modal");
    };

    input.addEventListener("click", handler);
    this.cleanupHandlers.push(() =>
      input.removeEventListener("click", handler)
    );
  }

  handleIconClick(): void {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    const iconSelector = this.core.options.ui?.iconSelector;
    if (!iconSelector) return;

    const icon = document.querySelector(iconSelector);
    if (!icon) return;

    const handler = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (this.core.isDestroyed) return;
      this.emitShow("dropdown");
    };

    icon.addEventListener("click", handler);
    this.cleanupHandlers.push(() => icon.removeEventListener("click", handler));
  }

  handleKeyboardOpen(): void {
    const displayMode = this.core.options.ui?.displayMode;

    if (displayMode === "modal") {
      const input = this.core.getInput();
      if (!input) return;

      const inputHandler = (e: KeyboardEvent): void => {
        if ((e.key === "Enter" || e.key === " ") && !this.core.isDestroyed) {
          e.preventDefault();
          this.emitShow("modal");
        }
      };

      input.addEventListener("keydown", inputHandler);
      this.cleanupHandlers.push(() =>
        input.removeEventListener("keydown", inputHandler)
      );
      return;
    }

    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    const iconSelector = this.core.options.ui?.iconSelector;
    if (!iconSelector) return;

    const icon = document.querySelector(iconSelector);
    if (!icon) return;

    const iconHandler = (e: KeyboardEvent): void => {
      if ((e.key === "Enter" || e.key === " ") && !this.core.isDestroyed) {
        e.preventDefault();
        this.emitShow("dropdown");
      }
    };

    (icon as HTMLElement).addEventListener("keydown", iconHandler);
    this.cleanupHandlers.push(() =>
      (icon as HTMLElement).removeEventListener("keydown", iconHandler)
    );
  }

  private emitShow(displayMode: "modal" | "dropdown"): void {
    this.emitter.emit("show", {
      date: this.core.selectedDate,
      month: this.core.currentMonth,
      year: this.core.currentYear,
      displayMode,
    });
  }

  destroy(): void {
    this.cleanupHandlers.forEach((cleanup) => cleanup());
    this.cleanupHandlers = [];
  }
}
