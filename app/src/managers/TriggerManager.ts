import type { CoreState } from "../datepicker/CoreState";
import type { PluralLabel } from "../types/options";
import type { Precision, RangeEnd, Selection } from "../types/selection";
import type { DatepickerEventMap } from "../types/types";
import type { EventEmitter } from "../utils/EventEmitter";
import { resolveElement } from "../utils/dom";
import { formatPeriodLabel } from "../utils/date/intl";
import { formatCount } from "../utils/selection/headline";
import { selectedDates } from "../utils/selection/model";
import { RANGE_SEPARATOR } from "../utils/selection/text";

export type OpenSource = "pointer" | "toggle" | "keyboard";

const describeValue = (
  value: Selection,
  locale: string,
  multipleSelected: PluralLabel,
  precision: Precision,
): string => {
  const dates = selectedDates(value);
  if (dates.length === 0) return "";
  if (value.mode === "multiple") {
    return formatCount(multipleSelected, dates.length, locale);
  }
  return dates
    .map((date) => formatPeriodLabel(date, precision, locale, "long"))
    .join(RANGE_SEPARATOR);
};

const ACTIVE_CLASS = "dp-ui__input--active";

export interface TriggerManagerDeps {
  open(source: OpenSource, end: RangeEnd): void;
}

export class TriggerManager {
  private toggle: HTMLElement | null = null;
  private expanded = false;
  private release: (() => void) | null = null;

  constructor(
    private readonly core: CoreState,
    _emitter: EventEmitter<DatepickerEventMap>,
    private readonly deps: TriggerManagerDeps,
  ) {}

  bind(signal: AbortSignal): void {
    this.releaseToggle();
    if (this.core.options.inline.enabled || signal.aborted) return;
    const { input } = this.core;
    this.bindField(input, "start", signal);
    const endInput = this.splitEnd();
    if (endInput !== null) {
      this.bindField(endInput, "end", signal);
      this.core.events.on(
        "change:active-end",
        () => {
          this.markActive();
        },
        signal,
      );
    }
    this.bindToggle(signal);
  }

  setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.toggle?.setAttribute("aria-expanded", String(expanded));
    this.markActive();
  }

  updateLabel(): void {
    if (this.toggle === null) return;
    const { labels, locale, precision } = this.core.options;
    const described = describeValue(
      this.core.value,
      locale,
      labels.multipleSelected,
      precision,
    );
    const label =
      described === ""
        ? labels.openCalendar
        : `${labels.openCalendar}, ${described}`;
    this.toggle.setAttribute("aria-label", label);
  }

  destroy(): void {
    this.releaseToggle();
    this.core.input.classList.remove(ACTIVE_CLASS);
    this.core.endInput?.classList.remove(ACTIVE_CLASS);
  }

  private splitEnd(): HTMLInputElement | null {
    return this.core.options.mode === "range" ? this.core.endInput : null;
  }

  private bindField(
    field: HTMLInputElement,
    end: RangeEnd,
    signal: AbortSignal,
  ): void {
    let pressed = false;
    field.addEventListener(
      "pointerdown",
      () => {
        pressed = true;
      },
      { signal },
    );
    field.addEventListener(
      "click",
      () => {
        const direct = pressed;
        pressed = false;
        if (this.expanded && !direct) return;
        this.request("pointer", end, field);
      },
      { signal },
    );
    field.addEventListener(
      "keydown",
      (event) => {
        if (event.altKey && event.key === "ArrowDown") {
          event.preventDefault();
          this.request("keyboard", end, field);
        }
      },
      { signal },
    );
  }

  private markActive(): void {
    const endInput = this.splitEnd();
    const { input } = this.core;
    if (endInput === null) {
      input.classList.remove(ACTIVE_CLASS);
      return;
    }
    const active = this.expanded ? this.core.activeEnd : null;
    input.classList.toggle(ACTIVE_CLASS, active === "start");
    endInput.classList.toggle(ACTIVE_CLASS, active === "end");
  }

  private request(
    source: OpenSource,
    end: RangeEnd,
    field: HTMLInputElement = this.core.input,
  ): void {
    if (field.disabled) return;
    this.deps.open(source, end);
  }

  private bindToggle(signal: AbortSignal): void {
    const toggle = resolveElement(
      this.core.options.toggleButton,
      this.core.host,
    );
    if (toggle === null) return;
    const previous = new Map<string, string | null>();
    const manage = (name: string, value: string): void => {
      if (!previous.has(name)) previous.set(name, toggle.getAttribute(name));
      toggle.setAttribute(name, value);
    };
    manage("aria-haspopup", "dialog");
    const isButton = toggle.tagName === "BUTTON";
    if (!isButton) {
      manage("role", "button");
      manage("tabindex", "0");
      toggle.addEventListener(
        "keydown",
        (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          this.request("toggle", "start");
        },
        { signal },
      );
    }
    toggle.addEventListener(
      "click",
      () => {
        this.request("toggle", "start");
      },
      { signal },
    );
    this.toggle = toggle;
    manage("aria-expanded", String(this.expanded));
    manage("aria-label", this.core.options.labels.openCalendar);
    this.updateLabel();
    const release = (): void => {
      signal.removeEventListener("abort", release);
      previous.forEach((value, name) => {
        if (value === null) toggle.removeAttribute(name);
        else toggle.setAttribute(name, value);
      });
      if (this.toggle === toggle) this.toggle = null;
      if (this.release === release) this.release = null;
    };
    this.release = release;
    signal.addEventListener("abort", release, { once: true });
  }

  private releaseToggle(): void {
    this.release?.();
  }
}
