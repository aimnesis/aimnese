// src/pages/auth/signup.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import Link from 'next/link'

export default function SignUpStep1() {
  const router = useRouter()
  const [role, setRole] = useState<'doctor' | 'student'>('doctor')
  const [honorific, setHonorific] = useState<'Dr.' | 'Dra.'>('Dr.')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const res = await fetch('/api/auth/register-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role, honorific,
          // tentamos separar primeiro/último nome se o usuário digitar o completo
          name, email, password
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao criar conta')
      sessionStorage.setItem('signup_email', email)
      sessionStorage.setItem('signup_password', password)
      await router.push(`/auth/signup/details?uid=${encodeURIComponent(data.userId)}`)
    } catch (err:any) {
      setError(err?.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl">
        <div className="flex flex-col items-center pt-8">
          <Image src="/logo-aimnesis.svg" alt="Aimnesis" width={72} height={72} priority />
          <h1 className="mt-4 text-xl font-semibold text-center">Crie sua conta</h1>
          <p className="mt-1 mb-6 text-sm text-center text-neutral-500">
            Etapa 1 de 2 • Dados básicos
          </p>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole('doctor')}
              className={`px-3 py-2 rounded-lg border ${role==='doctor'
                ? 'bg-emerald-600 text-white border-transparent'
                : 'bg-neutral-50 dark:bg-neutral-800 border-black/10 dark:border-white/10'}`}>
              Médico
            </button>
            <button type="button" onClick={() => setRole('student')}
              className={`px-3 py-2 rounded-lg border ${role==='student'
                ? 'bg-emerald-600 text-white border-transparent'
                : 'bg-neutral-50 dark:bg-neutral-800 border-black/10 dark:border-white/10'}`}>
              Estudante
            </button>
          </div>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={honorific==='Dr.'} onChange={() => setHonorific('Dr.')} />
              Dr.
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={honorific==='Dra.'} onChange={() => setHonorific('Dra.')} />
              Dra.
            </label>
          </div>

          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="Nome completo"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            type="email"
          />
          <div className="relative">
            <input
              className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 pr-20"
              placeholder="Senha (mín. 8)"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              type={showPwd ? 'text' : 'password'}
              minLength={8}
            />
            <button
              type="button"
              onClick={()=>setShowPwd(v=>!v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-3 py-1 rounded border border-black/10 dark:border-white/10"
            >
              {showPwd ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 transition"
          >
            {loading ? 'Enviando…' : 'Próximo'}
          </button>

          <p className="text-center text-sm text-neutral-500">
            Já tem conta?{' '}
            <Link href="/auth/signin" className="text-emerald-600 hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </main>
  )
}