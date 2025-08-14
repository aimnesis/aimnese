// src/pages/auth/signup.tsx
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

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

  useEffect(() => {
    if (!router.isReady) return
    const cb = typeof router.query.callbackUrl === 'string' ? router.query.callbackUrl : '/dashboard'
    try { sessionStorage.setItem('signup_callback', cb) } catch {}
  }, [router.isReady, router.query.callbackUrl])

  const emailValid = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email])
  const pwdValid = useMemo(() => password.length >= 8, [password])
  const nameValid = useMemo(() => name.trim().length >= 3, [name])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (!nameValid) { setError('Informe seu nome completo.'); return }
    if (!emailValid) { setError('Digite um e-mail válido.'); return }
    if (!pwdValid) { setError('A senha deve ter pelo menos 8 caracteres.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          honorific,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data: { userId?: string; error?: string } = await res.json()
      if (!res.ok || !data?.userId) throw new Error(data?.error || 'Falha ao criar conta.')

      try {
        sessionStorage.setItem('signup_email', email.trim().toLowerCase())
        sessionStorage.setItem('signup_password', password)
      } catch {}

      await router.push(`/auth/signup/details?uid=${encodeURIComponent(data.userId)}`)
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-1">Crie sua conta</h1>
      <p className="text-sm text-gray-500 mb-6">Etapa 1 de 2 • Dados básicos</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex gap-2" role="group" aria-label="Perfil">
          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`px-3 py-2 rounded border ${role === 'doctor' ? 'bg-gray-900 text-white' : 'bg-transparent'}`}
            aria-pressed={role === 'doctor'}
          >
            Médico
          </button>
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`px-3 py-2 rounded border ${role === 'student' ? 'bg-gray-900 text-white' : 'bg-transparent'}`}
            aria-pressed={role === 'student'}
          >
            Estudante
          </button>
        </div>

        <fieldset className="flex gap-3">
          <legend className="sr-only">Tratamento</legend>
          <label className="flex items-center gap-2">
            <input name="honorific" type="radio" checked={honorific === 'Dr.'} onChange={() => setHonorific('Dr.')} />
            Dr.
          </label>
          <label className="flex items-center gap-2">
            <input name="honorific" type="radio" checked={honorific === 'Dra.'} onChange={() => setHonorific('Dra.')} />
            Dra.
          </label>
        </fieldset>

        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          aria-invalid={!nameValid && name.length > 0}
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!emailValid && email.length > 0}
        />
        <div className="relative">
          <input
            className="w-full rounded border px-3 py-2 pr-10"
            placeholder="Senha (mín. 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type={showPwd ? 'text' : 'password'}
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!pwdValid && password.length > 0}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded border"
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPwd ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={loading || !nameValid || !emailValid || !pwdValid}
          className="w-full rounded bg-emerald-600 text-white font-semibold py-2 disabled:opacity-60"
        >
          {loading ? 'Enviando…' : 'Próximo'}
        </button>

        <p className="text-xs text-gray-500">
          Ao continuar, você concorda com nossos termos e confirma que não compartilhará dados pessoais de pacientes.
        </p>
      </form>

      <p className="mt-6 text-sm text-gray-600">
        Já tem conta?{' '}
        <a
          className="underline"
          href={`/auth/signin?callbackUrl=${encodeURIComponent(
            (typeof window !== 'undefined' && sessionStorage.getItem('signup_callback')) || '/dashboard'
          )}`}
        >
          Entrar
        </a>
      </p>
    </main>
  )
}