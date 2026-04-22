/**
 * Ethereal Docs — Performance utilities
 * All functions are pure and side-effect free unless noted.
 */

/**
 * Debounce — delays invoking fn until after wait ms have elapsed
 * since the last time it was invoked. Returns a stable ref-safe version.
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/**
 * Throttle — invokes fn at most once per limit ms.
 * Used for scroll/resize handlers.
 */
export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return function (...args: Parameters<T>) {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Check if the browser supports the CSS `will-change` property.
 * Use before setting will-change on elements.
 */
export function supportsWillChange(): boolean {
  if (typeof CSS === 'undefined') return false
  return CSS.supports('will-change', 'transform')
}