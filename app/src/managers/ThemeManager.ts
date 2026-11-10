import type { CoreState } from "../datepicker/CoreState";
import { detectColorScheme } from "../utils/colorScheme";
import { applyTheme } from "../utils/theme";

export class ThemeManager {
  private readonly core: CoreState;

  constructor(core: CoreState) {
    this.core = core;
  }

  applyHost(): void {
    this.core.host.setAttribute("data-theme", this.core.options.theme);
  }

  applyTo(root: HTMLElement): void {
    const { options, input, host } = this.core;
    applyTheme(root, {
      theme: options.theme,
      colorScheme:
        options.colorScheme === "auto"
          ? detectColorScheme(host)
          : options.colorScheme,
      className: options.cssClass,
      rtl: getComputedStyle(input).direction === "rtl",
    });
  }

  destroy(): void {
    this.core.host.removeAttribute("data-theme");
  }
}
