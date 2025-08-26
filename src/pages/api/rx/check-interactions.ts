// src/pages/api/rx/check-interactions.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { checkInteractions, type InteractionWarning } from '@/lib/rx-rules'

type Ok = { warnings: InteractionWarning[] }
type Err = { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { items } = req.body || {}
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items deve ser uma lista' })

    const names: string[] = items
      .map((it) => (typeof it === 'string' ? it : (it?.name || '')))
      .filter(Boolean)

    const warnings = checkInteractions(names)
    return res.status(200).json({ warnings })
  } catch (e: any) {
    console.error('[rx/check-interactions]', e?.message || e)
    return res.status(500).json({ error: 'Erro ao checar interações.' })
  }
}