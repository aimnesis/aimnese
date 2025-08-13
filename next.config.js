// next.config.js
/** @type {import('next').NextConfig} */

// tenta carregar o plugin do Sentry; se não estiver instalado, vira no-op
const withSentryConfig = (() => {
  try {
    return require('@sentry/nextjs').withSentryConfig
  } catch {
    return (cfg) => cfg
  }
})()

const nextConfig = {
  reactStrictMode: true,

  // gera sourcemaps de produção (útil p/ Sentry). Se não usar Sentry, pode manter assim mesmo.
  productionBrowserSourceMaps: true,

  // ajuste seu allowlist de imagens quando precisar
  images: { domains: [] },

  // tweaks de DX p/ evitar erros chatos em dev
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false // evita "Unable to snapshot build dependencies"
      config.infrastructureLogging = { level: 'error' }
    }
    return config
  },
}

// opções do plugin do Sentry (se instalado)
const sentryWebpackPluginOptions = {
  silent: true,
  // estes 3 são opcionais; só fazem efeito se você depois quiser subir sourcemaps automaticamente:
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
}

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "aimnesis",
    project: "javascript-nextjs",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
