// src/pages/404.tsx
import Head from 'next/head'
import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Não encontrado · Aimnesis</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="min-h-[100dvh] bg-app flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="panel p-6">
            <div className="text-6xl font-bold">404</div>
            <h1 className="mt-2 text-xl font-semibold">Página não encontrada</h1>
            <p className="mt-2 text-sm text-muted">
              O recurso que você procurou não existe ou foi movido.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link
                href="/dashboard"
                className="btn text-sm px-4 py-2 rounded-xl"
              >
                Ir ao Dashboard
              </Link>
              <Link
                href="/"
                className="btn-secondary text-sm px-4 py-2 rounded-xl"
              >
                Home
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">AIMNESIS</p>
        </div>
      </main>
    </>
  )
}