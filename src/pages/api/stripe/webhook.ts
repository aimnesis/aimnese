import type { NextApiRequest, NextApiResponse } from 'next'
import type Stripe from 'stripe'
import { stripe, WEBHOOK_SECRET } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const config = { api: { bodyParser: false } }

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

function readPriceInfo(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0]
  const price = item?.price
  return {
    unitAmount: price?.unit_amount ?? null,
    interval: (price?.recurring?.interval ?? null) as 'day' | 'week' | 'month' | 'year' | null,
    priceId: (price?.id ?? null) as string | null,
    productId: (price?.product ?? null) as string | null,
    currency: price?.currency?.toUpperCase?.() ?? null,
  }
}

const unix = (v: unknown): Date | undefined =>
  typeof v === 'number' ? new Date(v * 1000) : undefined

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']
  if (!sig || !WEBHOOK_SECRET) return res.status(400).end('Missing signature/secret')

  let event: Stripe.Event
  try {
    const buf = await readRawBody(req)
    event = stripe.webhooks.constructEvent(buf, sig as string, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[stripe:webhook] constructEvent error:', err?.message || err)
    return res.status(400).send(`Webhook Error: ${err?.message || 'invalid'}`)
  }

  // idempotência do evento
  try {
    const exists = await prisma.stripeEvent.findUnique({ where: { eventId: event.id } })
    if (exists) return res.status(200).json({ received: true, duplicate: true })
  } catch {}

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = String(session.customer || '')
        const subscriptionId = String(session.subscription || '')
        const email =
          (session.customer_details?.email ||
            (typeof session.customer_email === 'string' ? session.customer_email : '')) || ''

        if (email && customerId) {
          const u = await prisma.user.findUnique({ where: { email }, select: { id: true, stripeCustomerId: true } })
          if (u?.id && !u.stripeCustomerId) {
            await prisma.user.update({ where: { id: u.id }, data: { stripeCustomerId: customerId } })
          }
        }

        if (subscriptionId && customerId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
          const { unitAmount, interval, priceId, productId, currency } = readPriceInfo(sub)
          const status = sub.status

          const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } })
          if (user?.id) {
            await prisma.subscription.upsert({
              where: { id: sub.id },
              create: {
                id: sub.id, userId: user.id, customerId,
                productId: productId ?? undefined,
                priceId: priceId ?? undefined,
                priceAmount: unitAmount ?? undefined,
                currency: currency ?? undefined,
                interval: (interval as any) ?? undefined,
                status: status as any,
                cancelAtPeriodEnd: !!sub.cancel_at_period_end,
                currentPeriodStart: unix((sub as any).current_period_start),
                currentPeriodEnd:   unix((sub as any).current_period_end),
                canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
              },
              update: {
                userId: user.id, customerId,
                productId: productId ?? undefined,
                priceId: priceId ?? undefined,
                priceAmount: unitAmount ?? undefined,
                currency: currency ?? undefined,
                interval: (interval as any) ?? undefined,
                status: status as any,
                cancelAtPeriodEnd: !!sub.cancel_at_period_end,
                currentPeriodStart: unix((sub as any).current_period_start),
                currentPeriodEnd:   unix((sub as any).current_period_end),
                canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = String(sub.customer)
        const { unitAmount, interval, priceId, productId, currency } = readPriceInfo(sub)
        const status = sub.status

        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } })
        if (!user) break

        await prisma.subscription.upsert({
          where: { id: sub.id },
          update: {
            userId: user.id, customerId,
            productId: productId ?? undefined,
            priceId: priceId ?? undefined,
            priceAmount: unitAmount ?? undefined,
            currency: currency ?? undefined,
            interval: (interval as any) ?? undefined,
            status: status as any,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            currentPeriodStart: unix((sub as any).current_period_start),
            currentPeriodEnd:   unix((sub as any).current_period_end),
            canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
          },
          create: {
            id: sub.id, userId: user.id, customerId,
            productId: productId ?? undefined,
            priceId: priceId ?? undefined,
            priceAmount: unitAmount ?? undefined,
            currency: currency ?? undefined,
            interval: (interval as any) ?? undefined,
            status: status as any,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            currentPeriodStart: unix((sub as any).current_period_start),
            currentPeriodEnd:   unix((sub as any).current_period_end),
            canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'canceled' as any,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : new Date(),
          },
        }).catch(() => {})
        break
      }

      default:
        // ignorar outros por enquanto
        break
    }

    try { await prisma.stripeEvent.create({ data: { eventId: event.id, type: event.type, data: event as any } }) } catch {}

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[stripe:webhook] handler error:', err)
    return res.status(500).end('Internal error')
  }
}