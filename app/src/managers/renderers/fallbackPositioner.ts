import { computePopoverLayout } from "../../utils/popoverLayout";
import { createElement } from "../../utils/dom";

const TOP_VARIABLE = "--dp-ui-popover-top";
const LEFT_VARIABLE = "--dp-ui-popover-left";
const AVAILABLE_HEIGHT_VARIABLE = "--dp-ui-popover-available-height";
const TOKEN_PROBE_STYLE =
  "position:absolute;visibility:hidden;pointer-events:none";
const DEFAULT_GAP = 4;
const DEFAULT_EDGE_MARGIN = 4;
const DEFAULT_MIN_HEIGHT = 160;

interface PopoverMetrics {
  gap: number;
  edgeMargin: number;
  minHeight: number;
}

const readToken = (
  probe: HTMLElement,
  name: string,
  fallback: number,
): number => {
  probe.style.setProperty("max-width", `var(--dp-ui-${name})`);
  const resolved = getComputedStyle(probe).getPropertyValue("max-width");
  const value = resolved.endsWith("px") ? parseFloat(resolved) : NaN;
  return value >= 0 ? value : fallback;
};

const readMetrics = (root: HTMLElement): PopoverMetrics => {
  const probe = createElement("div");
  probe.style.cssText = TOKEN_PROBE_STYLE;
  root.appendChild(probe);
  const metrics = {
    gap: readToken(probe, "popover-gap", DEFAULT_GAP),
    edgeMargin: readToken(probe, "popover-edge-margin", DEFAULT_EDGE_MARGIN),
    minHeight: readToken(probe, "popover-min-height", DEFAULT_MIN_HEIGHT),
  };
  probe.remove();
  return metrics;
};

export const createFallbackPositioner = (
  root: HTMLElement,
  anchor: HTMLElement,
  rtl: boolean,
): { enable(): void; layout(): void } => {
  let metrics: PopoverMetrics | null = null;

  const enable = (): void => {
    const { style } = root;
    style.setProperty("position", "fixed");
    style.setProperty("margin", "0");
    style.setProperty("inset", "auto");
    style.setProperty("top", `var(${TOP_VARIABLE})`);
    style.setProperty("left", `var(${LEFT_VARIABLE})`);
    root.setAttribute("data-positioning", "fallback");
  };

  const layout = (): void => {
    metrics ??= readMetrics(root);
    const documentElement = root.ownerDocument.documentElement;
    root.style.removeProperty(AVAILABLE_HEIGHT_VARIABLE);
    const rect = anchor.getBoundingClientRect();
    const contentWidth = root.offsetWidth;
    const { top, left, placement, availableHeight } = computePopoverLayout({
      anchor: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: 0,
      },
      contentWidth,
      pickerHeight: root.offsetHeight,
      minHeight: metrics.minHeight,
      layoutWidth: documentElement.clientWidth,
      viewport: window.visualViewport ?? {
        width: documentElement.clientWidth,
        height: documentElement.clientHeight,
        offsetLeft: 0,
        offsetTop: 0,
      },
      tokens: {
        gap: metrics.gap,
        edgeMargin: metrics.edgeMargin,
        minWidth: 0,
        maxWidth: contentWidth,
      },
      request: "auto",
      rtl,
      pixelRatio: window.devicePixelRatio || 1,
    });
    root.style.setProperty(TOP_VARIABLE, `${String(top)}px`);
    root.style.setProperty(LEFT_VARIABLE, `${String(left)}px`);
    if (availableHeight !== null) {
      root.style.setProperty(
        AVAILABLE_HEIGHT_VARIABLE,
        `${String(availableHeight)}px`,
      );
    }
    root.setAttribute("data-placement", placement);
  };

  return { enable, layout };
};
