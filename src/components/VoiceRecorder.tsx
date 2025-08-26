// src/components/VoiceRecorder.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type OnText = (text: string) => void

interface VoiceRecorderProps {
  /** Texto parcial/final durante a gravação (ao vivo). */
  onTranscript?: OnText
  /** Alias compatível: será chamado igual ao onTranscript. */
  onTranscribed?: OnText
  /** Idioma para STT (padrão pt-BR). */
  lang?: string
  /** Mostra canvas com ondas. */
  showWave?: boolean
  /** Classe do botão (para combinar com sua UI). */
  className?: string
}

type SpeechRecognitionType = typeof window.SpeechRecognition
type SpeechRecognitionInstance = InstanceType<SpeechRecognitionType>

export default function VoiceRecorder({
  onTranscript,
  onTranscribed,
  lang = 'pt-BR',
  showWave = true,
  className,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [support, setSupport] = useState<{ speech: boolean; media: boolean }>({ speech: false, media: false })

  // SpeechRecognition
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalRef = useRef('') // acumulado final

  // MediaRecorder (fallback) + áudio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  // Waveform (AnalyserNode)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Timer
  const timerRef = useRef<number | null>(null)

  const emitText = (t: string) => {
    onTranscript?.(t)
    onTranscribed?.(t)
  }

  useEffect(() => {
    const speech =
      typeof window !== 'undefined' &&
      (Boolean((window as any).webkitSpeechRecognition) || Boolean((window as any).SpeechRecognition))
    const media = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    setSupport({ speech, media })
    return () => {
      cleanupAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─────────────────────────────────────────────────────
   * Iniciar gravação
   * ──────────────────────────────────────────────────── */
  async function start() {
    finalRef.current = ''
    setElapsed(0)

    // timer
    timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000)

    // ondas (se possível)
    if (showWave && support.media) {
      await setupWave()
    }

    if (support.speech) {
      startSpeechRecognition()
      setRecording(true)
      return
    }

    // fallback para MediaRecorder + /api/pro/transcribe
    if (support.media) {
      await startMediaRecorder()
      setRecording(true)
      return
    }

    // sem suporte
    alert('Seu navegador não suporta gravação/transcrição de voz.')
  }

  /* ─────────────────────────────────────────────────────
   * Parar gravação
   * ──────────────────────────────────────────────────── */
  function stop() {
    stopSpeechRecognition()
    stopMediaRecorder()
    teardownWave()
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRecording(false)
  }

  /* ─────────────────────────────────────────────────────
   * SpeechRecognition (ao vivo)
   * ──────────────────────────────────────────────────── */
  function startSpeechRecognition() {
    const SpeechRecognition: SpeechRecognitionType =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const rec: SpeechRecognitionInstance = new (SpeechRecognition as any)()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        const txt = res[0]?.transcript || ''
        if (res.isFinal) finalRef.current += txt + ' '
        else interim += txt
      }
      emitText((finalRef.current + interim).trim())
    }

    rec.onerror = () => {
      // se der erro, tenta cair para MediaRecorder
      stopSpeechRecognition()
      if (support.media) startMediaRecorder().then(() => setRecording(true))
    }
    rec.onend = () => {
      // quando o usuário parar manualmente, não reinicia
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // se não conseguir, fallback
      if (support.media) startMediaRecorder().then(() => setRecording(true))
    }
  }

  function stopSpeechRecognition() {
    try {
      recognitionRef.current?.stop()
    } catch {}
    recognitionRef.current = null
  }

  /* ─────────────────────────────────────────────────────
   * MediaRecorder (fallback) + transcrição servidor
   * ──────────────────────────────────────────────────── */
  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        // monta blob e manda para /api/pro/transcribe
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          if (blob.size > 0) {
            const form = new FormData()
            form.append('file', blob, `audio-${Date.now()}.webm`)
            const resp = await fetch('/api/pro/transcribe', { method: 'POST', body: form })
            const json = await resp.json()
            const txt = (json?.text || json?.transcript || '').trim()
            if (txt) emitText(txt)
          }
        } catch {
          // silencia
        } finally {
          chunksRef.current = []
        }
      }
      mediaRecorderRef.current = mr
      mr.start()
    } catch {
      alert('Falha ao acessar microfone.')
    }
  }

  function stopMediaRecorder() {
    try {
      mediaRecorderRef.current?.stop()
    } catch {}
    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {}
    mediaRecorderRef.current = null
    mediaStreamRef.current = null
  }

  /* ─────────────────────────────────────────────────────
   * Waveform (AnalyserNode + canvas)
   * ──────────────────────────────────────────────────── */
  async function setupWave() {
    try {
      const stream = mediaStreamRef.current ?? (await navigator.mediaDevices.getUserMedia({ audio: true }))
      if (!mediaStreamRef.current) mediaStreamRef.current = stream

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      const bufferLength = analyser.frequencyBinCount
      // Allocate with ArrayBuffer to align with the TS signature of getByteTimeDomainData (expects Uint8Array<ArrayBuffer>)
      const dataArray = new Uint8Array(new ArrayBuffer(bufferLength)) as unknown as Uint8Array<ArrayBuffer>

      source.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser
      dataArrayRef.current = dataArray

      // Ensure canvas is scaled for devicePixelRatio and resizes
      const canvas = canvasRef.current
      if (canvas) {
        const resize = () => {
          const dpr = Math.max(1, window.devicePixelRatio || 1)
          const rect = canvas.getBoundingClientRect()
          // keep visual height ~28px, but render crisp on high DPI
          const targetH = 28
          canvas.width = Math.max(1, Math.floor(rect.width * dpr))
          canvas.height = Math.max(1, Math.floor(targetH * dpr))
        }
        resize()
        const ro = new ResizeObserver(() => resize())
        ro.observe(canvas)
        ;(canvas as any).__ro = ro
      }

      drawWave()
    } catch {
      // sem ondas se falhar
    }
  }

  function drawWave() {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const data: Uint8Array<ArrayBuffer> | null = dataArrayRef.current
    if (!canvas || !analyser || !data) return

    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const render = () => {
      if (!analyserRef.current || !dataArrayRef.current) return
      const canvasEl = canvasRef.current
      if (!canvasEl) return
      const W = canvasEl.width
      const H = canvasEl.height

      // Read current data into the typed array
      analyser.getByteTimeDomainData(data)

      ctx2d.clearRect(0, 0, W, H)
      ctx2d.lineWidth = 2
      // Prefer CSS variable if available, fallback to a readable color
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#8ab4f8'
      ctx2d.strokeStyle = accent.trim() || '#8ab4f8'
      ctx2d.beginPath()

      const len = data.length
      const sliceWidth = (W * 1.0) / len
      let x = 0
      for (let i = 0; i < len; i++) {
        const v = data[i] / 128.0
        const y = (v * H) / 2
        if (i === 0) ctx2d.moveTo(x, y)
        else ctx2d.lineTo(x, y)
        x += sliceWidth
      }
      ctx2d.lineTo(W, H / 2)
      ctx2d.stroke()

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)
  }

  function teardownWave() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      audioCtxRef.current?.close()
    } catch {}
    audioCtxRef.current = null
    analyserRef.current = null
    dataArrayRef.current = null
    try {
      const canvas = canvasRef.current
      const ro = (canvas as any)?.__ro as ResizeObserver | undefined
      ro?.disconnect?.()
      if (canvas && (canvas as any).__ro) delete (canvas as any).__ro
    } catch {}
  }

  /* ─────────────────────────────────────────────────────
   * Cleanup total
   * ──────────────────────────────────────────────────── */
  function cleanupAll() {
    stopSpeechRecognition()
    stopMediaRecorder()
    teardownWave()
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => cleanupAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─────────────────────────────────────────────────────
   * UI
   * ──────────────────────────────────────────────────── */
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-pressed={recording}
        aria-label={recording ? 'Parar gravação' : 'Iniciar gravação'}
        title={recording ? 'Parar gravação' : 'Gravar áudio'}
        className={['rounded-md border border-base px-2 py-2 hover:bg-panel-2', className].join(' ')}
      >
        {recording ? `⏺︎ ${mm}:${ss}` : '🎤'}
      </button>

      {showWave && (
        <canvas
          ref={canvasRef}
          className="hidden sm:block w-[160px] h-[28px] rounded bg-panel border border-base"
          aria-hidden={!recording}
        />
      )}
    </div>
  )
}