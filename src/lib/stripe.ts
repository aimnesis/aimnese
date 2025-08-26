// src/lib/stripe.ts
import Stripe from 'stripe'

// Fixamos a apiVersion p/ estabilidade de contrato
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // Alinhado à versão atual da conta Stripe (evita erro de tipo no SDK)
  apiVersion: '2025-07-30.basil',
})

/** Segredo do webhook (LIVE) */
export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ""

/** URL base da app (sem trailing slash) */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.aimnesis.com').replace(/\/$/, '')

/**
 * Mapa de preços por TIER x INTERVALO
 */
export const STRIPE = {
  // ---- TIER lógico unificado ----
  PRO: {
    monthly:
      process.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
      process.env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY ||
      '',
    yearly:
      process.env.STRIPE_PRICE_ID_PRO_YEARLY ||
      process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY ||
      '',
  },

  // ---- legados (compat) ----
  P20: {
    monthly: process.env.STRIPE_PRICE_ID_P20_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_P20_YEARLY || '',
  },
  P50: {
    monthly: process.env.STRIPE_PRICE_ID_P50_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_P50_YEARLY || '',
  },
  SPEC_UNLTD: {
    monthly: process.env.STRIPE_PRICE_ID_SPEC_UNLTD_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_SPEC_UNLTD_YEARLY || '',
  },

  // ---- atuais (compat) ----
  P100: {
    monthly: process.env.STRIPE_PRICE_ID_P100_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_P100_YEARLY || '',
  },
  P200: {
    monthly: process.env.STRIPE_PRICE_ID_P200_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_P200_YEARLY || '',
  },
  UNLIMITED: {
    monthly: process.env.STRIPE_PRICE_ID_UNLIMITED_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ID_UNLIMITED_YEARLY || '',
  },

  // DevPass (produção para QA): somente mensal
  DEVPASS: {
    monthly: process.env.STRIPE_PRICE_ID_DEVPASS_MONTHLY || '',
    yearly: '',
  },
} as const

export type TierKey = keyof typeof STRIPE
export type IntervalKey = 'monthly' | 'yearly'

/** Mapa reverso: priceId -> { tier, interval } */
export const PRICE_LOOKUP: Record<string, { tier: TierKey; interval: IntervalKey }> = Object.fromEntries(
  Object.entries(STRIPE).flatMap(([tier, byInterval]) =>
    Object.entries(byInterval)
      .filter(([, priceId]) => !!priceId)
      .map(([interval, priceId]) => [priceId, { tier: tier as TierKey, interval: interval as IntervalKey }]),
  ),
)

/** Resolve {tier, interval} a partir de um priceId (ou null se desconhecido) */
export function resolvePrice(priceId?: string | null): { tier: TierKey; interval: IntervalKey } | null {
  if (!priceId) return null
  const hit = PRICE_LOOKUP[priceId]
  return hit ?? null
}

/** Retorna o priceId para um {tier, interval} válido (ou string vazia se faltar env) */
export function getPriceId(tier: TierKey, interval: IntervalKey): string {
  return STRIPE[tier]?.[interval] || ''
}

/** Apenas PRO é obrigatório (monthly OU yearly). DEVPASS é opcional. */
export function stripePricesConfigured(): boolean {
  const proOk =
    !!(STRIPE.PRO?.monthly && STRIPE.PRO.monthly.trim().length > 0) ||
    !!(STRIPE.PRO?.yearly && STRIPE.PRO.yearly.trim().length > 0)
  return proOk
}

/** Verifica se Stripe está pronto (secret + webhook + priceIds PRO). */
export function assertStripeReady(): {
  ok: boolean
  missing: Array<'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET' | 'PRICE_IDS'>
} {
  const missing: Array<'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET' | 'PRICE_IDS'> = []
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')
  if (!WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET')
  if (!stripePricesConfigured()) missing.push('PRICE_IDS')
  return { ok: missing.length === 0, missing }
}

/**
 * Fallback: tenta resolver via API do Stripe quando PRICE_LOOKUP não conhece o priceId.
 */
export async function resolvePriceWithFallback(priceId?: string | null): Promise<{ tier: TierKey; interval: IntervalKey } | null> {
  const local = resolvePrice(priceId)
  if (local) return local
  if (!priceId) return null
  try {
    const price = await stripe.prices.retrieve(priceId)
    const nickname = (price.nickname || price.lookup_key || '').toString().toUpperCase()
    const intervalRaw = (price.recurring?.interval ?? null) as 'day' | 'week' | 'month' | 'year' | null
    const normalized: IntervalKey | null =
      intervalRaw === 'month' ? 'monthly'
      : intervalRaw === 'year'  ? 'yearly'
      : null
    const tier = (Object.keys(STRIPE) as TierKey[]).find((t) => nickname.includes(t)) || null
    if (tier && normalized) return { tier, interval: normalized }
    return null
  } catch {
    return null
  }
}