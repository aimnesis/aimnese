'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Square, Pause, Play, Trash2, Loader2, CheckCircle2, Waves, AlertTriangle } from 'lucide-react'

/** Emissor seguro de CustomEvent */
function emit(name: string, detail?: any) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })) } catch {}
}

type Props = {
  /** Texto opcional para compor com a transcrição ao enviar ao Copiloto */
  seedPrompt?: string
  /** Máximo em segundos (default 60 min) */
  maxSeconds?: number
  /** Bloqueia uso se true (ex.: gating PRO) */
  disabled?: boolean
}

/**
 * Recorder longo com upload incremental (append) + finalize.
 * Integra com /api/pro/transcribe/long (append | partial | finalize)
 */
export default function RecorderControl({ seedPrompt, maxSeconds = 60 * 60, disabled }: Props) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [doneText, setDoneText] = useState<string | null>(null)
  const [warnBg, setWarnBg] = useState<boolean>(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  // sessão long
  const sessionIdRef = useRef<string | null>(null)
  const chunkIndexRef = useRef(0)
  const sendQueueRef = useRef<Promise<void>>(Promise.resolve())

  // visualizador
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  // aviso quando aba/tab perde foco
  useEffect(() => {
    const onVis = () => setWarnBg(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const timeLabel = useMemo(() => {
    const s = Math.max(0, seconds | 0)
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${ss}`
  }, [seconds])

  function startTimer() {
    if (timerRef.current) return
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        const nxt = prev + 1
        if (nxt >= maxSeconds) stop()
        return nxt
      })
    }, 1000) as unknown as number
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startVisualizer(stream: MediaStream) {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.85
      source.connect(analyser)
      analyserRef.current = analyser

      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = Math.floor(rect.width * dpr)
        canvas.height = Math.floor(36 * dpr)
      }
      resize()

      const data = new Uint8Array(analyser.frequencyBinCount)
      const draw = () => {
        const ctx2d = canvas.getContext('2d')
        if (!ctx2d || !analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(data)
        ctx2d.clearRect(0, 0, canvas.width, canvas.height)
        ctx2d.lineWidth = 2 * dpr
        ctx2d.strokeStyle =
          getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() ||
          getComputedStyle(document.documentElement).getPropertyValue('--text').trim() ||
          '#111'
        ctx2d.beginPath()
        const slice = canvas.width / data.length
        for (let i = 0; i < data.length; i++) {
          const x = i * slice
          const v = data[i] / 128.0
          const y = (v * canvas.height) / 2
          if (i === 0) ctx2d.moveTo(x, y)
          else ctx2d.lineTo(x, y)
        }
        ctx2d.stroke()
        rafRef.current = requestAnimationFrame(draw)
      }
      rafRef.current = requestAnimationFrame(draw)
      const ro = new ResizeObserver(() => resize())
      ro.observe(canvas)
      roRef.current = ro
    } catch { /* noop */ }
  }
  function stopVisualizer() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try { roRef.current?.disconnect?.() } catch {}
    roRef.current = null
    try { sourceRef.current?.disconnect() } catch {}
    try { analyserRef.current?.disconnect() } catch {}
    try {
      const ctx = audioCtxRef.current
      audioCtxRef.current = null
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => { /* noop */ })
      }
    } catch {}
  }

  function newSessionId(): string {
    const id = (globalThis.crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    sessionIdRef.current = id
    chunkIndexRef.current = 0
    sendQueueRef.current = Promise.resolve()
    return id
  }

  function queueSendChunk(blob: Blob, mime: string) {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    const idx = ++chunkIndexRef.current
    const name = `part-${String(idx).padStart(4, '0')}.${mime.includes('webm') ? 'webm' : 'm4a'}`

    // enfileira envios para evitar corrida
    sendQueueRef.current = sendQueueRef.current.then(async () => {
      const form = new FormData()
      form.append('file', blob, name)
      try {
        await fetch(`/api/pro/transcribe/long?action=append&sessionId=${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          body: form,
        })
      } catch {
        // segue gravando; erro será percebido na finalize
      }
    }).catch(() => {})
  }

  async function finalizeSession() {
    const sessionId = sessionIdRef.current
    if (!sessionId) return { final: '', encounterId: null as string | null }
    // aguarda fila zerar
    try { await sendQueueRef.current } catch {}
    setBusy(true)
    try {
      const r = await fetch(`/api/pro/transcribe/long?action=finalize&sessionId=${encodeURIComponent(sessionId)}`, { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      const final: string = j?.final || ''
      const encounterId: string | null = j?.encounterId || null
      return { final, encounterId }
    } finally {
      setBusy(false)
      sessionIdRef.current = null
    }
  }

  async function start() {
    setError(null)
    setDoneText(null)
    if (disabled || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const picked = mimeCandidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || ''
      const mr = new MediaRecorder(stream, picked ? { mimeType: picked, audioBitsPerSecond: 128000 } : undefined)
      mediaRecorderRef.current = mr
      newSessionId()

      // envia CHUNKS automaticamente a cada ~10s
      mr.ondataavailable = (ev) => {
        if (!ev.data || !ev.data.size) return
        if (recording && !paused && sessionIdRef.current) {
          queueSendChunk(ev.data, picked || 'audio/webm')
        }
      }

      mr.onstop = async () => {
        try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
        mediaStreamRef.current = null
        stopVisualizer()
        stopTimer()
        setRecording(false)
        setPaused(false)

        // Finaliza com o backend (monta transcrição)
        try {
          const { final, encounterId } = await finalizeSession()
          if (final) {
            setDoneText(final)
            const text = seedPrompt ? `${seedPrompt}\n\n${final}` : final
            // pré-preenche Copiloto
            emit('preset-prompt', { text, focus: true, send: false })
          }
          if (encounterId) emit('encounter:set', { encounterId })
        } catch (e: any) {
          setError(e?.message || 'Erro ao finalizar transcrição.')
        }
      }

      startVisualizer(stream)
      mr.start(10_000) // timeslice 10s
      setRecording(true)
      setPaused(false)
      setSeconds(0)
      startTimer()
    } catch {
      setError('Permissão de microfone negada ou navegador não suportado.')
    }
  }

  function pause() {
    if (!recording || paused) return
    try { mediaRecorderRef.current?.pause() } catch {}
    setPaused(true)
    stopTimer()
  }
  function resume() {
    if (!recording || !paused) return
    try { mediaRecorderRef.current?.resume() } catch {}
    setPaused(false)
    startTimer()
  }
  function stop() {
    try { mediaRecorderRef.current?.stop() } catch {}
  }
  function cancel() {
    // aborta sessão sem finalizar no backend
    sessionIdRef.current = null
    try { mediaRecorderRef.current?.stop() } catch {}
    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    mediaStreamRef.current = null
    setRecording(false)
    setPaused(false)
    stopVisualizer()
    stopTimer()
    setSeconds(0)
    setBusy(false)
    setError(null)
    setDoneText(null)
  }

  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
      stopVisualizer()
      stopTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5" />
          <h3 className="text-base font-semibold">Gravação da consulta</h3>
        </div>
        <div className="text-[12px] text-muted">{timeLabel} {maxSeconds >= 3600 ? '(máx 60 min)' : ''}</div>
      </header>

      {warnBg && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3 py-2 text-[12.5px] inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          A aba está em segundo plano; a qualidade pode variar. (PWA desktop recomendado)
        </div>
      )}

      <div className="rounded-xl border border-base bg-panel-2 p-3 relative">
        <canvas ref={canvasRef} className="h-10 w-full" />
      </div>

      {error && <div role="alert" className="text-[12px] text-red-500">{error}</div>}
      {doneText && !busy && (
        <div className="flex items-center gap-2 text-[12.5px] text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Transcrição pronta. Enviada ao Copiloto.</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!recording && (
          <button
            type="button"
            onClick={start}
            disabled={disabled || busy}
            className="rounded-lg border border-base bg-panel px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" /> Iniciar
          </button>
        )}

        {recording && !paused && (
          <button
            type="button"
            onClick={pause}
            className="rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
          >
            <Pause className="w-4 h-4" /> Pausar
          </button>
        )}

        {recording && paused && (
          <button
            type="button"
            onClick={resume}
            className="rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Retomar
          </button>
        )}

        {recording && (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
            title="Finalizar e transcrever"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Finalizar
          </button>
        )}

        <button
          type="button"
          onClick={cancel}
          className="ml-auto rounded-lg border border-base px-3 py-2 text-sm hover:bg-panel-2 transition inline-flex items-center gap-2"
          title="Descartar"
        >
          <Trash2 className="w-4 h-4" /> Descartar
        </button>
      </div>
    </section>
  )
}