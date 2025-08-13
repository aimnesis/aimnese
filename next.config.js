/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // (Opcional) se quiser evitar ruído no dev dentro da Vercel CLI
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.infrastructureLogging = { level: 'error' };
    }
    return config;
  },
};

// ---- Wrap Sentry apenas se instalado e configurado ----
let finalConfig = nextConfig;

try {
  // Ativa Sentry somente quando existir DSN (ou quando você quiser sempre ligar)
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // require dentro do try evita erro de import/duplicação
    const { withSentryConfig } = require('@sentry/nextjs');
    finalConfig = withSentryConfig(nextConfig, {
      silent: true, // menos logs de build
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    });
  }
} catch (e) {
  // Se @sentry/nextjs não estiver instalado, seguimos com nextConfig puro
  // console.warn('Sentry desativado no build:', e);
}

module.exports = finalConfig;