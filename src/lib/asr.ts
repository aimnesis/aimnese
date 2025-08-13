// src/lib/asr.ts
import fs from 'node:fs'
import OpenAI from 'openai'
import type { File as IncomingFile } from 'formidable'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const REQ_TIMEOUT_MS = 60_000 // 60s

// Timeout helper (Promise.race) — sem passar `signal` pro SDK (evita erro de type)
function withTimeout<T>(p: Promise<T>, ms = REQ_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ASR_TIMEOUT')), ms)
    p.then((v) => {
      clearTimeout(timer)
      resolve(v)
    }).catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
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
    // Garante que o arquivo existe
    if (!fs.existsSync(filePath)) return ''
    stream = fs.createReadStream(filePath)

    const resp = await withTimeout(
      openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: stream as any, // SDK aceita ReadStream
        language: 'pt',
        response_format: 'text',
        temperature: 0,
      }),
      REQ_TIMEOUT_MS
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
export async function transcribeAudioFiles(
  files: IncomingFile[]
): Promise<string[]> {
  const audios = files.filter((f) => (f.mimetype || '').startsWith('audio/'))
  if (audios.length === 0) return []
  const out: string[] = []
  for (const a of audios) {
    if (!a.filepath) continue
    const txt = await transcribeOne(a.filepath)
    if (txt) out.push(txt)
  }
  return out
}