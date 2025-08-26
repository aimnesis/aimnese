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
    const sys =
      'Você é o Copiloto de Plantão/Emergência. Foque em condutas imediatas, fluxos (ACLS/ATLS), red flags e doses. PT-BR, Markdown, segurança máxima.'

    const userMsg = [
      `Cenário de plantão:\n${p}\n`,
      'Responda assim:',
      '1) Red flags e estabilização imediata',
      '2) Diferenciais críticos a descartar',
      '3) Exames imediatos / monitoração',
      '4) Condutas e doses (adulto; ajuste se renal/hepático quando relevante)',
      '5) Critérios de internação/UTI e quando chamar especialista',
      '6) Referências rápidas',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_PLANTAO_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim() || 'Não foi possível gerar a conduta de plantão.'

    void prisma.query.create({
      data: { userId: user.id, queryType: 'plantao' as any, question: p },
    }).catch(() => {})

    return res.status(200).json({ answer, meta: { mode: 'plantao' } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Erro no modo Plantão' })
  }
}