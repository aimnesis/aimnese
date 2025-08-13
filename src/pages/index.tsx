// src/pages/index.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import CapabilitiesPanel from '@/components/CapabilitiesPanel'

/**
 * Exemplos rotativos exibidos quando o campo está vazio (typewriter).
 * Mantemos curto, claro e clinicamente útil.
 */
const EXAMPLES: string[] = [
  'Qual é o tratamento padrão‑ouro da uretrite?',
  'Quais orientações não medicamentosas para diabetes tipo 2?',
  'Dose inicial de metformina em doença renal crônica?',
  'Interações entre amoxicilina e varfarina?',
]

export default function Home() {
  const router = useRouter()
  const { data: session } = useSession()

  const [query, setQuery] = useState('')
  const [showPanel, setShowPanel] = useState(false)

  // Typewriter do placeholder
  const [exampleIndex, setExampleIndex] = useState(0)
  const [typedExample, setTypedExample] = useState('')
  const [isTypingExample, setIsTypingExample] = useState(true)

  // refs
  const inputRef = useRef<HTMLInputElement | null>(null)
  const attachRef = useRef<HTMLInputElement | null>(null)

  // Garantir zero margem do body em navegadores antigos
  useEffect(() => {
    document.body.style.margin = '0'
  }, [])

  // ⌘K / Ctrl+K -> foca o input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Digitação letra por letra do exemplo dentro do campo
  useEffect(() => {
    if (query.length > 0) return // não rodar quando usuário está digitando

    const full = EXAMPLES[exampleIndex]
    let timer: ReturnType<typeof setTimeout>

    if (isTypingExample) {
      if (typedExample.length < full.length) {
        timer = setTimeout(() => {
          setTypedExample(full.slice(0, typedExample.length + 1))
        }, 70) // velocidade da digitação
      } else {
        // terminou de digitar, pausa antes de trocar
        timer = setTimeout(() => setIsTypingExample(false), 1600)
      }
    } else {
      // troca para o próximo exemplo
      setTypedExample('')
      setExampleIndex((i) => (i + 1) % EXAMPLES.length)
      setIsTypingExample(true)
    }

    return () => clearTimeout(timer)
  }, [exampleIndex, isTypingExample, typedExample, query])

  const submit = useCallback(
    (q: string) => {
      const text = q.trim()
      if (!text) return
      const target = `/dashboard?prompt=${encodeURIComponent(text)}`
      if (!session?.user) {
        // manda para login e volta pro dashboard com a pergunta
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(target)}`)
      } else {
        router.push(target)
      }
    },
    [router, session?.user]
  )

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit(query)
    }
  }

  const isTyping = query.length > 0

  // Handlers superficiais dos chips (sem lógica pesada na Home)
  const triggerAttach = () => attachRef.current?.click()
  const onAttachChange = () => {
    // Home é uma landing. Apenas foca o input e informa visualmente.
    inputRef.current?.focus()
  }
  const focusSearch = () => inputRef.current?.focus()
  const focusVoice = () => inputRef.current?.focus()

  return (
    <Layout title="Início" description="Pergunte algo médico – experiência estilo ChatGPT.">
      <div className="min-h-[100dvh] bg-app">
        <main className="mx-auto w-full max-w-[980px] px-4 pt-10 sm:pt-16 pb-28 sm:pb-36">
          {/* Marca / título central */}
          <div className="flex flex-col items-center gap-4 sm:gap-5 mb-6 sm:mb-10 text-center">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20">
              <Image src="/logo-aimnesis.svg" alt="Aimnesis" fill className="object-contain" priority />
            </div>
            <h1 className="font-semibold tracking-tight text-[clamp(28px,4.2vw,40px)] leading-[1.15]">
              O Melhor Amigo Médico, do Médico!
            </h1>
          </div>

          {/* Card de busca */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(query) }}
            className="mx-auto w-full max-w-[820px]"
            aria-label="Caixa de pergunta"
          >
            <div
              className={[
                'relative rounded-[28px] border border-base bg-panel overflow-hidden',
                'transition-[box-shadow,transform] duration-200 will-change-transform',
                isTyping ? 'shadow-soft ring-1 ring-[var(--ring)] scale-[1.005]' : 'shadow-soft/0',
              ].join(' ')}
            >
              {/* linha com input */}
              <div className="relative flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-2 sm:pr-3 pt-3">
                {/* Estetoscópio — propositalmente maior que o texto e alinhado verticalmente */}
                <div
                  aria-hidden
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 text-[30px] sm:text-[34px] leading-none opacity-85 shrink-0 select-none"
                >
                  🩺
                </div>

                {/* Placeholder/Exemplo rotativo — aparece quando o campo está vazio */}
                {!isTyping && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = EXAMPLES[exampleIndex]
                      setQuery(text)
                      inputRef.current?.focus()
                    }}
                    className="absolute left-[92px] sm:left-[112px] right-20 top-1/2 -translate-y-1/2 text-[clamp(16px,2.2vw,22px)] text-muted text-left truncate pointer-events-auto"
                    aria-label="Usar exemplo de pergunta"
                  >
                    {typedExample}
                    <span className="ml-[1px] animate-pulse">▍</span>
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Pergunte alguma dúvida de saúde"
                  aria-describedby="home-helper"
                  placeholder=" "
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onEnter}
                  className="w-full bg-transparent outline-none placeholder:text-muted text-base sm:text-[17px] px-2 py-3 sm:py-4"
                />

                <button
                  type="submit"
                  aria-label="Enviar"
                  className="ml-auto inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full btn transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* divisor */}
              <div className="h-px mx-4 sm:mx-6 my-2" style={{ background: 'var(--border)' }} />

              {/* chips internos */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* input invisível para anexar */}
                  <input
                    ref={attachRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={onAttachChange}
                  />
                  <button
                    type="button"
                    onClick={triggerAttach}
                    className="inline-flex items-center gap-2 rounded-full border border-base bg-app px-3 sm:px-4 py-2 text-[13px] sm:text-sm transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05L12 20.5a2.12 2.12 0 0 1-3 0l-5-5a2.12 2.12 0 0 1 0-3l9.44-9.45a2.12 2.12 0 0 1 3 0l5 5a2.12 2.12 0 0 1 0 3Z"/><path d="M7.5 12.5l2 2"/></svg>
                    <span>Anexar</span>
                  </button>
                  <button
                    type="button"
                    onClick={focusSearch}
                    className="inline-flex items-center gap-2 rounded-full border border-base bg-app px-3 sm:px-4 py-2 text-[13px] sm:text-sm transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <span>Buscar</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={focusVoice}
                  className="inline-flex items-center gap-2 rounded-full border border-base bg-app px-3 sm:px-4 py-2 text-[13px] sm:text-sm transition hover:bg-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v5"/><path d="M10 21h4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/></svg>
                  <span>Voz</span>
                </button>
              </div>
            </div>
          </form>

          {/* CTA único “Explorar capacidades” */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowPanel(true)}
              className="inline-flex items-center gap-2 rounded-full border border-base bg-app px-4 sm:px-5 py-2.5 text-sm shadow-soft hover:bg-panel transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              type="button"
            >
              <span className="text-[16px]" aria-hidden>⚡</span>
              <span>Explorar capacidades</span>
            </button>
          </div>

          {/* estado de sessão */}
          {session?.user && (
            <p id="home-helper" className="mt-6 text-center text-sm text-muted">
              Logado como <span className="font-medium text-[color:var(--fg)]">{session.user.email}</span>.{' '}
              <Link href="/dashboard" className="underline">Ir para o Dashboard</Link>
            </p>
          )}
        </main>

        {/* Rodapé CTA */}
        <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-base bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-panel/80">
          <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-3 sm:py-4">
              <p className="text-center sm:text-left text-[13px] sm:text-[15px] leading-snug text-muted">
                Aimnesis é gratuito e ilimitado para profissionais de saúde.
              </p>

              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="btn rounded-full h-11 px-6 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                  aria-label="Abrir Dashboard"
                >
                  Abrir Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="btn rounded-full h-11 px-7 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                  aria-label="Entrar"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </footer>

        {/* modal “Explorar capacidades” */}
        {showPanel && (
          <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="relative w-full max-w-4xl">
              <CapabilitiesPanel
                onClose={() => setShowPanel(false)}
                onSelectQuestion={(q) => { setShowPanel(false); submit(q) }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}