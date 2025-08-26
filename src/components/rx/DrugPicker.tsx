// src/components/rx/DrugPicker.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Pill, Loader2 } from 'lucide-react'
import type { RxItem, PatientCtx } from '../ui/RxTypes'

type Props = {
  open: boolean
  onClose: () => void
  /** Contexto do paciente para pré-preencher ajustes */
  patient: PatientCtx
  /** Dispara item pronto (ou semi-pronto) para o fluxo */
  onPick: (item: RxItem) => void
}

type SuggestResponse = {
  item?: Partial<RxItem> & { name: string }
  notes?: string[]
  flags?: Array<'renal' | 'hepatic' | 'pregnancy' | 'lactation' | 'warning'>
}

const FALLBACK_DB = [
  'Amoxicilina',
  'Azitromicina',
  'Ceftriaxona',
  'Dipirona',
  'Ibuprofeno',
  'Enalapril',
  'Losartana',
  'Hidroclorotiazida',
  'Metformina',
  'Insulina NPH',
  'Omeprazol',
  'Ondansetrona',
  'Paracetamol',
  'Prednisona',
  'Rivaroxabana',
  'Sulfametoxazol + Trimetoprim',
]

const EMPTY_ITEM = (name = ''): RxItem => ({
  id: crypto.randomUUID(),
  name,
  dose: '',
  route: '',
  frequency: '',
  duration: '',
  notes: '',
})

export default function DrugPicker({ open, onClose, patient, onPick }: Props) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // foco ao abrir
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open])

  // lista filtrada local (fallback / auto-complete)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return FALLBACK_DB.slice(0, 20)
    return FALLBACK_DB.filter((n) => n.toLowerCase().includes(s)).slice(0, 20)
  }, [q])

  async function askSuggest(drugName: string): Promise<RxItem> {
    setErr(null)
    setBusy(true)
    try {
      const resp = await fetch('/api/rx/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug: drugName, patientMeta: patient }),
      })
      if (!resp.ok) {
        // fallback: devolve item cru
        return EMPTY_ITEM(drugName)
      }
      const data = (await resp.json()) as SuggestResponse
      const base = EMPTY_ITEM(data?.item?.name || drugName)
      const merged: RxItem = {
        ...base,
        dose: data?.item?.dose || '',
        route: data?.item?.route || '',
        frequency: data?.item?.frequency || '',
        duration: data?.item?.duration || '',
        notes: data?.notes?.length ? (data.notes.join(' • ')) : '',
      }
      return merged
    } catch {
      // offline/erro: fallback
      return EMPTY_ITEM(drugName)
    } finally {
      setBusy(false)
    }
  }

  async function choose(name: string) {
    const item = await askSuggest(name)
    onPick(item)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-label="Escolher medicamento"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      {/* modal */}
      <div className="relative z-10 w-full sm:max-w-lg mx-2 sm:mx-0 rounded-2xl border border-base bg-panel shadow-soft">
        <header className="flex items-center justify-between p-3 sm:p-4 border-b border-base">
          <div className="text-sm font-medium">Adicionar fármaco</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-base p-1 hover:bg-panel-2 transition"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-3 sm:p-4">
          {/* busca */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Busque por nome do medicamento…"
              className="w-full rounded-lg border border-base bg-panel pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* lista */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-base rounded-lg border border-base">
            {filtered.length === 0 ? (
              <li className="p-3 text-[13px] text-muted">Nenhum resultado para “{q}”.</li>
            ) : (
              filtered.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => choose(name)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-panel-2 transition text-left disabled:opacity-60"
                    title={`Selecionar ${name}`}
                  >
                    <Pill className="w-4 h-4 opacity-80" />
                    <span className="text-[13.5px]">{name}</span>
                    {busy && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
                  </button>
                </li>
              ))
            )}
          </ul>

          {err && <div className="mt-2 text-[12.5px] text-red-500">{err}</div>}

          {/* dica do contexto do paciente */}
          <p className="mt-3 text-[12px] text-muted">
            Ajustes considerarão: {patient.age ? `idade ${patient.age} • ` : ''}{patient.weightKg ? `peso ${patient.weightKg} kg • ` : ''}{patient.eGFR ? `TFG ${patient.eGFR} mL/min • ` : ''}{patient.childPugh ? `Child-Pugh ${patient.childPugh} • ` : ''}{patient.allergies ? `alergias: ${patient.allergies}` : 'alergias não informadas'}
          </p>
        </div>
      </div>
    </div>
  )
}