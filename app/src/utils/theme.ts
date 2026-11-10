import type { ThemeName } from "@/types/options";
import type { Scheme } from "@/utils/colorScheme";

/** Theme settings for a surface root. */
export interface SurfaceTheme {
  /** Theme name, written to `data-theme`. */
  readonly theme: ThemeName;
  /** Resolved scheme, written to `data-color-scheme`. For `"auto"` use `detectColorScheme()`. */
  readonly colorScheme: Scheme;
  /** Extra classes, like `ui.cssClass`. Classes from the previous call are removed. */
  readonly className?: string;
  /** Right-to-left: toggles `dp-ui__container--rtl` on the surface container. */
  readonly rtl?: boolean;
}

const CONTAINER_CLASS = "dp-ui__container";
const RTL_CLASS = "dp-ui__container--rtl";
const WHITESPACE = /\s+/;

const appliedTokens = new WeakMap<HTMLElement, readonly string[]>();

function splitTokens(className: string): readonly string[] {
  return className.split(WHITESPACE).filter((token) => token !== "");
}

/** Applies theme settings to a surface root (`host.root`). Safe to call again. */
export function applyTheme(root: HTMLElement, theme: SurfaceTheme): void {
  root.setAttribute("data-theme", theme.theme);
  root.setAttribute("data-color-scheme", theme.colorScheme);
  root.classList.remove(...(appliedTokens.get(root) ?? []));
  const tokens = splitTokens(theme.className ?? "");
  root.classList.add(...tokens);
  appliedTokens.set(root, tokens);
  const container = root.classList.contains(CONTAINER_CLASS)
    ? root
    : root.querySelector(`.${CONTAINER_CLASS}`);
  container?.classList.toggle(RTL_CLASS, theme.rtl ?? false);
}
