// src/pages/dashboard.tsx
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { authOptions } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { hasPro } from '@/server/paywall'

import Composer from '@/components/chat/Composer'
import { Sidebar, type SidebarItem } from '@/components/chat/Sidebar'
import Topbar from '@/components/ui/Topbar'
import ModeHeader from '@/components/ui/ModeHeader'
import AnswerView from '@/components/ui/AnswerView'
import { SUGGESTIONS, type ModeKey } from '@/data/mode-suggestions'
import { analytics } from '@/lib/analytics'
import FirstFrameGeneral from '@/components/ui/FirstFrameGeneral'
import FirstFrameStudies from '@/components/ui/FirstFrameStudies'
import FirstFramePlantao from '@/components/ui/FirstFramePlantao'
import FirstFrameConsultorio from '@/components/ui/FirstFrameConsultorio'
import FirstFrameSpecialties from '@/components/ui/FirstFrameSpecialties'
import FirstFrameAnalysis from '@/components/ui/FirstFrameAnalysis'

// -- legacy mode normalizer (maps old names to the new unified modes)
type StrictModeKey = ModeKey
function normalizeMode(raw?: string | null): StrictModeKey | null {
  if (!raw) return null
  const v = String(raw).trim().toLowerCase()
  if (v === 'copilot' || v === 'rx') return 'analysis'
  if (['general','studies','plantao','consultorio','specialties','analysis'].includes(v)) {
    return v as StrictModeKey
  }
  return null
}

// Drawers (Copiloto & Rx)
import ReportPanel, { type ReportSection, type ReportSectionKey } from '@/components/ui/ReportPanel'
import RxSummary from '@/components/rx/RxSummary'
import type { RxItem, PatientCtx } from '@/components/ui/RxTypes'
import { openClinicalReport } from '@/lib/pdf-client'

const isPremiumMode = (m: ModeKey) =>
  m === 'plantao' || m === 'consultorio' || m === 'specialties' || m === 'analysis'

async function openProCheckout() {
  try {
    analytics.track('checkout_opened', { interval: 'monthly', source: 'dashboard' })
    const r = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interval: 'monthly' }),
    })
    if (r.status === 401) { window.location.href = '/auth/signin'; return }
    const j = await r.json().catch(() => null)
    if (j?.url) window.location.href = j.url
    else window.location.href = '/pricing'
  } catch {
    window.location.href = '/pricing'
  }
}

function getModeIntro(mode: ModeKey): string {
  switch (mode) {
    case 'general':
      return 'Saúde Geral • Pergunte com contexto: idade, queixa, duração e achados relevantes.';
    case 'studies':
      return 'Estudos & Diretrizes • Busque e sintetize evidências (NEJM/JAMA + diretrizes brasileiras) com links.';
    case 'plantao':
      return 'Plantão • Emergências com condutas imediatas, red flags e doses prontas.';
    case 'consultorio':
      return 'Consultório • Grave sua consulta (até 60 min). Anamnese + sumário + plano em tempo real.';
    case 'specialties':
      return 'Especialidades • Prompts e diretrizes específicos por área. Contexto brasileiro.';
    case 'analysis':
      return 'Análise + Prescrição Completa • Anamnese → hipóteses → diagnóstico/diferenciais → elucidações → condutas (medicamentosas e não).';
  }
}

function placeholderFor(mode: ModeKey): string {
  switch (mode) {
    case 'general': return 'Ex.: dor torácica aguda — avaliação inicial';
    case 'studies': return 'Ex.: GLP-1 em obesidade — evidências principais';
    case 'plantao': return 'Ex.: AVC isquêmico — janela para trombólise';
    case 'consultorio': return 'Ex.: iniciar gravação da consulta (até 60 min)';
    case 'specialties': return 'Ex.: cardio — SCA sem supra: primeiros passos';
    case 'analysis': return 'Ex.: DM2 com DRC 3 — plano completo e prescrição';
  }
}

function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('SSR_TIMEOUT')), ms)
    p.then((v) => { clearTimeout(t); resolve(v) })
     .catch((e) => { clearTimeout(t); reject(e) })
  })
}

/* ================================
   SSR types
================================== */
type QueryItem = { id: string; question: string; answer: string | null; createdAt: string }
type Props = {
  userEmail: string
  userName: string | null
  isVerified: boolean
  isPro: boolean
  queries: QueryItem[]
}

/* ================================
   Streaming util
================================== */
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
  if (metaHeader) { try { meta = JSON.parse(metaHeader) } catch {} }
  return { meta, full: acc }
}

/* ================================
   SSR: session + recent history + paywall
================================== */
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as Session | null
  const email = session?.user?.email || null
  if (!email) return { redirect: { destination: '/auth/signin', permanent: false } }

  let userEmail = email
  let userName: string | null = null
  let isVerified = false
  let queries: QueryItem[] = []
  let isPro = false

  try {
    const user = await withTimeout(
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          queries: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true, question: true, answer: true, createdAt: true },
          },
        },
      }),
      6000
    )
    if (user) {
      userEmail = user.email ?? email
      userName = user.name ?? null
      isVerified = !!user.isVerified
      queries = (user.queries ?? []).map((q) => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        createdAt: q.createdAt.toISOString(),
      }))
      try { isPro = await hasPro(user.id) } catch {}
    }
  } catch (err) {
    console.warn('[dashboard:ssr] prisma fail/timeout:', (err as Error)?.message)
  }

  return { props: { userEmail, userName, isVerified, isPro, queries } }
}

/* ================================
   Chat types
================================== */
type MsgRole = 'user' | 'assistant'
type Msg = { role: MsgRole; content: string }

/** Cada thread carrega seu `mode` para manter contexto quando alternar guias. */
type Thread = {
  id: string
  title: string
  createdAt: string
  mode: ModeKey
  messages: Msg[]
}

/* ================================
   Component
================================== */
export default function Dashboard({ userEmail, isVerified, isPro, queries }: Props) {
  const router = useRouter()
  const bootSent = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // modo atual da UI + intro
  const [mode, setMode] = useState<ModeKey | null>(null)
  const [intro, setIntro] = useState<string>('')
  const currentMode: ModeKey = mode || 'general'

  useEffect(() => () => { try { abortRef.current?.abort() } catch {} }, [])

  // threads do SSR (assumimos 'general' para histórico legado)
  const initialThreads: Thread[] = useMemo(() => {
    return queries.map((q) => {
      const msgs: Msg[] = [{ role: 'user', content: q.question }]
      if (q.answer) msgs.push({ role: 'assistant', content: q.answer })
      return {
        id: q.id,
        title: q.question.slice(0, 48) || 'Pergunta',
        createdAt: q.createdAt,
        mode: 'general',
        messages: msgs,
      }
    })
  }, [queries])

  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [activeId, setActiveId] = useState<string | null>(threads[0]?.id ?? null)
  const active = threads.find((t) => t.id === activeId) ?? null

  const activeIdRef = useRef<string | null>(activeId)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  // sidebar drawer (mobile)
  const [drawer, setDrawer] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const sidebarItems: SidebarItem[] = useMemo(
    () => threads.map((t) => ({ id: t.id, title: t.title, createdAt: t.createdAt })),
    [threads]
  )

  // scroll + streaming
  const endRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [inflight, setInFlight] = useState(false)
  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    endRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'end' })
  }, [active?.messages?.length])
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

  /* ========== Copiloto: drawer/estado do Report ========== */
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSections, setReportSections] = useState<ReportSection[]>([])
  const patientHeader = '' // futuro: vir do Encounter

  const handleReportToggle = (key: ReportSectionKey, next: boolean) => {
    setReportSections((prev) => prev.map((s) => (s.key === key ? { ...s, selected: next } : s)))
  }
  const handleReportToggleAll = (next: boolean) => {
    setReportSections((prev) => prev.map((s) => ({ ...s, selected: next })))
  }

  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const section = detail.section as ReportSection | undefined
      if (!section) return
      setReportSections((prev) => {
        const exists = prev.some(
          (s) => s.key === section.key && s.title === section.title && s.content === section.content
        )
        return exists ? prev : [...prev, section]
      })
    }
    const onOpen = () => setReportOpen(true)
    window.addEventListener('report:add', onAdd as EventListener)
    window.addEventListener('report:open', onOpen as EventListener)
    return () => {
      window.removeEventListener('report:add', onAdd as EventListener)
      window.removeEventListener('report:open', onOpen as EventListener)
    }
  }, [])

  // ========== Encounter ID (para PDF/Share) ==========
  const [encounterId, setEncounterId] = useState<string | null>(null)
  useEffect(() => {
    const onSet = (e: Event) => {
      const id = (e as CustomEvent).detail?.encounterId as string | undefined
      setEncounterId(id ?? null)
    }
    window.addEventListener('encounter:set', onSet as EventListener)
    return () => window.removeEventListener('encounter:set', onSet as EventListener)
  }, [])

  /* ========== Rx: drawer/estado da Prescrição ========== */
  const [rxOpen, setRxOpen] = useState(false)
  const [rxItems, setRxItems] = useState<RxItem[]>([])
  const [patientMeta] = useState<PatientCtx>({})

  useEffect(() => {
    const onOpenRx = () => setRxOpen(true)
    window.addEventListener('rx:open', onOpenRx as EventListener)
    return () => window.removeEventListener('rx:open', onOpenRx as EventListener)
  }, [])
  useEffect(() => {
    const onAdd = (e: Event) => {
      const item = (e as CustomEvent).detail?.item as RxItem | undefined
      if (!item) return
      setRxItems(prev => [...prev, item])
      setRxOpen(true)
    }
    window.addEventListener('rx:add', onAdd as EventListener)
    return () => window.removeEventListener('rx:add', onAdd as EventListener)
  }, [])

  /* ========== Envio (texto / com arquivos) ========== */
  const ensureActiveOrCreate = useCallback((textTitle: string) => {
    let id = activeIdRef.current
    if (!id) {
      const draftId = `draft-${Date.now()}`
      setThreads((prev) => [
        {
          id: draftId,
          title: 'Novo chat',
        createdAt: new Date().toISOString(),
          mode: currentMode,
          messages: [],
        },
        ...prev,
      ])
      setActiveId(draftId)
      id = draftId
    } else {
      // Atualiza o mode do thread ativo caso ele seja rascunho
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id && t.title === 'Novo chat' ? { ...t, mode: currentMode, title: textTitle.slice(0, 48) } : t
        )
      )
    }
    return id
  }, [currentMode])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return
    if (!isPro && isPremiumMode(currentMode)) { analytics.track('upsell_attempt', { mode: currentMode }); await openProCheckout(); return }
    analytics.track('ask', { mode: currentMode, hasFiles: false, pro: isPro })

    const id = ensureActiveOrCreate(text)

    // push user + placeholder assistant
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              mode: t.mode || currentMode,
              title: t.title === 'Novo chat' ? text.slice(0, 48) : t.title,
              messages: [...t.messages, { role: 'user', content: text }, { role: 'assistant', content: '' }],
            }
          : t
      )
    )

    const updateAssistant = (content: string) => {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, messages: t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content } : m)) } : t
        )
      )
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current
    setInFlight(true)

    try {
      const { meta, full } = await streamAnswer(
        '/api/ask?stream=1',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, mode: currentMode }) },
        updateAssistant,
        signal,
      )
      if (meta) {
        const m = meta
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === id)
          if (idx === -1) return prev
          const curr = prev[idx]
          const newId = curr.id.startsWith('draft-') ? m.id : curr.id
          const updated: Thread = {
            ...curr,
            id: newId,
            title: curr.title === 'Novo chat' ? m.question.slice(0, 48) : curr.title,
            createdAt: m.createdAt,
            mode: curr.mode || currentMode,
            messages: curr.messages.map((msg, i) => (i === curr.messages.length - 1 ? { ...msg, content: full } : msg)),
          }
          const rest = prev.filter((_, i) => i !== idx)
          return [updated, ...rest]
        })
        if (String(id).startsWith('draft-')) setActiveId(m.id)
      }
      setInFlight(false)
    } catch {
      if ((abortRef.current?.signal as any)?.aborted) { setInFlight(false); return }
      try {
        const resp = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text, mode: currentMode }), signal })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as { id: string; answer: string; question: string; createdAt: string }
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === id)
          if (idx === -1) return prev
          const curr = prev[idx]
          const newId = curr.id.startsWith('draft-') ? data.id : curr.id
          const updated: Thread = {
            ...curr,
            id: newId,
            title: curr.title === 'Novo chat' ? data.question.slice(0, 48) : curr.title,
            createdAt: data.createdAt,
            mode: curr.mode || currentMode,
            messages: curr.messages.map((msg, i) => (i === curr.messages.length - 1 ? { ...msg, content: data.answer } : msg)),
          }
          const rest = prev.filter((_, i) => i !== idx)
          return [updated, ...rest]
        })
        if (String(id).startsWith('draft-')) setActiveId(data.id)
        setInFlight(false)
      } catch {
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, messages: [...t.messages.slice(0, -1), { role: 'assistant', content: '❌ Erro ao gerar resposta.' }] } : t))
        )
        setInFlight(false)
      }
    }
  }, [currentMode, isPro, ensureActiveOrCreate])

  const handleSendWithFiles = useCallback(async ({ text, files }: { text: string; files: File[] }) => {
    if (!text.trim()) return
    if (!isPro && isPremiumMode(currentMode)) { analytics.track('upsell_attempt', { mode: currentMode, hasFiles: true }); await openProCheckout(); return }
    analytics.track('ask', { mode: currentMode, hasFiles: true, pro: isPro })

    const id = ensureActiveOrCreate(text)

    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              mode: t.mode || currentMode,
              title: t.title === 'Novo chat' ? text.slice(0, 48) : t.title,
              messages: [...t.messages, { role: 'user', content: text }, { role: 'assistant', content: '' }],
            }
          : t
      )
    )

    const updateAssistant = (content: string) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, messages: t.messages.map((m, i) => (i === t.messages.length - 1 ? { ...m, content } : m)) } : t))
      )
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const { signal } = abortRef.current
    setInFlight(true)

    try {
      const form = new FormData()
      form.append('prompt', text)
      form.append('mode', currentMode)
      files.forEach((f) => form.append('files', f))
      const { meta, full } = await streamAnswer('/api/ask?stream=1', { method: 'POST', body: form }, updateAssistant, signal)
      if (meta) {
        const m = meta
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === id)
          if (idx === -1) return prev
          const curr = prev[idx]
          const newId = curr.id.startsWith('draft-') ? m.id : curr.id
          const updated: Thread = {
            ...curr,
            id: newId,
            title: curr.title === 'Novo chat' ? m.question.slice(0, 48) : curr.title,
            createdAt: m.createdAt,
            mode: curr.mode || currentMode,
            messages: curr.messages.map((msg, i) => (i === curr.messages.length - 1 ? { ...msg, content: full } : msg)),
          }
          const rest = prev.filter((_, i) => i !== idx)
          return [updated, ...rest]
        })
        if (String(id).startsWith('draft-')) setActiveId(m.id)
      }
      setInFlight(false)
    } catch {
      if ((abortRef.current?.signal as any)?.aborted) { setInFlight(false); return }
      try {
        const form = new FormData()
        form.append('prompt', text)
        form.append('mode', currentMode)
        files.forEach((f) => form.append('files', f))
        const resp = await fetch('/api/ask', { method: 'POST', body: form, signal })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = (await resp.json()) as { id: string; answer: string; question: string; createdAt: string }
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === id)
          if (idx === -1) return prev
          const curr = prev[idx]
          const newId = curr.id.startsWith('draft-') ? data.id : curr.id
          const updated: Thread = {
            ...curr,
            id: newId,
            title: curr.title === 'Novo chat' ? data.question.slice(0, 48) : curr.title,
            createdAt: data.createdAt,
            mode: curr.mode || currentMode,
            messages: curr.messages.map((msg, i) => (i === curr.messages.length - 1 ? { ...msg, content: data.answer } : msg)),
          }
          const rest = prev.filter((_, i) => i !== idx)
          return [updated, ...rest]
        })
        if (String(id).startsWith('draft-')) setActiveId(data.id)
        setInFlight(false)
      } catch {
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, messages: [...t.messages.slice(0, -1), { role: 'assistant', content: '❌ Erro ao gerar resposta.' }] } : t))
        )
        setInFlight(false)
      }
    }
  }, [currentMode, isPro, ensureActiveOrCreate])

  /* ================================
     Atalhos / eventos / deep-links
  ================================= */
  useEffect(() => {
    const focusComposer = () => (document.getElementById('prompt') as HTMLTextAreaElement | null)?.focus()
    const presetPrompt = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      const txt = String(d.text || '')
      const focus = !!d.focus
      const send = !!d.send
      const t = document.getElementById('prompt') as HTMLTextAreaElement | null
      if (t) { t.value = txt; if (focus) t.focus() }
      if (send && txt) void handleSend(txt)
    }
    const onModeIntro = (e: Event) => {
      const raw = (e as CustomEvent).detail?.mode as string | undefined
      const m = normalizeMode(raw)
      if (!m) return
      setMode(m); setIntro(getModeIntro(m))
      analytics.track('mode_open', { mode: m, source: 'event' })
    }
    window.addEventListener('focus-composer', focusComposer as EventListener)
    window.addEventListener('preset-prompt', presetPrompt as EventListener)
    window.addEventListener('mode-intro', onModeIntro as EventListener)
    return () => {
      window.removeEventListener('focus-composer', focusComposer as EventListener)
      window.removeEventListener('preset-prompt', presetPrompt as EventListener)
      window.removeEventListener('mode-intro', onModeIntro as EventListener)
    }
  }, [handleSend])

  // deep-link ?prompt
  useEffect(() => {
    const p = typeof router.query.prompt === 'string' ? router.query.prompt.trim() : ''
    if (!bootSent.current && p) {
      bootSent.current = true
      const t = document.getElementById('prompt') as HTMLTextAreaElement | null
      if (t) { t.value = p; t.focus() }
      void handleSend(p)
      const rest: Record<string, any> = { ...router.query }; delete rest.prompt
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true })
    }
  }, [router.query, handleSend, router])

  // deep-link ?mode
  useEffect(() => {
    const m = normalizeMode(typeof router.query.mode === 'string' ? router.query.mode : '')
    if (m && m !== mode) {
      setMode(m)
      const text = getModeIntro(m)
      setIntro(text)
      analytics.track('mode_open', { mode: m, source: 'deeplink' })
      const t = document.getElementById('prompt') as HTMLTextAreaElement | null
      if (t) { t.value = text; t.focus() }
    }
  }, [router.query.mode, mode])

  // ações simples
  const handleNew = useCallback(() => {
    analytics.track('chat_new', { mode: currentMode })
    const draftId = `draft-${Date.now()}`
    setThreads((prev) => [
      { id: draftId, title: 'Novo chat', createdAt: new Date().toISOString(), mode: currentMode, messages: [] },
      ...prev,
    ])
    setActiveId(draftId)
    setDrawer(false)
  }, [currentMode])

  const copyAnswer = useCallback(async (c: string) => { 
    try { 
      await navigator.clipboard.writeText(c) 
      analytics.track('copy_answer', { mode: currentMode })
    } catch {} 
  }, [currentMode])
  const stopStreaming = useCallback(() => { 
    try { 
      abortRef.current?.abort() 
      analytics.track('stop_stream', { mode: currentMode })
    } catch {} 
    setInFlight(false) 
  }, [currentMode])
  const regenerateLast = useCallback(() => {
    if (!active) return
    analytics.track('regenerate', { mode: currentMode })
    const lastUser = [...active.messages].reverse().find((m) => m.role === 'user')
    if (lastUser) void handleSend(lastUser.content)
  }, [active, handleSend, currentMode])

  // helpers UI
  const previewTitle = (t?: string, maxWords = 3) =>
    ((t || '').replace(/\s+/g, ' ').trim() || 'Novo chat').split(' ').slice(0, maxWords).join(' ')
  const chatTitle =
    active?.title ||
    (mode
      ? (
          {
            general: 'Saúde Geral',
            studies: 'Estudos & Diretrizes',
            plantao: 'Plantão',
            consultorio: 'Consultório',
            specialties: 'Especialidades',
            analysis: 'Análise + Prescrição',
          } as Record<ModeKey, string>
        )[mode] + ' · Dashboard'
      : 'Dashboard')
  const placeholder = placeholderFor(currentMode)

  /* ================================
     Render
  ================================= */
  return (
    <>
      <Head>
        <title>{`${chatTitle} · Aimnesis`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="relative h-screen w-screen bg-app text-[15px] flex">
        {/* Sidebar */}
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
        {drawer && <div onClick={() => setDrawer(false)} className="md:hidden fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]" aria-hidden />}

        {/* Main */}
        <main className="flex-1 flex flex-col">
          <Topbar title={previewTitle(chatTitle, 3)} onNew={handleNew} onOpenSidebar={() => setDrawer(true)} />

          {/* Scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
              {active && active.messages.length > 0 ? (
                <>
                  {active.messages.map((m, i) => {
                    const isUser = m.role === 'user'
                    return (
                      <article
                        key={`${m.role}-${i}`}
                        className={`rounded-2xl px-5 py-4 border border-base leading-[1.8] shadow-[0_1px_0_rgba(0,0,0,0.02)] ${isUser ? 'bg-panel' : 'bg-panel-2 text-[16px]'}`}
                        aria-live={!isUser ? 'assertive' : undefined}
                      >
                        <header className="flex items-center justify-between mb-1">
                          <div className="text-xs text-muted">{isUser ? 'Você' : 'Aimnesis'}</div>
                          {!isUser && (
                            <div className="flex items-center gap-2">
                              {i === (active?.messages.length ?? 0) - 1 && inflight && (
                                <button onClick={stopStreaming} className="text-xs px-2 py-1 rounded-md border border-base hover:bg-panel transition" title="Parar" type="button">Parar</button>
                              )}
                              {i === (active?.messages.length ?? 0) - 1 && !inflight && (
                                <button onClick={regenerateLast} className="text-xs px-2 py-1 rounded-md border border-base hover:bg-panel transition" title="Regenerar" type="button">Regenerar</button>
                              )}
                              <button onClick={() => copyAnswer(m.content)} className="text-xs px-2 py-1 rounded-md border border-base hover:bg-panel transition" title="Copiar" type="button">Copiar</button>
                            </div>
                          )}
                        </header>
                        {/* Por ora, render genérico — os componentes específicos por modo podem despachar eventos (ex.: CopilotAnswer → report:add). */}
                        {isUser ? <div className="whitespace-pre-wrap">{m.content}</div> : <AnswerView text={m.content || ''} />}
                      </article>
                    )
                  })}
                  <div ref={endRef} />
                </>
              ) : (
                <>
                  {intro && <ModeHeader mode={currentMode as any} intro={intro} isPro={isPro} />}
                  {(() => {
                    const common = {
                      suggestions: SUGGESTIONS[currentMode],
                      onSelectQuestion: (q: string) => {
                        const t = document.getElementById('prompt') as HTMLTextAreaElement | null
                        if (t) { t.value = q; t.focus() }
                        void handleSend(q)
                      },
                    };
                    const proProps = { proEnabled: isPro, onUpgrade: openProCheckout };
                    void proProps; // keep tree-shakers honest if props become conditional later
                    switch (currentMode) {
                      case 'general':
                        return <FirstFrameGeneral {...common} />;
                      case 'studies':
                        return <FirstFrameStudies {...common} />;
                      case 'plantao':
                        return <FirstFramePlantao {...common} {...proProps} />;
                      case 'consultorio':
                        return <FirstFrameConsultorio {...common} {...proProps} />;
                      case 'specialties':
                        return <FirstFrameSpecialties {...common} {...proProps} />;
                      case 'analysis':
                        return <FirstFrameAnalysis {...common} {...proProps} />;
                      default:
                        return <FirstFrameGeneral {...common} />;
                    }
                  })()}
                  <p className="text-[12px] text-muted text-center mt-2">
                    Aimnesis é um copiloto clínico com respostas referenciadas. Use como apoio; a decisão final é sempre do médico.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Botão "ir para o fim" */}
          {!atBottom && (
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
              className="absolute right-6 bottom-[112px] rounded-full border border-base bg-panel px-3 py-2 text-sm shadow-soft hover:bg-panel-2"
              title="Ir para o fim"
              type="button"
            >
              ↓
            </button>
          )}

          {/* Composer único com gating PRO */}
          <Composer
            onSend={handleSend}
            onSendWithFiles={handleSendWithFiles}
            placeholder={placeholder}
            premiumBlocked={!isPro && isPremiumMode(currentMode)}
            onUpgrade={openProCheckout}
          />
        </main>

        {/* Drawer: Relatório (Copiloto) */}
        <aside
          className={`fixed right-0 top-0 h-[100dvh] w-[90vw] max-w-[520px] bg-app border-l border-base shadow-xl transition-transform z-40
          ${reportOpen ? 'translate-x-0' : 'translate-x-full'}`}
          aria-hidden={!reportOpen}
        >
          <div className="h-full overflow-y-auto p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Relatório</h3>
              <button onClick={() => setReportOpen(false)} className="text-sm px-2 py-1 rounded-md border border-base hover:bg-panel">Fechar</button>
            </div>
            <ReportPanel
              sections={reportSections}
              patientHeader={patientHeader}
              onToggle={handleReportToggle}
              onToggleAll={handleReportToggleAll}
              onPushToRx={({ text }) => {
                setRxOpen(true)
                void text
              }}
              onExport={() => { if (encounterId) openClinicalReport(encounterId) }}
              onShare={async () => {
                if (!encounterId) return
                await fetch('/api/share/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    encounterId,
                    channels: [{ type: 'email' }],
                  }),
                })
              }}
            />
          </div>
        </aside>

        {/* Drawer: Prescrição (Rx) */}
        <aside
          className={`fixed right-0 top-0 h-[100dvh] w-[92vw] max-w-[720px] bg-app border-l border-base shadow-xl transition-transform z-40
          ${rxOpen ? 'translate-x-0' : 'translate-x-full'}`}
          aria-hidden={!rxOpen}
        >
          <div className="h-full overflow-y-auto p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Prescrição</h3>
              <button onClick={() => setRxOpen(false)} className="text-sm px-2 py-1 rounded-md border border-base hover:bg-panel">Fechar</button>
            </div>
            <RxSummary
              open={rxOpen}
              onClose={() => setRxOpen(false)}
              items={rxItems}
              patient={patientMeta}
              onShare={async () => {
                if (!encounterId) return
                await fetch('/api/share/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    encounterId,
                    channels: [{ type: 'whatsapp' }],
                  }),
                })
              }}
            />
          </div>
        </aside>
      </div>
    </>
  )
}