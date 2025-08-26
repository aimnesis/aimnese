import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { signIn } from 'next-auth/react'

type IntervalKey = 'monthly' | 'yearly' | 'devpass'

type SubView = {
  id: string
  status: string
  plan: 'FREE' | 'PRO'
  interval: 'day' | 'week' | 'month' | 'year' | null
  currentPeriodEnd?: string | null
  priceId?: string | null
  productId?: string | null
  currency?: string | null
  priceAmount?: number | null
  source?: 'db' | 'stripe'
}

export default function PricingPage() {
  const [interval, setInterval] = useState<IntervalKey>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [sub, setSub] = useState<SubView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  // PREÇOS DE VITRINE (não afetam o valor real do Stripe)
  const displayMonthly = process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY || 'R$ 99/mês'
  const displayYearly = process.env.NEXT_PUBLIC_PRICE_PRO_YEARLY || 'R$ 999/ano'
  const displayPrice = useMemo(
    () => (interval === 'monthly' ? displayMonthly : displayYearly),
    [interval, displayMonthly, displayYearly],
  )

  // Carrega sessão e assinatura
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => setSessionEmail(s?.user?.email ?? null))
      .catch(() => setSessionEmail(null))

    fetch('/api/stripe/subscription')
      .then(async (r) => {
        if (!r.ok) throw r
        const j = await r.json()
        setSub(j?.subscription || null)
      })
      .catch(async (err: Response | any) => {
        if (err?.status && (err.status === 401 || err.status === 404)) {
          setSub(null)
          return
        }
        setError('Não foi possível carregar sua assinatura agora.')
      })
  }, [])

  async function checkout(i: IntervalKey) {
    setError(null); setLoading(`checkout-${i}`)
    try {
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: i }),
      })
      const j = await r.json().catch(() => ({}))
      setLoading(null)
      if (!r.ok || !j?.url) {
        if (r.status === 401) {
          await signIn(undefined, { callbackUrl: '/pricing' })
          return
        }
        throw new Error(j?.error || 'Falha no checkout')
      }
      window.location.href = j.url
    } catch (e: any) {
      setLoading(null)
      setError(e?.message || 'Erro inesperado no checkout')
    }
  }

  async function openPortal() {
    setError(null); setLoading('portal')
    try {
      const r = await fetch('/api/stripe/portal', { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      setLoading(null)
      if (!r.ok || !j?.url) {
        if (r.status === 401) {
          await signIn(undefined, { callbackUrl: '/pricing' })
          return
        }
        throw new Error(j?.error || 'Falha ao abrir o portal')
      }
      window.location.href = j.url
    } catch (e: any) {
      setLoading(null)
      setError(e?.message || 'Erro inesperado ao abrir o portal')
    }
  }

  const isPRO = sub?.plan === 'PRO'
  const renewAt = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : null

  const sessionBadge = sessionEmail
    ? `Sessão: ${sessionEmail} • ${isPRO ? 'PRO' : 'FREE'}`
    : 'Sessão: visitante • FREE'

  return (
    <Layout title="Planos e Preços" description="Escolha o plano ideal no Aimnesis.">
      <main className="min-h-[100dvh] bg-app">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
          <header className="text-center">
            <h1 className="text-[clamp(28px,6vw,44px)] font-semibold tracking-tight">
              Ganhe 1–2 horas por dia no consultório e plantão
            </h1>
            <p className="mt-2 text-[15.5px] text-muted">
              Copiloto clínico com evidências. Relatórios e Prescrições prontos em minutos.
            </p>

            {/* Toggle Mensal/Anual */}
            <div className="mt-6 inline-flex items-center rounded-full border border-base bg-panel p-1">
              <button
                className={`h-10 px-4 rounded-full ${interval === 'monthly' ? 'bg-app shadow-soft' : ''}`}
                onClick={() => setInterval('monthly')}
                aria-pressed={interval === 'monthly'}
              >
                Mensal
              </button>
              <button
                className={`h-10 px-4 rounded-full ${interval === 'yearly' ? 'bg-app shadow-soft' : ''}`}
                onClick={() => setInterval('yearly')}
                aria-pressed={interval === 'yearly'}
              >
                Anual
              </button>
            </div>

            <p className="mt-3 text-[13.5px] text-muted">{sessionBadge}</p>
          </header>

          {error && (
            <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* GRID */}
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {/* FREE */}
            <li className="rounded-2xl border border-base bg-panel p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-semibold tracking-tight">Gratuito</h3>
                <span className="rounded-full border border-base px-3 py-1 text-[12px]">RECOMENDADO PARA TESTAR</span>
              </div>
              <p className="mt-1 text-[14.5px] text-muted">Explore o Aimnesis sem custo.</p>

              <div className="mt-4">
                <div className="text-[28px] font-semibold leading-none">R$ 0</div>
                <div className="mt-1 text-[13.5px] text-muted">acesso imediato</div>
              </div>

              <ul className="mt-4 space-y-2 text-[14px]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Modo <strong>Geral</strong> ilimitado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Modo <strong>Estudos</strong> ilimitado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Relatórios básicos e exportação</span>
                </li>
              </ul>

              <div className="mt-6">
                <a href="/dashboard" className="btn rounded-full h-11 px-6 w-full shadow-soft inline-grid place-items-center">
                  Usar grátis agora
                </a>
              </div>
            </li>

            {/* PRO */}
            <li className="rounded-2xl border border-base bg-panel p-5 sm:p-6 flex flex-col relative overflow-hidden">
              <div className="absolute right-4 top-4 hidden sm:block">
                <span className="rounded-full bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[12px]">MAIS POPULAR</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[18px] font-semibold tracking-tight">PRO</h3>
                <span className="rounded-full border border-base px-3 py-1 text-[12px]">PLANO ÚNICO</span>
              </div>
              <p className="mt-1 text-[14.5px] text-muted">Todos os modos + ferramentas profissionais.</p>

              <div className="mt-4">
                <div className="text-[28px] font-semibold leading-none">{displayPrice}</div>
                <div className="mt-1 text-[13.5px] text-muted">preço exibido no checkout</div>
              </div>

              <ul className="mt-4 space-y-2 text-[14px]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Plantão, Consultório, Especialidades, Análise+Prescrição</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>Resumos de diretrizes + links de evidência</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>LGPD • Voz 60 min • Suporte prioritário</span>
                </li>
              </ul>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => checkout('monthly')}
                  disabled={loading === 'checkout-monthly' || isPRO}
                  className="btn rounded-full h-11 px-6 w-full shadow-soft disabled:opacity-60"
                >
                  {isPRO ? 'Você já é PRO' : (loading === 'checkout-monthly' ? 'Abrindo…' : 'Assinar Mensal')}
                </button>
                <button
                  onClick={() => checkout('yearly')}
                  disabled={loading === 'checkout-yearly' || isPRO}
                  className="btn rounded-full h-11 px-6 w-full shadow-soft disabled:opacity-60"
                >
                  {isPRO ? 'Você já é PRO' : (loading === 'checkout-yearly' ? 'Abrindo…' : 'Assinar Anual')}
                </button>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => checkout('devpass')}
                  disabled={loading === 'checkout-devpass' || isPRO}
                  className="btn rounded-full h-11 px-6 w-full shadow-soft disabled:opacity-60"
                >
                  {isPRO ? 'Você já é PRO' : (loading === 'checkout-devpass' ? 'Abrindo…' : 'Assinar DevPass (R$ 5)')}
                </button>
              </div>

              {sub && (
                <p className="mt-3 text-[13px] text-muted">
                  Assinatura: <span className="font-medium">{sub.plan} • {sub.status}</span>
                  {renewAt ? <> • renova em {renewAt}</> : null}
                </p>
              )}

              <div className="mt-4">
                <button
                  onClick={openPortal}
                  disabled={loading === 'portal'}
                  className="rounded-full h-11 px-7 inline-grid place-items-center border border-base bg-panel hover:bg-panel/80 disabled:opacity-60"
                >
                  {loading === 'portal' ? 'Abrindo…' : 'Gerenciar assinatura'}
                </button>
              </div>
            </li>
          </ul>

          {/* Blocos extras */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-base bg-panel p-5">
              <h4 className="font-medium">Relatórios e Rx em minutos</h4>
              <p className="mt-1 text-[13.5px] text-muted">Economize 1–2h por dia somando consultório + plantão.</p>
              <a className="mt-4 inline-flex items-center gap-2 text-emerald-500 hover:underline" href="/dashboard">Assinar PRO</a>
            </div>
            <div className="rounded-2xl border border-base bg-panel p-5">
              <h4 className="font-medium">Evidência com links</h4>
              <p className="mt-1 text-[13.5px] text-muted">Diretrizes, doses e fluxos clínicos práticos.</p>
            </div>
            <div className="rounded-2xl border border-base bg-panel p-5">
              <h4 className="font-medium">Sem fidelidade</h4>
              <p className="mt-1 text-[13.5px] text-muted">Cancele quando quiser no portal do assinante.</p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-base bg-panel p-5">
            <h4 className="text-[16px] font-semibold">Perguntas frequentes</h4>
            <ul className="mt-3 space-y-3 text-[14px]">
              <li>
                <p className="font-medium">Posso cancelar quando quiser?</p>
                <p className="text-muted">Sim. O cancelamento vale ao fim do ciclo vigente.</p>
              </li>
              <li>
                <p className="font-medium">Os preços da página são os que pago?</p>
                <p className="text-muted">O valor final sempre aparece no checkout do Stripe.</p>
              </li>
              <li>
                <p className="font-medium">Notas fiscais?</p>
                <p className="text-muted">Você encontra tudo no portal do assinante (Stripe).</p>
              </li>
            </ul>
          </div>

          <p className="mt-8 text-center text-[12.5px] text-muted">
            * Uso sujeito à política justa (fair use) e limites técnicos. O Aimnesis auxilia o médico; a decisão clínica é sempre do profissional.
          </p>
        </section>
      </main>
    </Layout>
  )
}