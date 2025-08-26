'use client'

import { memo, useMemo } from 'react'
import { GraduationCap, Plus, Send, ArrowRight } from 'lucide-react'
import AnswerView from '../ui/AnswerView'

function emit(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
}

export type Guideline = {
  title: string
  grade?: 'A'|'B'|'C'|'D'|'NR'
  note?: string
}

export type SpecialtyBlocks = {
  summary?: string            // síntese da resposta gerada
  guidelines?: Guideline[]    // diretrizes com nível de evidência
  actions?: string[]          // próximos passos/conduta
  raw?: string                // fallback: markdown puro
}

type Props = { data: SpecialtyBlocks }

function gradeBadge(g?: Guideline['grade']) {
  const map: Record<NonNullable<Guideline['grade']>, string> = {
    A: 'bg-emerald-600/20 text-emerald-300',
    B: 'bg-sky-600/20 text-sky-300',
    C: 'bg-amber-600/20 text-amber-300',
    D: 'bg-rose-600/20 text-rose-300',
    NR: 'bg-zinc-600/20 text-zinc-300',
  }
  const cls = g ? map[g] || map.NR : map.NR
  return <span className={`text-[11px] px-1.5 py-0.5 rounded ${cls}`}>{g || 'NR'}</span>
}

function AddBtn({ keyName, title, content }: { keyName: string; title: string; content: string }) {
  const add = () => {
    emit('report:add', {
      section: {
        key: keyName,
        title,
        content,
        selected: true,
      },
    })
    emit('report:open')
  }
  return (
    <button
      type="button"
      onClick={add}
      className="inline-flex items-center gap-2 rounded-md border border-base bg-panel px-2.5 py-1.5 text-[12.5px] hover:bg-panel-2 transition"
    >
      <Plus className="w-4 h-4" /> Adicionar ao relatório
    </button>
  )
}

/** Toolbar global: abrir no Copiloto independentemente das seções */
function Toolbar({ compiled }: { compiled: string }) {
  const openInCopilot = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('mode', 'copilot')
    window.history.replaceState({}, '', url.toString())
    emit('mode-intro', { mode: 'copilot' })
    emit('preset-prompt', { text: compiled, focus: true, send: false })
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={openInCopilot}
        className="inline-flex items-center gap-2 rounded-md border border-base bg-panel px-2.5 py-1.5 text-[12.5px] hover:bg-panel-2 transition"
        title="Levar todo o conteúdo para o Copiloto (sem enviar)"
      >
        <ArrowRight className="w-4 h-4" /> Abrir no Copiloto
      </button>
    </div>
  )
}

function SpecialtyAnswerImpl({ data }: Props) {
  // Evitar early-return antes dos hooks
  const compiledAll = useMemo(() => {
    if (data?.raw && !data.summary && !data.guidelines && !data.actions) {
      return data.raw.trim()
    }
    const parts: string[] = []
    if (data.summary) parts.push(`## Resumo\n\n${data.summary.trim()}`)
    if (data.guidelines?.length) {
      parts.push(
        `## Diretrizes & Evidência\n\n` +
        data.guidelines.map((g, i) => `${i + 1}. ${g.title} [${g.grade || 'NR'}]${g.note ? ` — ${g.note}` : ''}`).join('\n')
      )
    }
    if (data.actions?.length) parts.push(`## Próximos passos\n\n${data.actions.map(a => `• ${a}`).join('\n')}`)
    return parts.join('\n\n').trim()
  }, [data])

  const sections: JSX.Element[] = []

  // Se veio apenas markdown cru, rende direto (sem quebrar hooks)
  const onlyRaw = !!data?.raw && !data.summary && !data.guidelines && !data.actions
  if (onlyRaw) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <AnswerView text={data.raw!} />
        {compiledAll && <Toolbar compiled={compiledAll} />}
      </div>
    )
  }

  if (data.summary) {
    sections.push(
      <article key="sum" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold">Resumo</h4>
          <AddBtn keyName="assessment" title="Resumo" content={data.summary} />
        </header>
        <pre className="text-[13px] text-muted whitespace-pre-wrap">{data.summary}</pre>
      </article>
    )
  }

  if (data.guidelines?.length) {
    const txt = data.guidelines
      .map((g, i) => `${i + 1}. ${g.title} [${g.grade || 'NR'}]${g.note ? ` — ${g.note}` : ''}`)
      .join('\n')
    sections.push(
      <article key="gl" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Diretrizes & Nível de Evidência
          </h4>
          <AddBtn keyName="workup" title="Diretrizes" content={txt} />
        </header>
        <ul className="text-[13px] text-muted space-y-1.5">
          {data.guidelines.map((g, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5">{gradeBadge(g.grade)}</span>
              <div className="min-w-0">
                <div className="font-medium">{g.title}</div>
                {g.note ? <div className="text-[12.5px]">{g.note}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      </article>
    )
  }

  if (data.actions?.length) {
    const txt = data.actions.map((a) => `• ${a}`).join('\n')
    sections.push(
      <article key="act" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold">Próximos passos</h4>
          <div className="flex gap-2">
            <AddBtn keyName="plan" title="Próximos passos" content={txt} />
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('mode', 'copilot')
                window.history.replaceState({}, '', url.toString())
                emit('mode-intro', { mode: 'copilot' })
                emit('preset-prompt', {
                  text: `Usar estes passos como base para um relatório estruturado (SOAP+, hipóteses, exames e conduta):\n\n${txt}`,
                  focus: true,
                  send: true,
                })
              }}
              className="inline-flex items-center gap-2 rounded-md border border-base bg-panel px-2.5 py-1.5 text-[12.5px] hover:bg-panel-2 transition"
            >
              <Send className="w-4 h-4" /> Enviar ao Copiloto
            </button>
          </div>
        </header>
        <ul className="text-[13px] text-muted list-disc pl-5">
          {data.actions.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </article>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {sections}
      {compiledAll && <Toolbar compiled={compiledAll} />}
    </div>
  )
}

export default memo(SpecialtyAnswerImpl)