// src/pages/admin/index.tsx
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { useRouter } from 'next/router'
import { useState } from 'react'

type Range = { from?: string | null; to?: string | null }

type UserRow = {
  id: string
  email: string
  name: string | null
  role: string
  blocked: boolean
  isVerified: boolean
  createdAt: string
  queriesCount: number
  subStatus: string | null
  subPlan: string | null
}

type Props = {
  range: Range
  metrics: {
    totalUsers: number
    usersInRange: number
    totalQueries: number
    queriesInRange: number
    activeSubs: number
    trialingSubs: number
    mrrCents: number
  }
  recentQueries: { id: string; question: string; createdAt: string; email: string | null }[]
  users: UserRow[]
}

function parseDateParam(v: any): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return isNaN(+d) ? null : d
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  // Gate admin
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  const email = session?.user?.email ?? null
  if (!email) return { redirect: { destination: '/auth/signin', permanent: false } }
  const u = await prisma.user.findUnique({ where: { email }, select: { role: true } })
  if (String(u?.role ?? 'user').toLowerCase() !== 'admin') {
    return { redirect: { destination: '/dashboard', permanent: false } }
  }

  // Filters
  const from = parseDateParam(ctx.query.from)
  const to = parseDateParam(ctx.query.to)

  const dateWhere: any = {}
  if (from || to) {
    dateWhere.createdAt = {}
    if (from) dateWhere.createdAt.gte = from
    if (to) dateWhere.createdAt.lte = to
  }

  // Users
  const [totalUsers, usersInRange] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: dateWhere }),
  ])

  // Queries
  const [totalQueries, queriesInRange] = await Promise.all([
    prisma.query.count(),
    prisma.query.count({ where: dateWhere }),
  ])

  // Subscriptions (active/trialing + MRR)
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ['active', 'trialing'] } },
    select: { status: true, priceAmount: true, interval: true },
  })
  let activeSubs = 0
  let trialingSubs = 0
  let mrrCents = 0
  for (const s of subs) {
    if (s.status === 'active') activeSubs++
    if (s.status === 'trialing') trialingSubs++
    const amt = s.priceAmount ?? 0
    if (!amt) continue
    // normaliza: month = 1x; year = /12
    const normalized = s.interval === 'year' ? Math.round(amt / 12) : amt
    mrrCents += normalized
  }

  // Recent queries (últimas 20)
  const recentQ = await prisma.query.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      question: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  })

  // Users table (últimos 50)
  const usersRaw = (await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { queries: true } },
      // Tip: some environments may not have `planCode` in the Subscription model yet.
      // We use `as any` to keep type-safety reasonable without blocking compile.
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, priceId: true },
      },
    },
  })) as unknown as Array<{
    id: string
    email: string
    name: string | null
    isVerified: boolean
    createdAt: Date
    role?: string
    blocked?: boolean
    _count: { queries: number }
    subscriptions: Array<{ status: string | null; priceId?: string | null }>
  }>

  const usersRows: UserRow[] = usersRaw.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    role: (u as any).role ?? 'user',
    blocked: (u as any).blocked ?? false,
    isVerified: u.isVerified ?? false,
    createdAt: u.createdAt.toISOString(),
    queriesCount: (u as any)._count?.queries ?? 0,
    subStatus: u.subscriptions?.[0]?.status ?? null,
    subPlan: (u.subscriptions?.[0] as any)?.priceId ?? null,
  }))

  return {
    props: {
      range: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
      metrics: { totalUsers, usersInRange, totalQueries, queriesInRange, activeSubs, trialingSubs, mrrCents },
      recentQueries: recentQ.map((q) => ({
        id: q.id,
        question: q.question,
        createdAt: q.createdAt.toISOString(),
        email: q.user?.email ?? null,
      })),
      users: usersRows,
    },
  }
}

function Currency({ cents }: { cents: number }) {
  const v = (cents ?? 0) / 100
  return <>{v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
}

export default function AdminHome({ range, metrics, recentQueries, users }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(range.from?.slice(0, 10) ?? '')
  const [to, setTo] = useState(range.to?.slice(0, 10) ?? '')

  const reload = () => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push({ pathname: '/admin', query: Object.fromEntries(params.entries()) })
  }

  const call = async (url: string, body: any) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  }

  const onToggleRole = async (id: string, isAdmin: boolean) => {
    await call(`/api/admin/users/${id}/role`, { role: isAdmin ? 'user' : 'admin' })
    reload()
  }
  const onToggleBlock = async (id: string, blocked: boolean) => {
    await call(`/api/admin/users/${id}/block`, { blocked: !blocked })
    reload()
  }
  const onToggleVerify = async (id: string, isVerified: boolean) => {
    await call(`/api/admin/users/${id}/verify`, { isVerified: !isVerified })
    reload()
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin • Overview</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="border rounded-md px-2 py-1 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-sm text-muted">→</span>
          <input
            type="date"
            className="border rounded-md px-2 py-1 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button onClick={reload} className="border rounded-md px-3 py-1.5 text-sm bg-[var(--panel)] hover:bg-[var(--panel-2)]">
            Filtrar
          </button>
          <Link
            href={`/api/admin/export.csv${from || to ? `?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString()}` : ''}`}
            className="border rounded-md px-3 py-1.5 text-sm bg-[var(--panel)] hover:bg-[var(--panel-2)]"
          >
            Exportar CSV
          </Link>
        </div>
      </header>

      {/* Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card title="Usuários (total)" value={metrics.totalUsers.toLocaleString('pt-BR')} />
        <Card title="Usuários (período)" value={metrics.usersInRange.toLocaleString('pt-BR')} />
        <Card title="Perguntas (total)" value={metrics.totalQueries.toLocaleString('pt-BR')} />
        <Card title="Perguntas (período)" value={metrics.queriesInRange.toLocaleString('pt-BR')} />
        <Card title="Assinaturas ativas" value={metrics.activeSubs.toLocaleString('pt-BR')} />
        <Card title="Em trial" value={metrics.trialingSubs.toLocaleString('pt-BR')} />
        <Card title="MRR estimado" value={<Currency cents={metrics.mrrCents} />} />
      </section>

      {/* Recentes */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Consultas recentes</h2>
        <div className="rounded-lg border divide-y">
          {recentQueries.length === 0 ? (
            <div className="p-3 text-sm text-muted">Sem dados.</div>
          ) : (
            recentQueries.map((q) => (
              <div key={q.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate">{q.question}</div>
                  <div className="text-xs text-muted">{q.email || '—'} · {new Date(q.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-xs text-muted">#{q.id.slice(0, 6)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Users */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Usuários (50 mais recentes)</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-[var(--panel)] text-left">
              <tr>
                <Th>Usuário</Th>
                <Th>Função</Th>
                <Th>Licença</Th>
                <Th>Bloqueio</Th>
                <Th>Consultas</Th>
                <Th>Assinatura</Th>
                <Th>Plano</Th>
                <Th>Cadastro</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => {
                const isAdmin = u.role === 'admin'
                return (
                  <tr key={u.id} className="align-top">
                    <Td>
                      <div className="font-medium truncate max-w-[22ch]" title={u.email}>{u.email}</div>
                      <div className="text-xs text-muted">{u.name ?? '—'}</div>
                    </Td>
                    <Td>{u.role}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${u.isVerified ? 'border-green-500 text-green-600' : 'border-zinc-400 text-zinc-600'}`}>
                        {u.isVerified ? 'verificada' : 'não verificada'}
                      </span>
                    </Td>
                    <Td>{u.blocked ? 'bloqueado' : 'ok'}</Td>
                    <Td>{u.queriesCount}</Td>
                    <Td>{u.subStatus ?? '—'}</Td>
                    <Td>{u.subPlan ?? '—'}</Td>
                    <Td>{new Date(u.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onToggleRole(u.id, isAdmin)}
                          className="border rounded px-2 py-1 hover:bg-[var(--panel)]"
                          title={isAdmin ? 'Remover admin' : 'Promover a admin'}
                        >
                          {isAdmin ? 'Tirar admin' : 'Tornar admin'}
                        </button>
                        <button
                          onClick={() => onToggleVerify(u.id, u.isVerified)}
                          className="border rounded px-2 py-1 hover:bg-[var(--panel)]"
                          title={u.isVerified ? 'Desverificar licença' : 'Verificar licença'}
                        >
                          {u.isVerified ? 'Desverificar' : 'Verificar'}
                        </button>
                        <button
                          onClick={() => onToggleBlock(u.id, u.blocked)}
                          className="border rounded px-2 py-1 hover:bg-[var(--panel)]"
                          title={u.blocked ? 'Desbloquear' : 'Bloquear'}
                        >
                          {u.blocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function Card({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted mb-1">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium text-muted">{children}</th>
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>
}