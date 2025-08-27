import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { stripe, APP_URL } from '@/lib/stripe'

type IntervalKey = 'monthly' | 'yearly' | 'devpass'

const PRICE_BY_INTERVAL: Record<IntervalKey, string | undefined> = {
  monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  yearly:  process.env.STRIPE_PRICE_ID_PRO_YEARLY,
  devpass: process.env.STRIPE_PRICE_ID_DEVPASS_MONTHLY || process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const { interval } = (req.body || {}) as { interval?: IntervalKey }
  if (!interval || !['monthly', 'yearly', 'devpass'].includes(interval)) {
    return res.status(400).json({ error: 'invalid-interval' })
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  const email = session?.user?.email
  if (!email) return res.status(401).json({ error: 'not-authenticated' })

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, stripeCustomerId: true, name: true },
    })
    if (!user) return res.status(404).json({ error: 'user-not-found' })

    let customerId = user.stripeCustomerId || ''
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: user.name || undefined,
        metadata: { app: 'aimnesis', userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const price = PRICE_BY_INTERVAL[interval]
    if (!price) return res.status(500).json({ error: `price-id-missing:${interval}` })

    const success_url = `${APP_URL}/settings/billing?success=1`
    const cancel_url  = `${APP_URL}/settings/billing?canceled=1`

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      client_reference_id: user.id,
      metadata: { interval, source: 'aimnesis-dashboard', userEmail: email },
    })

    return res.status(200).json({ url: checkout.url })
  } catch (err) {
    console.error('[stripe/checkout] error:', err)
    return res.status(500).json({ error: 'stripe-error' })
  }
}