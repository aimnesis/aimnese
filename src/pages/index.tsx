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
  'Qual é o tratamento padrão-ouro da uretrite?',
  'Quais orientações não medicamentosas para diabetes tipo 2?',
  'Dose inicial de metformina em doença renal crônica?',
  'Interações entre amoxicilina e varfarina?',
]

/** Cópias A/B discretas para conversão (banner) */
const COPIES: string[] = [
  'Gratuito para médicos. Em 60 segundos você faz sua primeira pergunta.',
  'Decida com segurança em segundos. Confirme seu CRM e tenha acesso imediato, sem custo.',
  'Seu copiloto no plantão, 24h por dia. Gratuito para profissionais verificados.',
]

export default function Home() {
  const router = useRouter()
  const { data: session } = useSession()

  const [query, setQuery] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [ctaCopy, setCtaCopy] = useState(COPIES[0])

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

  // Banner A/B simples
  useEffect(() => {
    setCtaCopy(COPIES[Math.floor(Math.random() * COPIES.length)])
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
        // manda direto para CADASTRO e preserva o callback para cair no Dashboard com a pergunta
        router.push(`/auth/signup?callbackUrl=${encodeURIComponent(target)}`)
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

  // Handlers dos chips — em produção, leve o usuário direto ao Dashboard ou Signup
  const goSignupOrDash = useCallback(() => {
    if (session?.user) router.push('/dashboard')
    else router.push('/auth/signup')
  }, [router, session?.user])

  const triggerAttach = goSignupOrDash
  const onAttachChange = goSignupOrDash
  const focusSearch = goSignupOrDash
  const focusVoice = goSignupOrDash

  return (
    <Layout title="Início" description="Pergunte algo médico – experiência estilo ChatGPT.">
      <div className="min-h-[100dvh] bg-app">
        <main className="mx-auto w-full max-w-[980px] px-4 pt-10 sm:pt-16 pb-28 sm:pb-36">
          <section
            aria-label="frame-1-hero"
            className="flex flex-col items-center justify-center gap-6 pb-12 sm:pb-16 min-h-[calc(100dvh-120px)]"
          >
          {/* Marca / título central (FRAME 1 — mantido) */}
          <div className="flex flex-col items-center gap-3 sm:gap-5 mb-4 sm:mb-8 text-center">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28">
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
              {/* linha com input centralizado verticalmente */}
              <div className="relative flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-2 sm:pr-3 h-[64px] sm:h-[76px]">
                {/* Estetoscópio — 2x o tamanho do texto (harmonia) */}
                <div
                  aria-hidden
                  className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 text-[36px] sm:text-[40px] leading-none opacity-85 shrink-0 select-none"
                >
                  🩺
                </div>

                {/* Placeholder/Exemplo rotativo — clicável e centralizado no eixo do ícone */}
                {!isTyping && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = EXAMPLES[exampleIndex]
                      setQuery(text)
                      inputRef.current?.focus()
                    }}
                    className="absolute inset-y-0 left-[92px] sm:left-[112px] right-20 flex items-center text-[clamp(16px,2.2vw,22px)] text-muted text-left truncate pointer-events-auto"
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
                  className="w-full h-full bg-transparent outline-none placeholder:text-muted text-base sm:text-[17px] px-2"
                />

                <button
                  type="submit"
                  aria-label="Enviar"
                  className="ml-auto grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full btn transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {/* seta centralizada dentro do círculo */}
                  <svg
                    viewBox="0 0 24 24"
                    className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
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
                    {/* clip “paperclip” levemente inclinado */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="-rotate-12">
                      <path d="M21.44 11.05 12 20.5a4 4 0 0 1-5.66-5.66l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                    </svg>
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
                  {/* microfone “estilo WhatsApp” (shape próximo) */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <path d="M12 19v3"/>
                  </svg>
                  <span>Voz</span>
                </button>
              </div>
            </div>
          </form>

          {/* CTA único “Explorar capacidades” */}
          <div className="mt-4 sm:mt-6 flex justify-center">
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

          {/* Banner de copy sutil (A/B) */}
          {!session?.user && (
            <div className="mt-5 sm:mt-8">
              <div className="mx-auto max-w-[820px] rounded-2xl border border-base bg-panel px-4 py-3 text-center text-[15px] sm:text-[16px]">
                <span className="opacity-90">{ctaCopy}</span>
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="ml-2 underline underline-offset-2 hover:opacity-90"
                >
                  Cadastre-se →
                </button>
              </div>
            </div>
          )}

          </section>
          {/* FRAME 2 — Como funciona */}
          <section id="como-funciona" className="mt-14 sm:mt-18 scroll-mt-24">
            <h2 className="text-center text-[24px] sm:text-[28px] font-semibold tracking-tight mb-3 sm:mb-4">
              Como funciona a Aimnesis?
            </h2>
            <p className="mx-auto max-w-[760px] text-center text-[14px] sm:text-[15.5px] text-muted leading-relaxed mb-6 sm:mb-7">
              Rápido, claro e seguro. Do cadastro à aplicação em poucos segundos.
            </p>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <Step
  n={1}
  title="Cadastre-se"
  desc="Confirme seu e-mail e CRM. Leva menos de 1 minuto. Gratuito para médicos."
/>
<Step
  n={2}
  title="Pergunte"
  desc="Digite, anexe documentos, exames ou use a voz. Respostas em segundos."
/>
<Step
  n={3}
  title="Receba"
  desc="Resposta rápida, clara e baseada em evidência. Inclui referências e orientações práticas."
/>
<Step
  n={4}
  title="Aplique"
  desc="Gere relatório completo com anamnese, hipóteses diagnosticas, condutas e exames."
/>
            </ol>

            <div className="mt-7 sm:mt-8 flex justify-center">
              <Link
                href="/auth/signup"
                className="btn rounded-full h-11 px-7 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              >
                Começar agora
              </Link>
            </div>
            <p className="mt-2 text-center text-[13px] sm:text-[14px] text-muted">
              Sem custo para médicos. Confirme seu CRM e comece agora.
            </p>
          </section>

          {/* FRAME 3 — Vantagens */}
          <section id="vantagens" className="mt-16 sm:mt-22">
            <h2 className="text-center text-[24px] sm:text-[28px] font-semibold tracking-tight mb-3 sm:mb-4">
              Por que milhares de médicos usam a Aimnesis?
            </h2>
            <p className="mx-auto max-w-[760px] text-center text-[14px] sm:text-[15.5px] text-muted leading-relaxed mb-6 sm:mb-8">
              Seu copiloto no plantão, 24h por dia. Gratuito para profissionais verificados.
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <Benefit
                title="Foco clínico real"
                desc="Treinada para o contexto do médico — linguagem objetiva e segura."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>
                  </svg>
                }
              />
              <Benefit
                title="Baseada em evidência"
                desc="Referências claras e orientação prática para decisão rápida."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M4 19.5V6.5a2 2 0 012-2h8l6 6v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M14 4v6h6"/>
                  </svg>
                }
              />
              <Benefit
                title="Velocidade no plantão"
                desc="Respostas em segundos, com suporte a voz e anexos."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M21 12a9 9 0 11-9-9"/><path d="M12 7v5l3 3"/>
                  </svg>
                }
              />
              <Benefit
                title="Gratuito para médicos"
                desc="Sem custo para profissionais de saúde verificados."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M12 1v22M5 5l14 14"/>
                  </svg>
                }
              />
              <Benefit
                title="Relatório completo"
                desc="Geração automática de SOAP, anamnese, condutas e pedidos de exame."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M7 12h10"/><path d="M7 16h7"/>
                  </svg>
                }
              />
              <Benefit
                title="Multiespecialidade"
                desc="Clínica, cirurgia, pediatria, gineco, cardio, urgência e muito mais."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>
                  </svg>
                }
              />
              <Benefit
                title="Suporte a anexos"
                desc="Analisa exames, receitas, PDFs e imagens para contextualizar a resposta."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M21.44 11.05 12 20.5a4 4 0 0 1-5.66-5.66l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                  </svg>
                }
              />
              <Benefit
                title="Disponível 24/7"
                desc="Seu copiloto no consultório, no SUS e no plantão — sempre pronto."
                icon={
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                  </svg>
                }
              />
            </ul>

            <div className="mt-6 flex justify-center">
              <Link
                href="/auth/signup"
                className="btn rounded-full h-11 px-7 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              >
                Criar conta gratuita
              </Link>
            </div>
            <p className="mt-2 text-center text-[13px] sm:text-[14px] text-muted">
              Seu copiloto de decisão clínica — gratuito para profissionais verificados.
            </p>
          </section>
        </main>

        {/* Rodapé CTA (mantido) */}
        <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-base bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-panel/80">
          <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 py-3 sm:py-4">
              <p className="text-center sm:text-left text-[16px] sm:text-[18px] leading-snug font-medium" style={{ color: 'var(--fg)' }}>
                Aimnesis é <span className="font-semibold">gratuito</span> para profissionais de saúde.
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
                  href="/auth/signup"
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

/** ———— Componentes internos simples (visuais) ———— */

function Step({
  n,
  title,
  desc,
}: {
  n: number
  title: string
  desc: string
}) {
  return (
    <li className="rounded-2xl border border-base bg-panel p-4 sm:p-5 transition hover:-translate-y-[2px] hover:shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-9 h-9 rounded-full bg-app/60 border border-base text-sm font-semibold">
          {n}
        </div>
        <h3 className="text-[15px] sm:text-[16px] font-semibold tracking-tight">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-[13.5px] sm:text-[14px] text-muted leading-snug">
        {desc}
      </p>
    </li>
  )
}

function Benefit({
  title,
  desc,
  icon,
}: {
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <li className="rounded-2xl border border-base bg-panel p-4 sm:p-5 flex items-start gap-3 transition hover:-translate-y-[2px] hover:shadow-soft">
      <div className="grid place-items-center w-9 h-9 rounded-full border border-base bg-app/40 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-[15px] sm:text-[16px] font-semibold tracking-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-[13.5px] sm:text-[14px] text-muted leading-snug">
          {desc}
        </p>
      </div>
    </li>
  )
}