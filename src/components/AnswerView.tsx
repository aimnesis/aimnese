// src/components/AnswerView.tsx
'use client'

import { FC, useMemo } from 'react'

interface Reference {
  title: string
  url: string
}

interface AnswerViewProps {
  question: string
  answer: string
  references: Reference[]
}

/**
 * Transforma texto puro em nodes React:
 * - quebra de linha vira <br />
 * - torna URLs clicáveis
 */
const linkifyAndFormat = (text: string): Array<string | JSX.Element> => {
  const urlRegex = /\b(https?:\/\/[^\s]+)/g
  const parts: Array<string | JSX.Element> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]
    const start = match.index

    if (start > lastIndex) {
      const segment = text.slice(lastIndex, start)
      segment.split('\n').forEach((line, i, arr) => {
        parts.push(line)
        if (i < arr.length - 1) parts.push(<br key={`br-${lastIndex}-${i}`} />)
      })
    }

    parts.push(
      <a
        key={`link-${start}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline break-all"
      >
        {url}
      </a>
    )
    lastIndex = start + url.length
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    remaining.split('\n').forEach((line, i, arr) => {
      parts.push(line)
      if (i < arr.length - 1) parts.push(<br key={`br-rem-${i}`} />)
    })
  }

  return parts
}

const AnswerView: FC<AnswerViewProps> = ({ question, answer, references }) => {
  const formattedAnswer = useMemo(() => linkifyAndFormat(answer), [answer])

  return (
    <section aria-label="Resposta e referências" className="results w-full max-w-3xl">
      <h2 className="text-xl font-semibold text-white mb-2">{question}</h2>
      <div
        className="answer prose prose-invert text-zinc-200 mb-6 break-words"
        aria-live="polite"
      >
        {formattedAnswer.length > 0 ? (
          <p className="whitespace-pre-wrap">{formattedAnswer}</p>
        ) : (
          <p className="text-zinc-400">Nenhuma resposta disponível.</p>
        )}
      </div>

      <div className="references">
        <h3 className="text-lg font-medium text-white mb-2">Referências</h3>
        {references && references.length > 0 ? (
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-300">
            {references.map((ref) => (
              <li key={ref.url}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-orange-400"
                >
                  {ref.title || ref.url}
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-zinc-500 text-sm">Nenhuma referência fornecida.</p>
        )}
      </div>
    </section>
  )
}

export default AnswerView