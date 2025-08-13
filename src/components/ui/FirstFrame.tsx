// src/components/ui/FirstFrame.tsx
'use client'

import { useState, useEffect, useRef, FC, FormEvent } from 'react'
import CapabilitiesPanel from '@/components/CapabilitiesPanel'
import { Search, ChevronDown, X } from 'lucide-react'

interface FirstFrameProps {
  initialQuery?: string
  onSelectQuestion: (q: string) => void
}

const FirstFrame: FC<FirstFrameProps> = ({ initialQuery = '', onSelectQuestion }) => {
  const [query, setQuery] = useState(initialQuery)
  const [showCapabilities, setShowCapabilities] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const panelWrapperRef = useRef<HTMLDivElement | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onSelectQuestion(trimmed)
  }

  const clear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  // foco com "/" e Escape fecha painel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setShowCapabilities(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // click fora fecha painel
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        showCapabilities &&
        panelWrapperRef.current &&
        !panelWrapperRef.current.contains(e.target as Node)
      ) {
        setShowCapabilities(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showCapabilities])

  return (
    <div className="relative w-full">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <form onSubmit={handleSubmit} className="flex-grow flex relative">
          <div className="flex items-center w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 gap-2">
            <Search size={18} className="text-zinc-400" aria-hidden="true" />
            <input
              ref={(el) => {
                inputRef.current = el
              }}
              type="text"
              aria-label="Pergunte algo médico"
              placeholder="Faça uma pergunta ou digite um fato rápido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent flex-grow outline-none text-white placeholder:text-zinc-500 text-sm"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e as any)
                }
              }}
            />
            {query && (
              <button
                type="button"
                aria-label="Limpar"
                onClick={clear}
                className="p-1 rounded hover:bg-zinc-700 transition"
              >
                <X size={16} className="text-zinc-400" />
              </button>
            )}
            <button
              type="submit"
              aria-label="Enviar pergunta"
              className="ml-2 bg-[#ff6720] hover:bg-[#ff8448] text-white px-4 py-2 rounded-full text-sm font-medium transition"
            >
              Perguntar
            </button>
          </div>
        </form>

        <div className="flex-shrink-0">
          <button
            type="button"
            aria-label="Explorar capacidades"
            onClick={() => setShowCapabilities((o) => !o)}
            className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg text-sm hover:bg-zinc-700 transition"
          >
            <ChevronDown
              size={16}
              className={
                showCapabilities
                  ? 'rotate-180 transition-transform'
                  : 'transition-transform'
              }
              aria-hidden="true"
            />
            Explorar capacidades
          </button>
        </div>
      </div>

      {showCapabilities && (
        <div className="fixed inset-0 bg-black/60 flex items-start pt-24 px-4 z-50">
          <div className="w-full max-w-5xl mx-auto" ref={panelWrapperRef}>
            <CapabilitiesPanel
              onClose={() => setShowCapabilities(false)}
              onSelectQuestion={(q) => {
                setShowCapabilities(false)
                setQuery(q)
                onSelectQuestion(q)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FirstFrame