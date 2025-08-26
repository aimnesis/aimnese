import 'dotenv/config'
/* scripts/seed-stripe.ts
 * Cria/garante em PRODUÇÃO:
 *   - Produto: "Aimnesis PRO"
 *   - Prices BRL:
 *       • PRO Monthly  (R$ 99/m)    lookup_key: AIMNESIS_PRO_MONTHLY_BRL
 *       • PRO Yearly   (R$ 999/a)   lookup_key: AIMNESIS_PRO_YEARLY_BRL
 *       • DEVPASS Mon. (R$ 5/m)     lookup_key: AIMNESIS_DEVPASS_MONTHLY_BRL
 *
 * Uso:
 *   pnpm tsx scripts/seed-stripe.ts
 * Requer no ambiente:
 *   STRIPE_SECRET_KEY=sk_live_...
 */

import Stripe from 'stripe'

const SECRET = process.env.STRIPE_SECRET_KEY
if (!SECRET) {
  console.error('❌ Defina STRIPE_SECRET_KEY no ambiente.')
  process.exit(1)
}

// Não fixamos apiVersion: usa a da conta.
const stripe = new Stripe(SECRET)

const PRODUCT_NAME = 'Aimnesis PRO'
const PRODUCT_METADATA = { app: 'aimnesis', tier: 'PRO' as const }

const CURRENCY = 'brl'
const PRO_MONTH_AMOUNT = 99_00
const PRO_YEAR_AMOUNT  = 999_00
const DEVPASS_AMOUNT   = 5_00

const LK_PRO_MONTH  = 'AIMNESIS_PRO_MONTHLY_BRL'
const LK_PRO_YEAR   = 'AIMNESIS_PRO_YEARLY_BRL'
const LK_DEVPASS    = 'AIMNESIS_DEVPASS_MONTHLY_BRL'

const NICK_PRO_MONTH  = 'PRO Monthly BRL'
const NICK_PRO_YEAR   = 'PRO Yearly BRL'
const NICK_DEVPASS    = 'DevPass Monthly BRL'

async function ensureProduct(name: string) {
  const list = await stripe.products.list({ active: true, limit: 100 })
  let prod = list.data.find(p => (p.name || '').trim().toLowerCase() === name.toLowerCase())
  if (!prod) {
    prod = await stripe.products.create({ name, active: true, metadata: PRODUCT_METADATA })
    console.log(`✅ Produto criado: ${prod.id} (${prod.name})`)
  } else {
    // garante metadados básicos
    const needMeta = JSON.stringify(prod.metadata) !== JSON.stringify(PRODUCT_METADATA)
    if (needMeta) {
      prod = await stripe.products.update(prod.id, { metadata: PRODUCT_METADATA })
      console.log(`ℹ️ Produto atualizado (metadata): ${prod.id}`)
    } else {
      console.log(`• Produto existente: ${prod.id} (${prod.name})`)
    }
  }
  return prod
}

async function ensureRecurringPrice(args: {
  productId: string
  unit_amount: number
  interval: 'month' | 'year'
  lookup_key: string
  nickname: string
}) {
  const { productId, unit_amount, interval, lookup_key, nickname } = args

  // A API aceita filtrar por lookup_keys ao listar:
  const list = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
    lookup_keys: [lookup_key],
  })

  let price = list.data.find(p => p.lookup_key === lookup_key) || null

  if (!price) {
    price = await stripe.prices.create({
      product: productId,
      currency: CURRENCY,
      unit_amount,
      nickname,
      lookup_key,
      recurring: { interval },
      active: true,
      metadata: { app: 'aimnesis', tier: interval === 'month' && unit_amount === DEVPASS_AMOUNT ? 'DEVPASS' : 'PRO' },
    })
    console.log(`✅ Price criado: ${nickname} = ${price.id}`)
  } else {
    // Prices não permitem alterar amount/interval/currency; se divergirem, criamos novo e desativamos o antigo
    const same =
      price.unit_amount === unit_amount &&
      price.currency === CURRENCY &&
      price.recurring?.interval === interval &&
      (price.nickname || '') === nickname

    if (same) {
      console.log(`• Price existente: ${nickname} = ${price.id}`)
    } else {
      await stripe.prices.update(price.id, { active: false })
      const created = await stripe.prices.create({
        product: productId,
        currency: CURRENCY,
        unit_amount,
        nickname,
        lookup_key, // mantemos o mesmo lookup_key para localizar no futuro
        recurring: { interval },
        active: true,
        metadata: price.metadata,
      })
      price = created
      console.log(`↻ Price recriado (atualizado): ${nickname} = ${price.id}`)
    }
  }

  return price
}

async function main() {
  console.log('▶️  Seed Stripe (LIVE)…')

  const product = await ensureProduct(PRODUCT_NAME)

  const proMonthly = await ensureRecurringPrice({
    productId: product.id,
    unit_amount: PRO_MONTH_AMOUNT,
    interval: 'month',
    lookup_key: LK_PRO_MONTH,
    nickname: NICK_PRO_MONTH,
  })

  const proYearly = await ensureRecurringPrice({
    productId: product.id,
    unit_amount: PRO_YEAR_AMOUNT,
    interval: 'year',
    lookup_key: LK_PRO_YEAR,
    nickname: NICK_PRO_YEAR,
  })

  const devpassMonthly = await ensureRecurringPrice({
    productId: product.id,
    unit_amount: DEVPASS_AMOUNT,
    interval: 'month',
    lookup_key: LK_DEVPASS,
    nickname: NICK_DEVPASS,
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Cole no seu .env (PRODUÇÃO):')
  console.log(`STRIPE_PRICE_ID_PRO_MONTHLY=${proMonthly.id}`)
  console.log(`STRIPE_PRICE_ID_PRO_YEARLY=${proYearly.id}`)
  console.log(`STRIPE_PRICE_ID_DEVPASS_MONTHLY=${devpassMonthly.id}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('✅ Concluído.')
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err?.message || err)
  process.exit(1)
})