// src/pages/auth/signup/details.tsx
import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import specialties from '@/data/specialties.json'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

export default function SignUpStep2() {
  const router = useRouter()
  const userId = useMemo(() => String(router.query.uid || ''), [router.query.uid])

  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [crm, setCrm] = useState('')
  const [crmUf, setCrmUf] = useState<string>('SP')
  const [specialty, setSpecialty] = useState<string>('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // força apenas 11 dígitos no CPF
  function handleCpf(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    setCpf(digits)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { setError('Sessão de cadastro perdida. Recomece.'); return }
    if (!terms) { setError('Aceite os termos para continuar.'); return }
    setError(null); setLoading(true)
    try {
      const res = await fetch('/api/auth/register-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          cpf,
          crm,
          crmUF: crmUf,
          specialty,
          phone, // opcionalmente salvar também
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao concluir cadastro')
      // login automático (credentials)
      const email = sessionStorage.getItem('signup_email') || ''
      const password = sessionStorage.getItem('signup_password') || ''
      if (email && password) {
        await signIn('credentials', { email, password, callbackUrl: '/dashboard' })
      } else {
        router.push('/auth/signin')
      }
    } catch (err:any) {
      setError(err?.message || 'Erro inesperado')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl">
        <div className="flex flex-col items-center pt-8">
          <Image src="/logo-aimnesis.svg" alt="Aimnesis" width={72} height={72} priority />
          <h1 className="mt-4 text-xl font-semibold text-center">Dados profissionais</h1>
          <p className="mt-1 mb-6 text-sm text-center text-neutral-500">Etapa 2 de 2</p>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="Telefone celular (DDD + número)"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="CPF (11 dígitos)"
            value={cpf}
            onChange={(e)=>handleCpf(e.target.value)}
            inputMode="numeric"
            pattern="\d{11}"
            title="Digite 11 dígitos"
          />

          {/* Campo de nascimento removido */}

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
              placeholder="CRM"
              value={crm}
              onChange={(e)=>setCrm(e.target.value)}
            />
            <select
              className="w-28 rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
              value={crmUf}
              onChange={(e)=>setCrmUf(e.target.value)}
            >
              {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          <select
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            value={specialty}
            onChange={(e)=>setSpecialty(e.target.value)}
          >
            <option value="">Especialidade</option>
            {(specialties as string[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={terms} onChange={(e)=>setTerms(e.target.checked)} />
            <span>
              Aceito os <Link href="/terms" className="text-emerald-600 hover:underline">termos de uso</Link> e a{' '}
              <Link href="/privacy" className="text-emerald-600 hover:underline">política de privacidade</Link>.
            </span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 transition"
          >
            {loading ? 'Enviando…' : 'Criar conta'}
          </button>
        </form>
      </div>
    </main>
  )
}