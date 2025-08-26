// src/components/ui/ModeHeader.tsx
import React from 'react'
import { Shield, Stethoscope, Brain, Bot, Pill } from 'lucide-react'

type ModeKey = 'general' | 'specialties' | 'copilot' | 'rx'

function modeMeta(mode: ModeKey) {
  switch (mode) {
    case 'general':
      return { icon: <Stethoscope className="h-4 w-4" />, label: 'Saúde Geral', accent: 'var(--accent)' }
    case 'specialties':
      return { icon: <Brain className="h-4 w-4" />, label: 'Especialidades', accent: 'var(--accent)' }
    case 'copilot':
      return { icon: <Bot className="h-4 w-4" />, label: 'Copiloto de Conduta', accent: 'var(--accent)' }
    case 'rx':
      return { icon: <Pill className="h-4 w-4" />, label: 'Prescrição Conjunta', accent: 'var(--accent)' }
    default:
      return { icon: null, label: '', accent: 'var(--accent)' }
  }
}

const isPremiumMode = (m: ModeKey) => m === 'copilot' || m === 'rx'

export default function ModeHeader({
  mode,
  intro,
  isPro,
  onUpgrade,
}: {
  mode: ModeKey
  intro: string
  isPro: boolean
  onUpgrade?: () => void
}) {
  const meta = modeMeta(mode)
  const premium = isPremiumMode(mode)
  const showUpgrade = premium && !isPro

  return (
    <section
      className="rounded-2xl border border-base bg-panel-2 px-4 py-3"
      aria-label={`Modo ${meta.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg border border-base bg-panel p-1.5">
            {meta.icon}
          </span>
          <div className="font-medium">
            <span className="mr-2">{meta.label}</span>
            {showUpgrade && (
              <span className="inline-flex items-center gap-1 rounded-md border border-base bg-panel px-2 py-0.5 text-[11px]">
                <Shield className="h-3.5 w-3.5" />
                PRO
              </span>
            )}
          </div>
        </div>

        {showUpgrade && (
          <button
            type="button"
            className="rounded-md border border-base bg-panel px-3 py-1.5 text-sm hover:bg-panel-3 transition"
            onClick={() => (onUpgrade ? onUpgrade() : (window.location.href = '/pricing'))}
          >
            Desbloquear PRO
          </button>
        )}
      </div>

      {/* descrição enxuta */}
      <p className="mt-2 text-[13px] text-muted">{intro}</p>
    </section>
  )
}