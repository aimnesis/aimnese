// src/pages/auth/signin.tsx
import { useState } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import { authOptions } from '@/server/auth'
import Image from 'next/image'
import Link from 'next/link'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (session) {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }
  return { props: {} }
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loadingPwd, setLoadingPwd] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setLoadingPwd(true)
    try {
      const res = await signIn('credentials', {
        email, password, redirect: false, callbackUrl: '/dashboard'
      })
      if (res?.ok) window.location.href = '/dashboard'
      else setErr('E-mail ou senha inválidos.')
    } catch (e:any) {
      setErr(e?.message || 'Erro ao entrar.')
    } finally {
      setLoadingPwd(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setLoadingLink(true)
    try {
      const res = await signIn('email', { email, redirect: false })
      if (res?.ok) {
        alert('Enviamos um link de acesso. Confira seu e-mail.')
      } else {
        // quando o callback signIn retorna false, vem error=AccessDenied
        setErr('Para usar o link por e-mail, finalize/valide seu cadastro primeiro.')
      }
    } catch (e:any) {
      setErr(e?.message || 'Erro ao enviar link.')
    } finally {
      setLoadingLink(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl">
        <div className="flex flex-col items-center pt-8">
          <Image src="/logo-aimnesis.svg" alt="Aimnesis" width={72} height={72} priority />
          <h1 className="mt-4 text-xl font-semibold text-center">Entrar no Aimnesis</h1>
          <p className="mt-1 mb-6 text-sm text-center text-neutral-500">
            Acesse com senha ou receba um link por e-mail
          </p>
        </div>

        <form onSubmit={handlePassword} className="px-6 space-y-3">
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="email@exemplo.com"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800 px-3 py-2"
            placeholder="Sua senha"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loadingPwd}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 transition"
          >
            {loadingPwd ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <form onSubmit={handleMagicLink} className="px-6">
          <button
            type="submit"
            disabled={loadingLink}
            className="w-full mt-4 mb-6 rounded-lg bg-[#2F6FE5] hover:bg-[#2b62c9] text-white font-semibold py-2 transition"
          >
            {loadingLink ? 'Enviando…' : 'Receber link por e-mail'}
          </button>
        </form>

        <div className="px-6 pb-6 text-center text-sm">
          <span className="text-neutral-500">Ainda não tem conta?</span>{' '}
          <Link href="/auth/signup" className="text-emerald-600 hover:underline">Criar conta</Link>
        </div>
      </div>
    </main>
  )
}