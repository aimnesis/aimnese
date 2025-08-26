// src/components/ui/RxPanel.tsx
'use client'

import { useMemo } from 'react'
import { FileDown, Trash2, Pencil, ClipboardList } from 'lucide-react'
import type { RxItem, PatientCtx } from './RxTypes'

type Props = {
  items: RxItem[]
  patient: PatientCtx
  onEdit: (item: RxItem) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export default function RxPanel({ items, patient, onEdit, onRemove, onClear }: Props) {

  const printable = useMemo(() => {
    const head: string[] = []
    if (patient.age) head.push(`Idade: ${patient.age}`)
    if (patient.weightKg) head.push(`Peso: ${patient.weightKg} kg`)
    if (patient.eGFR) head.push(`TFG: ${patient.eGFR} mL/min`)
    if (patient.childPugh) head.push(`Child-Pugh: ${patient.childPugh}`)
    if (patient.allergies) head.push(`Alergias: ${patient.allergies}`)
    return head.join(' • ')
  }, [patient])

  function exportPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    const css = `
      <style>
        *{box-sizing:border-box} body{font:14px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif; color:#111; margin:24px}
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
    const rows = items.map(i => `
      <tr>
        <td><strong>${escapeHtml(i.name)}</strong></td>
        <td>${escapeHtml(i.dose)}</td>
        <td>${escapeHtml(i.route)}</td>
        <td>${escapeHtml(i.frequency)}</td>
        <td>${escapeHtml(i.duration || '')}</td>
        <td>${escapeHtml(i.notes || '')}</td>
      </tr>`).join('')

    const html = `
      <!doctype html><html><head><meta charset="utf-8">${css}<title>Prescrição</title></head>
      <body>
        <h1>Prescrição</h1>
        <div class="muted">${printable || ''}</div>

        <h2>Itens</h2>
        <table>
          <thead><tr>
            <th>Medicamento</th><th>Dose</th><th>Via</th><th>Frequência</th><th>Duração</th><th>Observações</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="6">Sem itens</td></tr>'}</tbody>
        </table>

        <div class="footer muted">
          Gerado com Aimnesis • Este documento é um auxílio ao profissional e deve ser revisado e assinado.
        </div>
        <script>window.onload=()=>setTimeout(()=>window.print(),200)</script>
      </body></html>
    `
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 sm:p-5 space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          <h3 className="text-base font-semibold">Painel de prescrição</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportPdf}
            disabled={!items.length}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50 inline-flex items-center gap-2"
            title="Gerar PDF (impressão do navegador)"
          >
            <FileDown className="w-4 h-4" /> Gerar PDF
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!items.length}
            className="rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition disabled:opacity-50 inline-flex items-center gap-2"
            title="Limpar painel"
          >
            <Trash2 className="w-4 h-4" /> Limpar
          </button>
        </div>
      </header>

      {!items.length ? (
        <p className="text-[12.5px] text-muted">Nenhum item na prescrição. Adicione pelo formulário acima.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border border-base bg-panel-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.name}</div>
                  <div className="text-[13px] text-muted">
                    {i.dose} • {i.route} • {i.frequency}{i.duration ? ` • ${i.duration}` : ''}
                    {i.notes ? <> — <span className="italic">{i.notes}</span></> : null}
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(i)}
                    className="rounded-md border border-base px-2 py-1 hover:bg-panel transition"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(i.id)}
                    className="rounded-md border border-base px-2 py-1 hover:bg-panel transition"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
}