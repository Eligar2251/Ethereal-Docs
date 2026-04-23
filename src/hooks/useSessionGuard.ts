import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseSessionGuardReturn {
  sessionExpired: boolean
  sessionChecked: boolean
}

export function useSessionGuard(): UseSessionGuardReturn {
  const [sessionExpired, setSessionExpired] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const supabase = createClient()

    // Проверяем локальную сессию сразу — без сетевого запроса
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return

      if (!session) {
        setSessionExpired(true)
      }

      setSessionChecked(true)
    })

    // Подписываемся на изменения состояния сессии
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return

        if (
          event === 'SIGNED_OUT' ||
          event === 'TOKEN_REFRESHED' && !session
        ) {
          setSessionExpired(true)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' && session) {
          setSessionExpired(false)
          return
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  return { sessionExpired, sessionChecked }
}