// src/components/ui/Topbar.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  Menu, Plus, ChevronDown, Sun, Moon,
  Bot, Stethoscope, Layers, ClipboardList
} from 'lucide-react'
import { useTheme } from 'next-themes'

type Props = {
  /** título opcional exibido pelo caller — atualmente não usado aqui, mas aceito para compatibilidade */
  title?: string
  onNew?: () => void
  onOpenSidebar?: () => void
}

/** 4 modos legados com prompt pronto (dashboard normaliza para os modos novos) */
const MODEL_PRESETS: { key: string; label: string; icon: JSX.Element; prompt: string }[] = [
  { key: 'general', label: 'Saúde Geral', icon: <Bot className="h-4 w-4" />, prompt:
    'Sou seu assistente clínico para dúvidas gerais. Descreva o caso (idade, queixa, duração, sinais/exames) que eu construo raciocínio e condutas baseadas em evidências.' },
  { key: 'specialties', label: 'Especialidades', icon: <Stethoscope className="h-4 w-4" />, prompt:
    'Escolha a especialidade ou descreva o caso e a área foco. Vou orientar diagnóstico diferencial, condutas e exames pertinentes.' },
  { key: 'copilot', label: 'Copiloto Conduta', icon: <Layers className="h-4 w-4" />, prompt:
    'Copiloto de conduta completa: descreva idade, queixa, hipóteses, comorbidades e contexto. Sugiro avaliação, exames, terapêutica e acompanhamento, citando diretrizes.' },
  { key: 'rx', label: 'Prescrição Conjunta', icon: <ClipboardList className="h-4 w-4" />, prompt:
    'Prescrição conjunta: informe fármaco(s), dose-alvo, função renal/hepática, interações e alergias. Proponho posologia segura e justificativa baseada em evidências.' },
]

export default function Topbar({ onNew, onOpenSidebar }: Props) {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [openModels, setOpenModels] = useState(false)

  // monta para evitar hydrate mismatch do ícone
  useEffect(() => setMounted(true), [])

  /** abre um modo: navega e mostra instruções (sem enviar automaticamente) */
  function openMode(modeKey: string, prompt: string) {
    try {
      router.push({ pathname: '/dashboard', query: { mode: modeKey } }, undefined, { shallow: true });
    } catch {}

    const dispatchIntro = () => {
      window.dispatchEvent(new CustomEvent('mode-intro', { detail: { mode: modeKey } }));
      window.dispatchEvent(new CustomEvent('preset-prompt', { detail: { text: prompt, focus: true, send: false } }));
      setOpenModels(false);
    };

    if ('requestAnimationFrame' in window) {
      requestAnimationFrame(() => requestAnimationFrame(dispatchIntro));
    } else {
      setTimeout(dispatchIntro, 0);
    }
  }

  const current = theme ?? resolvedTheme ?? systemTheme ?? 'light'
  const toggle = () => setTheme(current === 'dark' ? 'light' : 'dark')

  // fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!openModels) return
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest?.('[data-models-root]')) setOpenModels(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openModels])

  return (
    <header
      role="banner"
      className="h-14 border-b border-base backdrop-blur bg-panel/95 flex items-center justify-between px-3 md:px-4 gap-2 sticky top-0 z-40"
    >
      {/* Esquerda */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 rounded-md border border-base hover:bg-panel-2"
            aria-label="Abrir menu lateral"
            type="button"
            title="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Seletor de modelos (estilo ChatGPT) */}
        <div className="relative" data-models-root>
          <button
            type="button"
            onClick={() => setOpenModels((v) => !v)}
            className="inline-flex items-center gap-1 text-xs md:text-sm px-2.5 py-1.5 rounded-md border border-base bg-panel hover:bg-panel-2"
            aria-haspopup="menu"
            aria-expanded={openModels || undefined}
            title="Selecionar modo"
          >
            Modelos
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {openModels && (
            <div
              role="menu"
              className="absolute left-0 md:left-auto md:right-0 mt-2 w-60 rounded-md border border-base bg-panel shadow-lg p-1 z-50"
            >
              {MODEL_PRESETS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => openMode(m.key, m.prompt)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-panel-2 text-sm"
                  role="menuitem"
                  type="button"
                >
                  {m.icon}
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Alternar claro/escuro */}
        <button
          onClick={toggle}
          className="p-2 rounded-md border border-base bg-panel hover:bg-panel-2"
          type="button"
          aria-label="Alternar tema"
          title={(current === 'dark') ? 'Tema escuro ativado' : 'Tema claro ativado'}
        >
          {mounted ? (current === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : null}
        </button>

        {/* Novo chat */}
        {onNew && (
          <button
            onClick={onNew}
            className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm px-2.5 py-1.5 rounded-md border border-base bg-panel hover:bg-panel-2 font-medium"
            type="button"
            aria-label="Criar novo chat"
            title="Novo chat"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo
          </button>
        )}
      </div>
    </header>
  )
}