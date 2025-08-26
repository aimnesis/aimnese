// src/pages/api/pro/transcribe/long.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'

import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { hasPro } from '@/server/paywall'

export const config = { api: { bodyParser: false } }

const TMP_ROOT = process.env.AIM_TMP_DIR || '/tmp/aimnesis-longrec'
const MAX_PARTS = 180 // ~60 min se cada parte ~20s
const ACCEPT = new Set(['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg'])

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function ensureDir(p: string) { await fs.mkdir(p, { recursive: true }) }

async function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false, maxFileSize: 25 * 1024 * 1024 }) // 25MB por parte
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })))
  })
}

async function listParts(dir: string) {
  try {
    const entries = await fs.readdir(dir)
    return entries
      .filter((f) => f.startsWith('part-') && f.endsWith('.bin'))
      .map((f) => ({ name: f, idx: Number(f.slice(5, -4)) }))
      .sort((a, b) => a.idx - b.idx)
  } catch {
    return []
  }
}

async function transcribeFile(filePath: string): Promise<string> {
  const rs = (await import('fs')).createReadStream(filePath)
  const r = await client.audio.transcriptions.create({
    model: (process.env.OPENAI_WHISPER_MODEL as any) || 'whisper-1',
    file: rs as any,
    language: 'pt',
    temperature: 0,
    response_format: 'text',
  })
  return (r as unknown as string) || ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 🔒 Auth + PRO
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  const pro = await hasPro(user.id).catch(() => false)
  if (!pro) return res.status(402).json({ error: 'PRO required' })

  const action = String(req.query.action || 'append')
  const sessionId = String(req.query.sessionId || '').trim()
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })

  const userDir = path.join(TMP_ROOT, user.id, sessionId)
  await ensureDir(userDir)

  if (action === 'append') {
    try {
      const { files } = await parseForm(req)
      const file = (files.file as any) || (files.audio as any)
      if (!file?.filepath) return res.status(400).json({ error: 'Missing file' })
      const mimetype = String(file.mimetype || '')
      if (mimetype && !ACCEPT.has(mimetype)) return res.status(415).json({ error: 'Tipo de arquivo não suportado' })

      const parts = await listParts(userDir)
      if (parts.length >= MAX_PARTS) return res.status(413).json({ error: 'Limite de duração atingido' })
      const nextIdx = (parts.at(-1)?.idx ?? 0) + 1
      const dest = path.join(userDir, `part-${String(nextIdx).padStart(5, '0')}.bin`)
      await fs.copyFile(file.filepath, dest)

      const updated = await listParts(userDir)
      return res.status(200).json({ ok: true, parts: updated.length })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Falha no upload' })
    }
  }

  if (action === 'partial') {
    try {
      const n = Math.max(1, Math.min(3, Number(req.query.n || 1)))
      const parts = await listParts(userDir)
      if (parts.length === 0) return res.status(200).json({ partial: '' })
      const slice = parts.slice(Math.max(0, parts.length - n))
      let txt = ''
      for (const p of slice) {
        const fp = path.join(userDir, p.name)
        const t = (await transcribeFile(fp)).trim()
        if (t) txt += (txt ? ' ' : '') + t
      }
      return res.status(200).json({ partial: txt })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Falha na transcrição parcial' })
    }
  }

  if (action === 'finalize') {
    try {
      const parts = await listParts(userDir)
      if (parts.length === 0) return res.status(400).json({ error: 'Nenhuma parte enviada' })

      let fullText = ''
      for (const p of parts) {
        const fp = path.join(userDir, p.name)
        const t = (await transcribeFile(fp)).trim()
        if (t) fullText += (fullText ? ' ' : '') + t
      }

      // limpeza best-effort
      try { await fs.rm(userDir, { recursive: true, force: true }) } catch {}

      // (hook opcional) aqui você poderia criar Encounter e retornar ID
      const encounterId: string | null = null

      return res.status(200).json({ final: fullText || ' ', encounterId })
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Falha na transcrição' })
    }
  }

  return res.status(400).json({ error: 'Invalid action' })
}