// src/pages/api/user/queries.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any)
  if (!session || !(session as any).email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { page = '1', size = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
  const pageSize = Math.min(100, parseInt(size as string, 10) || 20)
  const skip = (pageNum - 1) * pageSize

  const user = await prisma.user.findUnique({
    where: { email: (session as any).email },
    select: {
      id: true,
    },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const [total, queries] = await Promise.all([
    prisma.query.count({
      where: { userId: user.id },
    }),
    prisma.query.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        question: true,
        answer: true,
        createdAt: true,
        queryType: true,
      },
    }),
  ])

  res.status(200).json({
    total,
    page: pageNum,
    size: pageSize,
    queries,
  })
}