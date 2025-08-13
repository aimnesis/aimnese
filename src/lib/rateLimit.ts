// src/lib/rateLimit.ts
import type { NextApiRequest, NextApiResponse } from 'next'

type Bucket = { tokens: number; ts: number }
const buckets = new Map<string, Bucket>()

export async function rateLimit(
  req: NextApiRequest,
  _res: NextApiResponse,
  { max = 30, windowMs = 60_000 }: { max?: number; windowMs?: number } = {}
) {
  const key =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    'anon'

  const now = Date.now()
  const b = buckets.get(key) ?? { tokens: max, ts: now }

  // Refill por janela inteira (simples e suficiente p/ beta)
  const elapsed = now - b.ts
  if (elapsed >= windowMs) {
    const windows = Math.floor(elapsed / windowMs)
    b.tokens = Math.min(max, b.tokens + windows * max)
    b.ts = now
  }

  if (b.tokens <= 0) {
    throw new Error('RATE_LIMIT')
  }

  b.tokens -= 1
  buckets.set(key, b)
}