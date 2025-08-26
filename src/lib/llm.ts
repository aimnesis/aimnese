// src/lib/llm.ts
import OpenAI from 'openai'

/**
 * Client único (evita múltiplas conexões em serverless).
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type Ctx = {
  transcripts?: string[]        // textos vindos de áudio (ou outros anexos)
  model?: string                // permite override pontual
  maxChars?: number             // truncagem defensiva (default abaixo)
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const REQ_TIMEOUT_MS = 60_000 // 60s
const INACTIVITY_TIMEOUT_MS = 60_000 // 60s por delta de stream
const DEFAULT_MAX_CHARS = 24_000 // alvo ~16k tokens

/**
 * Prompt clínico enxuto, objetivo e em PT-BR.
 */
const SYSTEM_PROMPT = [
  'Você é um assistente clínico para MÉDICOS (profissionais de saúde).',
  'Responda em português do Brasil, com base em evidências, e com objetividade.',
  'Quando possível, cite diretrizes/consensos e principais fontes (sem inventar).',
  'Reconheça incertezas e ofereça alternativas. Não fabrique dados.',
  'Não substitui o julgamento clínico. Inclua breve aviso de responsabilidade.',
  'Formatação: títulos curtos, listas/bullets quando útil, e passos acionáveis.',
].join(' ')

/** ====== Template do Copiloto com marcadores previsíveis ====== */
const COPILOT_TEMPLATE = `
Você atuará como COPILOTO CLÍNICO. Gere uma resposta ESTRUTURADA com as seções a seguir, sempre nesta ordem e com estes títulos exatamente (para facilitar parsing):

# Subjetivo (S)
# Objetivo (O)
# Avaliação (A) — inclua hipóteses priorizadas e diagnóstico diferencial (DDx) com justificativa
# Plano (P) — passos acionáveis (exames pertinentes, tratamento medicamentoso e não medicamentoso, monitorização)
# Etiologias & Fisiopatologia (resumo)
# Elucidação Diagnóstica (estratégia)
# Seguimento
# Referências (principais diretrizes/consensos, datas)

Regras:
- Seja conciso e prático. Use bullets. Indique nível de evidência quando couber (A/B/C).
- Se faltar informação, aponte o que falta para decidir.
- Não invente dados. Não prescreva fora de segurança.
- Inclua um aviso final curto: "Suporte à decisão; exige revisão clínica."
`.trim()

/* Tipagens mínimas para compatibilidade entre versões do SDK */
type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }

type ChatCompletionChoice = {
  delta?: { content?: string }
  message?: { content?: string }
}

type ChatStreamChunk = { choices?: ChatCompletionChoice[] }
type ChatCompletionResult = { choices?: ChatCompletionChoice[] }

/* Utils ------------------------------------------------------------------- */
function truncateMiddle(text: string, max = DEFAULT_MAX_CHARS): string {
  if (!text || text.length <= max) return text
  const keep = Math.max(0, Math.floor(max / 2) - 100)
  const head = text.slice(0, keep)
  const tail = text.slice(-keep)
  return `${head}\n\n[...trecho omitido por limite de contexto...]\n\n${tail}`
}

/** Concatena prompt + anexos (transcripts) com limite total defensivo. */
function buildUserContent(prompt: string, ctx: Ctx): string {
  const { transcripts = [], maxChars = DEFAULT_MAX_CHARS } = ctx || {}
  const parts: string[] = []
  parts.push(`Pergunta do médico:\n${prompt.trim()}`)
  if (transcripts.length) {
    parts.push(
      'Observações derivadas de anexos/áudio (use como contexto auxiliar, cite apenas se fizer sentido clínico):',
      ...transcripts.map((t, i) => `(${i + 1}) ${t}`)
    )
  }
  const combined = parts.join('\n\n')
  return truncateMiddle(combined, maxChars)
}

function buildMessages(prompt: string, ctx: Ctx = {}): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserContent(prompt, ctx) },
  ]
}

/** Mensagens com template do Copiloto */
function buildCopilotMessages(prompt: string, ctx: Ctx = {}): ChatMessage[] {
  const user = [
    COPILOT_TEMPLATE,
    '',
    buildUserContent(prompt, ctx),
  ].join('\n')
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ]
}

function getModel(ctx?: Ctx) {
  return ctx?.model || DEFAULT_MODEL
}

/** Timeout para qualquer promise. */
async function withTimeout<T>(p: Promise<T>, ms = REQ_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const killer = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error('timeout')), ms)
  })
  try {
    const out = (await Promise.race([p, killer])) as T
    if (timer) clearTimeout(timer)
    return out
  } catch (e) {
    if (timer) clearTimeout(timer)
    throw e
  }
}

/** Retry simples com backoff. */
async function withRetries<T>(
  fn: () => Promise<T>,
  { tries = 3, baseDelay = 500 }: { tries?: number; baseDelay?: number } = {}
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
        msg.includes('timeout') ||
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

/* API pública ---------------------------------------------------------------- */

/** Stream “genérica” (mantida) */
export async function* generateStream(
  prompt: string,
  ctx: Ctx = {}
): AsyncGenerator<string, void, unknown> {
  if (!process.env.OPENAI_API_KEY) {
    const demo = `🔎 (DEMO) Você perguntou: "${prompt}". Configure OPENAI_API_KEY para obter respostas reais.`
    const chunks = demo.match(/.{1,18}/g) ?? [demo]
    for (const c of chunks) {
      await new Promise((r) => setTimeout(r, 50))
      yield c
    }
    return
  }

  const stream = (await withRetries(async () =>
    withTimeout(
      openai.chat.completions.create({
        model: getModel(ctx),
        temperature: 0.2,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
        stream: true,
        messages: buildMessages(prompt, ctx),
      }),
      REQ_TIMEOUT_MS
    )
  )) as unknown as AsyncIterable<ChatStreamChunk>

  let watchdog: ReturnType<typeof setTimeout> | null = null
  const resetWatchdog = () => {
    if (watchdog) clearTimeout(watchdog)
    watchdog = setTimeout(() => { throw new Error('timeout') }, INACTIVITY_TIMEOUT_MS)
  }
  resetWatchdog()

  try {
    for await (const part of stream) {
      const delta = part?.choices?.[0]?.delta?.content
      if (delta) {
        resetWatchdog()
        yield delta
      }
    }
  } finally {
    if (watchdog) clearTimeout(watchdog)
  }
}

/** Full “genérica” (mantida) */
export async function generateFull(
  prompt: string,
  ctx: Ctx = {}
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    const hint = ctx.transcripts?.length ? `\n\n(Recebi ${ctx.transcripts.length} transcrição(ões).)` : ''
    return `🔎 (DEMO) Você perguntou: "${prompt}". Configure OPENAI_API_KEY para obter respostas reais.${hint}`
  }

  const completion = (await withRetries(async () =>
    withTimeout(
      openai.chat.completions.create({
        model: getModel(ctx),
        temperature: 0.2,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
        messages: buildMessages(prompt, ctx),
      }),
      REQ_TIMEOUT_MS
    )
  )) as unknown as ChatCompletionResult

  return completion?.choices?.[0]?.message?.content?.trim() || 'Não consegui gerar a resposta no momento.'
}

/** Full específica do Copiloto */
export async function generateCopilotFull(prompt: string, ctx: Ctx = {}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    const hint = ctx.transcripts?.length ? `\n\n(Recebi ${ctx.transcripts.length} transcrição(ões).)` : ''
    return `🔎 (DEMO) [COPILOTO] "${prompt}". Configure OPENAI_API_KEY.${hint}`
  }

  const completion = (await withRetries(async () =>
    withTimeout(
      openai.chat.completions.create({
        model: getModel(ctx),
        temperature: 0.15,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
        messages: buildCopilotMessages(prompt, ctx),
      }),
      REQ_TIMEOUT_MS
    )
  )) as unknown as ChatCompletionResult

  return completion?.choices?.[0]?.message?.content?.trim() || ''
}

/** Parser simples de markdown -> blocos p/ CopilotAnswer */
export type CopilotBlock = { id: string; title: string; body: string }

export function parseCopilotMarkdown(md: string): CopilotBlock[] {
  const titles = [
    '# Subjetivo (S)',
    '# Objetivo (O)',
    '# Avaliação (A) — inclua hipóteses priorizadas e diagnóstico diferencial (DDx) com justificativa',
    '# Plano (P) — passos acionáveis (exames pertinentes, tratamento medicamentoso e não medicamentoso, monitorização)',
    '# Etiologias & Fisiopatologia (resumo)',
    '# Elucidação Diagnóstica (estratégia)',
    '# Seguimento',
    '# Referências (principais diretrizes/consensos, datas)',
  ]
  const lines = md.split(/\r?\n/)
  const blocks: CopilotBlock[] = []
  let currentTitle: string | null = null
  let buff: string[] = []

  function push() {
    if (!currentTitle) return
    const body = buff.join('\n').trim()
    blocks.push({
      id: `${currentTitle}-${blocks.length}`.toLowerCase().replace(/\s+/g, '-'),
      title: currentTitle.replace(/^#\s*/, '').trim(),
      body,
    })
  }

  for (const line of lines) {
    const isH = /^#\s/.test(line)
    if (isH && titles.some(t => line.trim().toLowerCase().startsWith(t.toLowerCase()))) {
      if (currentTitle) push()
      currentTitle = line.trim()
      buff = []
    } else {
      buff.push(line)
    }
  }
  if (currentTitle) push()

  // fallback: se não achou nada, retorna bloco único
  if (!blocks.length) {
    return [{ id: 'resposta', title: 'Relatório', body: md }]
  }
  return blocks
}

/* ===== Prompts por modo + helper (migração suave nas rotas /api/modes/*) ===== */

export type ModeKey =
  | 'general'
  | 'studies'
  | 'plantao'
  | 'consultorio'
  | 'specialties'
  | 'analysis'

const MODE_PROMPTS: Record<ModeKey, string> = {
  general: [
    'Objetivo: responder dúvidas clínicas gerais com segurança e concisão.',
    'Inclua: avaliação inicial, DDx curto, exames pertinentes e manejo inicial.',
  ].join(' '),

  studies: [
    'Objetivo: síntese de evidências (NEJM/JAMA/Lancet e diretrizes brasileiras quando possível).',
    'Inclua: visão geral, principais estudos com ano/link (se possível), nível de evidência (A/B/C) e implicações clínicas.',
  ].join(' '),

  plantao: [
    'Objetivo: emergência/urgência. Condutas imediatas, red flags e doses.',
    'Estruture pelos primeiros minutos e segurança do paciente.',
  ].join(' '),

  consultorio: [
    'Objetivo: apoio à consulta eletiva. Anamnese estruturada, sumário, plano, comunicação e follow-up.',
    'Se houver transcrição, tratar como contexto do encontro clínico.',
  ].join(' '),

  specialties: [
    'Objetivo: responder com base em diretrizes por especialidade (cite sociedade/ano quando possível).',
    'Inclua níveis de evidência (A/B/C) quando aplicável.',
  ].join(' '),

  analysis: [
    'Objetivo: anamnese → hipóteses → DDx → elucidações → condutas (medicamentosas e não) com foco em qualidade de vida.',
    'Use o template de Copiloto quando fizer sentido.',
  ].join(' '),
}

/** Retorna mensagens system+user com tempero por modo (sem quebrar nada existente). */
export function getPromptForMode(mode: ModeKey, prompt: string, ctx: Ctx = {}): ChatMessage[] {
  const header = MODE_PROMPTS[mode] || ''
  const user = [header, '', buildUserContent(prompt, ctx)].join('\n').trim()
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ]
}