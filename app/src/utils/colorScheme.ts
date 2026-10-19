import { isDocument, isNode } from "./node";

export type Scheme = "light" | "dark";

export interface ParsedColor {
  readonly luminance: number;
  readonly alpha: number;
}

const DARK_LUMINANCE = 0.179;
const MIN_ALPHA = 0.5;
const DARK_QUERY = "(prefers-color-scheme: dark)";
const FUNCTIONAL = /^(rgba?|color|oklch|oklab|lab|lch)\(([^)]*)\)$/;
const SEPARATORS = /[\s,/]+/;
const OBSERVED_ATTRIBUTES = [
  "class",
  "style",
  "data-theme",
  "data-color-scheme",
];

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

const linearize = (channel: number): number => {
  const value = clamp(channel);
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const srgbLuminance = (red: number, green: number, blue: number): number =>
  0.2126 * linearize(red) +
  0.7152 * linearize(green) +
  0.0722 * linearize(blue);

const toNumber = (token: string, percentScale: number): number => {
  if (token === "none") return 0;
  const value = parseFloat(token);
  return token.endsWith("%") ? (value / 100) * percentScale : value;
};

const readLuminance = (
  name: string,
  tokens: readonly string[],
): number | null => {
  const offset = name === "color" ? 1 : 0;
  if (name === "color" && tokens[0] !== "srgb") return null;
  const first = toNumber(
    tokens[offset] ?? "",
    name === "lab" || name === "lch" ? 100 : 1,
  );
  switch (name) {
    case "rgb":
    case "rgba":
    case "color": {
      const scale = name === "color" ? 1 : 255;
      const channels = [0, 1, 2].map(
        (index) => toNumber(tokens[offset + index] ?? "", scale) / scale,
      );
      const [red = NaN, green = NaN, blue = NaN] = channels;
      return srgbLuminance(red, green, blue);
    }
    case "oklab":
    case "oklch":
      return clamp(first) ** 3;
    default:
      return clamp((first + 16) / 116) ** 3;
  }
};

export function parseCssColor(value: string): ParsedColor | null {
  const text = value.trim().toLowerCase();
  if (text === "transparent") return { luminance: 0, alpha: 0 };
  const match = FUNCTIONAL.exec(text);
  const name = match?.[1];
  const body = match?.[2];
  if (name === undefined || body === undefined) return null;
  const tokens = body.split(SEPARATORS).filter((token) => token !== "");
  const alphaIndex = name === "color" ? 4 : 3;
  const alpha =
    tokens.length > alphaIndex ? toNumber(tokens[alphaIndex], 1) : 1;
  const luminance = readLuminance(name, tokens);
  if (luminance === null || Number.isNaN(luminance) || Number.isNaN(alpha)) {
    return null;
  }
  return { luminance, alpha: clamp(alpha) };
}

const pageScheme = (): Scheme => {
  const declared = getComputedStyle(document.documentElement).getPropertyValue(
    "color-scheme",
  );
  const dark = declared.includes("dark");
  if (!dark) return "light";
  if (!declared.includes("light")) return "dark";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
};

export function detectColorScheme(from: HTMLElement): Scheme {
  if (isNode() || !isDocument()) return "light";
  let element: HTMLElement | null = from;
  while (element !== null) {
    const parsed = parseCssColor(getComputedStyle(element).backgroundColor);
    if (parsed !== null && parsed.alpha >= MIN_ALPHA) {
      return parsed.luminance < DARK_LUMINANCE ? "dark" : "light";
    }
    element = element.parentElement;
  }
  return pageScheme();
}

export function watchColorScheme(onChange: () => void): () => void {
  if (isNode() || !isDocument()) {
    return () => undefined;
  }
  const notify = (): void => {
    onChange();
  };
  const observer = new MutationObserver(notify);
  const options = { attributes: true, attributeFilter: OBSERVED_ATTRIBUTES };
  observer.observe(document.documentElement, options);
  observer.observe(document.body, options);
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", notify);
  return () => {
    observer.disconnect();
    query.removeEventListener("change", notify);
  };
}
