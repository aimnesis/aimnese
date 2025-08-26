// src/components/rx/InteractionsPanel.tsx
'use client'

import { ShieldAlert, Info } from 'lucide-react'

export type Warning = {
  pair: string
  severity: 'contraindicado' | 'major' | 'moderate' | 'minor'
  note: string
}

type Props = {
  warnings: Warning[]
  className?: string
}

export default function InteractionsPanel({ warnings, className }: Props) {
  const none = !warnings || warnings.length === 0

  return (
    <section className={`rounded-2xl border border-base bg-panel shadow-soft p-3 sm:p-4 ${className || ''}`}>
      <header className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-5 h-5" />
        <h3 className="text-base font-semibold">Interações</h3>
      </header>

      {none ? (
        <p className="text-[12.5px] text-muted">Nenhuma interação relevante encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li key={`${w.pair}-${i}`} className="rounded-lg border border-base bg-panel-2 p-3">
              <div className="flex items-start gap-2">
                <span className={badgeClass(w.severity)}>{label(w.severity)}</span>
                <div className="min-w-0">
                  <div className="font-medium">{w.pair}</div>
                  <div className="text-[13px] text-muted">{w.note}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-3 text-[12px] text-muted flex items-center gap-1">
        <Info className="w-4 h-4" />
        <span>Revisão clínica necessária; esta verificação é um apoio e não substitui o julgamento.</span>
      </footer>
    </section>
  )
}

function label(s: Warning['severity']) {
  switch (s) {
    case 'contraindicado': return 'Contraindicado'
    case 'major': return 'Alerta importante'
    case 'moderate': return 'Cautela'
    case 'minor': return 'Menor'
  }
}

function badgeClass(s: Warning['severity']) {
  const base = 'inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] mr-2'
  switch (s) {
    case 'contraindicado': return `${base} bg-red-500/15 border border-red-500/40 text-red-400`
    case 'major': return `${base} bg-amber-500/15 border border-amber-500/40 text-amber-400`
    case 'moderate': return `${base} bg-yellow-500/10 border border-yellow-500/30 text-yellow-400`
    case 'minor': return `${base} bg-slate-500/10 border border-slate-500/30 text-slate-300`
  }
}