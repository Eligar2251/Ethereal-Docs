import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Валидирует параметр `next` — разрешает только внутренние пути.
 * Защита от open redirect атак:
 *   //evil.com  → /
 *   /\evil.com  → /
 *   https://evil.com → /
 *   /editor     → /editor  ✅
 */
function sanitizeRedirectPath(next: string | null): string {
  if (!next) return '/'

  try {
    // Убираем лишние пробелы
    const trimmed = next.trim()

    // Разрешаем только пути начинающиеся с одного /
    // Запрещаем // (protocol-relative) и /\ (path traversal)
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
      return '/'
    }

    // Проверяем через URL API — путь должен быть внутренним
    const url = new URL(trimmed, 'http://localhost')

    // Если origin изменился — это внешний редирект
    if (url.origin !== 'http://localhost') {
      return '/'
    }

    // Разрешаем только безопасные пути (буквы, цифры, /, -, _, .)
    const safePath = /^[a-zA-Z0-9\-_/.?=&%#]+$/
    if (!safePath.test(trimmed)) {
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

  // ── ИСПРАВЛЕНО: санитизация пути редиректа ──────────────────
  const next = sanitizeRedirectPath(rawNext)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}