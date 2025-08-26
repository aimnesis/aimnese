// src/components/ui/RxBuilder.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, WandSparkles } from 'lucide-react'
import type { RxItem, PatientCtx } from './RxTypes'
import { uid } from './RxTypes'

type Props = {
  patient: PatientCtx
  onPatientChange: (p: PatientCtx) => void
  onAdd: (item: RxItem) => void
  onAskAI: (prompt: string) => void
  editing?: RxItem | null
  onCancelEdit?: () => void
}

const ROUTES = ['VO', 'IV', 'IM', 'SC', 'SL', 'Top', 'Inal', 'Otic', 'Oft', 'Retal', 'Vag']
const FREQS  = ['1x/dia', '2x/dia', '8/8h', '12/12h', '6/6h', 'SOS']

export default function RxBuilder({ patient, onPatientChange, onAdd, onAskAI, editing, onCancelEdit }: Props) {
  const [name, setName] = useState(editing?.name || '')
  const [dose, setDose] = useState(editing?.dose || '')
  const [route, setRoute] = useState(editing?.route || 'VO')
  const [frequency, setFrequency] = useState(editing?.frequency || '')
  const [duration, setDuration] = useState(editing?.duration || '')
  const [notes, setNotes] = useState(editing?.notes || '')

  useEffect(() => {
    if (!editing) return
    setName(editing.name)
    setDose(editing.dose)
    setRoute(editing.route)
    setFrequency(editing.frequency)
    setDuration(editing.duration || '')
    setNotes(editing.notes || '')
  }, [editing])

  const renalFlag = useMemo(() => {
    const n = Number(patient.eGFR)
    if (Number.isFinite(n) && n > 0 && n < 30) return 'Atenção: TFG < 30 mL/min — revisar ajustes renais.'
    return ''
  }, [patient.eGFR])

  const hepaticFlag = useMemo(() => {
    if (patient.childPugh) {
      if (patient.childPugh === 'C') return 'Atenção: Child-Pugh C — revisar ajustes hepáticos/contraindicações.'
      if (patient.childPugh === 'B') return 'Alerta: Child-Pugh B — avaliar ajuste hepático.'
    }
    return ''
  }, [patient.childPugh])

  function add() {
    const clean = name.trim()
    if (!clean) return
    onAdd({
      id: editing?.id || uid(),
      name: clean,
      dose: dose.trim(),
      route: route.trim(),
      frequency: frequency.trim(),
      duration: duration.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setName(''); setDose(''); setFrequency(''); setDuration(''); setNotes('')
  }

  function askAI() {
    const ctx: string[] = []
    if (patient.age) ctx.push(`Idade: ${patient.age}`)
    if (patient.weightKg) ctx.push(`Peso: ${patient.weightKg} kg`)
    if (patient.eGFR) ctx.push(`TFG: ${patient.eGFR} mL/min`)
    if (patient.childPugh) ctx.push(`Child-Pugh: ${patient.childPugh}`)
    if (patient.allergies) ctx.push(`Alergias: ${patient.allergies}`)

    const med = [name, dose].filter(Boolean).join(' — ')
    const q =
`Preciso de POSOLOGIA segura para o(s) medicamento(s) abaixo, considerando o contexto do paciente.
Responda com tabela Dose | Via | Frequência | Duração | Observações e ajuste renal/hepático quando pertinente.

Contexto do paciente:
${ctx.join('\n') || '(não informado)'}

Medicamento foco:
${med || '(não informado)'}

Se pedir monitorização ou examinar interações, explique em 1–2 linhas cada.`

    onAskAI(q)
  }

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 sm:p-5 space-y-4">
      <header>
        <h3 className="text-base font-semibold">Contexto do paciente</h3>
        <p className="text-[12.5px] text-muted">Esses campos ajudam na checagem de ajustes (renal/hepático) e enriquecem o pedido para a IA.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <div className="text-[12.5px] mb-1">Idade</div>
          <input value={patient.age || ''} onChange={(e) => onPatientChange({ ...patient, age: e.target.value })} className="inp" placeholder="ex.: 54" />
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Peso (kg)</div>
          <input value={patient.weightKg || ''} onChange={(e) => onPatientChange({ ...patient, weightKg: e.target.value })} className="inp" placeholder="ex.: 72" />
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">TFG (mL/min)</div>
          <input value={patient.eGFR || ''} onChange={(e) => onPatientChange({ ...patient, eGFR: e.target.value })} className="inp" placeholder="ex.: 38" />
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Child-Pugh</div>
          <select value={patient.childPugh || ''} onChange={(e) => onPatientChange({ ...patient, childPugh: e.target.value as any })} className="inp">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <div className="text-[12.5px] mb-1">Alergias/contraindicações</div>
          <input value={patient.allergies || ''} onChange={(e) => onPatientChange({ ...patient, allergies: e.target.value })} className="inp" placeholder="ex.: penicilinas" />
        </label>
      </div>

      {(renalFlag || hepaticFlag) && (
        <div className="text-[12.5px] text-amber-400">{renalFlag || hepaticFlag}</div>
      )}

      <hr className="border-base" />

      <header>
        <h3 className="text-base font-semibold">{editing ? 'Editar medicamento' : 'Adicionar medicamento'}</h3>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block sm:col-span-2">
          <div className="text-[12.5px] mb-1">Medicamento</div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="inp" placeholder="ex.: Amoxicilina" />
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Dose</div>
          <input value={dose} onChange={(e) => setDose(e.target.value)} className="inp" placeholder="ex.: 500 mg" />
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Via</div>
          <select value={route} onChange={(e) => setRoute(e.target.value)} className="inp">
            {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Frequência</div>
          <input value={frequency} onChange={(e) => setFrequency(e.target.value)} className="inp" placeholder="ex.: 8/8h" list="freqs" />
          <datalist id="freqs">{FREQS.map((f) => <option key={f} value={f} />)}</datalist>
        </label>
        <label className="block">
          <div className="text-[12.5px] mb-1">Duração</div>
          <input value={duration} onChange={(e) => setDuration(e.target.value)} className="inp" placeholder="ex.: 7 dias" />
        </label>
        <label className="block sm:col-span-3">
          <div className="text-[12.5px] mb-1">Observações</div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="inp" placeholder="ex.: tomar após refeições" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {editing ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editing && (
            <button type="button" onClick={onCancelEdit} className="rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition">
              Cancelar
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={askAI}
          className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
          title="Pedir sugestão de posologia à IA"
        >
          <WandSparkles className="w-4 h-4" /> Pedir posologia com IA
        </button>
      </div>
    </section>
  )
}