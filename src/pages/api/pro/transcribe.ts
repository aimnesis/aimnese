// src/pages/api/pro/transcribe.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import formidable, { File } from 'formidable'
import fs from 'fs'
import { promisify } from 'util'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { hasPro as canUsePro } from '@/server/paywall'
import OpenAI from 'openai'

export const config = { api: { bodyParser: false } }

type Ok = { text: string }
type Err = { error: string }

const unlink = promisify(fs.unlink)
const readStream = (p: string) => fs.createReadStream(p)

const ACCEPT_MIME = new Set([
  'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/x-m4a',
])
const MAX_BYTES = 25 * 1024 * 1024 // 25MB

const openaiKey = (process.env.OPENAI_API_KEY || '').trim()
const whisperBaseRaw = (process.env.WHISPER_API_BASE || '').trim()
const whisperBase = /^https?:\/\//i.test(whisperBaseRaw) ? whisperBaseRaw : ''

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false, maxFiles: 1, maxFileSize: MAX_BYTES, keepExtensions: true })
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })))
  })
}

function pickFirstFile(files: formidable.Files): File | undefined {
  for (const key of ['audio', 'file', 'files']) {
    const v = (files as any)[key]
    if (!v) continue
    if (Array.isArray(v)) return (v[0] as File) || undefined
    return v as File
  }
  for (const v of Object.values(files)) {
    if (Array.isArray(v)) return (v[0] as File) || undefined
    if (v) return v as File
  }
  return undefined
}

function withTimeout<T>(p: Promise<T>, ms = 60_000): Promise<T> {
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), ms)
  return Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      ac.signal.addEventListener('abort', () =>
        rej(Object.assign(new Error('Timeout na transcrição'), { status: 504 }))
      )
    ),
  ]).finally(() => clearTimeout(to))
}

async function transcribeViaBase(tmpPath: string, filename: string) {
  const form = new FormData()
  form.append('file', readStream(tmpPath) as any, filename)
  form.append('model', 'whisper-1')
  form.append('language', 'pt')

  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 60_000)

  try {
    const resp = await fetch(`${whisperBase.replace(/\/+$/, '')}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form as any,
      signal: ctrl.signal,
    })
    if (!resp.ok) {
      const msg = await resp.text().catch(() => '')
      throw Object.assign(new Error(msg || `Falha ${resp.status} na transcrição (WHISPER_API_BASE)`), { status: resp.status })
    }
    const data = (await resp.json()) as any
    const text = (data?.text ?? data?.result ?? '').toString().trim()
    if (!text) throw Object.assign(new Error('Resposta sem texto (WHISPER_API_BASE)'), { status: 502 })
    return text
  } finally {
    clearTimeout(to)
  }
}

async function transcribeViaOpenAI(tmpPath: string) {
  if (!openai) throw Object.assign(new Error('OPENAI_API_KEY ausente'), { status: 500 })
  const req = openai.audio.transcriptions.create({
    file: readStream(tmpPath) as any,
    model: 'whisper-1',
    language: 'pt',
    response_format: 'json',
  }) as unknown as Promise<any>
  const data = await withTimeout(req, 60_000)
  const text = (data?.text || '').toString().trim()
  if (!text) throw Object.assign(new Error('Resposta sem texto (OpenAI)'), { status: 502 })
  return text
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getServerSession(req, res, authOptions as any)
  const userId = (session as any)?.user?.id as string | undefined
  if (!userId) return res.status(401).json({ error: 'Não autenticado' })

  const allowed = await canUsePro(userId).catch(() => false)
  if (!allowed) return res.status(402).json({ error: 'Limite de uso atingido. Assine o PRO.' })

  if (!whisperBase && !openai) {
    return res.status(503).json({ error: 'Transcrição indisponível (configure OPENAI_API_KEY ou WHISPER_API_BASE).' })
  }

  let tmpPath: string | undefined
  try {
    const { files } = await parseForm(req)
    const f = pickFirstFile(files)
    if (!f) return res.status(400).json({ error: 'Arquivo ausente' })

    const filepath = (f as any).filepath ?? (f as any).path
    const mimetype: string | undefined = (f as any).mimetype ?? (f as any).type
    const size: number | undefined = (f as any).size
    const original = (f as any).originalFilename ?? (f as any).originalFileName ?? 'audio'

    if (!filepath || typeof filepath !== 'string') return res.status(400).json({ error: 'Falha ao receber arquivo' })
    tmpPath = filepath

    if (typeof size === 'number' && size > MAX_BYTES) return res.status(413).json({ error: 'Arquivo maior que 25MB' })
    if (mimetype && !ACCEPT_MIME.has(mimetype)) {
      // opcionalmente recuse
      // return res.status(415).json({ error: `Formato não suportado (${mimetype})` })
    }

    const baseName = path.basename(String(original))
    const text = whisperBase ? await transcribeViaBase(tmpPath, baseName) : await transcribeViaOpenAI(tmpPath)
    return res.status(200).json({ text })
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500
    const msg = e?.name === 'AbortError' ? 'Tempo esgotado na transcrição' : e?.message || 'Erro na transcrição'
    console.error('[transcribe]', status, msg)
    return res.status(status).json({ error: msg })
  } finally {
    if (tmpPath) { try { await unlink(tmpPath) } catch {} }
  }
}