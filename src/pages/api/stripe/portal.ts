import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { stripe, APP_URL } from '@/lib/stripe'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  const email = session?.user?.email
  if (!email) return res.status(401).json({ error: 'not-authenticated' })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, stripeCustomerId: true, name: true },
  })
  if (!user?.id) return res.status(404).json({ error: 'user-not-found' })

  let customerId = user.stripeCustomerId || ''
  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: user.name || undefined,
        metadata: { app: 'aimnesis', userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/settings/billing`,
    })

    return res.status(200).json({ url: portal.url })
  } catch (err) {
    console.error('[stripe/portal] error:', err)
    return res.status(500).json({ error: 'stripe-error' })
  }
}