/**
 * Timing constants for animations and delays
 * All values in milliseconds
 *
 * Architecture: No magic numbers - all timing tokens
 */

export const TIMINGS = {
  MODAL_ANIMATION: 100,
  MODAL_REMOVE: 200,
  SCROLLBAR_RESTORE: 200,
  DEFAULT_DELAY: 300,
  ANIMATION_DURATION: 150,
  CALENDAR_TRANSITION: 200,
  SWIPE_SNAP_DURATION: 200,
  SWIPE_BOUNCE_DURATION: 150,
  VIEW_TOGGLE_DURATION: 250,
  VIEW_TOGGLE_STAGGER: 50,
} as const;

export const SWIPE_CONSTANTS = {
  VELOCITY_THRESHOLD: 0.3,
  MIN_DISTANCE_THRESHOLD: 50,
  RESISTANCE_FACTOR: 0.5,
  MAX_MONTHS_JUMP: 1,
  VELOCITY_MULTIPLIER: 3,
} as const;
