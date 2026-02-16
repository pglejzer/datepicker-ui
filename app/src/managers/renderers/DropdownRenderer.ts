import type { CoreState } from "../../datepicker/CoreState";
import type {
  EventEmitter,
  DatepickerEventMap,
} from "../../utils/EventEmitter";
import { isDocument } from "../../utils/node";
import { getModalTemplate } from "../../utils/template";
import { createDropdownObserver } from "../../utils/dropdownPosition";
import { TIMINGS } from "../../constants/timings";

export class DropdownRenderer {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private dropdownCleanup: (() => void) | null = null;

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  render(): void {
    if (isDocument() === false) return;

    const modalTemplate = getModalTemplate(
      this.core.options,
      this.core.instanceId,
      this.core.currentMonth,
      this.core.currentYear,
    );

    const { appendModalSelector } = this.core.options.ui;
    if (!appendModalSelector) {
      document.body.insertAdjacentHTML("beforeend", modalTemplate);
    } else {
      const element = document.querySelector(appendModalSelector);
      element?.insertAdjacentHTML("beforeend", modalTemplate);
    }
  }

  position(): void {
    const container = this.core.element;
    const wrapper = this.core.getWrapper();
    if (!container || !wrapper) return;

    const modal = this.core.getModalElement();
    if (!modal) return;

    modal.classList.add("dp-ui--dropdown");
    wrapper.classList.add("dp-ui__wrapper--dropdown");

    wrapper.style.position = "fixed";
    wrapper.style.width = "400px";
    wrapper.style.height = "";
    wrapper.style.transform = "scaleY(0)";
    wrapper.style.zIndex = "10000";
    wrapper.style.overflow = "visible";
    wrapper.style.visibility = "hidden";

    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const gap = 8;

      const dropdownHeight = wrapper.offsetHeight || 456;

      let top: number;
      let transformOrigin: string;

      if (spaceBelow >= dropdownHeight + gap) {
        top = rect.bottom + gap;
        transformOrigin = "top";
        wrapper.classList.add("dp-ui__wrapper--below");
      } else if (spaceAbove >= dropdownHeight + gap) {
        top = rect.top - dropdownHeight - gap;
        transformOrigin = "bottom";
        wrapper.classList.add("dp-ui__wrapper--above");
      } else if (spaceBelow > spaceAbove) {
        top = rect.bottom + gap;
        transformOrigin = "top";
        wrapper.classList.add("dp-ui__wrapper--below");
      } else {
        top = Math.max(gap, rect.top - dropdownHeight - gap);
        transformOrigin = "bottom";
        wrapper.classList.add("dp-ui__wrapper--above");
      }

      wrapper.style.top = `${top}px`;
      wrapper.style.left = `${rect.left}px`;
      wrapper.style.transformOrigin = transformOrigin;
      wrapper.style.visibility = "";

      this.dropdownCleanup = createDropdownObserver(
        container,
        wrapper,
        dropdownHeight,
      );
    });
  }

  show(callback?: () => void): void {
    this.position();

    setTimeout(() => {
      this.core.getModalElement()?.classList.add("show");
      if (callback) callback();
    }, TIMINGS.MODAL_ANIMATION);
  }

  destroy(): void {
    if (this.dropdownCleanup) {
      this.dropdownCleanup();
      this.dropdownCleanup = null;
    }
  }
}
