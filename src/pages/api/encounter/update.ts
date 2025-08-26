import type { NextApiRequest, NextApiResponse } from 'next'
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/encounter/update
 * Body:
 *  { encounterId: string,
 *    report?: any,                     // ex.: { sections: [...] }
 *    rx?: { items?: any[]; patient?: any; goal?: string } }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const session = (await getServerSession(req, res, authOptions as any)) as Session | null
    if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })

    const { encounterId, report, rx } = req.body || {}
    if (!encounterId || typeof encounterId !== 'string') {
      return res.status(400).json({ error: 'encounterId is required' })
    }

    // dono do encontro
    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) return res.status(401).json({ error: 'Unauthorized' })

    const enc = await prisma.encounter.findUnique({
      where: { id: encounterId },
      select: { id: true, userId: true },
    })
    if (!enc) return res.status(404).json({ error: 'Encounter not found' })
    if (enc.userId !== me.id) return res.status(403).json({ error: 'Forbidden' })

    const updates: any = {}
    if (report !== undefined) updates.report = report

    if (Object.keys(updates).length) {
      await prisma.encounter.update({ where: { id: encounterId }, data: updates })
    }

    let prescriptionId: string | null = null
    if (rx) {
      // atualiza (ou cria) a última prescrição vinculada ao encounter
      const last = await prisma.prescription.findFirst({
        where: { encounterId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      if (!last) {
        const created = await prisma.prescription.create({
          data: {
            encounterId,
            goal: rx.goal || null,
            patientMeta: rx.patient ?? {},
            items: Array.isArray(rx.items) ? rx.items : [],
          },
          select: { id: true },
        })
        prescriptionId = created.id
      } else {
        const updated = await prisma.prescription.update({
          where: { id: last.id },
          data: {
            goal: rx.goal ?? undefined,
            patientMeta: rx.patient ?? undefined,
            items: Array.isArray(rx.items) ? rx.items : undefined,
          },
          select: { id: true },
        })
        prescriptionId = updated.id
      }
    }

    return res.status(200).json({ ok: true, prescriptionId })
  } catch (e: any) {
    console.error('[encounter:update] ', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
}