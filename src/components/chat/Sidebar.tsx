// src/components/chat/Sidebar.tsx
// src/components/chat/Sidebar.tsx
'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Search, Stethoscope, FileText, MessageSquare, Settings, ChevronDown, ChevronUp, ChevronRight, LogOut } from 'lucide-react'

import { signOut } from 'next-auth/react'

export type SidebarItem = {
  id: string
  title: string
  createdAt: string
}

export type SidebarProps = {
  items: SidebarItem[]
  userEmail: string
  isVerified: boolean
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

function cleanTitle(title: string) {
  if (!title) return 'Novo chat'
  const t = title.replace(/\s+/g, ' ').trim()
  return t.length > 48 ? t.slice(0, 48) + '…' : t
}

// Utilitário para disparar eventos simples para a Home/Dashboard (focus no composer, etc.)
function emit(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

type SpecSectionKey = 'guidelines' | 'care' | 'tests'
type SpecSection = { key: SpecSectionKey; label: string }
type Specialty = { name: string; sections: SpecSection[] }

// Lista de especialidades com subitens
const SPECIALTIES: Specialty[] = [
  { name: "Alergia e Imunologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Anestesiologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Angiologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cancerologia (Oncologia)", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cardiologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Cardiovascular", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia da Mão", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia de Cabeça e Pescoço", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia do Aparelho Digestivo", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Geral", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Pediátrica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Plástica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Torácica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Cirurgia Vascular", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Clínica Médica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Coloproctologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Dermatologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Endocrinologia e Metabologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Endoscopia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Gastroenterologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Genética Médica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Geriatria", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Ginecologia e Obstetrícia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Hematologia e Hemoterapia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Homeopatia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Infectologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Mastologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina de Família e Comunidade", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina do Trabalho", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina de Tráfego", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Esportiva", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Física e Reabilitação", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Intensiva", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Legal e Perícia Médica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Nuclear", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Medicina Preventiva e Social", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Nefrologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Neurocirurgia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Neurologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Nutrologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Oftalmologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Oncologia Clínica", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Ortopedia e Traumatologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Otorrinolaringologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Patologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Patologia Clínica/Medicina Laboratorial", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Pediatria", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Pneumologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Psiquiatria", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Radiologia e Diagnóstico por Imagem", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Radioterapia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Reumatologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
  { name: "Urologia", sections: [{ key: 'guidelines', label: 'Diretrizes' }, { key: 'care', label: 'Condutas' }, { key: 'tests', label: 'Exames' }] },
]

function SidebarImpl({ items, userEmail, isVerified, activeId, onSelect, onNew }: SidebarProps) {
  const [q, setQ] = useState('')
  const [openSpecs, setOpenSpecs] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const filtered: Specialty[] = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return SPECIALTIES
    return SPECIALTIES.filter((sp) => sp.name.toLowerCase().includes(s))
  }, [q])

  function VirtualList({
    rows,
    height = 280,
    rowHeight = 40,
  }: { rows: Specialty[]; height?: number; rowHeight?: number }) {
    const [scrollTop, setScrollTop] = useState(0)
    const total = rows.length * rowHeight
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 3)
    const visible = Math.ceil(height / rowHeight) + 6
    const end = Math.min(rows.length, start + visible)

    return (
      <div
        style={{ height, overflowY: 'auto' }}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
        className="border border-border rounded-md"
      >
        <div style={{ height: total, position: 'relative' }}>
          {rows.slice(start, end).map((sp, i) => {
            const idx = start + i
            const top = idx * rowHeight
            const active = expandedIdx === idx
            return (
              <div key={sp.name} style={{ position: 'absolute', left: 0, right: 0, top }}>
                <button
                  type="button"
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-[13px] hover:bg-[var(--panel)] transition"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span className="flex-1 truncate">{sp.name}</span>
                  {active ? <ChevronUp className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <aside className="h-full w-full flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* BRAND / TOPO */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3 select-none">
        <Image src="/logo-aimnesis.svg" alt="Logo" width={100} height={100} />
        <div className="text-[15px] font-semibold tracking-tight">AIMNESIS</div>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar"
            className="w-full rounded-lg border border-border bg-[var(--panel)] px-9 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* MENU PRIMÁRIO (como no ChatGPT) */}
      <nav className="px-2 pb-2">
        <button
          type="button"
          onClick={() => setOpenSpecs((v) => (q ? true : !v))}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] border border-border hover:bg-[var(--panel)] transition"
        >
          {/* icon */}<Stethoscope className="h-4 w-4" aria-hidden />
          <span className="flex-1 truncate">Especialidades Médicas</span>
          {openSpecs || q ? <ChevronUp className="h-4 w-4 text-[var(--muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--muted)]" />}
        </button>

        {(openSpecs || q) && (
          <div className="mt-2 mb-3 px-1">
            {expandedIdx == null ? (
              <VirtualList rows={filtered} height={280} rowHeight={40} />
            ) : (
              <div className="rounded-md border border-border">
                {/* Cabeçalho da especialidade selecionada */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(null)}
                    className="text-[12px] text-[var(--muted)] hover:underline"
                  >
                    Voltar
                  </button>
                  <div className="text-[13px] font-medium truncate">
                    {filtered[expandedIdx]?.name || 'Especialidade'}
                  </div>
                </div>
                {/* Subitens */}
                <div className="p-2 grid grid-cols-1 gap-2">
                  {(filtered[expandedIdx]?.sections || []).map((sec) => (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => emit('select-specialty-section', { specialty: filtered[expandedIdx]?.name, section: sec.key })}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] hover:bg-[var(--panel)]"
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{sec.label}</div>
                        <div className="text-[12px] text-[var(--muted)]">Abrir {sec.label.toLowerCase()} desta especialidade</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => emit('start-consultation')}
          className="w-full mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] border border-border hover:bg-[var(--panel)] transition"
          title="Consulta médica com prescrição completa"
          aria-label="Consulta médica com prescrição completa"
        >
          <FileText className="h-4 w-4" aria-hidden />
          <span className="flex-1 truncate">Consulta Médica com Prescrição Completa</span>
        </button>

        <button
          type="button"
          onClick={() => emit('focus-composer')}
          className="w-full mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] border border-border hover:bg-[var(--panel)] transition"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span className="flex-1 truncate">Pergunte qualquer coisa de saúde</span>
        </button>
      </nav>

      {/* DIVISÓRIA */}
      <div className="h-px mx-2 my-2" style={{ background: 'var(--border)' }} />

      {/* LISTA DE CHATS RECENTES */}
      <div className="px-3 pb-2 text-[12px] text-[var(--muted)]">Recentes</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.length === 0 ? (
          <div className="text-xs text-[var(--muted)] px-2 py-3">Nenhum chat recente</div>
        ) : (
          items.map((it) => {
            const active = it.id === activeId
            return (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={[
                  'w-full text-left rounded-lg px-3 py-2 text-[13px] truncate border transition',
                  active
                    ? 'bg-[var(--panel)] border-border'
                    : 'bg-transparent border-transparent hover:bg-[var(--panel)] hover:border-border',
                ].join(' ')}
                title={cleanTitle(it.title)}
                aria-current={active ? 'page' : undefined}
                type="button"
              >
                <span className="block truncate">{cleanTitle(it.title)}</span>
              </button>
            )
          })
        )}
      </div>

      {/* RODAPÉ: PERFIL / STATUS */}
      <div className="p-3 border-t border-border text-[12px] text-[var(--muted)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="truncate max-w-[18ch]" title={userEmail}>{userEmail}</div>
          <button
            type="button"
            onClick={() => (window.location.href = '/settings')}
            className="rounded-md border border-border px-2 py-1 hover:bg-[var(--panel)]"
            title="Configurações"
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
          onClick={onNew}
          className="w-full mt-1 rounded-lg px-3 py-2 text-[14px] border border-border hover:bg-[var(--panel)] transition"
        >
          + Novo chat
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full mt-1 rounded-lg px-3 py-2 text-[14px] border border-border hover:bg-[var(--panel)] transition flex items-center gap-2 text-left"
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

/* =========================================================
   SidebarDrawer — drawer mobile com backdrop e animação
   Uso típico:

   <SidebarDrawer
     open={drawer}
     onClose={() => setDrawer(false)}
   >
     <Sidebar ... />
   </SidebarDrawer>
   ========================================================= */
type DrawerProps = {
  open: boolean
  onClose: () => void
  widthPx?: number
  children: React.ReactNode
}

export function SidebarDrawer({ open, onClose, widthPx = 300, children }: DrawerProps) {
  // trava scroll do body quando open
  useEffect(() => {
    if (!open) return
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={[
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />
      {/* Drawer */}
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

      {/* Layout estático para ≥ md (não usa overlay) */}
      <div className="hidden md:block h-[calc(100dvh)]" style={{ width: 300 }} aria-hidden>
        <div className="h-full border-r border-border" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
          {children}
        </div>
      </div>
    </>
  )
}