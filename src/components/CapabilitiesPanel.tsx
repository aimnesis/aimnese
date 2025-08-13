'use client'

import { FC, useEffect, useRef } from 'react'
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
  {
    id: 'side-1',
    section: 'Pergunte sobre Efeitos Colaterais',
    text: 'Quais são os efeitos colaterais mais comuns da metformina?',
  },
  {
    id: 'side-2',
    section: 'Pergunte sobre Efeitos Colaterais',
    text: 'Existem efeitos colaterais graves associados ao uso prolongado de lisinopril?',
  },
  {
    id: 'side-3',
    section: 'Pergunte sobre Efeitos Colaterais',
    text: 'Quais são os efeitos colaterais conhecidos do apixabano em pacientes idosos com disfunção renal?',
  },
  {
    id: 'alt-1',
    section: 'Alternativas de Tratamento',
    text: 'Paciente com celulite alérgico à penicilina e cefalosporinas: quais são as alternativas?',
  },
  {
    id: 'alt-2',
    section: 'Alternativas de Tratamento',
    text: 'Alternativas se metformina causar diarreia',
  },
  {
    id: 'alt-3',
    section: 'Alternativas de Tratamento',
    text: 'Ceftriaxona é contraindicada em alergia à penicilina?',
  },
  {
    id: 'workup-1',
    section: 'Construir um Plano de Investigação',
    text: 'Investigações para paciente com hipercalciúria',
  },
  {
    id: 'workup-2',
    section: 'Construir um Plano de Investigação',
    text: 'Qual é o próximo passo para um paciente com dor torácica e depressão de ST lateral?',
  },
  {
    id: 'curb-1',
    section: 'Consulta Rápida de Verificação',
    text: 'Paciente com fibrilação atrial idoso: como balancear risco de anticoagulação após sangramento recente?',
  },
  {
    id: 'evidence-1',
    section: 'Pergunte sobre Evidência Primária',
    text: 'Qual é a evidência primária que suporta o uso de metformina como tratamento de primeira linha para diabetes tipo 2?',
  },
  {
    id: 'evidence-2',
    section: 'Pergunte sobre Evidência Primária',
    text: 'Quais ensaios randomizados suportam o uso de aspirina de baixa dose na prevenção primária cardiovascular?',
  },
  {
    id: 'interactions-1',
    section: 'Interações Medicamentosas',
    text: 'Verifique interações entre atorvastatina e suco de toranja',
  },
  {
    id: 'interactions-2',
    section: 'Interações Medicamentosas',
    text: 'Interações de medicamentos para paciente em uso de ritonavir, rosuvastatina e apixabano considerando inibição de CYP3A4',
  },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  'Pergunte sobre Efeitos Colaterais': <AlertCircle className="inline-block mr-2" size={18} />,
  'Alternativas de Tratamento': <Briefcase className="inline-block mr-2" size={18} />,
  'Construir um Plano de Investigação': <Beaker className="inline-block mr-2" size={18} />,
  'Consulta Rápida de Verificação': <CheckCircle className="inline-block mr-2" size={18} />,
  'Pergunte sobre Evidência Primária': <FileText className="inline-block mr-2" size={18} />,
  'Interações Medicamentosas': <Layers className="inline-block mr-2" size={18} />,
}

interface CapabilitiesPanelProps {
  onClose: () => void
  onSelectQuestion: (q: string) => void
}

const CapabilitiesPanel: FC<CapabilitiesPanelProps> = ({ onClose, onSelectQuestion }) => {
  const grouped = QUESTIONS.reduce<Record<string, Question[]>>((acc, q) => {
    acc[q.section] = acc[q.section] || []
    acc[q.section].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Explorar mais funcionalidades"
      tabIndex={-1}
      className="max-w-4xl mx-auto bg-white border border-zinc-300 rounded-xl p-6 shadow-xl relative text-black focus:outline-none"
    >
      <button
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-500 hover:text-black transition"
        type="button"
      >
        <X size={20} />
      </button>

      <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 justify-center">
        <BookOpen size={22} /> Explorar mais funcionalidades
      </h2>

      <div className="flex flex-col gap-10">
        {Object.entries(grouped).map(([sectionName, items]) => (
          <div key={sectionName}>
            <div className="flex items-center mb-2">
              <div className="text-lg font-bold flex items-center gap-2">
                {ICON_MAP[sectionName] || <BookOpen size={18} />}
                <span>{sectionName}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {items.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(q.text)}
                  className="flex justify-between items-center border border-zinc-300 rounded-lg px-4 py-3 hover:bg-zinc-50 transition font-medium text-sm bg-white"
                  aria-label={q.text}
                  type="button"
                >
                  <span className="truncate">{q.text}</span>
                  <ArrowUpRight size={18} className="opacity-60 flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            Nenhuma funcionalidade disponível.
          </p>
        )}
      </div>
    </div>
  )
}

export default CapabilitiesPanel