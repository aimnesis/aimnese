// src/components/chat/Composer.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (alinhado ao backend)
const MAX_FILES = 6;
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
]);

function dedupeByName(list: File[]) {
  const map = new Map<string, File>();
  for (const f of list) {
    if (!map.has(f.name)) map.set(f.name, f);
  }
  return Array.from(map.values());
}

type Props = {
  onSend: (text: string) => void | Promise<void>
  onSendWithFiles?: (data: { text: string; files: File[] }) => void | Promise<void>
  placeholder?: string
  disabled?: boolean
}

export default function Composer({
  onSend,
  onSendWithFiles,
  placeholder = 'Digite sua pergunta médica...',
  disabled,
}: Props) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const [err, setErr] = useState<string | null>(null)

  // anexos
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // gravação de voz
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recStartedAt, setRecStartedAt] = useState<number | null>(null)
  const [isComposing, setIsComposing] = useState(false)

  // auto-resize do textarea
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(240, el.scrollHeight) + 'px'
  }, [value])

  function triggerFilePicker() {
    setErr(null);
    fileInputRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    if (!e.target.files?.length) return;
    const picked = Array.from(e.target.files);

    // valida tipo e tamanho
    const accepted: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_FILE_SIZE) {
        setErr('Arquivo excede 20MB.');
        continue;
      }
      if (f.type && !ACCEPTED_MIME.has(f.type)) {
        setErr('Tipo de arquivo não suportado.');
        continue;
      }
      accepted.push(f);
    }

    // respeita limite total
    setFiles(prev => {
      const merged = dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES);
      if (merged.length > MAX_FILES) setErr(`Máximo de ${MAX_FILES} arquivos.`);
      return merged;
    });

    // reseta o input para permitir reenviar mesmo nome
    e.target.value = '';
    areaRef.current?.focus();
  }

  function removeFile(name: string) {
    setFiles(prev => {
      const next = prev.filter(f => f.name !== name);
      if (next.length === 0) setErr(null);
      return next;
    });
  }

  // gravação de áudio (webm)
  async function toggleRecord() {
    setErr(null);
    if (recording) {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null } catch {}
      setRecording(false);
      setRecStartedAt(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data) };
      mr.onstop = () => {
        try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null } catch {}
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          if (blob.size > MAX_FILE_SIZE) {
            setErr('Áudio gravado excede 20MB.');
          } else {
            const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
            setFiles(prev => dedupeByName([...prev, file]).slice(0, MAX_FILES));
          }
        }
        setRecStartedAt(null);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecStartedAt(Date.now());
    } catch {
      setErr('Permissão de microfone negada ou não suportado.');
    }
  }


  // cleanup on unmount (stop recording and tracks if any)
  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop() } catch {}
      try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null } catch {}
    }
  }, [])

  async function submit(text: string) {
    setErr(null);
    const clean = text.trim()
    if (!clean || disabled || busy) return
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
    } finally {
      setBusy(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit(value);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      void submit(value);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!e.clipboardData) return;
    const list = Array.from(e.clipboardData.files || []);
    if (!list.length) return;
    e.preventDefault();
    setErr(null);
    const accepted: File[] = [];
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) { setErr('Arquivo excede 20MB.'); continue; }
      if (f.type && !ACCEPTED_MIME.has(f.type)) { setErr('Tipo de arquivo não suportado.'); continue; }
      accepted.push(f);
    }
    if (accepted.length) {
      setFiles(prev => dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES));
    }
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-base bg-app/92 backdrop-blur supports-[backdrop-filter]:bg-app/70">
      <div className="h-3" />
      <form onSubmit={(e) => { e.preventDefault(); void submit(value) }} className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        {/* chips de anexos */}
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f) => (
              <div key={f.name} className="chip group">
                <span className="truncate max-w-[22ch]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  className="ml-2 rounded-md px-1.5 py-0.5 border hover:bg-panel transition"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => { setFiles([]); setErr(null); }}
              className="chip hover:bg-panel-2 transition"
              title="Remover todos"
            >
              Limpar anexos
            </button>
          </div>
        )}

        {err && (
          <div role="alert" aria-live="polite" className="mb-2 text-xs text-red-500">
            {err}
          </div>
        )}

        <div
          className="panel shadow-soft flex items-end gap-2 p-2"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            setErr(null);
            const list = Array.from(e.dataTransfer.files || []);
            if (!list.length) return;
            const accepted: File[] = [];
            for (const f of list) {
              if (f.size > MAX_FILE_SIZE) { setErr('Arquivo excede 20MB.'); continue; }
              if (f.type && !ACCEPTED_MIME.has(f.type)) { setErr('Tipo de arquivo não suportado.'); continue; }
              accepted.push(f);
            }
            setFiles(prev => dedupeByName([...prev, ...accepted]).slice(0, MAX_FILES));
          }}
        >
          {/* ícones à esquerda */}
          <div className="flex items-center gap-1 pl-1 pb-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg,audio/webm,audio/mpeg,audio/mp4,audio/wav"
              onChange={onFilesSelected}
              className="hidden"
            />
            <button type="button" onClick={triggerFilePicker} className="btn-secondary h-9 px-2" title="Anexar arquivo" aria-label="Anexar arquivo">📎</button>
            <button type="button" onClick={toggleRecord} className={`btn-secondary h-9 px-2 ${recording ? 'outline outline-2 outline-[var(--accent)]' : ''}`} title={recording ? 'Parar gravação' : 'Gravar áudio'} aria-label="Gravar áudio">{recording ? '⏺️' : '🎙️'}</button>
            <button type="button" onClick={() => areaRef.current?.focus()} className="btn-secondary h-9 px-2" title="Pesquisar/consultar" aria-label="Pesquisar/consultar">🔍</button>
            {files.length > 0 && (
              <span className="ml-1 text-[11px] text-muted select-none">
                {files.length}/{MAX_FILES}
              </span>
            )}
          </div>

          {/* textarea */}
          <textarea
            ref={areaRef}
            id="prompt"
            name="prompt"
            autoComplete="off"
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onPaste={onPaste}
            disabled={disabled || busy}
            className="input bg-transparent border-none flex-1 resize-none px-3 py-2 text-sm leading-relaxed placeholder:text-muted"
            placeholder={placeholder}
            aria-label="Campo de mensagem"
            aria-busy={busy || undefined}
          />

          {/* enviar */}
          <button
            type="submit"
            disabled={disabled || busy || value.trim().length === 0}
            className="btn h-9 px-4 disabled:opacity-60"
            aria-label="Enviar"
            aria-busy={busy || undefined}
            title="Enviar"
          >
            {busy ? '…' : '➤'}
          </button>
        </div>

        <p className="text-[11px] text-muted text-center mt-2 mb-4">
          Evite dados pessoais sensíveis. Conteúdo para apoio clínico; não substitui o julgamento médico.
        </p>
      </form>
    </div>
  )
}