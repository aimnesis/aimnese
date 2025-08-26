'use client'

import { memo, useMemo } from 'react'
import { Plus, AlertTriangle, Stethoscope, ClipboardList, Pill, Share2, ArrowRight } from 'lucide-react'
import AnswerView from '../ui/AnswerView'

function emit(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
}

export type Hypothesis = { name: string; rationale?: string }
export type GeneralBlocks = {
  summary?: string
  redFlags?: string[]
  hypotheses?: Hypothesis[]
  immediatePlan?: string[]          // ações imediatas / conduta inicial
  references?: string[]
  raw?: string                      // fallback: markdown puro
}

type Props = { data: GeneralBlocks }

/** Botão utilitário “Adicionar ao relatório” com key mapeada para o ReportPanel */
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

/** Barra de ações globais para “Abrir no Copiloto” / “Compartilhar para Prescrição” */
function Toolbar({ fullText, planBullets }: { fullText: string; planBullets: string | null }) {
  const openInCopilot = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('mode', 'copilot')
    window.history.replaceState({}, '', url.toString())
    emit('mode-intro', { mode: 'copilot' })
    emit('preset-prompt', { text: fullText, focus: true, send: false })
  }

  const openRx = () => {
    emit('rx:open')
    if (planBullets) {
      // envia um RxItem válido para o painel de Prescrição
      emit('rx:add', {
        item: {
          id: `rx-${Date.now()}`,
          name: 'Orientações',
          dose: '',
          route: 'N/A',
          frequency: '',
          duration: '',
          notes: planBullets || undefined,
        }
      })
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={openInCopilot}
        className="inline-flex items-center gap-2 rounded-md border border-base bg-panel px-2.5 py-1.5 text-[12.5px] hover:bg-panel-2 transition"
        title="Levar o conteúdo para o Copiloto (sem enviar)"
      >
        <ArrowRight className="w-4 h-4" /> Abrir no Copiloto
      </button>

      <button
        type="button"
        onClick={openRx}
        className="inline-flex items-center gap-2 rounded-md border border-base bg-panel px-2.5 py-1.5 text-[12.5px] hover:bg-panel-2 transition"
        title="Abrir painel de Prescrição"
      >
        <Share2 className="w-4 h-4" /> Abrir Prescrição
      </button>
    </div>
  )
}

function GeneralAnswer({ data }: Props) {
  const compiledAll = useMemo(() => {
    if (data?.raw && !data.summary && !data.hypotheses && !data.immediatePlan && !data.references) {
      return data.raw.trim()
    }
    const parts: string[] = []
    if (data.summary) parts.push(`## Resumo clínico\n\n${data.summary.trim()}`)
    if (data.redFlags?.length) parts.push(`## Sinais de alerta\n\n${data.redFlags.map(r => `• ${r}`).join('\n')}`)
    if (data.hypotheses?.length) {
      parts.push(
        `## Hipóteses diagnósticas\n\n` +
        data.hypotheses.map((h, i) => `${i + 1}. ${h.name}${h.rationale ? ` — ${h.rationale}` : ''}`).join('\n')
      )
    }
    if (data.immediatePlan?.length) parts.push(`## Conduta imediata\n\n${data.immediatePlan.map(s => `• ${s}`).join('\n')}`)
    if (data.references?.length) parts.push(`## Referências\n\n${data.references.map(r => `• ${r}`).join('\n')}`)
    return parts.join('\n\n').trim()
  }, [data])

  const planBullets = useMemo(
    () => (data.immediatePlan?.length ? data.immediatePlan.map(s => `• ${s}`).join('\n') : null),
    [data.immediatePlan]
  )

  const onlyRaw =
    !!data?.raw &&
    !data.summary &&
    !data.hypotheses &&
    !data.immediatePlan &&
    !data.references

  if (onlyRaw) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <AnswerView text={data.raw!} />
        {compiledAll && <Toolbar fullText={compiledAll} planBullets={planBullets} />}
      </div>
    )
  }

  const blocks: JSX.Element[] = []

  if (data.summary) {
    blocks.push(
      <article key="sum" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Resumo clínico
          </h4>
          <AddBtn keyName="assessment" title="Resumo clínico" content={data.summary} />
        </header>
        <pre className="text-[13px] text-muted whitespace-pre-wrap">{data.summary}</pre>
      </article>
    )
  }

  if (data.redFlags?.length) {
    const txt = data.redFlags.map((r) => `• ${r}`).join('\n')
    blocks.push(
      <article key="rf" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Sinais de alerta
          </h4>
          <AddBtn keyName="followup" title="Sinais de alerta" content={txt} />
        </header>
        <ul className="text-[13px] text-muted list-disc pl-5">
          {data.redFlags.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </article>
    )
  }

  if (data.hypotheses?.length) {
    const txt = data.hypotheses
      .map((h, i) => `${i + 1}. ${h.name}${h.rationale ? ` — ${h.rationale}` : ''}`)
      .join('\n')
    blocks.push(
      <article key="hx" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Hipóteses diagnósticas (priorizadas)
          </h4>
          <AddBtn keyName="hypotheses" title="Hipóteses diagnósticas" content={txt} />
        </header>
        <ol className="text-[13px] text-muted list-decimal pl-5">
          {data.hypotheses.map((h, i) => (
            <li key={i}>
              <span className="font-medium">{h.name}</span>
              {h.rationale ? <span className="text-muted"> — {h.rationale}</span> : null}
            </li>
          ))}
        </ol>
      </article>
    )
  }

  if (data.immediatePlan?.length) {
    const txt = data.immediatePlan.map((s) => `• ${s}`).join('\n')
    blocks.push(
      <article key="plan" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <header className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-[15px] font-semibold inline-flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Conduta imediata
          </h4>
          <AddBtn keyName="plan" title="Conduta imediata" content={txt} />
        </header>
        <ul className="text-[13px] text-muted list-disc pl-5">
          {data.immediatePlan.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </article>
    )
  }

  if (data.references?.length) {
    blocks.push(
      <article key="refs" className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
        <h4 className="text-[15px] font-semibold mb-1">Referências</h4>
        <ul className="text-[12.5px] text-muted list-disc pl-5">
          {data.references.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </article>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {blocks}
      {compiledAll && <Toolbar fullText={compiledAll} planBullets={planBullets} />}
    </div>
  )
}

export default memo(GeneralAnswer)