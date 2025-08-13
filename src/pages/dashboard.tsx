// src/pages/dashboard.tsx
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'

import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import Composer from '@/components/chat/Composer'
import { Sidebar, type SidebarItem } from '@/components/chat/Sidebar'

// ===== Sugeridas (fora do componente p/ não recriar a cada render) =====
const QUICK_SUGGESTIONS = [
  'Opções de tratamento para hipertensão estágio 1',
  'Interações entre amoxicilina e varfarina',
  'Conduta inicial em febre em lactentes',
  'Ajuste de dose de metformina em DRC',
] as const

// ===== Tipagem dos props vindos do SSR =====
type QueryItem = { id: string; question: string; answer: string; createdAt: string }
type Props = { userEmail: string; userName: string | null; isVerified: boolean; queries: QueryItem[] }

// ===== Utilitário para ler streaming de resposta do endpoint =====
async function streamAnswer(
  input: RequestInfo | URL,
  init: RequestInit,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<{ meta?: { id: string; question: string; createdAt: string }, full: string }> {
  const resp = await fetch(input, { ...init, signal })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const reader = resp.body?.getReader()
  if (!reader) throw new Error('no-body')
  const decoder = new TextDecoder()
  let acc = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    acc += decoder.decode(value, { stream: true })
    onChunk(acc)
  }
  const metaHeader = resp.headers.get('x-aim-answer-meta')
  let meta: { id: string; question: string; createdAt: string } | undefined
  if (metaHeader) {
    try { meta = JSON.parse(metaHeader) } catch {}
  }
  return { meta, full: acc }
}

// ===== SSR: busca sessão + últimos 50 históricos =====
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  const email = session?.user?.email || null
  if (!email) return { redirect: { destination: '/auth/signin', permanent: false } }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      email: true,
      name: true,
      isVerified: true,
      queries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, question: true, answer: true, createdAt: true },
      },
    },
  })

  return {
    props: {
      userEmail: user?.email ?? email,
      userName: user?.name ?? null,
      isVerified: user?.isVerified ?? false,
      queries:
        user?.queries.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
          createdAt: q.createdAt.toISOString(),
        })) ?? [],
    },
  }
}

// ===== Tipos do chat (estado local) =====
type MsgRole = 'user' | 'assistant'
type Msg = { role: MsgRole; content: string }
type Thread = { id: string; title: string; createdAt: string; messages: Msg[] }

// ===== Topbar enxuta (sem logo/email duplicado) =====
const Topbar = memo(function Topbar({
  title,
  onNew,
  onOpenMenu,
}: {
  title: string
  onNew: () => void
  onOpenMenu: () => void
}) {
  return (
    <div className="h-12 border-b border-base bg-panel flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenMenu}
          className="md:hidden text-sm px-3 py-2 rounded-md border border-base hover:bg-panel-2"
          aria-label="Abrir menu"
          type="button"
        >
          ☰
        </button>
        <span className="text-sm font-medium">Aimnesis</span>
        <span className="mx-2 text-muted">/</span>
        <span className="text-sm truncate">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onNew}
          className="text-xs px-3 py-1.5 rounded-md border border-base hover:bg-panel-2 transition"
          type="button"
          aria-label="Novo chat"
          title="Novo chat"
        >
          + Novo chat
        </button>
      </div>
    </div>
  )
})

export default function Dashboard({ userEmail, isVerified, queries }: Props) {
  const router = useRouter()
  const bootSent = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  // abort on unmount
  useEffect(() => {
    return () => {
      try { abortRef.current?.abort() } catch {}
    }
  }, [])

  // Prisma -> estado local
  const initialThreads: Thread[] = useMemo(() => {
    return queries.map((q) => {
      const messages: Msg[] = [{ role: 'user', content: q.question }]
      if (q.answer) messages.push({ role: 'assistant', content: q.answer })
      return {
        id: q.id,
        title: q.question.slice(0, 48) || 'Pergunta',
        createdAt: q.createdAt,
        messages,
      }
    })
  }, [queries])

  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.id ?? null)
  const active = threads.find((t) => t.id === activeId) ?? null

  // Drawer (mobile)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Sidebar items
  const sidebarItems: SidebarItem[] = useMemo(
    () => threads.map((t) => ({ id: t.id, title: t.title, createdAt: t.createdAt })),
    [threads]
  )

  // Scroll refs/estado
  const endRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  // auto-scroll ao fim a cada nova mensagem
  useEffect(() => {
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'end' })
  }, [active?.messages?.length])

  // observa rolagem para mostrar o botão "voltar ao fim"
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
      setAtBottom(nearBottom)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return

    // garante thread ativo
    let id = active?.id
    if (!id) {
      const draftId = `draft-${Date.now()}`
      setThreads((prev) => [
        { id: draftId, title: 'Novo chat', createdAt: new Date().toISOString(), messages: [] },
        ...prev,
      ])
      setActiveId(draftId)
      id = draftId
    }

    // adiciona msg do usuário + placeholder vazio p/ stream
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title: t.title === 'Novo chat' ? text.slice(0, 48) : t.title,
              messages: [...t.messages, { role: 'user', content: text }, { role: 'assistant', content: '' }],
            }
          : t
      )
    )

    // atualizador do último balão (assistant)
    const updateAssistant = (content: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, messages: t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content } : m)) }
            : t
        )
      )
    }

    // cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    try {
      const { meta, full } = await streamAnswer(
        '/api/ask?stream=1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text }),
        },
        updateAssistant,
        signal,
      )

      if (meta) {
        const m = meta
        setThreads((prev) => {
          const withoutOld = prev.filter((t) => t.id !== id)
          const finished: Thread = {
            id: m.id,
            title: m.question.slice(0, 48),
            createdAt: m.createdAt,
            messages: [
              { role: 'user', content: m.question },
              { role: 'assistant', content: full },
            ],
          }
          return [finished, ...withoutOld]
        })
        setActiveId(m.id)
      }
    } catch {
      // if it was an explicit abort, do not fallback
      if ((abortRef.current?.signal as any)?.aborted) return
      // fallback para JSON completo
      try {
        const resp = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text }),
          signal,
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as { id: string; answer: string; question: string; createdAt: string }

        setThreads((prev) => {
          const withoutOld = prev.filter((t) => t.id !== id)
          const finished: Thread = {
            id: data.id,
            title: data.question.slice(0, 48),
            createdAt: data.createdAt,
            messages: [
              { role: 'user', content: data.question },
              { role: 'assistant', content: data.answer },
            ],
          }
          return [finished, ...withoutOld]
        })
        setActiveId(data.id)
      } catch {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, messages: [...t.messages.slice(0, -1), { role: 'assistant', content: '❌ Erro ao gerar resposta.' }] }
              : t
          )
        )
      }
    }
  }, [active?.id])

  const handleSendWithFiles = useCallback(async ({ text, files }: { text: string; files: File[] }) => {
    if (!text.trim()) return

    // garante thread ativo
    let id = active?.id
    if (!id) {
      const draftId = `draft-${Date.now()}`
      setThreads((prev) => [
        { id: draftId, title: 'Novo chat', createdAt: new Date().toISOString(), messages: [] },
        ...prev,
      ])
      setActiveId(draftId)
      id = draftId
    }

    // adiciona msg do usuário + placeholder vazio p/ stream
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              title: t.title === 'Novo chat' ? text.slice(0, 48) : t.title,
              messages: [...t.messages, { role: 'user', content: text }, { role: 'assistant', content: '' }],
            }
          : t
      )
    )

    const updateAssistant = (content: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, messages: t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content } : m)) }
            : t
        )
      )
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    try {
      const form = new FormData()
      form.append('prompt', text)
      files.forEach((f) => form.append('files', f))

      const { meta, full } = await streamAnswer('/api/ask?stream=1', { method: 'POST', body: form }, updateAssistant, signal)

      if (meta) {
        const m = meta
        setThreads((prev) => {
          const withoutOld = prev.filter((t) => t.id !== id)
          const finished: Thread = {
            id: m.id,
            title: m.question.slice(0, 48),
            createdAt: m.createdAt,
            messages: [
              { role: 'user', content: m.question },
              { role: 'assistant', content: full },
            ],
          }
          return [finished, ...withoutOld]
        })
        setActiveId(m.id)
      }
    } catch {
      // if it was an explicit abort, do not fallback
      if ((abortRef.current?.signal as any)?.aborted) return
      try {
        const form = new FormData()
        form.append('prompt', text)
        files.forEach((f) => form.append('files', f))

        const resp = await fetch('/api/ask', { method: 'POST', body: form, signal })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as { id: string; answer: string; question: string; createdAt: string }

        setThreads((prev) => {
          const withoutOld = prev.filter((t) => t.id !== id)
          const finished: Thread = {
            id: data.id,
            title: data.question.slice(0, 48),
            createdAt: data.createdAt,
            messages: [
              { role: 'user', content: data.question },
              { role: 'assistant', content: data.answer },
            ],
          }
          return [finished, ...withoutOld]
        })
        setActiveId(data.id)
      } catch {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, messages: [...t.messages.slice(0, -1), { role: 'assistant', content: '❌ Erro ao gerar resposta.' }] }
              : t
          )
        )
      }
    }
  }, [active?.id])

  // captura ?prompt= da URL e envia automaticamente 1x
  useEffect(() => {
    const p = typeof router.query.prompt === 'string' ? router.query.prompt.trim() : ''
    if (!bootSent.current && p) {
      bootSent.current = true
      const t = document.getElementById('prompt') as HTMLTextAreaElement | null
      if (t) {
        t.value = p
        t.focus()
      }
      void handleSend(p)

      // remove `prompt` da URL sem criar variável não utilizada
      const rest: Record<string, any> = { ...router.query }
      delete rest.prompt
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query, handleSend, router])

  // Novo chat
  const handleNew = useCallback(() => {
    const draftId = `draft-${Date.now()}`
    const draft: Thread = {
      id: draftId,
      title: 'Novo chat',
      createdAt: new Date().toISOString(),
      messages: [],
    }
    setThreads((prev) => [draft, ...prev])
    setActiveId(draftId)
    setDrawer(false)
  }, [])

  // Copiar resposta
  const copyAnswer = useCallback(async (content: string) => {
    try { await navigator.clipboard.writeText(content) } catch {}
  }, [])

  const chatTitle = active?.title || 'Dashboard'

  return (
    <>
      <Head>
        <title>{chatTitle} · Aimnesis</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="relative h-screen w-screen bg-app text-[15px] text-[color:var(--text)] flex">
        {/* Drawer + Sidebar */}
        <div
          className={`
            md:static md:translate-x-0 md:w-[300px]
            fixed z-30 left-0 top-0 h-[100dvh] w-[84vw] max-w-[360px]
            transition-transform ${drawer ? 'translate-x-0' : '-translate-x-full'}
            bg-app border-r border-base
          `}
        >
          <Sidebar
            items={sidebarItems}
            userEmail={userEmail}
            isVerified={isVerified}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); setDrawer(false) }}
            onNew={handleNew}
          />
        </div>
        {drawer && (
          <div
            onClick={() => setDrawer(false)}
            className="md:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
            aria-hidden
          />
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col">
          {/* Topbar minimal */}
          <Topbar title={chatTitle} onNew={handleNew} onOpenMenu={() => setDrawer(true)} />

          {/* Sub-header sticky (aparece quando há muitas mensagens) */}
          {active?.messages?.length ? (
            <div className="sticky top-12 z-[5] bg-app/80 backdrop-blur supports-[backdrop-filter]:bg-app/60 border-b border-base">
              <div className="max-w-3xl mx-auto px-4 py-2 text-xs text-muted truncate">{chatTitle}</div>
            </div>
          ) : null}

          {/* Área de rolagem */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {active && active.messages.length > 0 ? (
                <>
                  {active.messages.map((m, i) => {
                    const isUser = m.role === 'user'
                    return (
                      <article
                        key={`${m.role}-${i}`}
                        role="article"
                        data-role={isUser ? 'user' : 'assistant'}
                        className={`rounded-2xl px-5 py-4 border border-base leading-[1.75] shadow-[0_1px_0_rgba(0,0,0,0.02)] ${
                          isUser ? 'bg-panel text-[15px]' : 'bg-panel-2 text-[16px]'
                        }`}
                        aria-live={!isUser ? 'assertive' : undefined}
                      >
                        <header className="flex items-center justify-between mb-1">
                          <div className="text-xs text-muted">{isUser ? 'Você' : 'Aimnesis'}</div>
                          {!isUser && (
                            <button
                              onClick={() => copyAnswer(m.content)}
                              className="text-xs px-2 py-1 rounded-md border border-base hover:bg-panel transition"
                              aria-label="Copiar resposta"
                              title="Copiar resposta"
                              type="button"
                            >
                              Copiar
                            </button>
                          )}
                        </header>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </article>
                    )
                  })}
                  <div ref={endRef} />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold mb-2">Bem-vindo(a) ao Aimnesis</h1>
                  <p className="text-muted">
                    Faça sua pergunta médica de forma segura. Use linguagem clara, evite dados pessoais do paciente e
                    revise as fontes.
                  </p>

                  <section aria-label="Sugestões" className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {QUICK_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => {
                          const t = document.getElementById('prompt') as HTMLTextAreaElement | null
                          if (t) { t.value = sug; t.focus() }
                        }}
                        className="rounded-xl border border-base bg-panel hover:bg-panel-2 p-4 text-left text-sm transition"
                        type="button"
                      >
                        {sug}
                      </button>
                    ))}
                  </section>
                </>
              )}
            </div>
          </div>

          {/* Botão flutuante para voltar ao fim */}
          {!atBottom && (
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
              className="absolute right-6 bottom-[112px] rounded-full border border-base bg-panel px-3 py-2 text-sm shadow-soft hover:bg-panel-2"
              aria-label="Ir para a última mensagem"
              title="Ir para a última mensagem"
              type="button"
            >
              ↓
            </button>
          )}

          {/* Composer fixo */}
          <Composer onSend={handleSend} onSendWithFiles={handleSendWithFiles} />
        </main>
      </div>
    </>
  )
}