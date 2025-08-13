// src/pages/api/user/verify-license.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

// substituir pela integração real
async function verifyLicenseExternally(license: string): Promise<boolean> {
  // Ex: chamada a API oficial de CRM/NPI
  // retornar true se válido, false se não
  return license.trim() !== ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions as any)
  if (!session || !(session as any).email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: (session as any).email },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (!user.medicalLicenseId) return res.status(400).json({ error: 'No license on file' })

  const valid = await verifyLicenseExternally(user.medicalLicenseId)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: valid },
    select: {
      isVerified: true,
    },
  })

  res.status(200).json({ verified: updated.isVerified })
}