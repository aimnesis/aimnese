// src/pages/api/ask/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { generateFull, generateStream } from '@/lib/llm'
import { transcribeAudioFiles } from '@/lib/asr'
import { rateLimit } from '@/lib/rateLimit'
import * as Sentry from '@sentry/nextjs'

// ───────────────────────────────────────────────────────────
// Next disables body parsing so we can handle multipart/form-data
// ───────────────────────────────────────────────────────────
export const config = { api: { bodyParser: false } }

// Response types
type ApiOk = { id: string; answer: string; question: string; createdAt: string }
type ApiErr = { error: string }

// Limits & MIME allowlist
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 6
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
])

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────
async function readRawBody(req: NextApiRequest): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/** Parse tanto multipart/form-data quanto JSON puro */
async function parseRequest(
  req: NextApiRequest
): Promise<{ prompt: string; files: File[] }> {
  const ctype = req.headers['content-type'] || ''

  // multipart/form-data
  if (ctype.includes('multipart/form-data')) {
    const form = formidable({
      multiples: true,
      allowEmptyFiles: false,
      maxFileSize: MAX_FILE_SIZE,
      maxTotalFileSize: MAX_FILE_SIZE * MAX_FILES,
      filter: (part) => (part.mimetype ? ACCEPTED_MIME.has(part.mimetype) : true),
    })

    const { fields, files } = await new Promise<{
      fields: formidable.Fields
      files: formidable.Files
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      )
    })

    const prompt =
      (Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt) || ''
    const picked: File[] = []
    const anyFiles = files.files
    if (anyFiles) {
      if (Array.isArray(anyFiles)) picked.push(...(anyFiles as File[]))
      else picked.push(anyFiles as File)
    }
    // limita quantidade
    const normalized = picked.slice(0, MAX_FILES)
    return { prompt: String(prompt || ''), files: normalized }
  }

  // JSON (precisamos ler manualmente pois bodyParser está off)
  const raw = await readRawBody(req)
  try {
    const obj = raw ? JSON.parse(raw) : {}
    return { prompt: String(obj.prompt || ''), files: [] }
  } catch {
    return { prompt: '', files: [] }
  }
}

/** Recupera sessão (quando existir) e retorna userId/email de forma safe */
async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(
      req as any,
      res as any,
      authOptions as any
    )
    const user = (session as any)?.user || null
    return {
      userId: (user as any)?.id ?? null,
      email: (user as any)?.email ?? null,
    }
  } catch {
    return { userId: null, email: null }
  }
}

// ───────────────────────────────────────────────────────────
// Handler principal
// ───────────────────────────────────────────────────────────
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Rate limit (anti-abuso no beta)
  try {
    await rateLimit(req, res, { max: 30, windowMs: 60_000 }) // 30 req/min por IP
  } catch {
    res.status(429).json({ error: 'Muitas requisições, tente em instantes.' })
    return
  }

  const wantsStream = String(req.query.stream || '') === '1'

  try {
    const { prompt, files } = await parseRequest(req)
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Prompt vazio' })
      return
    }
    if (prompt.length > 8000) {
      res.status(413).json({ error: 'Prompt muito longo' })
      return
    }

    // Sessão (pode ser null em modo anônimo)
    const { userId } = await getSessionUser(req, res)

    // Se vier áudio, transcreve e anexa como contexto
    let transcripts: string[] = []
    try {
      transcripts = await transcribeAudioFiles(files)
    } catch (e) {
      console.error('Transcription failed:', e)
      Sentry.captureException(e)
    }

    // STREAMING
    if (wantsStream) {
      const id = `q_${Date.now()}`
      const createdAt = new Date()
      const question = prompt.trim()

      // headers antes de qualquer write
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader(
        'x-aim-answer-meta',
        JSON.stringify({ id, question, createdAt: createdAt.toISOString() })
      )
      // flush headers se disponível (nem todo adaptador expõe)
      ;(res as any).flushHeaders?.()

      let answer = ''
      try {
        for await (const chunk of generateStream(question, { transcripts })) {
          answer += chunk
          res.write(chunk)
        }
      } catch (streamErr) {
        console.error('Erro durante stream:', streamErr)
        Sentry.captureException(streamErr)
      } finally {
        try {
          res.end()
        } catch {}
      }

      // Persiste (async; não bloqueia a resposta)
      try {
        await prisma.medicalQuery.create({
          data: {
            id,
            userId,
            question,
            answer,
            queryType: 'evidence',
            createdAt,
          },
        })
      } catch (e) {
        console.error('Persistência (stream) falhou:', e)
        Sentry.captureException(e)
      }

      return
    }

    // JSON (fallback non-stream)
    const answer = await generateFull(prompt.trim(), { transcripts })
    const id = `q_${Date.now()}`
    const createdAt = new Date().toISOString()
    const question = prompt.trim()

    // Persiste
    try {
      await prisma.medicalQuery.create({
        data: {
          id,
          userId,
          question,
          answer,
          queryType: 'evidence',
          createdAt: new Date(createdAt),
        },
      })
    } catch (e) {
      console.error('Persistência (no-stream) falhou:', e)
      Sentry.captureException(e)
    }

    const payload: ApiOk = { id, answer, question, createdAt }
    res.status(200).json(payload)
  } catch (e: any) {
    console.error('/api/ask error', e)
    Sentry.captureException(e)
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' })
    else
      try {
        res.end()
      } catch {}
  }
}