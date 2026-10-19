import { TIMINGS } from "@/constants/timings";
import type { Panel } from "@/types/internal";
import type { MotionMode } from "@/utils/accessibility";
import { commandClassOf } from "./commands";
import type { MenuPanel } from "./types";

export interface PanelSwitcherOptions {
  readonly root: HTMLElement;
  readonly content: HTMLElement;
  readonly days: HTMLElement;
  readonly motion: () => MotionMode;
  readonly createParts: (panel: MenuPanel) => HTMLElement[];
  readonly swap?: (apply: () => void, panel: Panel, previous: Panel) => void;
  readonly onSwitched: (
    panel: Panel,
    previous: Panel,
    hadFocus: boolean,
  ) => void;
}

export interface PanelSwitcher {
  current(): Panel;
  settled(): boolean;
  mount(panel: Panel): void;
  switchTo(panel: Panel): void;
  rebuild(): void;
  entry(): HTMLElement | null;
  destroy(): void;
}

interface Fade {
  readonly animations: readonly Animation[];
  readonly complete: () => void;
}

const TABBABLE_SELECTOR = '[tabindex="0"]';
const PANEL_HEIGHT_PROPERTY = "--dp-ui-panel-height";
const LISTBOX_SELECTOR = '[role="listbox"]';
const OPTION_SELECTOR = '[role="option"]';
const REBUILT_ATTRIBUTE = "data-rebuilt";

export const createPanelSwitcher = (
  options: PanelSwitcherOptions,
): PanelSwitcher => {
  const { root, content, days } = options;
  let displayed: Panel = "days";
  let parts: HTMLElement[] = [];
  let fade: Fade | null = null;

  const activeElement = (): Element | null => root.ownerDocument.activeElement;

  const hide = (panel: Panel): void => {
    if (panel === "days") {
      days.hidden = true;
      return;
    }
    parts.forEach((part) => {
      part.remove();
    });
    parts = [];
  };

  const reveal = (panel: Panel): void => {
    if (panel === "days") {
      days.hidden = false;
      return;
    }
    parts = options.createParts(panel);
    days.after(...parts);
  };

  const finish = (): void => {
    const running = fade;
    if (running === null) return;
    fade = null;
    running.complete();
    running.animations.forEach((animation) => {
      animation.cancel();
    });
  };

  const cancel = (): void => {
    const running = fade;
    fade = null;
    running?.animations.forEach((animation) => {
      animation.cancel();
    });
  };

  const fadeOut = (
    elements: readonly HTMLElement[],
    duration: number,
    complete: () => void,
  ): void => {
    const targets =
      options.motion() !== "none"
        ? elements.filter(
            (element) =>
              !element.hidden && typeof element.animate === "function",
          )
        : [];
    if (targets.length === 0) {
      complete();
      return;
    }
    const animations = targets.map((element) =>
      element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration,
        easing: "linear",
        fill: "forwards",
      }),
    );
    const running: Fade = { animations, complete };
    fade = running;
    void Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (fade === running) finish();
      },
      () => undefined,
    );
  };

  const keepHeight = (): void => {
    const height = days.getBoundingClientRect().height;
    if (height > 0) {
      content.style.setProperty(PANEL_HEIGHT_PROPERTY, `${String(height)}px`);
    }
  };

  const switchTo = (panel: Panel): void => {
    finish();
    const previous = displayed;
    if (panel === previous) return;
    if (previous === "days") keepHeight();
    const hadFocus = root.contains(activeElement());
    const viewSwitch = panel === "input" || previous === "input";
    displayed = panel;
    const run = (): void => {
      const apply = (): void => {
        hide(previous);
        reveal(panel);
        options.onSwitched(panel, previous, hadFocus);
      };
      if (options.swap === undefined) {
        apply();
      } else {
        options.swap(apply, panel, previous);
      }
    };
    if (viewSwitch) {
      run();
      return;
    }
    const leaving = previous === "days" ? [days] : parts;
    fadeOut(leaving, TIMINGS.PANEL_FADE_OUT, run);
  };

  const mount = (panel: Panel): void => {
    cancel();
    if (panel === displayed) return;
    hide(displayed);
    displayed = panel;
    reveal(panel);
  };

  const optionIndex = (element: Element): number => {
    const listbox = element.closest(LISTBOX_SELECTOR);
    if (listbox === null) return -1;
    return Array.from(listbox.querySelectorAll(OPTION_SELECTOR)).indexOf(
      element,
    );
  };

  const findInParts = (
    find: (part: HTMLElement) => HTMLElement | null | undefined,
  ): HTMLElement | null => {
    for (const part of parts) {
      const found = find(part);
      if (found) return found;
    }
    return null;
  };

  const focusTarget = (
    held: string | null,
    option: number,
  ): HTMLElement | null => {
    if (option >= 0) {
      return findInParts((part) =>
        Array.from(part.querySelectorAll<HTMLElement>(OPTION_SELECTOR)).at(
          option,
        ),
      );
    }
    if (held === null) return null;
    return findInParts((part) => part.querySelector<HTMLElement>(`.${held}`));
  };

  const rebuild = (): void => {
    if (displayed === "days" || displayed === "input" || fade !== null) return;
    const active = activeElement();
    const focused =
      active !== null && parts.some((p) => p.contains(active)) ? active : null;
    const held = focused === null ? null : commandClassOf(focused);
    const option = focused === null ? -1 : optionIndex(focused);
    const scrolls = parts.map((part) => part.scrollTop);
    hide(displayed);
    reveal(displayed);
    parts.forEach((part) => {
      part.setAttribute(REBUILT_ATTRIBUTE, "");
    });
    requestAnimationFrame(() => {
      parts.forEach((part, index) => {
        part.scrollTop = scrolls.at(index) ?? part.scrollTop;
      });
    });
    if (focused === null) return;
    focusTarget(held, option)?.focus({ preventScroll: true });
  };

  const entry = (): HTMLElement | null => {
    for (const part of parts) {
      const item = part.querySelector<HTMLElement>(TABBABLE_SELECTOR);
      if (item !== null) return item;
    }
    return null;
  };

  return {
    current: () => displayed,
    settled: () => fade === null,
    mount,
    switchTo,
    rebuild,
    entry,
    destroy: cancel,
  };
};
