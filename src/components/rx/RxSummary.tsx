// src/components/rx/RxSummary.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, FileDown, ClipboardList, ClipboardCopy, Share2, AlertTriangle } from 'lucide-react'
import type { RxItem, PatientCtx } from '../ui/RxTypes'
import InteractionsPanel, { type Warning } from './InteractionsPanel'

type Props = {
  open: boolean
  onClose: () => void
  items: RxItem[]
  patient: PatientCtx
  /** Ações de topo (se não vierem, usamos fallback local) */
  onExport?: () => void
  onShare?: () => void
}

function normalizeSeverity(s: any): Warning['severity'] {
  const v = String(s || '').toLowerCase()
  if (v === 'contraindicado' || v === 'contraindicated') return 'contraindicado'
  if (v === 'major') return 'major'
  if (v === 'moderate') return 'moderate'
  if (v === 'minor') return 'minor'
  return 'minor'
}

export default function RxSummary({ open, onClose, items, patient, onExport, onShare }: Props) {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [busy, setBusy] = useState(false)

  const hasContra = warnings.some(w => w.severity === 'contraindicado' || w.severity === 'major')

  // Checagem de interações ao abrir ou ao mudar itens
  useEffect(() => {
    if (!open) return
    let alive = true
    ;(async () => {
      try {
        setBusy(true)
        const resp = await fetch('/api/rx/check-interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        const data = await resp.json().catch(() => ({}))
        if (!alive) return
        const raw = Array.isArray(data?.warnings) ? data.warnings : []
        const normalized: Warning[] = raw.map((w: any) => ({
          pair: String(w.pair || ''),
          severity: normalizeSeverity(w.severity),
          note: String(w.note || ''),
        }))
        setWarnings(normalized)
      } catch {
        setWarnings([])
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(items)])

  // Cabeçalho do paciente (entra em texto/HTML/compartilhar)
  const head = useMemo(() => {
    const v: string[] = []
    if (patient.age) v.push(`Idade: ${patient.age}`)
    if (patient.weightKg) v.push(`Peso: ${patient.weightKg} kg`)
    if (patient.eGFR) v.push(`TFG: ${patient.eGFR} mL/min`)
    if (patient.childPugh) v.push(`Child-Pugh: ${patient.childPugh}`)
    if (patient.allergies) v.push(`Alergias: ${patient.allergies}`)
    return v.join(' • ')
  }, [patient])

  const html = useMemo(() => buildHtml(items, head, warnings), [items, head, warnings])
  const text = useMemo(() => renderText(items, head, warnings), [items, head, warnings])

  /* ----------------------------- FALLBACKS ----------------------------- */

  function fallbackExport() {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.open(); win.document.write(html); win.document.close()
    try { win.onload = () => setTimeout(() => win.print(), 200) } catch {}
  }

  async function fallbackShare() {
    // Tenta Web Share API; se indisponível, copia o texto
    const ns = (navigator as any)
    if (ns?.share) {
      try { await ns.share({ title: 'Prescrição · Aimnesis', text }) } catch {}
      return
    }
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      {/* drawer right */}
      <aside
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[520px] bg-app border-l border-base shadow-2xl overflow-y-auto"
        role="dialog" aria-modal="true" aria-label="Resumo da Prescrição"
      >
        <header className="sticky top-0 z-10 bg-app/90 backdrop-blur border-b border-base p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" aria-hidden />
            <h3 className="text-base font-semibold">Resumo da Prescrição</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-base p-1 hover:bg-panel transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-4 space-y-4">
          {head && <p className="text-[12.5px] text-muted">{head}</p>}

          {/* tabela de itens */}
          <section className="rounded-2xl border border-base bg-panel shadow-soft">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-base text-left">
                  <th className="p-2">Medicamento</th>
                  <th className="p-2">Dose</th>
                  <th className="p-2">Via</th>
                  <th className="p-2">Frequência</th>
                  <th className="p-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="p-3 text-muted">Sem itens.</td></tr>
                ) : items.map(it => (
                  <tr key={it.id} className="border-t border-base">
                    <td className="p-2 font-medium">{it.name}</td>
                    <td className="p-2">{it.dose}</td>
                    <td className="p-2">{it.route}</td>
                    <td className="p-2">{it.frequency}</td>
                    <td className="p-2">{it.duration || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!!items.some(i => i.notes) && (
              <div className="border-t border-base p-3 text-[12.5px] text-muted">
                <strong>Observações: </strong>
                {items.filter(i=>i.notes).map(i => `${i.name}: ${i.notes}`).join(' • ')}
              </div>
            )}
          </section>

          {/* interações */}
          <InteractionsPanel warnings={warnings} />

          {/* avisos de bloqueio */}
          {hasContra && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 p-3 text-[13px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              Existem alertas importantes. Revise antes de gerar o PDF.
            </div>
          )}

          {/* ações */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport ? onExport : fallbackExport}
              disabled={items.length === 0 || busy || hasContra}
              className="inline-flex items-center gap-2 rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50"
              title={hasContra ? 'Resolva os alertas antes de gerar o PDF' : 'Gerar PDF'}
            >
              <FileDown className="w-4 h-4" aria-hidden /> Gerar PDF
            </button>
            <button
              type="button"
              onClick={async () => { await navigator.clipboard.writeText(text).catch(()=>{}) }}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50"
              title="Copiar texto"
            >
              <ClipboardCopy className="w-4 h-4" aria-hidden /> Copiar texto
            </button>
            <button
              type="button"
              onClick={onShare ? onShare : fallbackShare}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" aria-hidden /> Compartilhar
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ----------------------------- helpers render ----------------------------- */

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
}

function renderText(items: RxItem[], head: string, warnings: Warning[]) {
  const lines: string[] = []
  lines.push('PRESCRIÇÃO')
  if (head) lines.push(head)
  lines.push('')
  if (!items.length) lines.push('— Sem itens —')
  else {
    for (const i of items) {
      lines.push(`• ${i.name} — ${i.dose} • ${i.route} • ${i.frequency}${i.duration ? ' • ' + i.duration : ''}`)
      if (i.notes) lines.push(`  Obs: ${i.notes}`)
    }
  }
  if (warnings.length) {
    lines.push('')
    lines.push('ALERTAS/INTERAÇÕES:')
    for (const w of warnings) lines.push(`- [${w.severity}] ${w.pair}: ${w.note}`)
  }
  lines.push('')
  lines.push('Gerado com Aimnesis — apoio à decisão, requer revisão/assinatura.')
  return lines.join('\n')
}

function buildHtml(items: RxItem[], head: string, warnings: Warning[]) {
  const rows = items.map(i => `
    <tr>
      <td><strong>${escapeHtml(i.name)}</strong></td>
      <td>${escapeHtml(i.dose)}</td>
      <td>${escapeHtml(i.route)}</td>
      <td>${escapeHtml(i.frequency)}</td>
      <td>${escapeHtml(i.duration || '')}</td>
      <td>${escapeHtml(i.notes || '')}</td>
    </tr>`).join('')

  const warnHtml = !warnings.length ? '' : `
    <h2>Alertas / Interações</h2>
    <ul>
      ${warnings.map(w => `<li><strong>[${escapeHtml(w.severity)}]</strong> ${escapeHtml(w.pair)} — ${escapeHtml(w.note)}</li>`).join('')}
    </ul>
  `

  const css = `
    <style>
      *{box-sizing:border-box}
      body{font:14px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif; color:#111; margin:24px}
      h1{font-size:20px;margin:0 0 4px 0}
      h2{font-size:16px;margin:16px 0 6px 0}
      .muted{color:#666}
      table{width:100%; border-collapse:collapse; margin-top:8px}
      th,td{border:1px solid #ddd; padding:8px; font-size:13px}
      th{background:#f7f7f7; text-align:left}
      .footer{margin-top:24px; font-size:12px}
      @media print { @page{size:auto; margin:12mm} }
    </style>
  `

  return `
    <!doctype html><html><head><meta charset="utf-8"><title>Prescrição</title>${css}</head>
    <body>
      <h1>Prescrição</h1>
      ${head ? `<div class="muted">${escapeHtml(head)}</div>` : ''}
      <h2>Itens</h2>
      <table><thead><tr>
        <th>Medicamento</th><th>Dose</th><th>Via</th><th>Frequência</th><th>Duração</th><th>Observações</th>
      </tr></thead><tbody>${rows || '<tr><td colspan="6">Sem itens</td></tr>'}</tbody></table>
      ${warnHtml}
      <div class="footer muted">Gerado com Aimnesis • Documento de apoio — revisar e assinar.</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
    </body></html>
  `
}