export interface SwipeState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  startTime: number;
  lastMoveTime: number;
  lastDeltaX: number;
  direction: "left" | "right" | "none";
}

export interface SwipeConfig {
  enabled: boolean;
  velocity: number;
  snapDuration: number;
  overlapPreview: boolean;
  multipleMonthsJump: boolean;
  touchEnabled: boolean;
  mouseEnabled: boolean;
  threshold: number;
  resistance: number;
}

export function createInitialSwipeState(): SwipeState {
  return {
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    startTime: 0,
    lastMoveTime: 0,
    lastDeltaX: 0,
    direction: "none",
  };
}
