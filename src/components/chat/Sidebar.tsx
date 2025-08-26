// src/components/chat/Sidebar.tsx
'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import type React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import {
  Search,
  Settings,
  LogOut,
  ChevronRight,
  Bot,
  Layers,
  ClipboardList,
  Stethoscope,
  Activity,
  GraduationCap,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import type { ModeKey } from '@/data/mode-suggestions'

export type SidebarItem = { id: string; title: string; createdAt: string }

export type SidebarProps = {
  items: SidebarItem[]
  userEmail: string
  isVerified: boolean
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

/* ---------------- helpers ---------------- */
function emit(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
}
function previewTitle(t?: string, maxWords = 3) {
  const s = (t || '').replace(/\s+/g, ' ').trim()
  if (!s) return 'Novo chat'
  return s.split(' ').slice(0, maxWords).join(' ')
}

/* ---------------- módulos (cards) ---------------- */
function ModulesRow({ openMode }: { openMode: (mode: ModeKey) => void }) {
  const Card = ({
    icon,
    title,
    subtitle,
    onClick,
  }: {
    icon: React.ReactNode
    title: string
    subtitle: string
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 border border-border bg-transparent hover:bg-[var(--panel)] transition text-[12px] leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      aria-label={title}
      title={title}
    >
      <div className="shrink-0 opacity-90">{icon}</div>
      <div className="flex-1 text-left">
        <div className="font-medium text-[13px] truncate">{title}</div>
        <div className="text-[11px] text-[var(--muted)] truncate">{subtitle}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
    </button>
  )

  return (
    <div className="px-2 pb-2 grid grid-cols-1 gap-2" role="list" aria-label="Modos disponíveis">
      <Card icon={<Bot className="h-4 w-4" />}            title="Saúde Geral"           subtitle="Perguntas amplas e revisão rápida"      onClick={() => openMode('general')} />
      <Card icon={<GraduationCap className="h-4 w-4" />}   title="Estudos & Diretrizes"  subtitle="Síntese de evidências com fontes"       onClick={() => openMode('studies')} />
      <Card icon={<Activity className="h-4 w-4" />}        title="Plantão"               subtitle="Emergência: passos e doses imediatas"  onClick={() => openMode('plantao')} />
      <Card icon={<ClipboardList className="h-4 w-4" />}   title="Consultório"           subtitle="Gravação até 60 min + sumário"         onClick={() => openMode('consultorio')} />
      <Card icon={<Stethoscope className="h-4 w-4" />}     title="Especialidades"        subtitle="Diretrizes e condutas por área"        onClick={() => openMode('specialties')} />
      <Card icon={<Layers className="h-4 w-4" />}          title="Análise + Prescrição"  subtitle="S/O/A/P completo e Rx segura"          onClick={() => openMode('analysis')} />
    </div>
  )
}

/* ---------------- componente principal ---------------- */
function SidebarImpl({ items, userEmail, isVerified, activeId, onSelect, onNew }: SidebarProps) {
  const [q, setQ] = useState('')
  const router = useRouter()

  // encontra rascunho existente (título "Novo chat")
  const draft = useMemo(
    () => items.find((it) => it.title === 'Novo chat') || null,
    [items]
  )

  // cria um novo chat apenas se NÃO houver rascunho; senão abre o rascunho
  function newChatOrReuse() { if (draft) onSelect(draft.id); else onNew() }

  // abre um modo sem enviar mensagem automática
  function openMode(mode: ModeKey) {
    newChatOrReuse()
    try {
      router.push({ pathname: '/dashboard', query: { mode } }, undefined, { shallow: true })
    } catch {}

    const intro: Record<ModeKey, string> = {
      general:
        'Saúde Geral • Pergunte com contexto: idade, queixa, duração e achados relevantes.',
      studies:
        'Estudos & Diretrizes • Busque e sintetize evidências (NEJM/JAMA + diretrizes brasileiras) com links.',
      plantao:
        'Plantão • Emergências com condutas imediatas, red flags e doses prontas.',
      consultorio:
        'Consultório • Grave sua consulta (até 60 min). Anamnese + sumário + plano em tempo real.',
      specialties:
        'Especialidades • Prompts e diretrizes específicos por área. Contexto brasileiro.',
      analysis:
        'Análise + Prescrição Completa • Anamnese → hipóteses → diagnóstico/diferenciais → elucidações → condutas (medicamentosas e não).',
    }

    const dispatch = () => {
      emit('preset-prompt', { text: intro[mode], focus: true, send: false })
      emit('mode-intro', { mode })
    }
    if ('requestAnimationFrame' in window) {
      requestAnimationFrame(() => requestAnimationFrame(dispatch))
    } else {
      setTimeout(dispatch, 0)
    }
  }

  // lista “Recentes”: oculta rascunhos vazios fora do ativo
  const displayItems = useMemo(
    () => items.filter((it) => !(it.title === 'Novo chat' && it.id !== activeId)),
    [items, activeId]
  )

  return (
    <aside className="h-full w-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }} aria-label="Navegação lateral">
      {/* brand */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 select-none">
        <Image src="/logo-aimnesis.svg" alt="Logo Aimnesis" width={26} height={26} className="opacity-90" />
        <div className="text-[14px] font-semibold tracking-tight">AIMNESIS</div>
      </div>

      {/* busca */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
            className="w-full rounded-lg border border-border bg-[var(--panel)] px-9 py-2 text-[12px] leading-tight outline-none focus:ring-2 focus:ring-[var(--accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = (e.target as HTMLInputElement).value.trim()
                if (v) {
                  newChatOrReuse()
                  emit('preset-prompt', { text: v, focus: true, send: true })
                }
              }
            }}
          />
        </div>
      </div>

      {/* módulos */}
      <ModulesRow openMode={openMode} />

      {/* divisória */}
      <div className="h-px mx-2 my-2" style={{ background: 'var(--border)' }} />

      {/* recentes */}
      <div className="px-3 pb-2 text-[11px] text-[var(--muted)]">Recentes</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1" role="list" aria-label="Conversas recentes">
        {displayItems.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] px-2 py-3">Nenhum chat recente</div>
        ) : (
          displayItems.map((it) => {
            const active = it.id === activeId
            return (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={[
                  'w-full text-left rounded-lg px-3 py-2 text-[12px] leading-tight border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  active
                    ? 'bg-[var(--panel)] border-border'
                    : 'bg-transparent border-transparent hover:bg-[var(--panel)] hover:border-border',
                ].join(' ')}
                title={previewTitle(it.title)}
                aria-current={active ? 'page' : undefined}
                role="listitem"
                type="button"
              >
                <span className="block truncate">{previewTitle(it.title)}</span>
              </button>
            )
          })
        )}
      </div>

      {/* rodapé */}
      <div className="p-3 border-t border-border text-[11px] text-[var(--muted)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="truncate max-w-[18ch]" title={userEmail}>{userEmail}</div>
          <button
            type="button"
            onClick={() => (window.location.href = '/settings')}
            className="rounded-md border border-border px-2 py-1 hover:bg-[var(--panel)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            title="Configurações"
            aria-label="Abrir configurações"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isVerified ? 'bg-green-500' : 'bg-zinc-400'}`} />
          <span className="truncate">{isVerified ? 'Licença verificada' : 'Licença não verificada'}</span>
        </div>

        <button
          type="button"
          onClick={newChatOrReuse}
          className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] border border-border hover:bg-[var(--panel)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          + Novo chat
        </button>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full mt-1 rounded-lg px-3 py-2 text-[12px] border border-border hover:bg-[var(--panel)] transition flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          title="Sair"
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

export const Sidebar = memo(SidebarImpl)

/* ---------------- Drawer mobile com backdrop/scroll lock + coluna fixa desktop ---------------- */
type DrawerProps = { open: boolean; onClose: () => void; widthPx?: number; children: React.ReactNode }

/** Opcional: use <SidebarDrawer> se quiser controlar o Sidebar fora do layout do dashboard. */
export function SidebarDrawer({ open, onClose, widthPx = 300, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.documentElement.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={[
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />
      {/* drawer mobile */}
      <div
        className="fixed left-0 top-0 bottom-0 z-50 md:hidden will-change-transform"
        style={{
          width: Math.min(360, widthPx),
          transform: `translateX(${open ? '0' : '-100%'})`,
          transition: 'transform 220ms ease',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu lateral"
      >
        <div className="h-full border-r border-border" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
          {children}
        </div>
      </div>
      {/* coluna fixa desktop */}
      <div className="hidden md:block h-[calc(100dvh)]" style={{ width: 300 }} aria-hidden>
        <div className="h-full border-r border-border" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
          {children}
        </div>
      </div>
    </>
  )
}