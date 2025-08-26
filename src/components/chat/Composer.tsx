// src/components/chat/Composer.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Mic, Square, Send, X as XIcon, Paperclip } from 'lucide-react'

/** limites de upload */
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 6
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
])

function dedupeByName(list: File[]) {
  const map = new Map<string, File>()
  for (const f of list) if (!map.has(f.name)) map.set(f.name, f)
  return Array.from(map.values())
}

type Props = {
  onSend: (text: string) => void | Promise<void>
  onSendWithFiles?: (data: { text: string; files: File[] }) => void | Promise<void>
  placeholder?: string
  disabled?: boolean
  /** bloqueia envio (somente placeholder avisa que é PRO) */
  premiumBlocked?: boolean
  onUpgrade?: () => void
}

export default function Composer({
  onSend,
  onSendWithFiles,
  placeholder = 'Pergunte alguma coisa',
  disabled,
  premiumBlocked = false,
  onUpgrade,
}: Props) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  // texto/estado
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // anexos (opcionais, chips só aparecem se houver arquivo)
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // gravação + transcrição + visualizador
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  // auto-resize (cresce suavemente; limita a 8 linhas)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = '0px'
    const next = Math.min(8 * 24, el.scrollHeight)
    el.style.height = next + 'px'
  }, [value])

  /** anexos */
  function triggerFilePicker() {
    if (premiumBlocked) { onUpgrade?.(); return }
    setErr(null)
    fileInputRef.current?.click()
  }
  function acceptList(list: File[]) {
    const accepted: File[] = []
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) { setErr('Arquivo excede 20MB.'); continue }
      if (f.type && !ACCEPTED_MIME.has(f.type)) { setErr('Tipo de arquivo não suportado.'); continue }
      accepted.push(f)
    }
    return accepted
  }
  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null)
    if (!e.target.files?.length) return
    const accepted = acceptList(Array.from(e.target.files))
    setFiles((prev) => {
      const merged = dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES)
      if (merged.length > MAX_FILES) setErr(`Máximo de ${MAX_FILES} arquivos.`)
      return merged
    })
    e.target.value = ''
    areaRef.current?.focus()
  }
  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  /** visualizador (ondas finas sob o campo) */
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
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = Math.floor(rect.width * dpr)
        canvas.height = Math.floor(32 * dpr)
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
  if (i === 0) {
    ctx2d.moveTo(x, y)
  } else {
    ctx2d.lineTo(x, y)
  }
}
        ctx2d.stroke()
        rafRef.current = requestAnimationFrame(draw)
      }
      rafRef.current = requestAnimationFrame(draw)

      const ro = new ResizeObserver(() => resize())
      ro.observe(canvas)
      roRef.current = ro
    } catch {}
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
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {})
    } catch {}
  }

  /** gravação (botão à direita) */
  async function toggleRecord() {
    setErr(null)
    if (premiumBlocked) { onUpgrade?.(); return }
    if (recording) {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
      mediaStreamRef.current = null
      setRecording(false)
      stopVisualizer()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      startVisualizer(stream)

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const picked = mimeCandidates.find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || ''
      const mr = new MediaRecorder(stream, picked ? { mimeType: picked } : undefined)
      chunksRef.current = []

      mr.ondataavailable = (ev) => { if (ev.data?.size) chunksRef.current.push(ev.data) }
      mr.onstop = async () => {
        try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
        mediaStreamRef.current = null
        stopVisualizer()

        const blob = new Blob(chunksRef.current, { type: picked || 'audio/webm' })
        if (!blob.size) return
        if (blob.size > MAX_FILE_SIZE) { setErr('Áudio gravado excede 20MB.'); return }

        try {
          setTranscribing(true)
          const form = new FormData()
          form.append('file', blob, `audio-${Date.now()}.${picked.includes('webm') ? 'webm' : 'm4a'}`)
          const resp = await fetch('/api/pro/transcribe', { method: 'POST', body: form })
          if (!resp.ok) { setErr('Falha na transcrição.'); return }
          const data = (await resp.json()) as { text?: string }
          const text = (data?.text || '').trim()
          if (text) {
            setValue((prev) => (prev ? (prev.endsWith(' ') ? prev : prev + ' ') + text : text))
            areaRef.current?.focus()
          } else setErr('Não foi possível entender o áudio.')
        } catch {
          setErr('Erro ao transcrever. Tente novamente.')
        } finally { setTranscribing(false) }
      }

      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setErr('Permissão de microfone negada ou navegador não suportado.')
    }
  }

  // cleanup
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
      stopVisualizer()
    }
  }, [])

  /** envio */
  async function submit(text: string) {
    setErr(null)
    const clean = text.trim()
    if (!clean || disabled || busy || recording || transcribing) return
    if (premiumBlocked) { setErr('Este modo é exclusivo PRO.'); onUpgrade?.(); return }
    try {
      setBusy(true)
      if (onSendWithFiles && files.length > 0) {
        await onSendWithFiles({ text: clean, files })
        setFiles([])
      } else {
        await onSend(clean)
      }
      setValue('')
      areaRef.current?.focus()
    } finally { setBusy(false) }
  }

  // atalhos do textarea
  const [isComposing, setIsComposing] = useState(false)
  async function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      try { await submit(value) } catch { /* noop */ }
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault()
      try { await submit(value) } catch { /* noop */ }
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!e.clipboardData) return
    const list = Array.from(e.clipboardData.files || [])
    if (!list.length) return
    e.preventDefault()
    setErr(null)
    const accepted = acceptList(list)
    if (accepted.length) setFiles((prev) => dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES))
  }

  const computedPlaceholder =
    premiumBlocked ? 'Modo PRO — assine para enviar perguntas neste modo' : placeholder

  /** UI (tamanhos e spacing compatíveis com o anexo) */
  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-base bg-app/92 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="h-3" />

      <form
        onSubmit={async (e) => { e.preventDefault(); try { await submit(value) } catch { /* noop */ } }}
        className="mx-auto w-full max-w-3xl px-3 sm:px-4"
      >
        {/* chips de anexos */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f) => (
              <div key={f.name} className="chip group">
                <Paperclip className="w-3.5 h-3.5 mr-1 shrink-0 opacity-70" />
                <span className="truncate max-w-[22ch]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  className="ml-2 rounded-md px-1.5 py-0.5 border hover:bg-panel transition"
                  aria-label={`Remover ${f.name}`}
                  title="Remover"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* erros curtos */}
        {err && (
          <div role="alert" aria-live="polite" className="mb-2 text-xs text-red-500">
            {err}
          </div>
        )}

        {/* campo único */}
        <div
          className="relative rounded-2xl border border-base bg-panel shadow-soft px-3 py-2.5"
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            e.preventDefault()
            if (premiumBlocked) { onUpgrade?.(); return }
            setErr(null)
            const list = Array.from(e.dataTransfer.files || [])
            if (!list.length) return
            const accepted = acceptList(list)
            setFiles((prev) => dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES))
          }}
        >
          {/* input invisível de arquivo */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg,audio/webm,audio/mpeg,audio/mp4,audio/wav"
            onChange={onFilesSelected}
            className="hidden"
          />

          {/* + à esquerda */}
          <button
            type="button"
            onClick={triggerFilePicker}
            className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-base bg-panel hover:bg-panel-2 active:scale-[0.99] transition disabled:opacity-50"
            title={premiumBlocked ? 'Requer PRO' : 'Adicionar'}
            aria-label="Adicionar"
            disabled={premiumBlocked}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* textarea com paddings laterais para caber os ícones */}
          <div className="pl-[56px] pr-[96px]">
            <textarea
              id="prompt"
              ref={areaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              onPaste={onPaste}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={computedPlaceholder}
              disabled={disabled || busy || transcribing}
              className="w-full resize-none bg-transparent outline-none placeholder:text-muted text-[15px] leading-[1.6]"
              rows={1}
            />
          </div>

          {/* cluster direito: mic + enviar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecord}
              title={recording ? 'Parar gravação' : 'Gravar áudio'}
              aria-label="Gravar áudio"
              aria-pressed={recording || undefined}
              disabled={premiumBlocked}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-base bg-panel hover:bg-panel-2 active:scale-[0.99] transition ${recording ? 'outline outline-2 outline-[var(--accent)]' : ''}`}
            >
              {recording ? <Square className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>

            <button
              type="submit"
              disabled={disabled || busy || !value.trim() || premiumBlocked}
              title={premiumBlocked ? 'Requer PRO' : 'Enviar'}
              aria-label="Enviar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-base bg-panel hover:bg-panel-2 active:scale-[0.99] transition disabled:opacity-50"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* ondas da gravação (slim) */}
          {recording && (
            <canvas ref={canvasRef} className="pointer-events-none absolute left-3 right-3 bottom-1 h-8" />
          )}
        </div>
      </form>

      <div className="h-2" />
    </div>
  )
}