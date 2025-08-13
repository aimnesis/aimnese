// src/lib/asr.ts
import fs from 'node:fs'
import OpenAI from 'openai'
import type { File as IncomingFile } from 'formidable'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const REQ_TIMEOUT_MS = 60_000 // 60s

// AbortController com timeout
function makeTimeoutSignal(ms = REQ_TIMEOUT_MS) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return {
    signal: ctrl.signal,
    clear: () => clearTimeout(timer),
  }
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
  const { signal, clear } = makeTimeoutSignal()
  try {
    // Garante que o arquivo existe
    if (!fs.existsSync(filePath)) return ''
    stream = fs.createReadStream(filePath)

    const resp = await openai.audio.transcriptions.create(
      {
        model: 'whisper-1',
        file: stream as any, // SDK aceita ReadStream
        language: 'pt',
        response_format: 'text',
        temperature: 0,
      },
      { signal }
    )

    if (typeof resp === 'string') return resp.trim()
    // alguns SDKs retornam objeto { text }
    // @ts-ignore
    return (resp?.text ?? '').toString().trim()
  } catch (e) {
    console.error('ASR error:', e)
    return ''
  } finally {
    try { stream?.close() } catch {}
    try { fs.unlinkSync(filePath) } catch {}
    clear()
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