// src/server/paywall.ts
import { prisma } from '@/lib/prisma'
import { resolvePrice, type IntervalKey } from '@/lib/stripe'

/** Modos do produto */
export type ModeKey =
  | 'general'
  | 'studies'
  | 'plantao'
  | 'consultorio'
  | 'specialties'
  | 'analysis'

/** Status que consideramos “ativos” */
const ACTIVE_STATUSES = new Set(['active', 'trialing'] as const)

type PlanLimits = Record<ModeKey, number | 'unlimited'>

export type UserPlan = {
  kind: 'FREE' | 'PRO'
  interval?: IntervalKey
  status:
    | 'inactive'
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused'
    | 'incomplete'
    | 'incomplete_expired'
  limits: PlanLimits
}

function freeLimits(): PlanLimits {
  return {
    general: 'unlimited',
    studies: 'unlimited',
    plantao: 0,
    consultorio: 0,
    specialties: 0,
    analysis: 0,
  }
}

function proLimits(): PlanLimits {
  return {
    general: 'unlimited',
    studies: 'unlimited',
    plantao: 'unlimited',
    consultorio: 'unlimited',
    specialties: 'unlimited',
    analysis: 'unlimited',
  }
}

function currentMonthWindow(): { gte: Date; lte: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  return { gte: start, lte: now }
}

/** Conta uso mensal por modo (se quiser limitar número em algum momento) */
export async function countUsageThisMonth(userId: string, mode: ModeKey): Promise<number> {
  const window = currentMonthWindow()
  return prisma.query.count({
    where: {
      userId,
      queryType: mode as any,
      createdAt: { gte: window.gte, lte: window.lte },
    },
  })
}

export async function getUserPlan(userId?: string | null): Promise<UserPlan> {
  if (!userId) return { kind: 'FREE', status: 'inactive', limits: freeLimits() }

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: Array.from(ACTIVE_STATUSES) as any } },
    orderBy: { updatedAt: 'desc' },
    select: { status: true, priceId: true },
  })

  if (!sub) return { kind: 'FREE', status: 'inactive', limits: freeLimits() }

  const resolved = resolvePrice(sub.priceId)
  if (!resolved) {
    // assinatura ativa mas price desconhecido → segurança: FREE
    return { kind: 'FREE', status: sub.status as UserPlan['status'], limits: freeLimits() }
  }

  return {
    kind: 'PRO',
    interval: resolved.interval,
    status: sub.status as UserPlan['status'],
    limits: proLimits(),
  }
}

export async function hasPro(userId?: string | null): Promise<boolean> {
  const plan = await getUserPlan(userId)
  return plan.kind === 'PRO'
}

/** Gate por modo: FREE libera general/studies; PRO libera tudo */
export async function canUseMode(
  userId: string | undefined,
  mode: ModeKey,
): Promise<{
  allowed: boolean
  reason?: 'not-authenticated' | 'blocked' | 'limit-reached'
  remaining?: number | 'unlimited'
  plan?: UserPlan
}> {
  // general/studies são FREE mesmo sem login
  if (mode === 'general' || mode === 'studies') {
    const plan = await getUserPlan(userId) // útil para saber se já é PRO
    return { allowed: true, remaining: 'unlimited', plan }
  }

  if (!userId) return { allowed: false, reason: 'not-authenticated' }

  const plan = await getUserPlan(userId)
  const limit = plan.limits[mode]
  if (limit === 'unlimited') return { allowed: true, remaining: 'unlimited', plan }
  if (typeof limit === 'number' && limit <= 0) return { allowed: false, reason: 'blocked', remaining: 0, plan }

  const used = await countUsageThisMonth(userId, mode)
  const remaining = Math.max(0, (limit as number) - used)
  if (remaining <= 0) return { allowed: false, reason: 'limit-reached', remaining: 0, plan }

  return { allowed: true, remaining, plan }
}