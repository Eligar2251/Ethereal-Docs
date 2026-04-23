import type { NextConfig } from 'next'

// ── Content Security Policy ──────────────────────────────────
// Определяем отдельно для читаемости
const CSP = [
  // Базовый fallback — ничего не разрешаем по умолчанию
  `default-src 'self'`,

  // Скрипты — только свои + Next.js inline (нужен для HMR в dev)
  // 'unsafe-eval' нужен для CodeMirror в dev режиме
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,

  // Стили — unsafe-inline нужен для CSS-in-JS и CSS Modules
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

  // Шрифты — Google Fonts + свои
  `font-src 'self' https://fonts.gstatic.com`,

  // Изображения — свои + Supabase Storage + data: для аватаров
  `img-src 'self' blob: data: https://*.supabase.co`,

  // API запросы — свои + Supabase REST + WebSocket для Realtime
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,

  // Фреймы — полностью запрещены
  `frame-src 'none'`,
  `frame-ancestors 'none'`,

  // Объекты (Flash и т.п.) — запрещены
  `object-src 'none'`,

  // base-href — только свой домен
  `base-uri 'self'`,

  // form-action — только свой домен
  `form-action 'self'`,

  // Обновление небезопасных запросов до HTTPS
  `upgrade-insecure-requests`,
]
  .join('; ')
  .trim()

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ── Уже были ────────────────────────────────────────
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // ── ДОБАВЛЕНО ────────────────────────────────────────

          // HSTS — принудительный HTTPS на 1 год
          // includeSubDomains — все поддомены тоже
          // preload — включение в браузерный preload list
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },

          // CSP — главная защита от XSS
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },

          // Permissions Policy — отключаем неиспользуемые API браузера
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()',
              'payment=()',
              'usb=()',
              'bluetooth=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
            ].join(', '),
          },

          // CORP — защита от cross-origin утечек данных
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },

          // COOP — изолирует browsing context группу
          // Защита от Spectre-подобных атак
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },

          // COEP — требует явного разрешения для cross-origin ресурсов
          // Включаем только если все внешние ресурсы поддерживают CORS
          // Пока ставим require-corp — если сломает шрифты, убери
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },

      // ── Отдельные правила для статики ───────────────────────
      // Статические файлы кэшируем агрессивно
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Статике не нужен CSP
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },

      // ── SVG иконки — отдельная политика ─────────────────────
      {
        source: '/(.*).svg',
        headers: [
          // SVG могут содержать скрипты — блокируем выполнение
          {
            key: 'Content-Security-Policy',
            value: `default-src 'none'; style-src 'unsafe-inline'`,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig