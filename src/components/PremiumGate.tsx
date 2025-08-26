// src/components/ui/PremiumGate.tsx
import * as React from 'react'

type Props = {
  enabled?: boolean          // se true, não exibe o gate
  onUpgrade?: () => void     // ação opcional p/ "Assinar agora" (abre checkout)
  modeLabel?: string         // nome do modo p/ mensagem: ex. "Plantão"
}

export default function PremiumGate({ enabled = false, onUpgrade, modeLabel }: Props) {
  if (enabled) return null

  const goCheckout = () => {
    if (onUpgrade) return onUpgrade()
    if (typeof window !== 'undefined') window.location.href = '/pricing' // fallback seguro
  }
  const goPlans = () => {
    if (typeof window !== 'undefined') window.location.href = '/pricing'
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium">Recurso premium</div>
          <div className="text-sm text-amber-700">
            {modeLabel ? (
              <>O modo <strong>{modeLabel}</strong> é PRO. Assine para desbloquear acesso ilimitado.</>
            ) : (
              <>Este recurso é PRO. Assine para desbloquear acesso ilimitado.</>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={goCheckout}
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            Assinar agora
          </button>
          <button
            onClick={goPlans}
            className="rounded-md border border-base bg-panel px-3 py-1.5 text-sm hover:bg-panel/80"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  )
}