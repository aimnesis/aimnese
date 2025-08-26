'use client'

import { useMemo } from 'react'
import { CheckSquare, Square, FileDown, ClipboardCopy, ToggleRight, ClipboardList, Share2 } from 'lucide-react'

export type ReportSectionKey =
  | 'subjective'      // S
  | 'objective'       // O
  | 'assessment'      // A
  | 'plan'            // P
  | 'hypotheses'      // hipóteses com justificativa
  | 'differentials'   // diagnóstico diferencial
  | 'workup'          // elucidação diagnóstica / exames pertinentes
  | 'therapy'         // terapêutica proposta
  | 'followup'        // seguimento e alertas

export type ReportSection = {
  key: ReportSectionKey
  title: string
  content: string       // markdown/markdown-like
  selected?: boolean
}

type Props = {
  sections: ReportSection[]
  patientHeader?: string // ex.: "Idade 68, PA 150x90, TFG 35 mL/min — Alergia: penicilina"
  onToggle: (key: ReportSectionKey, next: boolean) => void
  onToggleAll?: (next: boolean) => void
  /** LEGACY: continua suportado (recebe apenas HTML) */
  onExportPdf?: (html: string) => void
  /** NOVOS: recebem { text, html } já compilados */
  onExport?: (compiled: { text: string; html: string }) => void
  onShare?: (compiled: { text: string; html: string }) => void
  onPushToRx?: (payload: { text: string }) => void
}

export default function ReportPanel({
  sections,
  patientHeader,
  onToggle,
  onToggleAll,
  onExportPdf,
  onExport,
  onShare,
  onPushToRx,
}: Props) {

  const anySelected = sections.some(s => !!s.selected)
  const allSelected = sections.length > 0 && sections.every(s => !!s.selected)

  const compiled = useMemo(() => {
    const vis = sections.filter(s => s.selected)
    const headerTxt = patientHeader ? `Relatório clínico\n${patientHeader}\n` : 'Relatório clínico\n'
    const bodyTxt = vis.map(s => `## ${s.title}\n\n${s.content.trim()}`).join('\n\n')
    const text = `${headerTxt}\n${bodyTxt}`.trim()
    const html = `
      <!doctype html><html><head><meta charset="utf-8">
        <title>Relatório clínico</title>
        <style>
          *{box-sizing:border-box}
          body{font:14px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif; color:#111; margin:24px}
          h1{font-size:20px;margin:0 0 4px 0}
          h2{font-size:16px;margin:16px 0 6px 0}
          p,pre{margin:0 0 10px 0;white-space:pre-wrap}
          .muted{color:#666}
          .block{margin-top:8px}
          @media print { @page{size:auto; margin:12mm} }
        </style>
      </head><body>
        <h1>Relatório clínico</h1>
        ${patientHeader ? `<div class="muted">${escapeHtml(patientHeader)}</div>` : ''}
        ${vis.map(s => `
          <div class="block">
            <h2>${escapeHtml(s.title)}</h2>
            <pre>${escapeHtml(s.content)}</pre>
          </div>
        `).join('')}
      </body></html>
    `
    return { text, html }
  }, [sections, patientHeader])

  function doExport() {
    if (!anySelected) return
    if (onExport) return onExport(compiled)
    if (onExportPdf) return onExportPdf(compiled.html)

    // fallback: abrir janela para impressão
    const win = window.open('', '_blank')
    if (!win) return
    win.document.open(); win.document.write(compiled.html); win.document.close()
    try { win.onload = () => setTimeout(() => win.print(), 200) } catch {}
  }

  async function copyToClipboard() {
    try { await navigator.clipboard.writeText(compiled.text || '') } catch {}
  }

  function pushToRx() {
    if (!onPushToRx || !anySelected) return
    onPushToRx({ text: compiled.text })
  }

  function doShare() {
    if (!anySelected) return
    if (onShare) return onShare(compiled)
    // sem handler externo: tenta Web Share API com fallback
    if ((navigator as any).share) {
      ;(navigator as any).share({ title: 'Relatório clínico', text: compiled.text }).catch(() => {})
    } else {
      void copyToClipboard()
      // aqui poderia disparar um toast (“copiado para área de transferência”)
    }
  }

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 sm:p-5 space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <h3 className="text-base font-semibold">Relatório estruturado (seleção)</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleAll?.(!allSelected)}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
            title={allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
          >
            <ToggleRight className="w-4 h-4" />
            {allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!anySelected}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50 inline-flex items-center gap-2"
            title="Copiar selecionado"
          >
            <ClipboardCopy className="w-4 h-4" /> Copiar
          </button>
          <button
            type="button"
            onClick={doShare}
            disabled={!anySelected}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50 inline-flex items-center gap-2"
            title="Compartilhar"
          >
            <Share2 className="w-4 h-4" /> Compartilhar
          </button>
          <button
            type="button"
            onClick={doExport}
            disabled={!anySelected}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50 inline-flex items-center gap-2"
            title="Gerar PDF"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      {patientHeader && (
        <p className="text-[12.5px] text-muted">{patientHeader}</p>
      )}

      <ul className="space-y-2">
        {sections.map((sec) => (
          <li key={sec.key} className="rounded-lg border border-base bg-panel-2 p-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onToggle(sec.key, !sec.selected)}
                className="mt-0.5 rounded-md border border-base p-1 hover:bg-panel transition"
                aria-pressed={!!sec.selected || undefined}
                title={sec.selected ? 'Desmarcar' : 'Selecionar'}
              >
                {sec.selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
              <div className="min-w-0">
                <div className="font-medium mb-1">{sec.title}</div>
                <pre className="text-[13px] text-muted whitespace-pre-wrap">{sec.content}</pre>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-1">
        <div className="text-[12px] text-muted">
          {anySelected ? 'Pronto para exportar/compartilhar.' : 'Selecione as seções que deseja incluir.'}
        </div>
        {onPushToRx && (
          <button
            type="button"
            onClick={pushToRx}
            disabled={!anySelected}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50"
            title="Enviar conteúdo selecionado para o painel de prescrição"
          >
            Enviar para Prescrição
          </button>
        )}
      </div>
    </section>
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
}