// src/instrumentation-client.ts
// Inicialização opcional do Sentry no client.
// Só liga se houver NEXT_PUBLIC_SENTRY_DSN definido.

if (typeof window !== 'undefined') {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (dsn) {
    // Import dinâmico para não pesar bundle de quem não usa
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn,
        tracesSampleRate: 1.0,
        enableLogs: false,
        debug: false,
      })
    }).catch(() => {
      // falha silenciosa
    })
  }
}

// Função no-op para transições de rota (evita erro se Sentry não estiver carregado)
export const onRouterTransitionStart = () => {}