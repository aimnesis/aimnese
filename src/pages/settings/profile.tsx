// src/pages/settings/profile.tsx
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Topbar from '@/components/ui/Topbar'

type UserProfile = {
  email: string
  firstName: string
  lastName: string
  medicalLicenseId: string
  isVerified: boolean
}

type ApiProfileResponse = { user: Partial<UserProfile> }

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  if (!session?.user?.email) {
    return { redirect: { destination: '/auth/signin', permanent: false } }
  }
  return { props: {} }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    const email = session?.user?.email
    if (!email) { setLoading(false); return }

    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/settings/profile')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = (await r.json()) as ApiProfileResponse
        const base: UserProfile = {
          email,
          firstName: '',
          lastName: '',
          medicalLicenseId: '',
          isVerified: false,
        }
        setProfile({ ...base, ...j.user })
      } catch {
        setMsg('Erro ao carregar perfil.')
      } finally {
        setLoading(false)
      }
    })()
  }, [session, status])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          medicalLicenseId: profile.medicalLicenseId,
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = (await r.json()) as ApiProfileResponse
      setProfile((prev) => (prev ? ({ ...prev, ...j.user } as UserProfile) : prev))
      setMsg('Perfil salvo com sucesso.')
    } catch (err) {
      console.error('Erro salvando perfil:', err)
      setMsg('Falha ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Head><title>Perfil · Aimnesis</title></Head>
      <main className="min-h-[100dvh] bg-app">
        <Topbar title="Configurações" />
        <div className="max-w-3xl mx-auto p-4">
          <section className="panel p-6">
            <h1 className="text-lg font-semibold">Perfil</h1>

            {(status === 'loading' || loading) && (
              <div className="text-sm text-muted mt-2">Carregando…</div>
            )}

            {!loading && !session?.user?.email && (
              <div className="text-sm mt-2">Você precisa estar logado para ver esta página.</div>
            )}

            {!loading && profile && (
              <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
                {msg && (
                  <div className={`rounded-lg px-3 py-2 text-sm ${msg.includes('sucesso') ? 'border border-green-300 bg-green-50 text-green-700' : 'border border-red-300 bg-red-50 text-red-700'}`}>
                    {msg}
                  </div>
                )}

                <label className="block">
                  <div className="text-xs text-muted mb-1">E-mail</div>
                  <input className="input" type="email" value={profile.email} disabled />
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <div className="text-xs text-muted mb-1">Primeiro nome</div>
                    <input
                      className="input"
                      type="text"
                      required
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs text-muted mb-1">Sobrenome</div>
                    <input
                      className="input"
                      type="text"
                      required
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs text-muted mb-1">CRM / Licença Médica</div>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ex: CRM12345"
                    value={profile.medicalLicenseId}
                    onChange={(e) => setProfile({ ...profile, medicalLicenseId: e.target.value })}
                  />
                </label>

                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <strong>Status de verificação:</strong>{' '}
                    {profile.isVerified ? (
                      <span className="text-green-600">Verificado ✅</span>
                    ) : (
                      <span className="text-amber-600">Não verificado</span>
                    )}
                  </div>
                  {!profile.isVerified && (
                    <button
                      type="button"
                      onClick={() => alert('Fluxo de verificação ainda não implementado.')}
                      className="btn-secondary text-sm"
                    >
                      Solicitar verificação
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={saving} className="btn text-sm">
                    {saving ? 'Salvando…' : 'Salvar perfil'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <div className="text-sm mt-3">
            <a href="/settings" className="underline">← Voltar</a>
          </div>
        </div>
      </main>
    </>
  )
}