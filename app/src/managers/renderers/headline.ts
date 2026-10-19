import { TIMINGS } from "@/constants/timings";
import { createElement } from "@/utils/dom";

export interface Headline {
  readonly element: HTMLDivElement;
  setText(text: string): void;
  destroy(): void;
}

const FADING_OUT_CLASS = "dp-ui__headline--fading-out";

export const createHeadline = (text: string, animate: boolean): Headline => {
  const element = createElement("div", "dp-ui__headline");
  element.textContent = text;
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = null;
    element.classList.remove(FADING_OUT_CLASS);
  };

  const swap = (): void => {
    const next = pending;
    stop();
    if (next !== null) element.textContent = next;
  };

  const setText = (next: string): void => {
    if (next === (pending ?? element.textContent)) return;
    if (!animate) {
      stop();
      element.textContent = next;
      return;
    }
    pending = next;
    element.classList.add(FADING_OUT_CLASS);
    timer ??= setTimeout(swap, TIMINGS.HEADLINE_FADE);
  };

  return { element, setText, destroy: stop };
};
