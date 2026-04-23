/**
 * Ethereal Docs — Client-side Rate Limiter
 *
 * Простой in-memory rate limiter для браузерного кода.
 * Защищает от случайных повторных действий пользователя
 * и абуза API с одного клиента.
 *
 * Примечание: серверный rate limiting должен быть настроен
 * на уровне Supabase или Vercel Edge Middleware.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Map хранится в памяти на время сессии
const rateLimitMap = new Map<string, RateLimitEntry>()

/**
 * Проверяет, разрешено ли выполнение действия.
 *
 * @param key          — уникальный ключ действия (напр. 'create-doc')
 * @param maxRequests  — максимум запросов в окне
 * @param windowMs     — размер окна в миллисекундах
 * @returns true если действие разрешено, false если заблокировано
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  // Нет записи или окно сброшено → создаём новую
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  // Лимит исчерпан
  if (entry.count >= maxRequests) {
    return false
  }

  // Увеличиваем счётчик
  entry.count++
  return true
}

/**
 * Возвращает оставшееся время в мс до сброса лимита.
 * Возвращает 0 если лимит не активен.
 */
export function getRateLimitReset(key: string): number {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) return 0
  return Math.max(0, entry.resetTime - now)
}

/**
 * Очищает устаревшие записи.
 * Вызывай периодически, если ключей может быть много.
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}