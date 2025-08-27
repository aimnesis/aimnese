// src/pages/api/stripe/subscription.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { stripe, planFromPriceId } from '@/lib/stripe'
import type Stripe from 'stripe'

type Interval = 'day' | 'week' | 'month' | 'year' | null
type Plan = 'FREE' | 'PRO'

type SubView = {
  id: string
  status: string
  plan: Plan
  interval: Interval
  currentPeriodEnd?: string | null
  priceId?: string | null
  productId?: string | null
  currency?: string | null
  priceAmount?: number | null
  source: 'db' | 'stripe'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  const email = session?.user?.email
  if (!email) return res.status(401).json({ error: 'not-authenticated' })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, stripeCustomerId: true },
  })
  if (!user) return res.status(404).json({ error: 'user-not-found' })

  // 1) DB primeiro
  const local = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })
  if (local) {
    const plan = await planFromPriceId(local.priceId ?? null)
    const view: SubView = {
      id: local.id,
      status: local.status,
      plan,
      interval: (local.interval as any) ?? null,
      currentPeriodEnd: local.currentPeriodEnd?.toISOString() ?? null,
      priceId: local.priceId ?? null,
      productId: local.productId ?? null,
      currency: local.currency ?? null,
      priceAmount: local.priceAmount ?? null,
      source: 'db',
    }
    return res.status(200).json({ subscription: view })
  }

  // 2) Stripe (fallback)
  if (!user.stripeCustomerId) return res.status(200).json({ subscription: null })

  try {
    const subs: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      expand: ['data.items.data.price', 'data.items.data.price.product'],
      limit: 1,
    })
    const sub = subs.data[0]
    if (!sub) return res.status(200).json({ subscription: null })

    const item = sub.items.data[0]
    const interval = (item?.price?.recurring?.interval ?? null) as Interval
    const priceId = item?.price?.id ?? null
    const plan = await planFromPriceId(priceId)

    const view: SubView = {
      id: sub.id,
      status: sub.status,
      plan,
      interval,
      currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null,
      priceId,
      productId: (item?.price?.product as string) ?? null,
      currency: item?.price?.currency?.toUpperCase?.() ?? null,
      priceAmount: item?.price?.unit_amount ?? null,
      source: 'stripe',
    }

    return res.status(200).json({ subscription: view })
  } catch (err) {
    console.error('[stripe/subscription] error:', err)
    return res.status(500).json({ error: 'stripe-error' })
  }
}