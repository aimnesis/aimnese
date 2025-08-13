// src/pages/api/user/me.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  const email = session.user.email as string
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      medicalLicenseId: user.medicalLicenseId || '',
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
  })
}