/**
 * Lifecycle - Mount/Unmount orchestration
 * Manages the lifecycle of all managers
 *
 * Architecture: Orchestrates mount → init → bind → unmount
 * Follows timepicker-ui patterns exactly
 */

import type { CoreState } from "./CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import type { Managers } from "./Managers";
import { isDocument, isNode } from "../utils/node";
import { TIMINGS } from "../constants/timings";

type TypeFunction = () => void;

export class Lifecycle {
  private core: CoreState;
  private managers: Managers;
  private emitter: EventEmitter<DatepickerEventMap>;
  private eventHandlers: Map<string, EventListener> = new Map();

  constructor(
    core: CoreState,
    managers: Managers,
    emitter: EventEmitter<DatepickerEventMap>,
  ) {
    this.core = core;
    this.managers = managers;
    this.emitter = emitter;
  }

  init(): void {
    if (this.core.isDestroyed) return;
    if (this.core.isInitialized) return;

    if (!this.core.options.ui.inline?.enabled) {
      this.managers.events.handleOpenOnClick();
      this.managers.events.handleIconClick();
      this.managers.events.handleKeyboardOpen();
    }

    this.managers.mask.init();

    this.setupCallbackBridge();
    this.core.setIsInitialized(true);
  }

  private setupCallbackBridge(): void {
    const { callbacks } = this.core.options;

    if (callbacks.onOpen) {
      this.emitter.on("open", callbacks.onOpen);
    }
    if (callbacks.onClose) {
      this.emitter.on("close", callbacks.onClose);
    }
    if (callbacks.onCancel) {
      this.emitter.on("cancel", callbacks.onCancel);
    }
    if (callbacks.onConfirm) {
      this.emitter.on("confirm", callbacks.onConfirm);
    }
    if (callbacks.onUpdate) {
      const events: Array<{
        name: keyof DatepickerEventMap;
        type:
          | "update"
          | "confirm"
          | "cancel"
          | "open"
          | "select:day"
          | "select:month"
          | "select:year";
      }> = [
        { name: "update", type: "update" },
        { name: "confirm", type: "confirm" },
        { name: "cancel", type: "cancel" },
        { name: "open", type: "open" },
        { name: "select:day", type: "select:day" },
        { name: "select:month", type: "select:month" },
        { name: "select:year", type: "select:year" },
      ];

      events.forEach(({ name, type }) => {
        this.emitter.on(name, () => {
          callbacks.onUpdate!(
            {
              date: this.core.selectedDate,
              timestamp: Date.now(),
            },
            {
              event: type,
            },
          );
        });
      });
    }
    if (callbacks.onSelectDay) {
      this.emitter.on("select:day", callbacks.onSelectDay);
    }
    if (callbacks.onSelectMonth) {
      this.emitter.on("select:month", callbacks.onSelectMonth);
    }
    if (callbacks.onSelectYear) {
      this.emitter.on("select:year", callbacks.onSelectYear);
    }
    if (callbacks.onError) {
      this.emitter.on("error", callbacks.onError);
    }
    if (callbacks.onRangeStart) {
      this.emitter.on("range:start", callbacks.onRangeStart);
    }
    if (callbacks.onRangeUpdate) {
      this.emitter.on("range:update", callbacks.onRangeUpdate);
    }
    if (callbacks.onRangeEnd) {
      this.emitter.on("range:end", callbacks.onRangeEnd);
    }
    if (callbacks.onRangeCancel) {
      this.emitter.on("range:cancel", callbacks.onRangeCancel);
    }
  }

  mount(): void {
    if (this.core.isDestroyed) return;

    if (!this.core.isInitialized) {
      this.init();
    }

    this.core.resetTempSelection();
    // Range selection temporarily disabled
    // if (this.core.options.ui?.rangeSelection) {
    //   this.core.resetTempRangeSelection();
    // }

    this.eventsBundle();
  }

  private eventsBundle(): void {
    if (this.core.isDestroyed) return;
    if (!this.core.isModalRemove) return;

    if (!this.core.options.ui.inline?.enabled) {
      const input = this.core.getInput();
      if (input) {
        input.classList.add("disabled");
        input.blur();
      }
    }

    this.managers.modal.setScrollbarOrNot();
    this.managers.modal.setModalTemplate();
    this.managers.modal.setNormalizeClass();
    this.managers.modal.removeBackdrop();

    setTimeout(() => {
      this.managers.theme.setTheme();

      const wrapper = this.core.getWrapper();
      if (wrapper && this.core.options.ui.cssClass) {
        wrapper.classList.add(this.core.options.ui.cssClass);
      }
    }, 0);

    this.managers.animation.setAnimationToOpen();

    this.managers.calendar.renderCalendar();
    this.managers.calendar.bindNavigationEvents();
    this.managers.swipe.init();
    this.managers.swipe.bind();
    this.managers.inputToggle.init();
    // Range selection temporarily disabled
    // this.managers.range.init();

    this.bindButtonHandlers();
    this.bindCloseOnSelectHandler();

    if (!this.core.options.ui.inline?.enabled) {
      this.handleEscClick();
      this.handleBackdropClick();
    }

    this.managers.modal.setShowClassToBackdrop();

    this.emitter.emit("open", {
      date: this.core.selectedDate,
      month: this.core.currentMonth,
      year: this.core.currentYear,
    });
  }

  private bindButtonHandlers(): void {
    const okBtn = this.core.getOkButton();
    const cancelBtn = this.core.getCancelButton();

    if (okBtn) {
      const okHandler = (() => {
        if (this.core.options.ui?.rangeSelection) {
          this.core.commitTempRangeSelection();
          const rangeValue = this.core.getRangeValue();

          if (rangeValue) {
            this.emitter.emit("confirm", {
              date: rangeValue.endDate,
              timestamp: Date.now(),
            });
          }
        } else {
          this.core.commitTempSelection();
          const { selectedDate } = this.core;

          if (selectedDate) {
            this.managers.input.updateInputValue();

            this.emitter.emit("confirm", {
              date: selectedDate,
              timestamp: Date.now(),
            });
          }
        }

        this.unmount();
      }) as EventListener;

      okBtn.addEventListener("click", okHandler);
      this.eventHandlers.set("ok", okHandler);
    }

    if (cancelBtn) {
      const cancelHandler = (() => {
        this.core.resetTempSelection();
        if (this.core.options.ui?.rangeSelection) {
          this.core.resetTempRangeSelection();
        }

        this.emitter.emit("cancel", {});

        if (this.core.options.behavior.closeOnCancel) {
          this.unmount();
        }
      }) as EventListener;

      cancelBtn.addEventListener("click", cancelHandler);
      this.eventHandlers.set("cancel", cancelHandler);
    }
  }

  private bindCloseOnSelectHandler(): void {
    if (!this.core.options.behavior.closeOnSelect) return;
    if (this.core.options.ui.inline?.enabled) return;

    const displayMode = this.core.displayMode;
    if (displayMode !== "dropdown") return;

    this.emitter.on("select:day", () => {
      this.core.commitTempSelection();
      const { selectedDate } = this.core;

      if (selectedDate) {
        this.managers.input.updateInputValue();

        this.emitter.emit("confirm", {
          date: selectedDate,
          timestamp: Date.now(),
        });
      }

      this.unmount();
    });
  }

  private handleEscClick(): void {
    const escHandler = ((event: KeyboardEvent) => {
      if (event.key === "Escape") {
        this.unmount();
      }
    }) as EventListener;

    document.addEventListener("keydown", escHandler);
    this.eventHandlers.set("esc", escHandler);
  }

  private handleBackdropClick(): void {
    if (!this.core.options.behavior.closeOnClickOutside) return;

    const modal = this.core.getModalElement();
    if (!modal) return;

    const displayMode = this.core.displayMode;

    if (displayMode === "dropdown") {
      const clickOutsideHandler = ((event: MouseEvent) => {
        if (this.core.isSwiping) return;

        const target = event.target as Node;
        const wrapper = this.core.getWrapper();
        const input = this.core.getInput();
        const container = this.core.element;

        const isInsideWrapper = wrapper?.contains(target) || false;
        const isInsideInput = input?.contains(target) || false;
        const isInsideContainer = container?.contains(target) || false;

        if (!isInsideWrapper && !isInsideInput && !isInsideContainer) {
          this.unmount();
        }
      }) as EventListener;

      setTimeout(() => {
        document.addEventListener("click", clickOutsideHandler);
        this.eventHandlers.set("clickOutside", clickOutsideHandler);
      }, 0);
    } else {
      const backdropHandler = ((event: MouseEvent) => {
        if (this.core.isSwiping) return;

        if (event.target === modal) {
          this.unmount();
        }
      }) as EventListener;

      modal.addEventListener("click", backdropHandler);
      this.eventHandlers.set("backdrop", backdropHandler);
    }
  }

  unmount(callback?: TypeFunction): void {
    if (this.core.isDestroyed) return;

    this.core.setIsModalRemove(false);

    this.removeEventListeners();

    this.managers.animation.removeAnimationToClose();

    const input = this.core.getInput();
    if (input) {
      input.classList.remove("disabled");
    }

    setTimeout(() => {
      if (!isNode()) {
        document.body.style.overflowY = "";
        document.body.style.paddingRight = "";
      }
    }, TIMINGS.SCROLLBAR_RESTORE);

    setTimeout(() => {
      const input = this.core.getInput();
      if (this.core.options.behavior.focusInputAfterClose) {
        input?.focus();
      }

      const modal = this.core.getModalElement();
      if (modal === null) return;

      modal.remove();
      this.core.setIsModalRemove(true);

      if (this.core.selectedDate) {
        this.core.setCurrentMonth(this.core.selectedDate.getMonth());
        this.core.setCurrentYear(this.core.selectedDate.getFullYear());
      } else {
        const today = new Date();
        this.core.setCurrentMonth(today.getMonth());
        this.core.setCurrentYear(today.getFullYear());
      }

      this.emitter.emit("close", {});
    }, TIMINGS.MODAL_REMOVE);

    if (callback) callback();
  }

  destroy(
    options?:
      | { keepInputValue?: boolean; callback?: TypeFunction }
      | TypeFunction,
  ): void {
    if (this.core.isDestroyed) return;

    const config =
      typeof options === "function" ? { callback: options } : options || {};
    const { keepInputValue = false, callback } = config;

    const input = this.core.getInput();
    const inputValue = keepInputValue ? input?.value : null;

    this.removeEventListeners();

    const modal = this.core.getModalElement();
    modal?.remove();

    if (input) {
      input.classList.remove(
        "disabled",
        "active",
        "dp-ui-open-element",
        "dp-ui-invalid-format",
        "invalid-value",
        "error",
        "dp-ui-input",
      );

      input.removeAttribute("data-open");
      input.removeAttribute("data-owner-id");

      if (keepInputValue && inputValue) {
        input.value = inputValue;
      }
    }

    const element = this.core.element;
    if (element) {
      element.removeAttribute("data-owner-id");
      element.removeAttribute("data-open");

      if (this.core.options.ui.cssClass) {
        element.classList.remove(this.core.options.ui.cssClass);
      }
    }

    this.core.reset();
    this.managers.destroy();
    this.emitter.clear();

    if (!isNode()) {
      document.body.style.overflowY = "";
      document.body.style.paddingRight = "";
    }

    if (callback) callback();
  }

  private removeEventListeners(): void {
    if (isDocument() === false) return;

    this.eventHandlers.forEach((handler, key) => {
      if (key === "esc") {
        document.removeEventListener("keydown", handler);
      } else if (key === "backdrop") {
        const modal = this.core.getModalElement();
        modal?.removeEventListener("click", handler);
      } else if (key === "clickOutside") {
        document.removeEventListener("click", handler);
      } else {
        const button =
          key === "ok"
            ? this.core.getOkButton()
            : key === "cancel"
              ? this.core.getCancelButton()
              : null;
        button?.removeEventListener("click", handler);
      }
    });

    this.eventHandlers.clear();
  }
}
