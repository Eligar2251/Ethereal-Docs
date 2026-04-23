/**
 * Ethereal Docs — Security Event Logger
 *
 * Централизованное логирование событий безопасности.
 * В production легко заменяется на Sentry, Datadog и т.п.
 */

type SecurityEventType =
  | 'open-redirect-attempt'
  | 'unauthenticated-save-attempt'
  | 'unauthenticated-delete-attempt'
  | 'content-size-exceeded'
  | 'invalid-settings-values'
  | 'rate-limit-exceeded'
  | 'auth-callback-failed'
  | 'invalid-file-name'

interface SecurityEvent {
  type: SecurityEventType
  timestamp: string
  details: Record<string, unknown>
}

/**
 * Логирует событие безопасности.
 * В production подключи внешний сервис мониторинга.
 */
export function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, unknown> = {}
): void {
  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    details,
  }

  // В dev — подробный вывод в консоль
  if (process.env.NODE_ENV === 'development') {
    console.warn('[SECURITY EVENT]', event)
    return
  }

  // В production — только краткое предупреждение
  // (не раскрываем детали в клиентской консоли)
  console.warn(`[SECURITY] ${type} at ${event.timestamp}`)

  // TODO: отправить в Sentry/Datadog/LogRocket:
  // Sentry.captureEvent({
  //   message: `Security Event: ${type}`,
  //   level: 'warning',
  //   extra: details,
  // })
}