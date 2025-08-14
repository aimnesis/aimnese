// src/pages/auth/signup/details.tsx
import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import specialties from '@/data/specialties.json'
import { signIn } from 'next-auth/react'

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export default function SignUpStep2() {
  const router = useRouter()
  const userId = useMemo(() => String(router.query.uid || ''), [router.query.uid])

  const [city, setCity] = useState('')
  const [stateUF, setStateUF] = useState<string>('SP')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [crm, setCrm] = useState('')
  const [crmUF, setCrmUF] = useState<string>('SP')
  const [specialty, setSpecialty] = useState<string>('')
  const [terms, setTerms] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { setError('Sessão de cadastro perdida. Recomece.'); return }
    if (!terms) { setError('Você precisa aceitar os termos.'); return }

    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: undefined,   // opcional: se quiser salvar "Dr./Dra."
          cpf,
          birthDate,
          crm,
          crmUF,
          specialty,
          city,
          stateUF,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao concluir cadastro')

      const email = sessionStorage.getItem('signup_email') || ''
      const password = sessionStorage.getItem('signup_password') || ''
      const callback = sessionStorage.getItem('signup_callback') || '/dashboard'

      if (email && password) {
        await signIn('credentials', { email, password, callbackUrl: callback })
      } else {
        router.push('/auth/signin')
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-1">Dados profissionais</h1>
      <p className="text-sm text-gray-500 mb-6">Etapa 2 de 2</p>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" placeholder="Cidade onde atende" value={city} onChange={(e)=>setCity(e.target.value)} />
          <select className="w-28 rounded border px-3 py-2" value={stateUF} onChange={(e)=>setStateUF(e.target.value)}>
            {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <input className="w-full rounded border px-3 py-2" placeholder="CPF" value={cpf} onChange={(e)=>setCpf(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} />

        <div className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" placeholder="CRM" value={crm} onChange={(e)=>setCrm(e.target.value)} />
          <select className="w-28 rounded border px-3 py-2" value={crmUF} onChange={(e)=>setCrmUF(e.target.value)}>
            {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        <select className="w-full rounded border px-3 py-2" value={specialty} onChange={(e)=>setSpecialty(e.target.value)}>
          <option value="">Especialidade</option>
          {(specialties as string[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={terms} onChange={(e)=>setTerms(e.target.checked)} />
          Aceito os termos de uso e a política de privacidade.
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button disabled={loading} className="w-full rounded bg-emerald-600 text-white font-semibold py-2">
          {loading ? 'Enviando…' : 'Criar conta'}
        </button>
      </form>
    </main>
  )
}