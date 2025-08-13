// pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const config = { api: { bodyParser: false } }

function buffer(readable: any) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = []
    readable.on('data', (chunk: any) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
    readable.on('end', () => resolve(Buffer.concat(chunks)))
    readable.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const sig = req.headers['stripe-signature'] as string
  const buf = await buffer(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch (err: any) {
    console.error('Webhook error', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as any
      const userId = sub.metadata?.userId || sub.client_reference_id || sub?.metadata?.user_id
      const planCode =
        sub.items?.data?.[0]?.price?.nickname ||
        sub.items?.data?.[0]?.price?.id ||
        'PRO99'
      const status = sub.status
      const currentPeriodEnd = new Date((sub.current_period_end ?? Date.now() / 1000) * 1000)

      if (userId) {
        const existing = await prisma.subscription.findFirst({
          where: { userId, provider: 'stripe' },
        })
        if (!existing) {
          await prisma.subscription.create({
            data: {
              userId,
              provider: 'stripe',
              planCode,
              status,
              currentPeriodEnd,
            },
          })
        } else {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { planCode, status, currentPeriodEnd },
          })
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as any
      const userId = sub.metadata?.userId || sub.client_reference_id || sub?.metadata?.user_id
      if (userId) {
        const existing = await prisma.subscription.findFirst({
          where: { userId, provider: 'stripe' },
        })
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { status: 'canceled' },
          })
        }
      }
    }

    res.json({ received: true })
  } catch (e: any) {
    console.error('Webhook handling failed', e)
    res.status(500).json({ error: 'Webhook handling failed' })
  }
}