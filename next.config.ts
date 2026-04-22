import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Убираем предупреждение о workspace root
  outputFileTracingRoot: process.cwd(),

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  experimental: {
    optimizeCss: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig