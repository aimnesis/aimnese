// src/pages/api/admin/export.csv.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from './_utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const from = req.query.from ? new Date(String(req.query.from)) : null
  const to   = req.query.to   ? new Date(String(req.query.to))   : null

  const where: any = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = from
    if (to)   where.createdAt.lte = to
  }

  // funciona com Query OU MedicalQuery, de acordo com seu schema
  const queries =
    (await (prisma as any).query?.findMany?.({
      where, orderBy: { createdAt: 'desc' },
      select: { id: true, question: true, answer: true, createdAt: true, user: { select: { email: true } } }
    })) ??
    (await (prisma as any).medicalQuery.findMany({
      where, orderBy: { createdAt: 'desc' },
      select: { id: true, question: true, answer: true, createdAt: true, user: { select: { email: true } } }
    }))

  const rows: Array<Array<string | number>> = [
    ['id', 'email', 'question', 'answer', 'createdAt'],
    ...queries.map((q: any) => [
      q.id,
      q.user?.email ?? '',
      String(q.question ?? '').replace(/\s+/g, ' '),
      String(q.answer ?? '').replace(/\s+/g, ' '),
      new Date(q.createdAt).toISOString(),
    ])
  ]

  const csv = rows
    .map((r) =>
      r
        .map((cell: string | number) => {
          const s = String(cell ?? '')
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(',')
    )
    .join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="export.csv"')
  res.status(200).send(csv)
}