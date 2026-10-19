import type { CoreState } from "../datepicker/CoreState";
import { detectColorScheme } from "../utils/colorScheme";

const CONTAINER_CLASS = "dp-ui__container";
const RTL_CLASS = "dp-ui__container--rtl";
const WHITESPACE = /\s+/;

function splitTokens(cssClass: string): string[] {
  return cssClass.split(WHITESPACE).filter((token) => token !== "");
}

export class ThemeManager {
  private readonly core: CoreState;
  private tokens: readonly string[] = [];

  constructor(core: CoreState) {
    this.core = core;
  }

  applyHost(): void {
    this.core.host.setAttribute("data-theme", this.core.options.theme);
  }

  applyTo(root: HTMLElement): void {
    const { options, input } = this.core;
    root.setAttribute("data-theme", options.theme);
    root.setAttribute(
      "data-color-scheme",
      options.colorScheme === "auto"
        ? detectColorScheme(this.core.host)
        : options.colorScheme,
    );
    root.classList.remove(...this.tokens);
    this.tokens = splitTokens(options.cssClass);
    root.classList.add(...this.tokens);
    const container = root.classList.contains(CONTAINER_CLASS)
      ? root
      : root.querySelector(`.${CONTAINER_CLASS}`);
    container?.classList.toggle(
      RTL_CLASS,
      getComputedStyle(input).direction === "rtl",
    );
  }

  destroy(): void {
    this.core.host.removeAttribute("data-theme");
    this.tokens = [];
  }
}
