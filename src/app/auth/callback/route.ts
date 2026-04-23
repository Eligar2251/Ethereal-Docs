import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/securityLog'

/**
 * Валидирует параметр `next` — разрешает только внутренние пути.
 *
 * Защита от open redirect атак:
 *   //evil.com   → /
 *   /\evil.com   → /
 *   https://evil → /
 *   /editor      → /editor ✅
 */
function sanitizeRedirectPath(next: string | null): string {
  if (!next) return '/'

  try {
    const trimmed = next.trim()

    // Разрешаем только пути начинающиеся строго с одного /
    if (
      !trimmed.startsWith('/') ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/\\')
    ) {
      // ── ИСПРАВЛЕНО: логируем попытку open redirect ───────────
      logSecurityEvent('open-redirect-attempt', {
        attempted: trimmed,
        source: 'auth-callback',
      })
      return '/'
    }

    // Проверяем через URL API
    const url = new URL(trimmed, 'http://localhost')

    if (url.origin !== 'http://localhost') {
      logSecurityEvent('open-redirect-attempt', {
        attempted: trimmed,
        resolvedOrigin: url.origin,
        source: 'auth-callback',
      })
      return '/'
    }

    // Только безопасные символы в пути
    const safePath = /^[a-zA-Z0-9\-_/.?=&%#]+$/
    if (!safePath.test(trimmed)) {
      logSecurityEvent('open-redirect-attempt', {
        attempted: trimmed,
        reason: 'unsafe-characters',
        source: 'auth-callback',
      })
      return '/'
    }

    return trimmed
  } catch {
    return '/'
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')

  const next = sanitizeRedirectPath(rawNext)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    // ── ИСПРАВЛЕНО: логируем неудачную попытку auth ──────────
    logSecurityEvent('auth-callback-failed', {
      error: error.message,
      code: error.status,
    })
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=auth_callback_failed`
  )
}