// src/components/ui/CopilotRecorder.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mic,
  Square,
  Pause,
  Play,
  Trash2,
  Loader2,
  Waves,
  AlertTriangle,
  CheckCircle2,
  Upload,
} from 'lucide-react'
import RecorderControl from '@/components/copilot/RecorderControl'
import PremiumGate from '@/components/PremiumGate'

type ModeKey =
  | 'general'
  | 'studies'
  | 'plantao'
  | 'consultorio'
  | 'specialties'
  | 'analysis'

type Props = {
  /** Modo atual (controla UX e rota de longo prazo) */
  mode: ModeKey
  /** Texto opcional para prefixar a transcrição enviada ao Copiloto */
  seedPrompt?: string
  /** Se true, o componente exibe um gate PRO e não permite gravar */
  disabled?: boolean
}

/** Emissor seguro de CustomEvent (para pré-preencher o Copiloto) */
function emit(name: string, detail?: any) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch {
    /* noop */
  }
}

/**
 * Gravador curto (captura 1 blob e envia para /api/pro/transcribe).
 * Ideal para General/Studies/Plantão/Specialties/Analysis.
 */
function ShortRecorder({
  seedPrompt,
  disabled,
  maxSeconds = 180,
}: {
  seedPrompt?: string
  disabled?: boolean
  maxSeconds?: number
}) {
  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [warnBg, setWarnBg] = useState(false)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const tRef = useRef<number | null>(null)

  const timeLabel = useMemo(() => {
    const s = Math.max(0, seconds | 0)
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `00:${m}:${ss}`
  }, [seconds])

  // alerta quando a aba sai de foco
  useEffect(() => {
    const onVis = () => setWarnBg(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  function startTimer() {
    if (tRef.current) return
    tRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        const nxt = prev + 1
        if (nxt >= maxSeconds) stop()
        return nxt
      })
    }, 1000) as unknown as number
  }
  function stopTimer() {
    if (tRef.current) {
      clearInterval(tRef.current)
      tRef.current = null
    }
  }

  async function start() {
    setError(null)
    setDone(null)
    if (disabled || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
          (window as any).MediaRecorder?.isTypeSupported?.(t)
        ) || ''
      const mr = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, audioBitsPerSecond: 128000 } : undefined
      )
      chunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunksRef.current.push(ev.data)
      }
      mr.onstop = async () => {
        stopTimer()
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop())
        } catch {}
        streamRef.current = null
        setRecording(false)
        setPaused(false)
        setBusy(true)
        try {
          const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
          const form = new FormData()
          form.append('file', blob, 'recording.webm')
          const r = await fetch('/api/pro/transcribe', { method: 'POST', body: form })
          const j = await r.json().catch(() => ({}))
          const text = (j?.text || '').toString()
          if (!text) throw new Error(j?.error || 'Falha na transcrição')
          const payload = seedPrompt ? `${seedPrompt}\n\n${text}` : text
          // pré-preenche o Copiloto (sem enviar automaticamente)
          emit('preset-prompt', { text: payload, focus: true, send: false })
          setDone('Transcrição pronta. Enviada ao Copiloto.')
        } catch (e: any) {
          setError(e?.message || 'Erro na transcrição.')
        } finally {
          setBusy(false)
        }
      }
      recRef.current = mr
      mr.start()
      setRecording(true)
      setPaused(false)
      setSeconds(0)
      startTimer()
    } catch {
      setError('Permissão de microfone negada ou navegador não suportado.')
    }
  }

  function pause() {
    try {
      recRef.current?.pause()
    } catch {}
    setPaused(true)
    stopTimer()
  }
  function resume() {
    try {
      recRef.current?.resume()
    } catch {}
    setPaused(false)
    startTimer()
  }
  function stop() {
    try {
      recRef.current?.stop()
    } catch {}
  }
  function cancel() {
    try {
      recRef.current?.stop()
    } catch {}
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {}
    streamRef.current = null
    setRecording(false)
    setPaused(false)
    stopTimer()
    setBusy(false)
    setError(null)
    setDone(null)
    chunksRef.current = []
  }

  useEffect(
    () => () => {
      try {
        recRef.current?.stop()
      } catch {}
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
      stopTimer()
    },
    []
  )

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 space-y-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5" />
          <h3 className="text-base font-semibold">Gravação rápida</h3>
        </div>
        <div className="text-[12px] text-muted">
          {timeLabel} (máx {Math.floor(maxSeconds / 60)} min)
        </div>
      </header>

      {warnBg && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 px-3 py-2 text-[12.5px] inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          A aba está em segundo plano; a qualidade pode variar.
        </div>
      )}
      {error && (
        <div role="alert" className="text-[12px] text-red-500">
          {error}
        </div>
      )}
      {done && !busy && (
        <div className="flex items-center gap-2 text-[12.5px] text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>{done}</span>
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
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Finalizar
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

      {/* Upload manual (um arquivo pronto) */}
      {!recording && (
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0]
              if (!f) return
              setBusy(true)
              setError(null)
              setDone(null)
              try {
                const form = new FormData()
                form.append('file', f, f.name)
                const r = await fetch('/api/pro/transcribe', {
                  method: 'POST',
                  body: form,
                })
                const j = await r.json().catch(() => ({}))
                const text = (j?.text || '').toString()
                if (!text) throw new Error(j?.error || 'Falha na transcrição')
                const payload = seedPrompt ? `${seedPrompt}\n\n${text}` : text
                emit('preset-prompt', { text: payload, focus: true, send: false })
                setDone('Transcrição pronta. Enviada ao Copiloto.')
              } catch (err: any) {
                setError(err?.message || 'Erro na transcrição.')
              } finally {
                setBusy(false)
                // limpa input para permitir re-upload do mesmo arquivo
                e.currentTarget.value = ''
              }
            }}
          />
          <span className="rounded-lg border border-base px-3 py-2 hover:bg-panel-2 inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Enviar arquivo de áudio
          </span>
        </label>
      )}
    </section>
  )
}

/**
 * Componente principal:
 * - Se `disabled` => mostra PremiumGate (upsell gentil).
 * - Consultório => usa RecorderControl (sessão longa ~60min).
 * - Demais modos => ShortRecorder (1 blob).
 */
export default function CopilotRecorder({ mode, seedPrompt, disabled }: Props) {
  if (disabled) {
    return <PremiumGate enabled={false} modeLabel={labelFor(mode)} />
  }

  if (mode === 'consultorio') {
    return (
      <RecorderControl
        seedPrompt={seedPrompt}
        disabled={false}
        maxSeconds={60 * 60}
      />
    )
  }

  let hint: string | undefined
  switch (mode) {
    case 'plantao':
      hint = 'Gravação (Plantão): descreva o caso agudo, sinais vitais e conduta inicial.'
      break
    case 'analysis':
      hint = 'Transcrição para análise completa (S/O/A/P).'
      break
    case 'specialties':
      hint = 'Transcrição para discussão com a especialidade selecionada.'
      break
    case 'studies':
      hint = 'Transcrição de dúvidas para busca de evidências.'
      break
    default:
      hint = undefined
  }

  return <ShortRecorder seedPrompt={seedPrompt || hint} disabled={false} />
}

function labelFor(mode: ModeKey): string {
  switch (mode) {
    case 'plantao':
      return 'Plantão'
    case 'consultorio':
      return 'Consultório'
    case 'specialties':
      return 'Especialidades'
    case 'analysis':
      return 'Análise/Prescrição'
    case 'studies':
      return 'Studies'
    default:
      return 'Geral'
  }
}