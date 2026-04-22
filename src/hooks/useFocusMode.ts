import { useEffect, useRef, useCallback, useState } from 'react'

interface UseFocusModeOptions {
  enabled: boolean
  /** ms of inactivity before UI fades. Default: 1500 */
  idleDelay?: number
}

interface UseFocusModeReturn {
  isFocused: boolean
  containerProps: {
    onMouseMove: () => void
    onKeyDown: () => void
  }
}

export function useFocusMode({
  enabled,
  idleDelay = 1500,
}: UseFocusModeOptions): UseFocusModeReturn {
  const [isFocused, setIsFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const resetTimer = useCallback(() => {
    if (!enabled) return

    // User is active — show UI
    if (mountedRef.current) setIsFocused(false)

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      if (mountedRef.current) setIsFocused(true)
    }, idleDelay)
  }, [enabled, idleDelay])

  // When focus mode is disabled, always show UI
  useEffect(() => {
    if (!enabled) {
      setIsFocused(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled])

  return {
    isFocused,
    containerProps: {
      onMouseMove: resetTimer,
      onKeyDown: resetTimer,
    },
  }
}