import React from 'react'
import { ActivitySquare, ChevronRight } from 'lucide-react'
import PremiumGate from '@/components/PremiumGate'

type Props = {
  suggestions?: string[]
  onSelectQuestion?: (q: string) => void
  proEnabled?: boolean
  onUpgrade?: () => void
}

export default function FirstFramePlantao({
  suggestions = [],
  onSelectQuestion,
  proEnabled = false,
  onUpgrade,
}: Props) {
  return (
    <section className="space-y-4">
      <header className="text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold flex items-center justify-center gap-2">
          <ActivitySquare className="h-6 w-6 opacity-80" />
          Copiloto Plantão (PRO)
        </h2>
        <p className="text-muted mt-1 text-sm">
          Emergências com condutas imediatas, red flags e doses prontas. Responde em segundos.
        </p>
        <div className="mt-2 text-[12.5px] text-muted">&gt;97% precisão típica • Fluxos ACLS/ATLS • LGPD</div>
      </header>

{!proEnabled && (
  <PremiumGate enabled={false} onUpgrade={onUpgrade} modeLabel="Plantão" />
)}
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