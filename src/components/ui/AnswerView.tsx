// src/components/ui/AnswerView.tsx
import React, { useMemo } from 'react'

export type AnswerViewProps = { text: string }

/**
 * Renderer leve, sem libs, com foco em legibilidade clínica.
 * Suporta:
 *  - Títulos ### e ####
 *  - “Seções clínicas” (Anamnese:, SOAP:, Conduta:, Prescrição:, Exames:, Diagnóstico:, Etiologia:, Fisiopatologia:, Orientações:)
 *  - Listas "-" / "•" e "1. ..."
 *  - Parágrafos
 *  - **negrito** e *itálico*
 *  - Links http/https
 */
export default function AnswerView({ text }: AnswerViewProps) {
  const blocks = useMemo(() => parseMarkdownish(text || ''), [text])

  return (
    <div className="leading-[1.8] text-[15px]">
      {blocks.map((b, i) => {
        if (b.type === 'h3') {
          return (
            <h3 key={i} className="text-[15px] font-semibold tracking-tight mb-2">
              {renderInline(b.text)}
            </h3>
          )
        }
        if (b.type === 'h4') {
          return (
            <h4 key={i} className="text-[14px] font-semibold tracking-tight mb-2">
              {renderInline(b.text)}
            </h4>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 mb-3">
              {b.items.map((li, j) => (
                <li key={j}>{renderInline(li)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1 mb-3">
              {b.items.map((li, j) => (
                <li key={j}>{renderInline(li)}</li>
              ))}
            </ol>
          )
        }
        // paragraph
        return (
          <p key={i} className="mb-3">
            {renderInline(b.text)}
          </p>
        )
      })}
    </div>
  )
}

/* ================= utils ================= */

type Block =
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

// palavras-chave que, quando iniciam a linha, viram subtítulo clínico
const CLINICAL_SECTIONS = [
  'Anamnese',
  'SOAP',
  'Conduta',
  'Plano de Conduta',
  'Prescrição',
  'Prescrições',
  'Exames',
  'Laudos',
  'Diagnóstico',
  'Etiologia',
  'Fisiopatologia',
  'Orientações',
  'Orientacoes', // tolerante a acento
]

/** Parser simples para os padrões comuns de saída. */
function parseMarkdownish(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const out: Block[] = []
  let buf: string[] = []
  let listBuf: string[] = []
  let numBuf: string[] = []
  let inUL = false
  let inOL = false

  const flushP = () => {
    const t = buf.join(' ').replace(/\s+/g, ' ').trim()
    if (t) out.push({ type: 'p', text: t })
    buf = []
  }
  const flushUL = () => {
    if (listBuf.length) out.push({ type: 'ul', items: listBuf.slice() })
    listBuf = []
    inUL = false
  }
  const flushOL = () => {
    if (numBuf.length) out.push({ type: 'ol', items: numBuf.slice() })
    numBuf = []
    inOL = false
  }

  for (const raw of lines) {
    const line = raw.trim()

    // ### / ####
    const h = line.match(/^#{3,6}\s+(.*)$/)
    if (h) {
      if (inUL) flushUL()
      if (inOL) flushOL()
      if (buf.length) flushP()
      const level = Math.min(4, Math.max(3, (line.match(/^#+/)?.[0].length || 3)))
      const text = h[1].trim()
      if (level === 3) out.push({ type: 'h3', text })
      else out.push({ type: 'h4', text })
      continue
    }

    // Seções clínicas "Titulo:"
    const clin = line.match(/^([A-Za-zÀ-ÿ\s]+):\s*$/)
    if (clin) {
      const key = (clin[1] || '').trim()
      const isClinical = CLINICAL_SECTIONS.some((k) =>
        key.localeCompare(k, undefined, { sensitivity: 'accent' }) === 0
      )
      if (isClinical) {
        if (inUL) flushUL()
        if (inOL) flushOL()
        if (buf.length) flushP()
        out.push({ type: 'h4', text: key })
        continue
      }
    }

    // listas não numeradas
    if (/^[-•]\s+/.test(line)) {
      if (inOL) flushOL()
      inUL = true
      listBuf.push(line.replace(/^[-•]\s+/, ''))
      continue
    }
    // listas numeradas "1. "
    if (/^\d+\.\s+/.test(line)) {
      if (inUL) flushUL()
      inOL = true
      numBuf.push(line.replace(/^\d+\.\s+/, ''))
      continue
    }

    // separador (linha vazia)
    if (line === '') {
      if (inUL) flushUL()
      if (inOL) flushOL()
      if (buf.length) flushP()
      continue
    }

    // parágrafo (concatena linhas até flush)
    buf.push(line)
  }

  if (inUL) flushUL()
  if (inOL) flushOL()
  if (buf.length) flushP()
  return out
}

/** Inline: **bold**, *italic* e links (http/https). */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const urlRegex = /(https?:\/\/[^\s)]+)/
  const parts = text.split(urlRegex)

  parts.forEach((chunk, i) => {
    if (i % 2 === 1) {
      nodes.push(
        <a
          key={`u${i}`}
          href={chunk}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {chunk}
        </a>
      )
    } else {
      const segs = chunk.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
      segs.forEach((s, j) => {
        if (/^\*\*[^*]+\*\*$/.test(s)) {
          nodes.push(<strong key={`b${i}-${j}`}>{s.slice(2, -2)}</strong>)
        } else if (/^\*[^*]+\*$/.test(s)) {
          nodes.push(<em key={`e${i}-${j}`}>{s.slice(1, -1)}</em>)
        } else if (s) {
          nodes.push(<span key={`t${i}-${j}`}>{s}</span>)
        }
      })
    }
  })
  return nodes
}