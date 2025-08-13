// src/pages/auth/signin.tsx
import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import { authOptions } from '@/server/auth'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (session) {
    return {
      redirect: { destination: '/dashboard', permanent: false },
    }
  }
  return { props: {} }
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // validação simples
    const okEmail = /^\S+@\S+\.\S+$/.test(email)
    if (!okEmail) {
      setError('Digite um e-mail válido.')
      return
    }

    setSubmitting(true)
    try {
      const res = await signIn('email', {
        email,
        redirect: false, // mantemos na mesma página
        // callbackUrl: '/dashboard', // opcional: redireciono após confirmar
      })

      if (res?.ok) {
        setSent(true)
      } else {
        setError(res?.error || 'Não foi possível enviar o link. Verifique o remetente (EMAIL_FROM) e as credenciais SMTP.')
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao enviar o e-mail.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '64px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Entrar no Aimnesis</h1>

      {sent ? (
        <p>✅ Enviamos um link de acesso para <b>{email}</b>. Verifique sua caixa de entrada (e o spam).</p>
      ) : (
        <form onSubmit={handleSend}>
          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
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
              background: submitting ? '#999' : '#ff6720',
              color: 'white',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
        </form>
      )}
    </main>
  )
}