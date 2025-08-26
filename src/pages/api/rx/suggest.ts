// src/pages/api/rx/suggest.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { suggest, type PatientMeta } from '@/lib/rx-rules'

type Ok = {
  item: { name: string; dose?: string; route?: string; frequency?: string; duration?: string }
  notes: string[]
  flags: Array<'renal' | 'hepatic' | 'pregnancy' | 'lactation' | 'warning'>
}
type Err = { error: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { drug, patientMeta } = req.body || {}
    const name = String(drug || '').trim()
    if (!name) return res.status(400).json({ error: 'Campo "drug" é obrigatório.' })

    const pm: PatientMeta = {
      age: toNum((patientMeta || {}).age),
      weightKg: toNum((patientMeta || {}).weightKg),
      eGFR: toNum((patientMeta || {}).eGFR),
      childPugh: (patientMeta || {}).childPugh,
      pregnant: !!(patientMeta || {}).pregnant,
      lactating: !!(patientMeta || {}).lactating,
      allergies: (patientMeta || {}).allergies,
    }

    const out = suggest(name, pm)
    return res.status(200).json(out)
  } catch (e: any) {
    console.error('[rx/suggest]', e?.message || e)
    return res.status(500).json({ error: 'Erro ao sugerir dose.' })
  }
}

function toNum(x: any) {
  const n = Number(x)
  return Number.isFinite(n) ? n : undefined
}