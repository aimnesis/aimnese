// src/pages/auth/signin.tsx
import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import { authOptions } from '@/server/auth'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (session) return { redirect: { destination: '/dashboard', permanent: false } }
  return { props: {} }
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Digite um e-mail válido.')

    setSubmitting(true)
    try {
      const res = await signIn('email', { email, redirect: false })
      if (res?.ok) setSent(true)
      else setError(res?.error || 'Não foi possível enviar o link.')
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Digite um e-mail válido.')
    if (!password || password.length < 8) return setError('Senha inválida.')

    setSubmitting(true)
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/dashboard',
      })
      // se redirect: true, NextAuth redireciona por nós.
      if (res?.error) setError('Credenciais inválidas.')
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Entrar no Aimnesis</h1>

      {/* Login com e-mail + senha */}
      <form onSubmit={handlePasswordLogin} style={{ marginBottom: 24 }}>
        <input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, marginBottom: 12 }}
        />
        {error && (
          <div style={{ color: '#b00020', marginBottom: 12, fontSize: 14 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            background: submitting ? '#999' : '#10b981',
            color: 'white',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Link mágico como alternativa */}
      {sent ? (
        <p>✅ Enviamos um link de acesso para <b>{email}</b>. Confira sua caixa de entrada.</p>
      ) : (
        <form onSubmit={handleMagicLink}>
          <button
            type="submit"
            disabled={submitting || !email}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              background: submitting ? '#999' : '#3b82f6',
              color: 'white',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Enviando…' : 'Receber link por e-mail'}
          </button>
        </form>
      )}
    </main>
  )
}