/**
 * SSR-safe DOM utilities
 * Guard all DOM access for Node.js environment safety
 */

/**
 * Check if document is available (SSR-safe)
 */
export function isDocument(): boolean {
  return typeof document !== 'undefined';
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if window is available (SSR-safe)
 */
export function isWindow(): boolean {
  return typeof window !== 'undefined';
}
