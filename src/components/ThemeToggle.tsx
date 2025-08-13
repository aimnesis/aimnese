// src/components/ThemeToggle.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Moon, Sun } from 'lucide-react'

type Props = {
  className?: string
  size?: number
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export default function ThemeToggle({ className, size = 18 }: Props) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null)
    return saved ?? (getSystemPrefersDark() ? 'dark' : 'light')
  })

  // aplica na montagem e quando theme muda
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  // primeira pintura consistente (evita flash)
  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | null)
    const initial = saved ?? (getSystemPrefersDark() ? 'dark' : 'light')
    applyTheme(initial)
    setTheme(initial)
    setMounted(true)
  }, [])

  // responde a alterações do sistema (só se o user não mudar manualmente? aqui sempre respeitamos manual)
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mql) return
    const onChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme')
      if (!saved) {
        const next = e.matches ? 'dark' : 'light'
        setTheme(next)
        applyTheme(next)
      }
    }
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const isDark = theme === 'dark'
  const label = isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center rounded-md h-9 w-9 border',
        'border-border bg-transparent hover:bg-[color-mix(in_oklab,var(--panel)80%,black_20%)] transition',
        className || '',
      ].join(' ')}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  )
}