import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '../../_utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const id = req.query.id as string
  const input = String(req.body?.role || 'user')

  // Aceita enum (USER/ADMIN) ou string (user/admin)
  const normalized = input.toUpperCase() === 'ADMIN' ? 'ADMIN' : input.toLowerCase() === 'admin' ? 'admin' : 'user'

  // Se seu schema usa enum Role { ADMIN, USER }, isso funciona; se for string, também.
  await prisma.user.update({ where: { id }, data: { role: normalized as any } })
  res.status(200).json({ ok: true })
}