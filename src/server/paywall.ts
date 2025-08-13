// src/server/paywall.ts
import { prisma } from '@/lib/prisma'

export async function canUsePro(userId: string) {
  // 1) assinatura ativa libera
  const active = await prisma.subscription.findFirst({
    where: { userId, status: 'active', provider: 'stripe' },
  })
  if (active) return { allowed: true, reason: 'active_subscription' }

  // 2) até 3 usos PRO grátis
  const count = await prisma.medicalQuery.count({
    where: { userId, queryType: 'PRO' },
  })
  if (count < 3) return { allowed: true, reason: 'free_quota' }

  return { allowed: false, reason: 'quota_exceeded' }
}