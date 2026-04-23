import type { NextConfig } from 'next'

// ── Dev/Prod режим ───────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development'

// ── Content Security Policy ──────────────────────────────────
const CSP = [
  // Базовый fallback
  `default-src 'self'`,

  // В production убираем unsafe-eval (нужен только для HMR в dev)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,

  // Стили — unsafe-inline нужен для CSS Modules
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

  // Шрифты
  `font-src 'self' https://fonts.gstatic.com data:`,

  // Изображения
  `img-src 'self' blob: data: https://*.supabase.co`,

  // API запросы + Supabase WebSocket
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,

  // Фреймы — запрещены
  `frame-src 'none'`,
  `frame-ancestors 'none'`,

  // Объекты — запрещены
  `object-src 'none'`,

  // base-href
  `base-uri 'self'`,

  // form-action
  `form-action 'self'`,

  // HTTPS
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
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // ── ИСПРАВЛЕНО: X-XSS-Protection deprecated, ставим 0 ──
          // Современные браузеры его игнорируют или он сам создаёт
          // уязвимости. CSP уже обеспечивает защиту от XSS.
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // HSTS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // CSP — с разделением dev/prod
          {
            key: 'Content-Security-Policy',
            value: CSP,
          },
          // Permissions Policy
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
          // CORP
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // COOP
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // ── ИСПРАВЛЕНО: require-corp → credentialless ──────────
          // require-corp блокирует Google Fonts (fonts.gstatic.com
          // не отдаёт CORP заголовок). credentialless разрешает
          // cross-origin ресурсы без credentials и совместим с
          // Google Fonts и Supabase Storage.
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },

      // Статика — агрессивное кэширование
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },

      // SVG — отдельная CSP политика
      {
        source: '/(.*).svg',
        headers: [
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