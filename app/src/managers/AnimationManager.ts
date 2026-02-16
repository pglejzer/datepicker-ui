import type { CoreState } from "../datepicker/CoreState";
import type { EventEmitter, DatepickerEventMap } from "../utils/EventEmitter";
import { TIMINGS } from "../constants/timings";

export class AnimationManager {
  private core: CoreState;
  private emitter: EventEmitter<DatepickerEventMap>;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor(core: CoreState, emitter: EventEmitter<DatepickerEventMap>) {
    this.core = core;
    this.emitter = emitter;
  }

  init(): void {
    if (typeof window === "undefined") return;
  }

  private runWithAnimation(
    callback: () => void,
    delay = TIMINGS.MODAL_ANIMATION,
  ): void {
    if (this.core.options.ui.animation) {
      const t = setTimeout(callback, delay);
      this.timeouts.push(t);
    } else {
      callback();
    }
  }

  private clearAllTimeouts(): void {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }

  setAnimationToOpen(): void {
    this.clearAllTimeouts();
    const modalElement = this.core.getModalElement();
    modalElement?.classList.add("opacity");

    this.runWithAnimation(() => {
      this.core.getModalElement()?.classList.add("show");
      this.emitter.emit("animation:calendar", {});
    });
  }

  removeAnimationToClose(): void {
    this.clearAllTimeouts();

    const modalElement = this.core.getModalElement();
    if (!modalElement) return;

    this.runWithAnimation(() => {
      const modal = this.core.getModalElement();
      modal?.classList.remove("show");
      modal?.classList.remove("opacity");
    });
  }

  slideCalendar(
    direction: "left" | "right",
    currentHtml: string,
    nextHtml: string,
    onComplete: () => void,
  ): void {
    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    const calendarContainer = wrapper.querySelector(".dp-ui__calendar");
    if (!calendarContainer) return;

    const nextWeeksCount = (nextHtml.match(/dp-ui__week/g) || []).length;

    if (nextWeeksCount >= 4 && nextWeeksCount <= 6) {
      calendarContainer.classList.remove(
        "dp-ui__calendar--weeks-4",
        "dp-ui__calendar--weeks-5",
        "dp-ui__calendar--weeks-6",
      );
      calendarContainer.classList.add(
        `dp-ui__calendar--weeks-${nextWeeksCount}`,
      );
    }

    let slider = calendarContainer.querySelector(
      ".dp-ui__calendar-slider",
    ) as HTMLElement;

    if (!slider) {
      slider = document.createElement("div");
      slider.className = "dp-ui__calendar-slider";

      const oldGrid = calendarContainer.querySelector(".dp-ui__calendar-grid");
      if (oldGrid) oldGrid.remove();

      calendarContainer.appendChild(slider);
    }

    slider.innerHTML = "";

    const prevSlot = document.createElement("div");
    prevSlot.className = "dp-ui__calendar-grid dp-ui__calendar-grid--prev";

    const currentSlot = document.createElement("div");
    currentSlot.className =
      "dp-ui__calendar-grid dp-ui__calendar-grid--current";
    currentSlot.innerHTML = currentHtml;

    const nextSlot = document.createElement("div");
    nextSlot.className = "dp-ui__calendar-grid dp-ui__calendar-grid--next";

    slider.appendChild(prevSlot);
    slider.appendChild(currentSlot);
    slider.appendChild(nextSlot);

    slider.style.transition = "none";
    slider.style.transform = "translateX(-100%)";

    if (direction === "left") {
      nextSlot.innerHTML = nextHtml;
    } else {
      prevSlot.innerHTML = nextHtml;
    }

    requestAnimationFrame(() => {
      slider.style.transition = "";

      requestAnimationFrame(() => {
        const targetTransform =
          direction === "left" ? "translateX(-200%)" : "translateX(0)";
        slider.style.transform = targetTransform;

        const t = setTimeout(() => {
          const newCurrent = direction === "left" ? nextSlot : prevSlot;

          slider.innerHTML = "";
          newCurrent.className =
            "dp-ui__calendar-grid dp-ui__calendar-grid--current";
          slider.appendChild(newCurrent);

          slider.style.transition = "none";
          slider.style.transform = "translateX(0)";

          requestAnimationFrame(() => {
            slider.style.transition = "";
            onComplete();
          });
        }, 300);

        this.timeouts.push(t);
      });
    });
  }

  destroy(): void {
    this.clearAllTimeouts();
  }
}
