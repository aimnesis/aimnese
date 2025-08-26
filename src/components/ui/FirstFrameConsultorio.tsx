import React from 'react'
import { Stethoscope, ChevronRight, Mic } from 'lucide-react'
import PremiumGate from '@/components/PremiumGate'

type Props = {
  suggestions?: string[]
  onSelectQuestion?: (q: string) => void
  proEnabled?: boolean
  onUpgrade?: () => void
}

export default function FirstFrameConsultorio({
  suggestions = [],
  onSelectQuestion,
  proEnabled = false,
  onUpgrade,
}: Props) {
  return (
    <section className="space-y-4">
      <header className="text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold flex items-center justify-center gap-2">
          <Stethoscope className="h-6 w-6 opacity-80" />
          Copiloto Consultório (PRO)
        </h2>
        <p className="text-muted mt-1 text-sm">
          Apoio em tempo real à consulta. Grave até 60 minutos e gere anamnese, sumário, plano e atestados.
        </p>
        <div className="mt-2 text-[12.5px] text-muted">LGPD • evidência &gt; 97% • foco em comunicação ao paciente</div>
      </header>

{!proEnabled && (
  <PremiumGate enabled={false} onUpgrade={onUpgrade} modeLabel="Consultório" />
)}
      <div className="rounded-xl border border-base bg-panel p-4 flex items-center gap-3">
        <Mic className="w-5 h-5 opacity-80" />
        <div className="text-sm">
          <div className="font-medium">Grave sua consulta (até 60 min)</div>
          <div className="text-muted">Transcrição automática e resumo estruturado do encontro.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.slice(0, 4).map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={!proEnabled}
            onClick={() => proEnabled && onSelectQuestion?.(s)}
            className={`w-full rounded-xl border px-4 py-3 text-left transition flex items-center justify-between gap-2 ${
              proEnabled
                ? 'border-base bg-panel hover:bg-panel-2'
                : 'border-dashed border-base/60 bg-panel/50 opacity-70'
            }`}
            title={s}
          >
            <span className="truncate">{s}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        ))}
      </div>
    </section>
  )
}