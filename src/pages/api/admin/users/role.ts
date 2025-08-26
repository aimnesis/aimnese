import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '../_utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await requireAdmin(req, res)
  if (!session) return

  const { id, role } = req.body as { id?: string; role?: 'user' | 'admin' }
  if (!id || (role !== 'user' && role !== 'admin')) {
    return res.status(400).json({ error: 'invalid payload' })
  }
  const user = await prisma.user.update({ where: { id }, data: { role } })
  return res.json({ user })
}