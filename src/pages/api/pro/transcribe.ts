// pages/api/pro/transcribe.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import fs from 'fs'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { canUsePro } from '@/server/paywall'

export const config = { api: { bodyParser: false } }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false, maxFileSize: 25 * 1024 * 1024 })
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions as any)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) return res.status(401).json({ error: 'Não autenticado' })

  const gate = await canUsePro(userId)
  if (!gate.allowed) return res.status(402).json({ error: 'Limite de uso atingido. Assine o PRO.' })

  try {
    const { files } = await parseForm(req)

    // `files.file` can be undefined | File | File[], normalize safely:
    type FileLike = File | undefined
    const fileField = (files as Record<string, unknown>)['file'] as unknown
    const incoming: FileLike = Array.isArray(fileField)
      ? (fileField[0] as File)
      : (fileField as File | undefined)

    const filepath = (incoming as unknown as { filepath?: string })?.filepath
    if (!filepath) return res.status(400).json({ error: 'Arquivo ausente' })

    const stream = fs.createReadStream(filepath)

    const resp = await openai.audio.transcriptions.create({
      file: stream as any,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    })

    const text = typeof resp === 'string' ? resp : (resp as unknown as { text?: string })?.text || ''
    if (!text) return res.status(500).json({ error: 'Falha na transcrição' })

    return res.status(200).json({ text })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro na transcrição'
    console.error('Transcribe error:', e)
    return res.status(500).json({ error: msg })
  }
}