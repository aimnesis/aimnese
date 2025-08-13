// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR" suppressHydrationWarning>
      <Head>
        {/* Fontes performáticas */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Segurança mínima recomendada para MVP */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            // básico
            "default-src 'self'",
            // imagens e mídia (permite data: e blob: p/ uploads e gravação)
            "img-src * data: blob:",
            "media-src * blob:",
            // conexões (APIs, WebSocket, analytics se houver)
            "connect-src *",
            // scripts e estilos (Next.js + Google Fonts)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src https://fonts.gstatic.com",
          ].join('; ')}
        />
        <meta name="referrer" content="no-referrer" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#0b0f10" />
      </Head>

      <body className="min-h-[100dvh]">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}