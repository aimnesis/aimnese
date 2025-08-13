/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  images: { domains: ['avatars.githubusercontent.com'] },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
      config.infrastructureLogging = { level: 'error' }
    }
    return config
  },
}

let nextConfig = baseConfig

try {
  const { withSentryConfig } = require('@sentry/nextjs')
  nextConfig = withSentryConfig(baseConfig, {
    silent: true,
  }, {
    hideSourceMaps: true,
  })
} catch {
  // Sentry não instalado/sem DSN — segue sem ele
}

module.exports = nextConfig