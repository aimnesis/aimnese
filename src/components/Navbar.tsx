// src/components/Navbar.tsx
'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, LogOut, LogIn, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)

  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated' && !!session?.user
  const isDashboard = router.pathname === '/dashboard'

  // Fecha ao clicar fora
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Fecha com ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Fecha ao trocar de rota
  useEffect(() => {
    const start = () => setOpen(false)
    router.events?.on('routeChangeStart', start)
    return () => router.events?.off('routeChangeStart', start)
  }, [router.events])

  // Trava/destrava scroll no <html> quando o menu abre
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden'
      // Foco automático no primeiro botão do menu
      setTimeout(() => {
        const firstBtn = menuRef.current?.querySelector('button') as HTMLButtonElement | null
        firstBtn?.focus()
      }, 0)
    } else {
      document.documentElement.style.overflow = ''
      // devolve foco para o botão de menu
      menuButtonRef.current?.focus()
    }
  }, [open])

  // Loop de tabulação dentro do menu (focus trap)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])') || []
      ).filter(el => !el.hasAttribute('disabled'))
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const navigate = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <nav
      className="w-full h-14 flex items-center justify-between px-3 md:px-5"
      aria-label="Barra de navegação"
      style={{ background: 'transparent', color: 'var(--fg)' }}
    >
      {/* Logo / Home */}
      <button
        aria-label="Ir para a página inicial"
        onClick={() => navigate('/')}
        className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        type="button"
      >
        <Image
          src="/logo-aimnesis.svg"
          alt="Aimnesis"
          width={28}
          height={28}
          className="object-contain"
          priority
        />
        <span className="text-base font-semibold tracking-tight">Aimnesis</span>
      </button>

      {/* Ações (desktop) */}
      <div className="hidden md:flex items-center gap-2">
        <ThemeToggle />

        {isAuthed ? (
          <>
            <button
              onClick={() => navigate('/dashboard')}
              className={`btn-secondary h-9 px-3 ${isDashboard ? 'ring-2 ring-border' : ''}`}
              aria-current={isDashboard ? 'page' : undefined}
              aria-label="Dashboard"
              type="button"
              title="Dashboard"
            >
              <LayoutGrid size={18} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="btn h-9 px-4"
              aria-label="Sair"
              type="button"
              title="Sair"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate('/auth/signin')}
            className="btn h-9 px-4"
            aria-label="Entrar ou Cadastrar"
            type="button"
            title="Entrar"
          >
            <LogIn size={18} />
            <span>Entrar</span>
          </button>
        )}
      </div>

      {/* Menu mobile */}
      <div className="md:hidden flex items-center">
        <ThemeToggle className="mr-1" />
        <button
          ref={menuButtonRef}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(o => !o)}
          className="p-2 rounded transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          type="button"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Backdrop + Dropdown mobile */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            ref={menuRef}
            id="mobile-menu"
            role="menu"
            aria-label="Menu mobile"
            className="fixed top-16 right-3 panel shadow-soft z-40 w-[220px] p-2"
          >
            <div className="flex flex-col gap-2">
              {isAuthed ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`btn-secondary w-full justify-start h-10 px-3 ${isDashboard ? 'ring-2 ring-border' : ''}`}
                    type="button"
                  >
                    <LayoutGrid size={18} />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="btn w-full justify-start h-10 px-3"
                    type="button"
                  >
                    <LogOut size={18} />
                    <span>Sair</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/auth/signin')}
                  className="btn w-full justify-start h-10 px-3"
                  type="button"
                >
                  <LogIn size={18} />
                  <span>Entrar</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}