// src/components/ui/SearchBar.tsx
'use client'

import { FC, FormEvent, useState, useCallback, useEffect, useRef } from 'react'
import { ChevronRight, X } from 'lucide-react'

interface SearchBarProps {
  initialQuery?: string
  placeholder?: string
  onSearch: (q: string) => void
  className?: string
}

const SearchBar: FC<SearchBarProps> = ({
  initialQuery = '',
  placeholder = 'Faça uma pergunta médica...',
  onSearch,
  className = '',
}) => {
  const [value, setValue] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (trimmed) {
        onSearch(trimmed)
      }
    },
    [onSearch]
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSearch(value)
  }

  const clear = () => {
    setValue('')
    inputRef.current?.focus()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Busca médica principal"
      className={`w-full flex flex-col items-center ${className}`}
    >
      <div className="relative flex items-center w-full max-w-2xl rounded-full bg-zinc-900 px-5 py-3 border-l-4 border-[#ff6720] shadow-md">
        <input
          ref={(el) => {
            inputRef.current = el
          }}
          type="text"
          aria-label="Campo de pergunta médica"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-grow bg-transparent text-white outline-none placeholder:text-zinc-500 text-sm pr-10"
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            aria-label="Limpar campo"
            onClick={clear}
            className="absolute right-10 p-1 rounded-full hover:bg-zinc-800 transition"
          >
            <X size={16} className="text-zinc-400" />
          </button>
        )}

        <button
          aria-label="Enviar busca"
          type="submit"
          className="ml-2 bg-[#ff6720] hover:bg-[#ff8448] p-2 rounded-full flex items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!value.trim()}
        >
          <ChevronRight className="text-white" size={18} />
        </button>
      </div>
    </form>
  )
}

export default SearchBar