// src/pages/api/ask/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { generateFull, generateStream } from '@/lib/llm'
import { transcribeAudioFiles } from '@/lib/asr'
import { rateLimit } from '@/lib/rateLimit'

// ───────────────────────────────────────────────────────────
// Desliga o body parser do Next p/ lidarmos com multipart/form-data
// ───────────────────────────────────────────────────────────
export const config = { api: { bodyParser: false } }

// Tipos de resposta
type ApiOk = { id: string; answer: string; question: string; createdAt: string }
type ApiErr = { error: string }

// Limites & MIME allowlist (alinhados ao Composer)
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

/** Garante que pegamos "files" mas também "file"/"audio" por compatibilidade */
function pickAllFiles(f: formidable.Files): File[] {
  const out: File[] = []
  const tryPush = (v: unknown) => {
    if (!v) return
    if (Array.isArray(v)) out.push(...(v as File[]))
    else out.push(v as File)
  }
  const any = f as Record<string, unknown>
  // prioridades conhecidas
  tryPush(any['files'])
  tryPush(any['file'])
  tryPush(any['audio'])
  // pega qualquer outro campo de arquivo (defensive)
  for (const v of Object.values(any)) {
    if (!v) continue
    if (Array.isArray(v)) {
      for (const x of v) if ((x as File)?.filepath && !out.includes(x as File)) out.push(x as File)
    } else if ((v as File)?.filepath && !out.includes(v as File)) {
      out.push(v as File)
    }
  }
  return out
}

/** Faz parse de multipart/form-data ou JSON cru (bodyParser off) */
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
      filter: (part) => {
        // se o navegador não mandar mimetype, deixamos passar (servidor valida depois)
        return part.mimetype ? ACCEPTED_MIME.has(part.mimetype) : true
      },
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

    const picked = pickAllFiles(files).slice(0, MAX_FILES)
    return { prompt: String(prompt || ''), files: picked }
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

/** Sessão segura (pode não existir) */
async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req as any, res as any, authOptions as any)
    const user = (session as any)?.user || null
    return {
      userId: (user as any)?.id ?? null,
      email: (user as any)?.email ?? null,
    }
  } catch {
    return { userId: null, email: null }
  }
}

/** Gera um ID estável p/ o item (não colide em ambiente serverless) */
function newQueryId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

  // Rate limit básico (anti-abuso)
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

    // Sessão (pode ser null/guest)
    const { userId } = await getSessionUser(req, res)

    // Se vier áudio, transcreve e adiciona como contexto adicional
    let transcripts: string[] = []
    try {
      if (files.length) {
        const audioOnly = files.filter((f) => {
          const t = (f as any).mimetype || ''
          return t.startsWith('audio/')
        })
        if (audioOnly.length) {
          transcripts = await transcribeAudioFiles(audioOnly)
        }
      }
    } catch (e) {
      console.error('Transcription failed:', e)
    }

    // STREAMING
    if (wantsStream) {
      const id = newQueryId()
      const createdAt = new Date()
      const question = prompt.trim()

      // headers precisam ir ANTES de qualquer write
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')

      // Header customizado deve conter apenas ASCII; encode em base64
      const meta = { id, question, createdAt: createdAt.toISOString() }
      const metaB64 = Buffer.from(JSON.stringify(meta), 'utf8').toString('base64')
      res.setHeader('x-aim-answer-meta', metaB64)
      res.setHeader('x-aim-answer-meta-encoding', 'base64')

      ;(res as any).flushHeaders?.()

      let answer = ''
      try {
        for await (const chunk of generateStream(question, { transcripts })) {
          answer += chunk
          res.write(chunk)
        }
      } catch (streamErr) {
        console.error('Erro durante stream:', streamErr)
      } finally {
        try { res.end() } catch {}
      }

      // Persistência assíncrona (não bloqueia a resposta)
      try {
        await prisma.query.create({
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
      }

      return
    }

    // JSON (fallback non-stream)
    const question = prompt.trim()
    const answer = await generateFull(question, { transcripts })
    const id = newQueryId()
    const createdAtISO = new Date().toISOString()

    try {
      await prisma.query.create({
        data: {
          id,
          userId,
          question,
          answer,
          queryType: 'evidence',
          createdAt: new Date(createdAtISO),
        },
      })
    } catch (e) {
      console.error('Persistência (no-stream) falhou:', e)
    }

    const payload: ApiOk = { id, answer, question, createdAt: createdAtISO }
    res.status(200).json(payload)
  } catch (e: any) {
    console.error('/api/ask error', e)
    if (!res.headersSent) res.status(500).json({ error: 'Internal error' })
    else { try { res.end() } catch {} }
  }
}