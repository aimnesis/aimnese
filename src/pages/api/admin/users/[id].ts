import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '../_utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAdmin(req, res)
  if (!session) return

  const { id } = req.query
  const userId = Array.isArray(id) ? id[0] : id
  if (!userId) return res.status(400).json({ error: 'missing id' })

  if (req.method === 'GET') {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    return res.json({ user })
  }

  if (req.method === 'PATCH') {
    const { blocked, isVerified, role } = req.body as {
      blocked?: boolean
      isVerified?: boolean
      role?: 'user' | 'admin'
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        blocked: typeof blocked === 'boolean' ? blocked : undefined,
        isVerified: typeof isVerified === 'boolean' ? isVerified : undefined,
        role: role === 'user' || role === 'admin' ? role : undefined,
      },
    })
    return res.json({ user })
  }

  return res.status(405).end()
}