import { CoreState } from "./CoreState";
import { Managers } from "./Managers";
import { Lifecycle } from "./Lifecycle";
import { EventEmitter, type DatepickerEventMap } from "../utils/EventEmitter";
import { generateUUID } from "../utils/config";
import type { DatepickerOptions } from "../types/options";
import { isNode, isDocument } from "../utils/node";

type Callback = () => void;

const instanceRegistry = new Map<string, DatepickerUI>();

export default class DatepickerUI {
  private readonly core: CoreState;
  private readonly managers: Managers;
  private readonly lifecycle: Lifecycle;
  private readonly emitter: EventEmitter<DatepickerEventMap>;

  constructor(
    selectorOrElement: string | HTMLElement,
    options?: DatepickerOptions
  ) {
    if (isNode()) {
      throw new Error("DatepickerUI requires browser environment");
    }

    const targetInput = this.resolveInputElement(selectorOrElement);
    if (!targetInput) {
      throw new Error("Input element not found");
    }

    const customId = options?.behavior?.id;
    const instanceId = customId || `dp-ui-${generateUUID()}`;
    const element = this.createWrapperElement(targetInput);

    this.emitter = new EventEmitter<DatepickerEventMap>();
    this.core = new CoreState(element, options || {}, instanceId, customId);

    if (
      this.core.options.ui.inline?.enabled &&
      typeof options?.behavior?.focusTrap === "undefined"
    ) {
      this.core.options.behavior.focusTrap = false;
    }

    if (this.core.options.ui.inline?.enabled) {
      if (!this.core.options.ui.inline.containerId) {
        throw new Error(
          "inline.containerId is required when inline mode is enabled"
        );
      }

      if (!isNode()) {
        const containerElement = document.getElementById(
          this.core.options.ui.inline.containerId
        );
        if (!containerElement) {
          throw new Error(
            `Container element with id "${this.core.options.ui.inline.containerId}" not found`
          );
        }
      }
    }

    this.managers = new Managers(this.core, this.emitter);
    this.lifecycle = new Lifecycle(this.core, this.managers, this.emitter);

    this.setupInternalEventListeners();

    instanceRegistry.set(this.core.instanceId, this);
  }

  private setupInternalEventListeners(): void {
    this.emitter.on("show", (data) => {
      if (!this.core.isDestroyed) {
        if (data.displayMode) {
          this.core.setDisplayMode(data.displayMode);
        }

        const input = this.core.getInput();
        if (input && input.value.trim() !== "") {
          const parsedDate = this.managers.input.parseDate(input.value);
          if (parsedDate) {
            this.core.setSelectedDate(parsedDate);
          }
        }

        if (this.core.selectedDate) {
          this.core.setCurrentMonth(this.core.selectedDate.getMonth());
          this.core.setCurrentYear(this.core.selectedDate.getFullYear());
        } else {
          const today = new Date();
          this.core.setCurrentMonth(today.getMonth());
          this.core.setCurrentYear(today.getFullYear());
        }

        this.lifecycle.mount();
      }
    });

    this.emitter.on("cancel", () => {
      if (!this.core.isDestroyed) {
        this.lifecycle.unmount();
      }
    });

    this.emitter.on("confirm", (data) => {
      if (!this.core.isDestroyed) {
        if (data.date) {
          this.managers.input.updateInputValue();
        }
        this.lifecycle.unmount();
      }
    });

    this.emitter.on("select:day", () => {
      if (!this.core.isDestroyed) {
        this.managers.input.updateInputValue();
      }
    });
  }

  public create(): void {
    this.lifecycle.init();

    if (this.core.options.ui.inline?.enabled) {
      this.lifecycle.mount();
    }
  }

  public open(callback?: Callback): void {
    this.lifecycle.mount();
    if (callback) callback();
  }

  public close(update?: boolean, callback?: Callback): void {
    this.lifecycle.unmount(update ? callback : undefined);
    if (!update && callback) callback();
  }

  public destroy(
    options?: { keepInputValue?: boolean; callback?: Callback } | Callback
  ): void {
    instanceRegistry.delete(this.core.instanceId);
    this.lifecycle.destroy(options);
  }

  public update(
    value: { options: DatepickerOptions; create?: boolean },
    callback?: Callback
  ): void {
    if (this.core.isDestroyed) return;

    this.core.updateOptions(value.options);

    if (value.create) {
      this.create();
    }

    if (callback) callback();
  }

  public getValue():
    | {
        date: Date | null;
        formatted: string;
        day: number;
        month: number;
        year: number;
      }
    | {
        startDate: Date;
        endDate: Date;
        formattedStart: string;
        formattedEnd: string;
      }
    | null {
    if (this.core.isDestroyed) {
      return {
        date: null,
        formatted: "",
        day: 0,
        month: 0,
        year: 0,
      };
    }

    if (this.core.options.ui?.rangeSelection) {
      const rangeValue = this.core.getRangeValue();
      if (!rangeValue) {
        return null;
      }

      return {
        startDate: rangeValue.startDate,
        endDate: rangeValue.endDate,
        formattedStart: this.formatDate(rangeValue.startDate),
        formattedEnd: this.formatDate(rangeValue.endDate),
      };
    }

    const selectedDate = this.core.getSelectedDate();

    if (!selectedDate) {
      return {
        date: null,
        formatted: "",
        day: 0,
        month: 0,
        year: 0,
      };
    }

    return {
      date: selectedDate,
      formatted: this.formatDate(selectedDate),
      day: selectedDate.getDate(),
      month: selectedDate.getMonth(),
      year: selectedDate.getFullYear(),
    };
  }

  public setValue(dateInput: Date | string, updateInput: boolean = true): void {
    if (this.core.isDestroyed) return;
    if (!dateInput) return;

    if (!this.core.isInitialized) {
      this.create();
    }

    let date: Date;

    if (typeof dateInput === "string") {
      date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        return;
      }
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return;
    }

    this.core.setSelectedDate(date);
    this.core.setCurrentMonth(date.getMonth());
    this.core.setCurrentYear(date.getFullYear());

    if (updateInput) {
      const input = this.core.getInput();
      if (input) {
        input.value = this.formatDate(date);
      }
    }

    if (this.core.isInitialized) {
      this.managers.calendar.renderCalendar();
    }
  }

  public getElement(): HTMLElement {
    return this.core.element;
  }

  public get instanceId(): string {
    return this.core.instanceId;
  }

  public get options(): Required<DatepickerOptions> {
    return this.core.options;
  }

  public get isInitialized(): boolean {
    return this.core.isInitialized;
  }

  public get isDestroyed(): boolean {
    return this.core.isDestroyed;
  }

  public get input(): HTMLInputElement | null {
    return this.core.getInput();
  }

  public get okButton(): HTMLButtonElement | null {
    return this.core.getOkButton();
  }

  public get cancelButton(): HTMLButtonElement | null {
    return this.core.getCancelButton();
  }

  public get calendarGrid(): HTMLDivElement | null {
    return this.core.getCalendarGrid();
  }

  public on<K extends keyof DatepickerEventMap>(
    event: K,
    handler: (data: DatepickerEventMap[K]) => void
  ): void {
    if (this.core.isDestroyed) return;
    this.emitter.on(event, handler);
  }

  public once<K extends keyof DatepickerEventMap>(
    event: K,
    handler: (data: DatepickerEventMap[K]) => void
  ): void {
    if (this.core.isDestroyed) return;
    this.emitter.once(event, handler);
  }

  public off<K extends keyof DatepickerEventMap>(
    event: K,
    handler?: (data: DatepickerEventMap[K]) => void
  ): void {
    if (this.core.isDestroyed) return;
    this.emitter.off(event, handler);
  }

  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  private resolveInputElement(
    selectorOrElement: string | HTMLElement
  ): HTMLInputElement | null {
    if (isDocument() === false) {
      return null;
    }

    let element: HTMLElement | null = null;

    if (typeof selectorOrElement === "string") {
      element = document.querySelector(selectorOrElement);
      if (!element) return null;
    } else if (selectorOrElement instanceof HTMLElement) {
      element = selectorOrElement;
    } else {
      return null;
    }

    if (element.tagName === "INPUT") {
      return element as HTMLInputElement;
    }

    const inputElement = element.querySelector("input");
    return inputElement;
  }

  private createWrapperElement(inputElement: HTMLInputElement): HTMLElement {
    if (isDocument() === false) {
      return inputElement;
    }

    const parentElement = inputElement.parentElement;

    if (
      inputElement.tagName === "INPUT" &&
      !parentElement?.classList.contains("dp-ui")
    ) {
      const wrapper = document.createElement("div");
      wrapper.className = "dp-ui";
      inputElement.parentNode?.insertBefore(wrapper, inputElement);
      wrapper.appendChild(inputElement);
      return wrapper;
    }

    if (parentElement && !parentElement.classList.contains("dp-ui")) {
      parentElement.classList.add("dp-ui");
    }

    return parentElement || inputElement;
  }

  static getById(id: string): DatepickerUI | undefined {
    return instanceRegistry.get(id);
  }

  static getAllInstances(): DatepickerUI[] {
    return Array.from(instanceRegistry.values());
  }

  static isAvailable(selectorOrElement: string | HTMLElement): boolean {
    if (isNode()) {
      return false;
    }

    if (typeof selectorOrElement === "string") {
      return document.querySelector(selectorOrElement) !== null;
    } else if (selectorOrElement instanceof HTMLElement) {
      return document.contains(selectorOrElement);
    }
    return false;
  }

  static destroyAll(): void {
    const instances = Array.from(instanceRegistry.values());
    instances.forEach((instance) => instance.destroy());
    instanceRegistry.clear();
  }
}
