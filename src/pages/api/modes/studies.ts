import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

type Body = { query?: string }
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // login é opcional (modo gratuito)
  const session = await getServerSession(req, res, authOptions as any)
  const email = (session as any)?.user?.email as string | undefined
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
    : null

  const { query } = (req.body || {}) as Body
  const q = String(query || '').trim()
  if (!q) return res.status(400).json({ error: 'Missing query' })

  try {
    const sys =
      'Você sintetiza evidências científicas em PT-BR. Produza revisão curta com links (quando possível), qualidade/nível de evidência e implicações clínicas. Use Markdown.'

    const userMsg = [
      `Tema/pesquisa: ${q}`,
      '',
      'Retorne com esta estrutura:',
      '• Visão geral da evidência',
      '• Principais estudos (NEJM/JAMA/Lancet/Guidelines nacionais) – cite ano e link quando possível',
      '• Nível de evidência e força de recomendação (A/B/C)',
      '• Pontos de prática clínica',
      '• Limitações e controvérsias',
      '• Referências/links',
    ].join('\n')

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_STUDIES_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim() || 'Não foi possível sintetizar as evidências.'

    if (user?.id) {
      void prisma.query.create({
        data: { userId: user.id, queryType: 'studies' as any, question: q },
      }).catch(() => {})
    }

    return res.status(200).json({ answer, meta: { mode: 'studies' } })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Erro no modo Estudos' })
  }
}