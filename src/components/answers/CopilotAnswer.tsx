// src/components/answers/CopilotAnswer.tsx
'use client'

import { memo } from 'react'
import { PlusCircle, ClipboardList, Beaker, Stethoscope, FlaskConical, ListChecks, GraduationCap, BookOpenText } from 'lucide-react'

/** Emissor de evento para o ReportPanel (drawer) */
function emit(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
}

export type CopilotBlock = {
  id: string
  title: string
  body: string // markdown
}

type Props = {
  blocks: CopilotBlock[]
}

/**
 * Renderiza a resposta do Copiloto em blocos (SOAP+, Etiologias/Fisiopatologia,
 * Elucidação Diagnóstica, Hipóteses, Conduta/Plano, Seguimento, Referências).
 * Cada bloco possui “Adicionar ao relatório”.
 */
function CopilotAnswerImpl({ blocks }: Props) {
  const iconFor = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes('subjetivo') || t.includes('objetivo') || t.includes('avaliação') || t.includes('plano')) return <ClipboardList className="w-4 h-4" />
    if (t.includes('etiolog') || t.includes('fisiopat')) return <FlaskConical className="w-4 h-4" />
    if (t.includes('elucida')) return <Beaker className="w-4 h-4" />
    if (t.includes('hipótes') || t.includes('ddx')) return <Stethoscope className="w-4 h-4" />
    if (t.includes('conduta') || t.includes('plano')) return <ListChecks className="w-4 h-4" />
    if (t.includes('seguimento')) return <GraduationCap className="w-4 h-4" />
    if (t.includes('refer')) return <BookOpenText className="w-4 h-4" />
    return <ClipboardList className="w-4 h-4" />
  }

  return (
    <div className="space-y-3">
      {blocks.map((b) => (
        <article key={b.id} className="rounded-2xl border border-base bg-panel-2 p-3">
          <header className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {iconFor(b.title)}
              <h3 className="text-[14.5px] font-semibold">{b.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => emit('report:add', { block: b })}
              className="rounded-md border border-base px-2 py-1 text-[12.5px] hover:bg-panel transition inline-flex items-center gap-1.5"
              title="Adicionar ao relatório"
              aria-label="Adicionar ao relatório"
            >
              <PlusCircle className="w-4 h-4" /> Adicionar
            </button>
          </header>

          {/* usa o AnswerView do projeto via markdown básico por cascata */}
          <div className="prose prose-invert max-w-none text-[14px] leading-relaxed whitespace-pre-wrap">
            {b.body}
          </div>
        </article>
      ))}
    </div>
  )
}

const CopilotAnswer = memo(CopilotAnswerImpl)
export default CopilotAnswer