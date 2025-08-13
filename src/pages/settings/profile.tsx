// src/pages/settings/profile.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '@/components/Layout'
import axios from 'axios'
import { NextPage } from 'next'

type UserProfile = {
  email: string
  firstName: string
  lastName: string
  medicalLicenseId: string
  isVerified: boolean
}

const defaultProfile = (email: string): UserProfile => ({
  email,
  firstName: '',
  lastName: '',
  medicalLicenseId: '',
  isVerified: false,
})

type ApiProfileResponse = {
  user: Partial<UserProfile>
}

const ProfilePage: NextPage = () => {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Carrega perfil quando session está pronta
  useEffect(() => {
    if (status === 'loading') return

    const email = session?.user?.email
    if (!email) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const res = await axios.get<ApiProfileResponse>('/api/settings/profile')
        const incoming = res.data.user
        setProfile({ ...defaultProfile(email), ...incoming } as UserProfile)
      } catch (err) {
        console.error('Erro ao buscar perfil:', err)
        setMessage('Erro ao carregar perfil.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session, status])

  // Salva alterações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await axios.post<ApiProfileResponse>('/api/settings/profile', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        medicalLicenseId: profile.medicalLicenseId,
      })
      const incoming = res.data.user
      setProfile((prev) => {
        if (!prev) return prev
        return { ...prev, ...incoming } as UserProfile
      })
      setMessage('Perfil salvo com sucesso.')
    } catch (err) {
      console.error('Erro salvando perfil:', err)
      setMessage('Falha ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div>Carregando perfil...</div>
      </Layout>
    )
  }

  if (!session?.user?.email) {
    return (
      <Layout>
        <div>Você precisa estar logado para ver esta página.</div>
      </Layout>
    )
  }

  if (!profile) {
    // ainda não temos perfil preenchido (caso raro); mostramos loading leve
    return (
      <Layout>
        <div>Inicializando perfil...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
        <h1>Perfil</h1>
        {message && (
          <div style={{ margin: '1rem 0', color: message.includes('sucesso') ? 'green' : 'red' }}>
            {message}
          </div>
        )}
        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>
              E-mail
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ width: '100%', padding: '8px', marginTop: 4 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ flex: 1, display: 'block', fontWeight: 600 }}>
              Primeiro nome
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: 4 }}
              />
            </label>
            <label style={{ flex: 1, display: 'block', fontWeight: 600 }}>
              Sobrenome
              <input
                type="text"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: 4 }}
              />
            </label>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600 }}>
              CRM / Licença Médica
              <input
                type="text"
                value={profile.medicalLicenseId}
                onChange={(e) => setProfile({ ...profile, medicalLicenseId: e.target.value })}
                placeholder="Ex: CRM12345"
                style={{ width: '100%', padding: '8px', marginTop: 4 }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <strong>Status de verificação:</strong>{' '}
              {profile.isVerified ? (
                <span style={{ color: 'green' }}>Verificado ✅</span>
              ) : (
                <span style={{ color: '#b8860b' }}>Não verificado</span>
              )}
            </div>
            {!profile.isVerified && (
              <div>
                <button
                  type="button"
                  onClick={() => alert('Fluxo de verificação ainda não implementado.')}
                  style={{
                    padding: '6px 12px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Solicitar verificação
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default ProfilePage