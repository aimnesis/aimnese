// src/lib/llm.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type Ctx = {
  transcripts?: string[] // transcrições/observações (ex.: áudio)
  model?: string
}

const REQ_TIMEOUT_MS = 60_000 // 60s

// Prompt clínico seguro (curto e objetivo)
const SYSTEM = [
  'Você é um assistente clínico para médicos.',
  'Seja objetivo, baseado em evidências (cite diretrizes e fontes quando possível).',
  'Aponte incertezas e alternativas. Não invente referências.',
  'Não substitui julgamento clínico; deixe isso claro.',
  'Formato: responda com seções claras e bullets quando útil.',
].join(' ')

// Mensagens da conversa
function buildMessages(prompt: string, ctx: Ctx = {}) {
  const { transcripts = [] } = ctx
  const userParts: string[] = [`Pergunta: ${prompt}`]
  if (transcripts.length) {
    userParts.push(
      'Observações de anexos/áudio:',
      ...transcripts.map((t, i) => `(${i + 1}) ${t}`)
    )
  }
  return [
    { role: 'system' as const, content: SYSTEM },
    { role: 'user' as const, content: userParts.join('\n\n') },
  ]
}

function getModel(ctx?: Ctx) {
  return ctx?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

// Promise timeout utilitário (evita pendurar requests)
async function withTimeout<T>(p: Promise<T>, ms = REQ_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout
  try {
    const race = await Promise.race([
      p,
      new Promise<never>((_, rej) => (timer = setTimeout(() => rej(new Error('timeout')), ms))),
    ])
    // @ts-ignore — timer é definido acima antes de resolver
    clearTimeout(timer)
    return race as T
  } catch (e) {
    // @ts-ignore
    if (timer) clearTimeout(timer)
    throw e
  }
}

/**
 * Streaming: gera a resposta em pedaços (como o ChatGPT).
 * Use no /api/ask?stream=1. Cada yield é um delta de texto.
 */
export async function* generateStream(prompt: string, ctx: Ctx = {}) {
  // Fallback sem chave (não quebra dev)
  if (!process.env.OPENAI_API_KEY) {
    const demo = `🔎 (DEMO) Você perguntou: "${prompt}". Configure OPENAI_API_KEY para ativar respostas reais.`
    const chunks = demo.match(/.{1,12}/g) ?? [demo]
    for (const c of chunks) {
      await new Promise(r => setTimeout(r, 60))
      yield c
    }
    return
  }

  // Cria o stream com timeout na fase de criação
  const stream = await withTimeout(
    openai.chat.completions.create({
      model: getModel(ctx),
      temperature: 0.2,
      stream: true,
      messages: buildMessages(prompt, ctx),
    })
  )

  // Watchdog de inatividade por chunk (reinicia a cada delta)
  let chunkTimer: NodeJS.Timeout | null = null
  const resetChunkTimer = () => {
    if (chunkTimer) clearTimeout(chunkTimer)
    chunkTimer = setTimeout(() => {
      throw new Error('timeout') // interrompe iteração em inatividade prolongada
    }, REQ_TIMEOUT_MS)
  }
  resetChunkTimer()

  try {
    for await (const part of stream as any) {
      const delta = part?.choices?.[0]?.delta?.content as string | undefined
      if (delta) {
        resetChunkTimer()
        yield delta
      }
    }
  } finally {
    if (chunkTimer) clearTimeout(chunkTimer)
  }
}

/**
 * Completa de uma vez (sem streaming).
 * Use quando /api/ask for chamado sem ?stream=1.
 */
export async function generateFull(prompt: string, ctx: Ctx = {}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    const hint = ctx.transcripts?.length
      ? `\n\n(Recebi ${ctx.transcripts.length} transcrição(ões).)`
      : ''
    return `🔎 (DEMO) Você perguntou: "${prompt}". Configure OPENAI_API_KEY para ativar respostas reais.${hint}`
  }

  const completion = await withTimeout(
    openai.chat.completions.create({
      model: getModel(ctx),
      temperature: 0.2,
      messages: buildMessages(prompt, ctx),
    })
  )

  return (
    // @ts-ignore — tipos do SDK podem variar por versão
    completion?.choices?.[0]?.message?.content?.trim() ||
    'Não consegui gerar a resposta no momento.'
  )
}