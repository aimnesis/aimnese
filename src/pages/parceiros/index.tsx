// src/pages/parceiros/index.tsx
import { useState } from 'react'
import Layout from '@/components/Layout'

export default function Partners() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)

    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    const r = await fetch('/api/partners/apply', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data),
    })
    const j = await r.json()
    setLoading(false)
    if (!r.ok) return setError(j?.error || 'Falha ao enviar inscrição.')
    setDone(true)
  }

  if (done) {
    return (
      <Layout title="Programa de Parceiros — Inscrição recebida" description="Parceria Aimnesis">
        <main className="min-h-[100dvh] bg-app">
          <section className="mx-auto max-w-xl px-4 sm:px-6 py-16">
            <h1 className="text-[26px] font-semibold tracking-tight">Inscrição recebida 🎉</h1>
            <p className="mt-2 text-muted">Em breve enviaremos os próximos passos do programa de parceiros.</p>
          </section>
        </main>
      </Layout>
    )
  }

  return (
    <Layout title="Programa de Parceiros" description="Comissão recorrente ao indicar médicos para a Aimnesis.">
      <main className="min-h-[100dvh] bg-app">
        <section className="mx-auto max-w-xl px-4 sm:px-6 py-14 sm:py-16">
          <h1 className="text-[clamp(24px,3.2vw,32px)] font-semibold tracking-tight">Programa de Parceiros</h1>
          <p className="mt-2 text-[15.5px] text-muted leading-relaxed">
            Ganhe comissão recorrente por cada assinatura ativa indicada. Indicado para clínicas, influenciadores e redes médicas.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="rounded-2xl border border-base bg-panel p-4 sm:p-5 space-y-3">
              <input name="name" required placeholder="Nome completo *" className="w-full rounded-xl border border-base bg-app p-3" />
              <input name="email" required type="email" placeholder="E-mail *" className="w-full rounded-xl border border-base bg-app p-3" />
              <input name="phone" placeholder="Telefone (opcional)" className="w-full rounded-xl border border-base bg-app p-3" />
              <input name="crm" placeholder="CRM (se médico)" className="w-full rounded-xl border border-base bg-app p-3" />
              <input name="company" placeholder="Clínica/Empresa (opcional)" className="w-full rounded-xl border border-base bg-app p-3" />
              <textarea name="message" placeholder="Contexto (opcional)" className="h-28 w-full rounded-xl border border-base bg-app p-3" />
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="pt-2">
                <button
                  disabled={loading}
                  className="btn rounded-full h-11 px-7 shadow-soft focus-visible:ring-2 disabled:opacity-60"
                >
                  {loading ? 'Enviando…' : 'Quero ser parceiro'}
                </button>
              </div>
            </div>
          </form>

          <p className="mt-3 text-[13.5px] text-muted">
            Ao enviar, você concorda com os termos do programa e nossa política de privacidade.
          </p>
        </section>
      </main>
    </Layout>
  )
}