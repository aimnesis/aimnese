// src/pages/settings/billing.tsx
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import Topbar from '@/components/ui/Topbar'

type SubStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'incomplete'
  | 'canceled'
  | 'paused'
  | 'incomplete_expired'
  | null

type BillingInfo = {
  status: SubStatus
  planName: string | null
  priceCents: number | null
  interval: 'month' | 'year' | null
  currentPeriodEnd: string | null // ISO
  cancelAtPeriodEnd?: boolean | null
}

/** Formata centavos em BRL */
function currencyBRL(cents?: number | null) {
  const v = (cents ?? 0) / 100
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  if (!session?.user?.email) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }
  return { props: {} }
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<BillingInfo | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const r = await fetch('/api/stripe/subscription', { method: 'GET' })
        if (r.status === 401) {
          window.location.href = '/auth/signin'
          return
        }
        if (!r.ok) throw new Error('Falha ao carregar assinatura')
        const j = await r.json()
        const subs = (j?.subscriptions || []) as any[]

        // pega a assinatura ativa/trialing mais recente; fallback para a mais recente de qualquer status
        const byUpdated = (a: any, b: any) =>
          (b?.current_period_end || 0) - (a?.current_period_end || 0)

        const active = subs
          .filter((s) => ['active', 'trialing', 'past_due', 'incomplete'].includes(s?.status))
          .sort(byUpdated)[0] || subs.sort(byUpdated)[0]

        if (!active) {
          setInfo({
            status: null,
            planName: null,
            priceCents: null,
            interval: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: null,
          })
          setLoading(false)
          return
        }

        const price = active?.items?.data?.[0]?.price
        const planName =
          price?.nickname ||
          price?.product?.name ||
          'PRO'

        const interval = price?.recurring?.interval as 'month' | 'year' | undefined
        const priceCents = typeof price?.unit_amount === 'number' ? price.unit_amount : null

        const endUnix = active?.current_period_end
        const cancelAtPeriodEnd = !!active?.cancel_at_period_end

        setInfo({
          status: (active?.status as SubStatus) ?? null,
          planName,
          priceCents,
          interval: interval === 'month' || interval === 'year' ? interval : null,
          currentPeriodEnd: typeof endUnix === 'number' ? new Date(endUnix * 1000).toISOString() : null,
          cancelAtPeriodEnd,
        })
      } catch (e: any) {
        setErr(e?.message || 'Não foi possível carregar sua assinatura.')
        setInfo(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const isActive = info?.status === 'active' || info?.status === 'trialing'
  const renewDate = useMemo(() => {
    if (!info?.currentPeriodEnd) return null
    try {
      return new Date(info.currentPeriodEnd).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }, [info?.currentPeriodEnd])

  async function openPortal() {
    try {
      setPortalLoading(true)
      const r = await fetch('/api/stripe/portal', { method: 'POST' })
      if (r.status === 401) {
        window.location.href = '/auth/signin'
        return
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        alert(j?.error || 'Falha ao abrir portal')
        return
      }
      const j = await r.json()
      if (j?.url) window.location.href = j.url
      else alert('Resposta inesperada do portal')
    } catch (e: any) {
      alert(e?.message || 'Erro ao abrir portal')
    } finally {
      setPortalLoading(false)
    }
  }

  async function goCheckout() {
    // fallback para checkout do plano PRO básico (P50 mensal); pode ajustar UI depois
    try {
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'P50', interval: 'monthly' }),
      })
      if (r.status === 401) {
        window.location.href = '/auth/signin'
        return
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        alert(j?.error || 'Falha ao iniciar assinatura')
        return
      }
      const j = await r.json()
      if (j?.url) window.location.href = j.url
      else alert('Resposta inesperada do checkout')
    } catch (e: any) {
      alert(e?.message || 'Erro ao iniciar assinatura')
    }
  }

  return (
    <>
      <Head><title>Assinatura · Aimnesis</title></Head>

      <main className="min-h-[100dvh] bg-app">
        <Topbar title="Configurações" />

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <section className="panel p-6">
            <h1 className="text-lg font-semibold">Assinatura</h1>

            {loading && (
              <div className="mt-3 text-sm text-muted animate-pulse">Carregando informações de cobrança…</div>
            )}

            {!loading && err && (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
                {err}
              </div>
            )}

            {!loading && !err && (
              <>
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div className="card p-4">
                    <div className="text-xs text-muted mb-1">Plano</div>
                    <div className="text-base font-semibold">{info?.planName || '—'}</div>
                    <div className="text-sm text-muted mt-1">
                      {info?.priceCents
                        ? `${currencyBRL(info.priceCents)} / ${info?.interval === 'year' ? 'ano' : 'mês'}`
                        : '—'}
                    </div>
                  </div>

                  <div className="card p-4">
                    <div className="text-xs text-muted mb-1">Status</div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${
                          isActive
                            ? 'border-green-500 text-green-600'
                            : 'border-zinc-400 text-zinc-600'
                        }`}
                      >
                        {info?.status ?? '—'}
                      </span>
                      {info?.cancelAtPeriodEnd && (
                        <span className="text-xs text-amber-600">cancelamento ao fim do ciclo</span>
                      )}
                    </div>
                    <div className="text-sm text-muted mt-1">
                      {renewDate
                        ? (info?.cancelAtPeriodEnd
                            ? `Acesso até ${renewDate}.`
                            : `Renova em ${renewDate}.`)
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        onClick={openPortal}
                        className="btn-secondary text-sm rounded-xl px-4 py-2"
                        disabled={portalLoading}
                      >
                        {portalLoading ? 'Abrindo…' : 'Gerenciar no Stripe'}
                      </button>
                      <span className="text-xs text-muted">
                        Atualize cartão, recibos e cancelamento no portal.
                      </span>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={goCheckout}
                        className="btn text-sm rounded-xl px-4 py-2"
                      >
                        Assinar PRO
                      </button>
                      <span className="text-xs text-muted">
                        Desbloqueie Copiloto e Prescrição avançada.
                      </span>
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Perguntas frequentes curtas */}
          <section className="panel p-6">
            <h2 className="text-base font-semibold mb-2">Dúvidas rápidas</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Você pode gerenciar a assinatura e notas fiscais no portal do Stripe.</li>
              <li>Cancelamentos têm efeito no fim do ciclo vigente.</li>
              <li>Se tiver problemas com cobrança, escreva para suporte@aimnesis.com.</li>
            </ul>
          </section>

          {/* Link de volta */}
          <div className="text-sm">
            <Link href="/dashboard" className="underline">← Voltar ao Dashboard</Link>
          </div>
        </div>
      </main>
    </>
  )
}