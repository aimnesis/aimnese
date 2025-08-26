// src/pages/api/modes/specialties.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { canUseMode } from '@/server/paywall'
import { getPromptForMode } from '@/lib/llm'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type Body = {
  prompt?: string
  specialty?: string
  subtopic?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' })

  const session = await getServerSession(req, res, authOptions as any)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return res.status(401).json({ error: 'unauthorized' })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user?.id) return res.status(401).json({ error: 'unauthorized' })

  // Gate por modo "specialties"
  const gate = await canUseMode(user.id, 'specialties').catch(() => ({ allowed: false, reason: 'paywall' }))
  if (!gate.allowed) {
    return res.status(402).json({ error: 'PRO required', reason: gate.reason || 'paywall' })
  }

  const { prompt, specialty, subtopic } = (req.body || {}) as Body
  const p = String(prompt || '').trim()
  const sp = String(specialty || '').trim()
  const st = String(subtopic || '').trim()

  if (!p && !sp) return res.status(400).json({ error: 'missing-prompt-or-specialty' })

  // Mensagem do usuário combinando contexto de especialidade
  const userPrompt =
    [
      sp ? `Especialidade: ${sp}` : null,
      st ? `Subtema: ${st}` : null,
      p ? `Pergunta: ${p}` : null,
      '',
      'Estruture:',
      '• Diretrizes atuais (síntese; cite sociedade/ano quando possível)',
      '• Exames pertinentes (o que pedir e por quê)',
      '• Conduta por níveis de evidência (A/B/C) — bullets objetivos',
      '• Alertas/armadilhas',
      '• Quando encaminhar',
    ]
      .filter(Boolean)
      .join('\n') || 'Síntese por especialidade.'

  try {
    // Reaproveita o tempero de modo do llm.ts
    const messages = getPromptForMode('specialties', userPrompt)

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_SPECIALTY_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: messages as any,
    })

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      'Não foi possível gerar a resposta de especialidades.'

    // Telemetria leve / histórico (best-effort)
    void prisma.query
      .create({
        data: {
          userId: user.id,
          queryType: 'specialties',
          question: p || `${sp}${st ? `/${st}` : ''}`,
        },
      })
      .catch(() => {})

    return res
      .status(200)
      .json({ answer, meta: { mode: 'specialties', specialty: sp || null, subtopic: st || null } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'internal-error' })
  }
}