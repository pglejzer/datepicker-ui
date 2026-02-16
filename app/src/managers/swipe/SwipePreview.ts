import type { CoreState } from "../../datepicker/CoreState";
import type { SwipeConfig } from "./SwipeTypes";
import { SwipeContentGenerator } from "./SwipeContentGenerator";
import { TIMINGS } from "../../constants/timings";

export class SwipePreview {
  private core: CoreState;
  private config: SwipeConfig;
  private contentGenerator: SwipeContentGenerator;
  private sliderElement: HTMLElement | null = null;
  private prevPanel: HTMLElement | null = null;
  private currentPanel: HTMLElement | null = null;
  private nextPanel: HTMLElement | null = null;
  private calendarWidth: number = 0;
  private calendarWrapper: HTMLElement | null = null;
  private originalHeader: HTMLElement | null = null;
  private originalCalendar: HTMLElement | null = null;
  private originalGrid: HTMLElement | null = null;

  constructor(core: CoreState, config: SwipeConfig) {
    this.core = core;
    this.config = config;
    this.contentGenerator = new SwipeContentGenerator(core);
  }

  updateConfig(config: SwipeConfig): void {
    this.config = config;
  }

  setCalendarWidth(width: number): void {
    this.calendarWidth = width;
  }

  getSliderElement(): HTMLElement | null {
    return this.sliderElement;
  }

  setup(): void {
    if (this.sliderElement) return;

    const wrapper = this.core.getWrapper();
    if (!wrapper) return;

    this.calendarWrapper = wrapper.querySelector(
      ".dp-ui__calendar-wrapper",
    ) as HTMLElement;

    if (!this.calendarWrapper) {
      this.calendarWrapper = wrapper;
    }

    if (!this.calendarWrapper) return;

    this.originalHeader = this.calendarWrapper.querySelector(
      ".dp-ui__calendar-header",
    );
    this.originalCalendar =
      this.calendarWrapper.querySelector(".dp-ui__calendar");
    this.originalGrid = this.originalCalendar?.querySelector(
      ".dp-ui__calendar-grid",
    ) as HTMLElement | null;

    const currentHeight = this.calendarWrapper.offsetHeight;
    this.calendarWrapper.style.minHeight = `${currentHeight}px`;

    if (this.originalHeader) {
      this.originalHeader.style.visibility = "hidden";
    }
    if (this.originalCalendar) {
      this.originalCalendar.style.visibility = "hidden";
    }

    let slider = this.calendarWrapper.querySelector(
      ".dp-ui__calendar-slider",
    ) as HTMLElement;

    if (!slider) {
      slider = this.createNewSlider(this.calendarWrapper);
    } else {
      this.updateExistingSlider(slider);
    }

    this.sliderElement = slider;
    slider.style.transition = "none";
    slider.style.transform = "translateX(-33.33%)";
  }

  private createNewSlider(container: Element): HTMLElement {
    const slider = document.createElement("div");
    slider.className =
      "dp-ui__calendar-slider dp-ui__calendar-slider--swiping dp-ui__calendar-slider--full-panel";

    const prevPanel = document.createElement("div");
    prevPanel.className = "dp-ui__swipe-panel dp-ui__swipe-panel--prev";
    prevPanel.innerHTML = this.contentGenerator.generatePrevMonthPanel();

    const currentPanel = document.createElement("div");
    currentPanel.className = "dp-ui__swipe-panel dp-ui__swipe-panel--current";
    currentPanel.innerHTML = this.contentGenerator.generateCurrentMonthPanel();

    const nextPanel = document.createElement("div");
    nextPanel.className = "dp-ui__swipe-panel dp-ui__swipe-panel--next";
    nextPanel.innerHTML = this.contentGenerator.generateNextMonthPanel();

    slider.appendChild(prevPanel);
    slider.appendChild(currentPanel);
    slider.appendChild(nextPanel);

    container.appendChild(slider);

    this.prevPanel = prevPanel;
    this.currentPanel = currentPanel;
    this.nextPanel = nextPanel;

    return slider;
  }

  private updateExistingSlider(slider: HTMLElement): void {
    slider.classList.add("dp-ui__calendar-slider--swiping");
    slider.classList.add("dp-ui__calendar-slider--full-panel");

    this.prevPanel = slider.querySelector(".dp-ui__swipe-panel--prev");
    this.currentPanel = slider.querySelector(".dp-ui__swipe-panel--current");
    this.nextPanel = slider.querySelector(".dp-ui__swipe-panel--next");

    if (this.prevPanel) {
      this.prevPanel.innerHTML = this.contentGenerator.generatePrevMonthPanel();
    }
    if (this.currentPanel) {
      this.currentPanel.innerHTML =
        this.contentGenerator.generateCurrentMonthPanel();
    }
    if (this.nextPanel) {
      this.nextPanel.innerHTML = this.contentGenerator.generateNextMonthPanel();
    }
  }

  private updateWeeksCount(container: Element, panel: HTMLElement): void {
    const weeksCount = panel.querySelectorAll(".dp-ui__week").length;
    if (weeksCount >= 4 && weeksCount <= 6) {
      container.classList.remove(
        "dp-ui__calendar--weeks-4",
        "dp-ui__calendar--weeks-5",
        "dp-ui__calendar--weeks-6",
      );
      container.classList.add(`dp-ui__calendar--weeks-${weeksCount}`);
    }
  }

  update(rawDeltaX: number): void {
    if (!this.sliderElement) return;

    const resistedDelta = this.applyResistance(rawDeltaX);
    const deltaPercent = (resistedDelta / this.calendarWidth) * 33.33;
    const percentage = -33.33 + deltaPercent;

    this.sliderElement.style.transform = `translateX(${percentage}%)`;
  }

  private applyResistance(delta: number): number {
    const maxDelta = this.calendarWidth;
    const absDelta = Math.abs(delta);

    if (absDelta <= maxDelta) {
      return delta;
    }

    const overDelta = absDelta - maxDelta;
    const resistedOver = overDelta * this.config.resistance;
    const sign = delta > 0 ? 1 : -1;

    return sign * (maxDelta + resistedOver);
  }

  animateToTarget(
    direction: "left" | "right" | "none",
    onComplete: () => void,
  ): void {
    if (!this.sliderElement) {
      onComplete();
      return;
    }

    const slider = this.sliderElement;

    slider.classList.remove("dp-ui__calendar-slider--swiping");
    slider.style.transition = `transform ${this.config.snapDuration}ms cubic-bezier(0.2, 0, 0, 1)`;

    let targetPercentage: number;
    if (direction === "left") {
      targetPercentage = -66.66;
    } else if (direction === "right") {
      targetPercentage = 0;
    } else {
      targetPercentage = -33.33;
    }

    slider.style.transform = `translateX(${targetPercentage}%)`;

    const onTransitionEnd = (): void => {
      slider.removeEventListener("transitionend", onTransitionEnd);
      this.cleanupAfterTransition();
      onComplete();
    };

    slider.addEventListener("transitionend", onTransitionEnd);
  }

  animateToReset(onComplete?: () => void): void {
    if (!this.sliderElement) return;

    const slider = this.sliderElement;
    slider.classList.remove("dp-ui__calendar-slider--swiping");
    slider.style.transition = `transform ${TIMINGS.SWIPE_BOUNCE_DURATION}ms cubic-bezier(0.2, 0, 0, 1)`;
    slider.style.transform = "translateX(-33.33%)";

    const onTransitionEnd = (): void => {
      slider.removeEventListener("transitionend", onTransitionEnd);
      this.cleanupAfterReset();
      onComplete?.();
    };

    slider.addEventListener("transitionend", onTransitionEnd);
  }

  private cleanupAfterTransition(): void {
    if (this.calendarWrapper) {
      this.calendarWrapper.style.minHeight = "";
    }

    if (this.originalHeader) {
      this.originalHeader.style.visibility = "";
    }

    if (this.originalCalendar) {
      this.originalCalendar.style.visibility = "";
    }

    if (this.sliderElement) {
      this.sliderElement.remove();
    }

    this.cleanup();
  }

  private cleanupAfterReset(): void {
    if (this.calendarWrapper) {
      this.calendarWrapper.style.minHeight = "";
    }

    if (this.originalHeader) {
      this.originalHeader.style.visibility = "";
    }

    if (this.originalCalendar) {
      this.originalCalendar.style.visibility = "";
    }

    if (this.sliderElement) {
      this.sliderElement.remove();
    }

    this.cleanup();
  }

  cleanup(): void {
    this.sliderElement = null;
    this.prevPanel = null;
    this.currentPanel = null;
    this.nextPanel = null;
    this.calendarWrapper = null;
    this.originalHeader = null;
    this.originalCalendar = null;
    this.originalGrid = null;
  }
}
