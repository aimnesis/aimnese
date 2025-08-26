// src/pages/settings/index.tsx
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import Topbar from '@/components/ui/Topbar'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  if (!session?.user?.email) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }
  return { props: {} }
}

export default function SettingsHome() {
  return (
    <>
      <Head><title>Configurações · Aimnesis</title></Head>
      <main className="min-h-[100dvh] bg-app">
        <Topbar title="Configurações" />
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <section className="panel p-6">
            <h1 className="text-lg font-semibold">Configurações</h1>
            <p className="text-sm text-muted mt-1">Gerencie seu perfil e assinatura.</p>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <Link href="/settings/profile" className="card p-4 hover:shadow-soft transition">
                <div className="text-base font-semibold">Perfil</div>
                <div className="text-sm text-muted">Nome, CRM e verificação</div>
              </Link>
              <Link href="/settings/billing" className="card p-4 hover:shadow-soft transition">
                <div className="text-base font-semibold">Assinatura</div>
                <div className="text-sm text-muted">Plano PRO e pagamentos</div>
              </Link>
            </div>

            <div className="mt-5 text-sm">
              <Link href="/dashboard" className="underline">← Voltar ao Dashboard</Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}