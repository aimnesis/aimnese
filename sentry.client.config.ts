// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.25, // ajuste depois (0.05–0.2 em prod normalmente)
  replaysSessionSampleRate: 0.0, // opcional (Sentry Replay)
  replaysOnErrorSampleRate: 0.0,
  integrations: [],
  // tags úteis
  environment: process.env.NODE_ENV,
})