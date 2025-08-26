// src/components/ui/ProLock.tsx
import React, { useState } from 'react'

type IntervalKey = 'monthly' | 'yearly'
type TierKey = 'P20' | 'P50' | 'SPEC_UNLTD' | 'UNLIMITED'

export default function ProLock({
  title = 'Função PRO',
  message = 'Assine para liberar este modo e ter prescrição segura e planos de conduta completos.',
  // defaults pensados para conversão: plano Pro mensal
  defaultTier = 'P50',
  defaultInterval = 'monthly',
  onUpgrade, // opcional: permite sobrescrever a ação de upgrade
}: {
  title?: string
  message?: string
  defaultTier?: TierKey
  defaultInterval?: IntervalKey
  onUpgrade?: () => void | Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function openCheckout() {
    if (onUpgrade) return void onUpgrade()
    try {
      setLoading(true)
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: defaultTier, interval: defaultInterval }),
      })
      if (r.status === 401) {
        window.location.href = '/auth/signin'
        return
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as any))
        alert(j?.error || 'Falha ao iniciar checkout')
        return
      }
      const j = await r.json()
      if (j?.url) window.location.href = j.url
      else alert('Resposta inesperada do checkout')
    } catch (e: any) {
      alert(e?.message || 'Erro ao abrir checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-base bg-panel-2 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-[13px] text-muted">{message}</p>
      <button
        type="button"
        onClick={openCheckout}
        disabled={loading}
        className="mt-3 inline-flex items-center rounded-xl border border-base bg-panel px-3 py-1.5 text-sm hover:bg-panel-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
        aria-busy={loading || undefined}
        aria-label="Desbloquear recursos PRO"
      >
        {loading ? 'Abrindo…' : 'Desbloquear PRO'}
      </button>
    </section>
  )
}