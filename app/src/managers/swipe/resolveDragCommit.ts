import { GESTURE } from "@/constants/timings";

const commitTowardsNext = (
  dx: number,
  velocity: number,
  width: number,
): -1 | 0 | 1 => {
  if (velocity < -GESTURE.FLICK_VELOCITY) return 1;
  if (velocity > GESTURE.FLICK_VELOCITY) return -1;
  const threshold = width * GESTURE.COMMIT_FRACTION;
  if (dx < -threshold) return 1;
  if (dx > threshold) return -1;
  return 0;
};

export const resolveDragCommit = (
  dx: number,
  velocity: number,
  width: number,
  rtl: boolean,
): -1 | 0 | 1 => {
  const direction = commitTowardsNext(dx, velocity, width);
  if (!rtl || direction === 0) return direction;
  return direction === 1 ? -1 : 1;
};
