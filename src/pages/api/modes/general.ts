// src/pages/api/modes/general.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

type Body = { prompt?: string }
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // login é opcional (modo gratuito)
  const session = await getServerSession(req, res, authOptions as any)
  const email = (session as any)?.user?.email as string | undefined
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
    : null

  const { prompt } = (req.body || {}) as Body
  const p = String(prompt || '').trim()
  if (!p) return res.status(400).json({ error: 'Missing prompt' })

  try {
    const sys =
      'Você é o Copiloto Médico Geral (AIMNESIS). Responda de forma objetiva, segura e empática, em português do Brasil, usando Markdown. Traga referências quando possível. Não dê diagnóstico definitivo; sugira condutas e quando encaminhar.'

    const userMsg = [
      `Caso (Clínica Geral):\n${p}\n`,
      'Estruture em blocos curtos:',
      '1) Resumo do caso',
      '2) Sinais de alarme',
      '3) Hipóteses principais (3–5) com raciocínio',
      '4) Conduta imediata (exames/medidas)',
      '5) Quando encaminhar / reavaliar',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_GENERAL_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim() || 'Não foi possível gerar resposta.'

    // log (se tiver user)
    if (user?.id) {
      void prisma.query.create({
        data: { userId: user.id, queryType: 'general', question: p },
      }).catch(() => {})
    }

    return res.status(200).json({ answer, meta: { mode: 'general' } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Erro no modo Geral' })
  }
}