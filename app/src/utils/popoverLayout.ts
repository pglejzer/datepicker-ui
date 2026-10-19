export type PopoverSide = "top" | "bottom";

export type PopoverRequest = PopoverSide | "auto";

export type PopoverAnchorRect = Pick<
  DOMRectReadOnly,
  "top" | "bottom" | "left" | "right" | "width"
>;

export interface PopoverViewport {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface PopoverTokens {
  gap: number;
  minWidth: number;
  maxWidth: number;
  edgeMargin: number;
}

export interface PopoverLayoutInput {
  anchor: PopoverAnchorRect;
  contentWidth: number;
  pickerHeight: number;
  minHeight: number;
  layoutWidth: number;
  viewport: PopoverViewport;
  tokens: PopoverTokens;
  request: PopoverRequest;
  rtl: boolean;
  pixelRatio: number;
}

export interface PopoverLayout {
  top: number;
  left: number;
  width: number;
  placement: PopoverSide;
  availableHeight: number | null;
}

const snapToPixel = (value: number, pixelRatio: number): number =>
  Math.round(value * pixelRatio) / pixelRatio;

export function computePopoverLayout({
  anchor,
  contentWidth,
  pickerHeight,
  minHeight,
  layoutWidth,
  viewport,
  tokens,
  request,
  rtl,
  pixelRatio,
}: PopoverLayoutInput): PopoverLayout {
  const { gap, minWidth, maxWidth, edgeMargin } = tokens;
  const { offsetLeft, offsetTop } = viewport;
  const width = snapToPixel(
    Math.min(
      Math.max(anchor.width, minWidth, contentWidth),
      maxWidth,
      layoutWidth - 2 * edgeMargin,
    ),
    pixelRatio,
  );
  const minTop = offsetTop + edgeMargin;
  const spaceAbove = anchor.top - gap - minTop;
  const spaceBelow =
    offsetTop + viewport.height - edgeMargin - anchor.bottom - gap;
  const fitsBelow = pickerHeight <= spaceBelow;
  const fitsAbove = pickerHeight <= spaceAbove;
  const autoPlacement: PopoverSide =
    fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove) ? "bottom" : "top";
  const requested = request === "auto" ? autoPlacement : request;
  const isTopRequested = requested === "top";
  const requestedSpace = isTopRequested ? spaceAbove : spaceBelow;
  const otherSpace = isTopRequested ? spaceBelow : spaceAbove;
  const isCramped =
    requestedSpace < Math.min(pickerHeight, minHeight) &&
    otherSpace > requestedSpace;
  const isTop = isCramped ? !isTopRequested : isTopRequested;
  const placement: PopoverSide = isTop ? "top" : "bottom";
  const space = isTop ? spaceAbove : spaceBelow;
  const availableHeight = pickerHeight > space ? Math.max(space, 0) : null;
  const height = availableHeight ?? pickerHeight;
  const top = isTop ? anchor.top - gap - height : anchor.bottom + gap;
  const preferredLeft = rtl ? anchor.right - width : anchor.left;
  const left = Math.max(
    Math.min(preferredLeft, offsetLeft + viewport.width - width - edgeMargin),
    offsetLeft + edgeMargin,
  );

  return {
    top: snapToPixel(Math.max(top, minTop), pixelRatio),
    left: snapToPixel(left, pixelRatio),
    width,
    placement,
    availableHeight,
  };
}
