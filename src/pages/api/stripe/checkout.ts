// pages/api/stripe/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '@/lib/stripe'

const PRICE_MAP: Record<string, string> = {
  PRO99: process.env.STRIPE_PRICE_PRO99 || '',
  PRO199: process.env.STRIPE_PRICE_PRO199 || '',
  PRO299: process.env.STRIPE_PRICE_PRO299 || '',
  PRO499: process.env.STRIPE_PRICE_PRO499 || '',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { priceKey = 'PRO99', userId } = req.body || {}
    const price = PRICE_MAP[priceKey]
    if (!price) return res.status(400).json({ error: 'Invalid price' })
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?sub=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precos?canceled=1`,
      line_items: [{ price, quantity: 1 }],
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    })
    return res.status(200).json({ url: session.url })
  } catch (e: any) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}