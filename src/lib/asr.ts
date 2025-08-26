// src/lib/asr.ts
import fs from 'node:fs'
import OpenAI from 'openai'
import type { File as IncomingFile } from 'formidable'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const REQ_TIMEOUT_MS = 60_000 // 60s
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function withTimeout<T>(p: Promise<T>, ms = REQ_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ASR_TIMEOUT')), ms)
    p.then((v) => { clearTimeout(timer); resolve(v) })
      .catch((err) => { clearTimeout(timer); reject(err) })
  })
}

async function withRetries<T>(
  fn: () => Promise<T>,
  { tries = 3, baseDelay = 400 }: { tries?: number; baseDelay?: number } = {}
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const msg = String(err?.message || err)
      const code = err?.status || err?.code
      const retriable =
        msg.includes('ASR_TIMEOUT') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNRESET') ||
        code === 429 || code === 500 || code === 502 || code === 503 || code === 504
      if (!retriable || i === tries - 1) break
      const wait = baseDelay * Math.pow(2, i) + Math.random() * 200
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

/**
 * Transcreve um arquivo de áudio local com Whisper.
 * Suporta .webm, .m4a, .mp3, .wav etc.
 * Retorna '' (string vazia) se não houver chave de API ou em erro (fail-safe).
 * Limpa o arquivo temporário ao final.
 */
export async function transcribeOne(filePath: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return ''
  let stream: fs.ReadStream | null = null
  try {
    if (!fs.existsSync(filePath)) return ''
    const stat = fs.statSync(filePath)
    if (!stat?.isFile() || stat.size <= 0 || stat.size > MAX_FILE_SIZE) return ''
    stream = fs.createReadStream(filePath)

    const resp = await withRetries(
      () =>
        withTimeout(
          openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: stream as any, // ReadStream aceito pelo SDK
            language: 'pt',
            response_format: 'text',
            temperature: 0,
          }),
          REQ_TIMEOUT_MS
        ),
      { tries: 3 }
    )

    if (typeof resp === 'string') return resp.trim()
    if (resp && typeof (resp as any).text === 'string') {
      return String((resp as any).text).trim()
    }
    return ''
  } catch (e) {
    console.error('ASR error:', e)
    return ''
  } finally {
    try { stream?.close() } catch {}
    try { fs.unlinkSync(filePath) } catch {}
  }
}

/**
 * Recebe a lista de arquivos vindos do formidable e
 * transcreve apenas os que forem de áudio.
 */
export async function transcribeAudioFiles(files: IncomingFile[]): Promise<string[]> {
  const audios = files.filter((f) => (f.mimetype || '').startsWith('audio/'))
  if (audios.length === 0) return []
  const out: string[] = []
  for (const a of audios) {
    try {
      if (!a.filepath) continue
      const txt = await transcribeOne(a.filepath)
      if (txt) out.push(txt)
    } catch {
      // segue para o próximo; função é best-effort
    }
  }
  return out
}