// src/pages/api/partners/apply.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ApplySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  crm: z.string().optional(),
  company: z.string().optional(),
  message: z.string().max(2000).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method-not-allowed' })
  }

  let data: z.infer<typeof ApplySchema>
  try {
    data = ApplySchema.parse(req.body ?? {})
  } catch (err: any) {
    return res.status(400).json({ error: 'invalid-body', details: err?.message ?? String(err) })
  }

  try {
    const created = await prisma.partnerApplication.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        crm: data.crm,
        company: data.company,
        message: data.message,
        status: 'pending',
      },
      select: { id: true, createdAt: true },
    })
    return res.status(200).json({ ok: true, id: created.id, createdAt: created.createdAt.toISOString() })
  } catch (err: any) {
    // conflito de email já aplicado
    if (String(err?.code) === 'P2002') {
      return res.status(409).json({ error: 'already-applied' })
    }
    console.error('[partners/apply] error:', err)
    return res.status(500).json({ error: 'internal-error' })
  }
}