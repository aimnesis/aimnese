// src/pages/api/pro/generate.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { z } from 'zod'
import { hasPro as canUsePro } from '@/server/paywall'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const OutSchema = z.object({
  anamnese: z.string(),
  soap: z.string(),
  orientacoes: z.string(),
  prescricoes: z.string(),
  exames: z.string(),
  laudos: z.string(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = (await getServerSession(req, res, authOptions as any)) as any
  const userId = session?.user?.id as string | undefined
  if (!userId) return res.status(401).json({ error: 'Não autenticado' })

  const transcriptRaw = (req.body?.transcript ?? '').toString().trim()
  if (!transcriptRaw) return res.status(400).json({ error: 'transcript é obrigatório' })
  if (transcriptRaw.length < 10) return res.status(400).json({ error: 'transcript muito curto' })

  const allowed = await canUsePro(userId)
  if (!allowed) return res.status(402).json({ error: 'Limite de uso atingido. Assine o PRO.' })

  try {
    const system = `Você é um assistente médico que transforma uma transcrição em 6 documentos clínicos.
Responda SEMPRE em pt-BR e em JSON estrito com as chaves: anamnese, soap, orientacoes, prescricoes, exames, laudos.
Evite alucinar; use apenas o que está no transcript.`

    const user = `TRANSCRIPT:\n${transcriptRaw}\n\nGere o JSON solicitado.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })

    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = OutSchema.parse(JSON.parse(raw))

    await prisma.query.create({
      data: {
        userId,
        question: transcriptRaw.slice(0, 180),
        answer: JSON.stringify(parsed),
        queryType: 'PRO',
      },
    })

    await prisma.$transaction([
      prisma.generatedDoc.create({ data: { userId, kind: 'anamnese',   content: parsed.anamnese } }),
      prisma.generatedDoc.create({ data: { userId, kind: 'soap',       content: parsed.soap } }),
      prisma.generatedDoc.create({ data: { userId, kind: 'orientacoes',content: parsed.orientacoes } }),
      prisma.generatedDoc.create({ data: { userId, kind: 'prescricao', content: parsed.prescricoes } }),
      prisma.generatedDoc.create({ data: { userId, kind: 'exames',     content: parsed.exames } }),
      prisma.generatedDoc.create({ data: { userId, kind: 'laudos',     content: parsed.laudos } }),
    ])

    return res.status(200).json({ docs: parsed })
  } catch (e: any) {
    console.error('[pro/generate]', e)
    return res.status(500).json({ error: e?.message || 'Falha na geração' })
  }
}