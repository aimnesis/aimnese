// src/pages/api/admin/_utils.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  const email = session?.user?.email ?? null
  if (!email) {
    res.status(401).json({ error: 'unauthenticated' })
    return null
  }
  const db = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, email: true } })
  const role = String(db?.role ?? 'user').toLowerCase()
  if (role !== 'admin') {
    res.status(403).json({ error: 'forbidden' })
    return null
  }
  return { id: db!.id, email: db!.email, role: 'admin' as const }
}