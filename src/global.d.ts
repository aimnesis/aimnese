// src/global.d.ts
interface Window {
  SpeechRecognition: any
  webkitSpeechRecognition: any
}

interface SpeechRecognitionEvent {
  // adicione só o mínimo necessário para evitar erros
  readonly resultIndex: number
  readonly results: any
}

interface SpeechRecognition {
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((e: any) => void) | null
  onaudioend: (() => void) | null
  lang: string
  continuous: boolean
  interimResults: boolean
}