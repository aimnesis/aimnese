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
      'Você é o Copiloto de Consultório. Ajude a conduzir consultas eletivas: anamnese, sumário, diagnóstico diferencial, plano, comunicação e follow-up. PT-BR, Markdown.'

    const userMsg = [
      `Consulta (eletiva):\n${p}\n`,
      'Retorne:',
      '1) Anamnese resumida e dados que faltam perguntar',
      '2) Diagnóstico diferencial (3–5) com raciocínio curto',
      '3) Exames pertinentes (porquê pedir)',
      '4) Plano terapêutico (med e não-med) + educação do paciente',
      '5) Atestado/declaração (se aplicável) e follow-up',
      '6) Referências',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_CONSULTORIO_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim() || 'Não foi possível gerar o apoio à consulta.'

    void prisma.query.create({
      data: { userId: user.id, queryType: 'consultorio' as any, question: p },
    }).catch(() => {})

    return res.status(200).json({ answer, meta: { mode: 'consultorio' } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Erro no modo Consultório' })
  }
}