import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { hasPro } from '@/server/paywall'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

type Body = { prompt?: string }
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions as any)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return res.status(401).json({ error: 'Unauthorized' })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })

  const pro = await hasPro(user.id).catch(() => false)
  if (!pro) return res.status(402).json({ error: 'PRO required' })

  const { prompt } = (req.body || {}) as Body
  const p = String(prompt || '').trim()
  if (!p) return res.status(400).json({ error: 'Missing prompt' })

  try {
    const sys = [
      'Você é o Copiloto de Análise + Prescrição Completa da AIMNESIS.',
      'Inclua anamnese, hipóteses, diferenciais, elucidações diagnósticas e condutas (med e não-med).',
      'Foque em segurança, qualidade de vida e longevidade. Responda em PT-BR, Markdown.',
    ].join(' ')

    const userMsg = [
      `Caso:\n${p}\n`,
      'Entregue em seções:',
      '1) Anamnese e achados relevantes',
      '2) Etiologia provável',
      '3) Hipóteses (3–5) e diferenciais',
      '4) Elucidações diagnósticas (o que pedir/por quê)',
      '5) Condutas: medicamentosas e não medicamentosas',
      '6) Comunicação ao paciente e follow-up',
      '7) Referências essenciais',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
    })

    const answer =
      completion.choices?.[0]?.message?.content?.trim() || 'Não foi possível gerar a prescrição.'

    void prisma.query.create({
      data: { userId: user.id, queryType: 'analysis' as any, question: p },
    }).catch(() => {})

    return res.status(200).json({ answer, meta: { mode: 'analysis' } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Erro no modo Análise' })
  }
}