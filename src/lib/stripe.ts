// src/lib/stripe.ts
import Stripe from 'stripe'

/** URL base do app (com protocolo e sem barra final) */
function computeAppUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const vercel = process.env.VERCEL_URL?.trim() // vem sem protocolo
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}
export const APP_URL = computeAppUrl()

/** Instância do Stripe — usa a apiVersion da conta */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

/** Segredo do webhook */
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

/** Prices mapeados (inclui DEVPASS) */
export const STRIPE = {
  PRO: {
    monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
    yearly:  process.env.STRIPE_PRICE_ID_PRO_YEARLY  || '',
  },
  DEVPASS: { monthly: process.env.STRIPE_PRICE_ID_DEVPASS_MONTHLY || '', yearly: '' },
} as const

export type IntervalKey = 'monthly' | 'yearly'
export type TierKey = keyof typeof STRIPE

/** priceId -> { tier, interval } */
export const PRICE_LOOKUP: Record<string, { tier: TierKey; interval: IntervalKey }> = Object.fromEntries(
  Object.entries(STRIPE).flatMap(([tier, byInterval]) =>
    Object.entries(byInterval)
      .filter(([, priceId]) => !!priceId)
      .map(([interval, priceId]) => [priceId, { tier: tier as TierKey, interval: interval as IntervalKey }]),
  ),
)

/** Resolve localmente; se não achar, tenta API e deduz por nickname/lookup_key */
export async function resolvePriceWithFallback(priceId?: string | null) {
  if (!priceId) return null
  const local = PRICE_LOOKUP[priceId]
  if (local) return local
  try {
    const price = await stripe.prices.retrieve(priceId)
    const nickname = String(price.nickname || price.lookup_key || '').toUpperCase()
    const interval = price.recurring?.interval as IntervalKey | undefined
    const tier = (Object.keys(STRIPE) as TierKey[]).find((t) => nickname.includes(t)) || null
    return tier && (interval === 'monthly' || interval === 'yearly') ? { tier, interval } : null
  } catch {
    return null
  }
}

/** Plano lógico a partir do priceId (DEVPASS também libera PRO) */
export async function planFromPriceId(priceId?: string | null): Promise<'FREE' | 'PRO'> {
  const r = await resolvePriceWithFallback(priceId)
  if (!r) return 'FREE'
  // Tudo que for PRO ou DEVPASS libera PRO na UI
  if (r.tier === 'PRO' || r.tier === 'DEVPASS') return 'PRO'
  return 'FREE'
}