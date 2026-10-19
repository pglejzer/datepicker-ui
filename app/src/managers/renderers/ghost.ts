import { TIMINGS } from "@/constants/timings";

export interface Ghost {
  show(): void;
  remove(): void;
}

interface ScrollState {
  readonly live: Element;
  readonly copy: Element;
  readonly top: number;
  readonly left: number;
}

const GHOST_CLASS = "dp-ui__ghost";
const MORPHING_CLASS = "dp-ui__container--morphing";

const descendants = (root: Element): Element[] =>
  Array.from(root.querySelectorAll("*")).filter(
    (element) => element.closest(`.${GHOST_CLASS}`) === null,
  );

const clean = (clone: HTMLElement, width: number, height: number): void => {
  clone.querySelectorAll(`.${GHOST_CLASS}`).forEach((nested) => {
    nested.remove();
  });
  clone.removeAttribute("popover");
  clone.removeAttribute("style");
  clone.classList.remove(MORPHING_CLASS);
  clone.classList.add(GHOST_CLASS);
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.removeAttribute("id");
  clone.removeAttribute("name");
  clone.querySelectorAll("[id], [name]").forEach((element) => {
    element.removeAttribute("id");
    element.removeAttribute("name");
  });
  clone.style.setProperty("inline-size", `${String(width)}px`);
  clone.style.setProperty("block-size", `${String(height)}px`);
};

const scrollStates = (container: Element, clone: Element): ScrollState[] => {
  const copies = Array.from(clone.querySelectorAll("*"));
  return descendants(container).flatMap((live, index) => {
    const copy = copies.at(index);
    if (copy === undefined) return [];
    if (live.scrollTop === 0 && live.scrollLeft === 0) return [];
    return [{ live, copy, top: live.scrollTop, left: live.scrollLeft }];
  });
};

const hollowHidden = ({ live, copy }: ScrollState): void => {
  const view = live.getBoundingClientRect();
  const copies = Array.from(copy.children);
  Array.from(live.children).forEach((child, index) => {
    const twin = copies.at(index);
    const box = child.getBoundingClientRect();
    if (
      twin === undefined ||
      (box.bottom > view.top && box.top < view.bottom)
    ) {
      return;
    }
    twin.replaceChildren();
    if (twin instanceof HTMLElement) {
      twin.style.setProperty("block-size", `${String(box.height)}px`);
    }
  });
};

export const createGhost = (
  container: HTMLElement,
  width: number,
  height: number,
): Ghost | null => {
  const clone = container.cloneNode(true);
  if (!(clone instanceof HTMLElement)) return null;
  clean(clone, width, height);
  const scrolled = scrollStates(container, clone);
  scrolled.forEach(hollowHidden);
  let fade: Animation | null = null;

  const remove = (): void => {
    if (fade !== null) {
      const running = fade;
      fade = null;
      running.cancel();
    }
    clone.remove();
  };

  const show = (): void => {
    container.append(clone);
    scrolled.forEach(({ copy, top, left }) => {
      copy.scrollTop = top;
      copy.scrollLeft = left;
    });
    if (typeof clone.animate !== "function") {
      remove();
      return;
    }
    fade = clone.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: TIMINGS.VIEW_SWITCH_FADE_OUT,
      easing: "linear",
      fill: "forwards",
    });
    void fade.finished.then(remove, remove);
  };

  return { show, remove };
};
