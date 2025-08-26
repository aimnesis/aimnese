'use client'

import { FC, useEffect, useRef, useMemo } from 'react'
import {
  BookOpen,
  AlertCircle,
  Briefcase,
  Beaker,
  CheckCircle,
  FileText,
  Layers,
  X,
  ArrowUpRight,
} from 'lucide-react'

interface Question {
  id: string
  section: string
  text: string
  href?: string
}

const QUESTIONS: Question[] = [
  { id: 'side-1', section: 'Efeitos colaterais', text: 'Quais os efeitos colaterais mais comuns da metformina?' },
  { id: 'side-2', section: 'Efeitos colaterais', text: 'Efeitos graves com uso prolongado de lisinopril?' },
  { id: 'side-3', section: 'Efeitos colaterais', text: 'Apixabana em idoso com DRC — quais efeitos observar?' },

  { id: 'alt-1', section: 'Alternativas terapêuticas', text: 'Celulite com alergia a penicilina/cefalosporina — opções?' },
  { id: 'alt-2', section: 'Alternativas terapêuticas', text: 'Se metformina causar diarreia — como ajustar/substituir?' },
  { id: 'alt-3', section: 'Alternativas terapêuticas', text: 'Ceftriaxona é contraindicada em alergia à penicilina?' },

  { id: 'workup-1', section: 'Plano de investigação', text: 'Investigação de hipercalciúria — quais exames pedir?' },
  { id: 'workup-2', section: 'Plano de investigação', text: 'Dor torácica + depressão de ST lateral — próximos passos?' },

  { id: 'curb-1', section: 'Checagem rápida', text: 'FA em idoso pós-sangramento — como balancear anticoagulação?' },

  { id: 'evidence-1', section: 'Evidência primária', text: 'Evidência que suporta metformina como 1ª linha no DM2?' },
  { id: 'evidence-2', section: 'Evidência primária', text: 'Quais ECRs suportam AAS em prevenção primária?' },

  { id: 'inter-1', section: 'Interações medicamentosas', text: 'Interações entre atorvastatina e suco de toranja' },
  { id: 'inter-2', section: 'Interações medicamentosas', text: 'Ritonavir + rosuvastatina + apixabana (CYP3A4) — condução?' },
]

const ICON_MAP: Record<string, JSX.Element> = {
  'Efeitos colaterais': <AlertCircle size={18} />,
  'Alternativas terapêuticas': <Briefcase size={18} />,
  'Plano de investigação': <Beaker size={18} />,
  'Checagem rápida': <CheckCircle size={18} />,
  'Evidência primária': <FileText size={18} />,
  'Interações medicamentosas': <Layers size={18} />,
}

interface CapabilitiesPanelProps {
  onClose: () => void
  onSelectQuestion: (q: string) => void
}

const CapabilitiesPanel: FC<CapabilitiesPanelProps> = ({ onClose, onSelectQuestion }) => {
  const grouped = useMemo(() => {
    return QUESTIONS.reduce<Record<string, Question[]>>((acc, q) => {
      (acc[q.section] ||= []).push(q)
      return acc
    }, {})
  }, [])

  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Explorar funcionalidades"
      tabIndex={-1}
      className="rounded-2xl border border-base bg-panel p-6 shadow-xl relative text-[color:var(--text)] focus:outline-none"
    >
      <button
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute top-4 right-4 rounded-md border border-base bg-panel hover:bg-panel-2 p-1 text-[color:var(--muted)]"
        type="button"
      >
        <X size={18} />
      </button>

      <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 justify-center">
        <BookOpen size={20} /> Explorar funcionalidades
      </h2>

      <div className="flex flex-col gap-8">
        {Object.entries(grouped).map(([sectionName, items]) => (
          <section key={sectionName} aria-labelledby={`cap-${sectionName}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="opacity-80">{ICON_MAP[sectionName] || <BookOpen size={18} />}</span>
              <h3 id={`cap-${sectionName}`} className="text-base font-semibold">
                {sectionName}
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(q.text)}
                  className="flex justify-between items-center rounded-xl border border-base bg-panel hover:bg-panel-2 transition px-4 py-3 text-sm text-left"
                  aria-label={q.text}
                  type="button"
                >
                  <span className="truncate">{q.text}</span>
                  <ArrowUpRight size={18} className="opacity-70 flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </section>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-sm text-muted">Nenhuma funcionalidade disponível.</p>
        )}
      </div>
    </div>
  )
}

export default CapabilitiesPanel