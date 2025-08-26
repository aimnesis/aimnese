// src/components/rx/RxItemCard.tsx
'use client'

import { useId } from 'react'
import { Trash2, Save, AlertTriangle, Info } from 'lucide-react'
import type { RxItem } from '../ui/RxTypes'

type Props = {
  item: RxItem
  onChange: (next: RxItem) => void
  onRemove?: (id: string) => void
  compact?: boolean
  /** Sinais vindos do suggest/interações (ex.: 'renal','hepatic','pregnancy','warning') */
  flags?: string[]
}

export default function RxItemCard({ item, onChange, onRemove, compact, flags = [] }: Props) {
  const id = useId()
  const label = (s: string) => `${id}-${s}`

  const hasWarn = flags.includes('warning')
  const pills = [
    flags.includes('renal') && 'ajuste renal',
    flags.includes('hepatic') && 'ajuste hepático',
    flags.includes('pregnancy') && 'gravidez',
    flags.includes('lactation') && 'lactação',
  ].filter(Boolean) as string[]

  function patch<K extends keyof RxItem>(k: K, v: RxItem[K]) {
    onChange({ ...item, [k]: v })
  }

  return (
    <div className="rounded-xl border border-base bg-panel p-3 sm:p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate">{item.name || '—'}</div>
          {!!pills.length && (
            <div className="mt-1 flex flex-wrap gap-1">
              {pills.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-full border border-base bg-panel-2 px-2 py-0.5 text-[11.5px]">
                  <Info className="w-3.5 h-3.5" /> {p}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-md border border-base px-2 py-1 hover:bg-panel-2 transition"
              title="Remover item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div className="space-y-1">
          <label htmlFor={label('dose')} className="text-[12px] text-muted">Dose</label>
          <input
            id={label('dose')}
            value={item.dose}
            onChange={(e) => patch('dose', e.target.value)}
            placeholder="ex.: 500 mg"
            className="w-full rounded-md border border-base bg-panel-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={label('route')} className="text-[12px] text-muted">Via</label>
          <input
            id={label('route')}
            value={item.route}
            onChange={(e) => patch('route', e.target.value)}
            placeholder="VO, IV, IM, SC…"
            className="w-full rounded-md border border-base bg-panel-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={label('frequency')} className="text-[12px] text-muted">Frequência</label>
          <input
            id={label('frequency')}
            value={item.frequency}
            onChange={(e) => patch('frequency', e.target.value)}
            placeholder="8/8h, 12/12h, 1x/dia…"
            className="w-full rounded-md border border-base bg-panel-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={label('duration')} className="text-[12px] text-muted">Duração</label>
          <input
            id={label('duration')}
            value={item.duration}
            onChange={(e) => patch('duration', e.target.value)}
            placeholder="ex.: 7 dias"
            className="w-full rounded-md border border-base bg-panel-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div className="col-span-full space-y-1">
          <label htmlFor={label('notes')} className="text-[12px] text-muted">Observações</label>
          <textarea
            id={label('notes')}
            value={item.notes || ''}
            onChange={(e) => patch('notes', e.target.value)}
            placeholder="ex.: tomar após as refeições; evitar AINE; orientar sinais de alarme…"
            rows={2}
            className="w-full rounded-md border border-base bg-panel-2 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>
      </div>

      {hasWarn && (
        <div className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-amber-500">
          <AlertTriangle className="w-4 h-4" /> Atenção: há alertas importantes para este item.
        </div>
      )}

      <div className="mt-3 flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
          <Save className="w-3.5 h-3.5" /> alterações são salvas automaticamente
        </span>
      </div>
    </div>
  )
}