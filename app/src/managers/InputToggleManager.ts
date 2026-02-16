import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { ICONS } from "../constants/icons";
import { TIMINGS } from "../constants/timings";
import { MaskManager } from "./MaskManager";

export class InputToggleManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private isInputMode: boolean = false;
  private boundToggleHandler: ((e: Event) => void) | null = null;
  private modalMaskManager: MaskManager | null = null;
  private animationTimeouts: ReturnType<typeof setTimeout>[] = [];
  private cachedCalendarHeight: number = 0;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    const displayMode = this.core.options.ui.displayMode;
    if (displayMode !== "modal") return;

    this.bindToggleHandler();
  }

  private bindToggleHandler(): void {
    const modal = this.core.getModalElement();
    if (!modal) {
      console.error("InputToggleManager: Modal not found");
      return;
    }

    const toggleButton = modal.querySelector(
      ".dp-ui__selected-date-icon",
    ) as HTMLButtonElement;

    if (!toggleButton) {
      console.error("InputToggleManager: Toggle button not found");
      return;
    }

    this.boundToggleHandler = (e: Event) => {
      console.log("InputToggleManager: Toggle clicked!");
      e.preventDefault();
      e.stopPropagation();
      this.toggleView();
    };

    toggleButton.addEventListener("click", this.boundToggleHandler);
  }

  private toggleView(): void {
    const modal = this.core.getModalElement();
    if (!modal) {
      console.error("InputToggleManager: Modal not found in toggleView");
      return;
    }

    const iconButton = modal.querySelector(
      ".dp-ui__selected-date-icon",
    ) as HTMLButtonElement;
    if (!iconButton) {
      console.error("InputToggleManager: Icon button not found in toggleView");
      return;
    }

    const currentMode = iconButton.getAttribute("data-mode") || "calendar";
    console.log("InputToggleManager: Current mode:", currentMode);

    if (currentMode === "calendar") {
      console.log("InputToggleManager: Switching to INPUT view");
      this.showInputView();
      this.isInputMode = true;
    } else {
      console.log("InputToggleManager: Switching to CALENDAR view");
      this.showCalendarView();
      this.isInputMode = false;
    }

    this.emitter.emit("view:toggle", {
      mode: this.isInputMode ? "input" : "calendar",
    });
  }

  private showInputView(): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    this.clearAnimationTimeouts();

    const header = modal.querySelector(".dp-ui__modal-header");
    const calendarWrapper = modal.querySelector(
      ".dp-ui__calendar-wrapper",
    ) as HTMLElement;
    const calendar = modal.querySelector(".dp-ui__calendar");
    const selectedDateDisplay = modal.querySelector(".dp-ui__selected-date");
    const iconButton = modal.querySelector(
      ".dp-ui__selected-date-icon",
    ) as HTMLButtonElement;

    if (calendarWrapper) {
      this.cachedCalendarHeight = calendarWrapper.offsetHeight;
      calendarWrapper.style.setProperty(
        "--dp-wrapper-height",
        `${this.cachedCalendarHeight}px`,
      );

      void calendarWrapper.offsetHeight;

      calendarWrapper.style.setProperty(
        "--dp-wrapper-height",
        "var(--dp-input-mode-height)",
      );
      calendarWrapper.classList.add("dp-ui__calendar-wrapper--input-mode");
    }

    if (header) {
      header.classList.add("dp-ui__modal-header--input-mode");
    }

    if (calendar) {
      (calendar as HTMLElement).classList.add("dp-ui__calendar--exiting");
    }

    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = "Enter dates";
    }

    if (iconButton) {
      iconButton.innerHTML = ICONS.calendar;
      iconButton.setAttribute("data-mode", "input");
    }

    const exitTimeout = setTimeout(() => {
      if (calendar) {
        (calendar as HTMLElement).classList.remove("dp-ui__calendar--exiting");
        (calendar as HTMLElement).classList.add("dp-ui__calendar--hidden");
      }
      this.showInputField();
    }, TIMINGS.VIEW_TOGGLE_DURATION);

    this.animationTimeouts.push(exitTimeout);
  }

  private showCalendarView(): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    this.clearAnimationTimeouts();

    const header = modal.querySelector(".dp-ui__modal-header");
    const calendarWrapper = modal.querySelector(
      ".dp-ui__calendar-wrapper",
    ) as HTMLElement;
    const calendar = modal.querySelector(".dp-ui__calendar");
    const inputContainer = modal.querySelector(".dp-ui__input-container");
    const iconButton = modal.querySelector(
      ".dp-ui__selected-date-icon",
    ) as HTMLButtonElement;

    if (inputContainer) {
      inputContainer.classList.add("dp-ui__input-container--exiting");
    }

    if (iconButton) {
      iconButton.innerHTML = ICONS.pencil;
      iconButton.setAttribute("data-mode", "calendar");
    }

    const exitTimeout = setTimeout(() => {
      if (header) {
        header.classList.remove("dp-ui__modal-header--input-mode");
      }

      if (calendarWrapper) {
        void calendarWrapper.offsetHeight;
        calendarWrapper.style.setProperty(
          "--dp-wrapper-height",
          `${this.cachedCalendarHeight}px`,
        );
        calendarWrapper.classList.remove("dp-ui__calendar-wrapper--input-mode");
      }

      if (calendar) {
        (calendar as HTMLElement).classList.remove("dp-ui__calendar--hidden");
        (calendar as HTMLElement).classList.add("dp-ui__calendar--entering");
      }

      if (inputContainer) {
        inputContainer.remove();
      }

      this.updateSelectedDateDisplay();

      const enterTimeout = setTimeout(() => {
        if (calendar) {
          (calendar as HTMLElement).classList.remove(
            "dp-ui__calendar--entering",
          );
        }
        if (calendarWrapper) {
          calendarWrapper.style.removeProperty("--dp-wrapper-height");
        }
      }, TIMINGS.VIEW_TOGGLE_DURATION);

      this.animationTimeouts.push(enterTimeout);
    }, TIMINGS.VIEW_TOGGLE_DURATION);

    this.animationTimeouts.push(exitTimeout);
  }

  private clearAnimationTimeouts(): void {
    this.animationTimeouts.forEach(clearTimeout);
    this.animationTimeouts = [];
  }

  private showInputField(): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    const existingInput = modal.querySelector(".dp-ui__input-container");
    if (existingInput) return;

    const inputId = `dp-ui-modal-input-${this.core.instanceId}`;

    const inputContainer = document.createElement("div");
    inputContainer.className = "dp-ui__input-container";

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "dp-ui__input-field";

    const input = document.createElement("input");
    input.type = "text";
    input.id = inputId;
    input.name = "date-input";
    input.className = "dp-ui__modal-input";
    input.placeholder = " ";

    const label = document.createElement("label");
    label.className = "dp-ui__input-label";
    label.textContent = "Date";
    label.setAttribute("for", inputId);

    const selectedDate = this.core.tempSelectedDate || this.core.selectedDate;
    if (selectedDate) {
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const day = selectedDate.getDate().toString().padStart(2, "0");
      const year = selectedDate.getFullYear();
      input.value = `${month}/${day}/${year}`;
    }

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(label);
    inputContainer.appendChild(inputWrapper);

    const calendarWrapper = modal.querySelector(".dp-ui__calendar-wrapper");
    if (calendarWrapper) {
      calendarWrapper.appendChild(inputContainer);
    }

    input.focus();

    const modalCoreProxy = new Proxy(this.core, {
      get: (target: CoreState, prop: string | symbol): unknown => {
        if (prop === "getInput") {
          return (): HTMLInputElement | null => input;
        }
        if (prop === "options") {
          const originalOptions = target[prop as keyof CoreState];
          if (typeof originalOptions === "object" && originalOptions !== null) {
            return {
              ...originalOptions,
              ui: {
                ...(originalOptions as { ui?: Record<string, unknown> }).ui,
                maskEnabled: true,
                format: "mm/dd/yyyy",
              },
            };
          }
        }
        return target[prop as keyof CoreState];
      },
    });

    this.modalMaskManager = new MaskManager(
      modalCoreProxy as CoreState,
      this.emitter,
    );
    this.modalMaskManager.init();

    this.emitter.on("mask:input", (data) => {
      if (data.isComplete && data.value.length === 10) {
        const parts = data.value.split("/");
        const monthNum = parseInt(parts[0], 10);
        const dayNum = parseInt(parts[1], 10);
        const yearNum = parseInt(parts[2], 10);

        const date = new Date(yearNum, monthNum - 1, dayNum);
        if (date.getMonth() === monthNum - 1 && date.getDate() === dayNum) {
          this.core.setTempSelectedDate(date);
          this.updateSelectedDateDisplay();
        }
      }
    });
  }

  private updateSelectedDateDisplay(): void {
    const modal = this.core.getModalElement();
    if (!modal) return;

    const selectedDateDisplay = modal.querySelector(".dp-ui__selected-date");
    if (!selectedDateDisplay) return;

    const displayDate =
      this.core.tempSelectedDate || this.core.selectedDate || new Date();

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };

    const formatter = new Intl.DateTimeFormat("en-US", options);
    selectedDateDisplay.textContent = formatter.format(displayDate);
  }

  destroy(): void {
    this.clearAnimationTimeouts();

    if (this.modalMaskManager) {
      this.modalMaskManager.destroy();
      this.modalMaskManager = null;
    }

    this.boundToggleHandler = null;
    this.isInputMode = false;
    this.cachedCalendarHeight = 0;

    const modal = this.core.getModalElement();
    if (!modal) return;

    const toggleButton = modal.querySelector(
      ".dp-ui__selected-date-icon",
    ) as HTMLButtonElement;
    if (toggleButton && this.boundToggleHandler) {
      toggleButton.removeEventListener("click", this.boundToggleHandler);
    }

    const inputContainer = modal.querySelector(".dp-ui__input-container");
    if (inputContainer) {
      inputContainer.remove();
    }

    const header = modal.querySelector(".dp-ui__modal-header");
    if (header) {
      header.classList.remove("dp-ui__modal-header--input-mode");
    }

    const calendarWrapper = modal.querySelector(
      ".dp-ui__calendar-wrapper",
    ) as HTMLElement;
    if (calendarWrapper) {
      calendarWrapper.classList.remove("dp-ui__calendar-wrapper--input-mode");
      calendarWrapper.style.removeProperty("--dp-wrapper-height");
    }

    const calendar = modal.querySelector(".dp-ui__calendar");
    if (calendar) {
      calendar.classList.remove(
        "dp-ui__calendar--exiting",
        "dp-ui__calendar--hidden",
        "dp-ui__calendar--entering",
      );
    }
  }
}
