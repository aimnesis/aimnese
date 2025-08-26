// src/components/ui/SpecialtyPicker.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import specialtiesList from '@/data/specialties.json'
import aliasesMap from '@/data/specialty-aliases.json'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (name: string) => void
}

type AliasDict = Record<string, string>

export default function SpecialtyPicker({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState('')
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // normaliza
  const items = useMemo(() => {
    const base = (specialtiesList as string[]).map((s) => String(s))
    const aliases = aliasesMap as AliasDict
    const qn = q.trim().toLowerCase()
    if (!qn) return base
    return base.filter((name) => {
      const n = name.toLowerCase()
      if (n.includes(qn)) return true
      // variações por apelidos (neuro, cardio etc)
      const hits = Object.entries(aliases).some(([alias, real]) => {
        return real.toLowerCase() === n && alias.toLowerCase().includes(qn)
      })
      return hits
    })
  }, [q])

  // foco quando abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 10)
      return () => clearTimeout(t)
    }
  }, [open])

  // fechar com ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function pick(name: string) {
    onSelect(name)
    onClose()
    setQ('')
  }

  return (
    <div
      aria-hidden={!open}
      className={[
        'fixed inset-0 z-50 transition',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
    >
      {/* backdrop */}
      <div
        className={[
          'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden
      />

      {/* dialog */}
      <div className="absolute inset-x-0 top-[10vh] mx-auto w-[min(680px,92vw)]">
        <div className="rounded-2xl border border-base bg-app shadow-soft overflow-hidden">
          {/* header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-base">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busque por especialidade (ex.: cardio, dermato, neuro)…"
                className="w-full rounded-lg bg-panel pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                aria-label="Buscar especialidade"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-base px-2 py-1 hover:bg-panel text-sm"
              aria-label="Fechar"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* list */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto px-2 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
            role="listbox"
            aria-label="Lista de especialidades"
          >
            {items.length === 0 && (
              <div className="text-center text-sm text-muted py-6 col-span-full">
                Nada encontrado. Tente outro termo.
              </div>
            )}
            {items.map((name) => (
              <button
                key={name}
                role="option"
                aria-selected={false}
                onClick={() => pick(name)}
                className="flex items-center justify-between rounded-xl border border-base bg-panel hover:bg-panel-2 transition px-3 py-2 text-sm text-left"
                title={name}
                type="button"
              >
                <span className="truncate">{name}</span>
                <ChevronDown className="w-4 h-4 rotate-[-90deg] opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}