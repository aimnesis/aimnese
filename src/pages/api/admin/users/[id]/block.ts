import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '../../_utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const id = req.query.id as string
  const blocked = Boolean(req.body?.blocked)

  await prisma.user.update({ where: { id }, data: { blocked } })
  res.status(200).json({ ok: true })
}