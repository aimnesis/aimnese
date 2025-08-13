// src/components/VoiceRecorder.tsx
'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  lang?: string // padrão pt-BR
}

// Tipos para SpeechRecognition e eventos
type SpeechRecognitionType = typeof window.SpeechRecognition
type SpeechRecognitionInstance = InstanceType<SpeechRecognitionType>

export default function VoiceRecorder({ onTranscript, lang = 'pt-BR' }: VoiceRecorderProps) {
  const [gravando, setGravando] = useState(false)
  const [intermediario, setIntermediario] = useState('')
  const [final, setFinal] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isSupported =
    typeof window !== 'undefined' &&
    (window.webkitSpeechRecognition || window.SpeechRecognition)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onend = null
        try {
          recognitionRef.current.stop()
        } catch {
          // ignora erros de parada
        }
      }
    }
  }, [])

  const startRecording = () => {
    if (!isSupported) return
    const SpeechRecognition: SpeechRecognitionType =
      window.webkitSpeechRecognition || window.SpeechRecognition
    const recognition: SpeechRecognitionInstance = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let intermediarioTemp = ''
      let finalAcumulado = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i]
        const trecho = result[0]?.transcript || ''
        if (result.isFinal) {
          finalAcumulado += trecho + ' '
        } else {
          intermediarioTemp += trecho
        }
      }

      if (finalAcumulado) {
        setFinal((prev) => {
          const atualizado = prev + finalAcumulado
          onTranscript(atualizado + intermediarioTemp)
          return atualizado
        })
      } else {
        setIntermediario(intermediarioTemp)
        onTranscript(final + intermediarioTemp)
      }
    }

    recognition.onend = () => {
      setGravando(false)
    }

    recognition.onerror = () => {
      // Exemplo: alert('Erro no reconhecimento de voz')
    }

    recognitionRef.current = recognition
    recognition.start()
    setGravando(true)
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setGravando(false)
  }

  if (!isSupported) {
    return (
      <p className="text-sm text-red-400">
        Reconhecimento de voz não suportado neste navegador.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={gravando ? stopRecording : startRecording}
          aria-label={gravando ? 'Parar gravação' : 'Iniciar gravação'}
          className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white font-medium transition"
          type="button"
        >
          {gravando ? 'Parar' : 'Gravar'}
        </button>
        <span aria-live="polite" className="text-sm text-zinc-300">
          {gravando ? 'Ouvindo...' : 'Pronto para gravar'}
        </span>
      </div>

      {(final || intermediario) && (
        <div className="bg-zinc-800 rounded p-3 text-xs">
          {final && (
            <p className="mb-1">
              <strong>Final:</strong> {final}
            </p>
          )}
          {intermediario && (
            <p>
              <strong>Intermediário:</strong> {intermediario}
            </p>
          )}
        </div>
      )}
    </div>
  )
}