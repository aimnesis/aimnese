'use client'

import { useState, useCallback } from 'react'
import Layout from '@/components/Layout'
import VoiceRecorder from '@/components/VoiceRecorder'
import AnswerView from '@/components/AnswerView'
import { useTranslation } from 'react-i18next'

type Reference = {
  title: string
  url: string
}

export default function VoicePage() {
  const { t } = useTranslation()
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [references, setReferences] = useState<Reference[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTranscript = useCallback((text: string) => {
    setInterimTranscript(text)
    setFinalTranscript(text)
  }, [])

  const sendQuestion = useCallback(async () => {
    const query = finalTranscript.trim() || interimTranscript.trim()
    if (!query) {
      setError(t('voice.noQuestion') || 'Nenhuma pergunta detectada.')
      return
    }
    setError(null)
    setLoading(true)
    setAnswer(null)
    setReferences([])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Erro na API')
      }
      const data = await res.json()
      setAnswer(data.answer || '')
      setReferences(Array.isArray(data.references) ? data.references : [])
    } catch (e: any) {
      console.error('VoicePage error:', e)
      setError(t('voice.fetchError') || 'Erro ao obter resposta.')
    } finally {
      setLoading(false)
    }
  }, [finalTranscript, interimTranscript, t])

  const generateDocument = useCallback(async () => {
    // por enquanto reaproveita a mesma lógica
    await sendQuestion()
  }, [sendQuestion])

  return (
    <Layout>
      <div className="min-h-screen bg-black flex flex-col items-center pt-10 px-4 text-white">
        <h2 className="text-2xl font-bold mb-6">{t('voice.title') || 'Pergunta por voz'}</h2>

        <div className="w-full max-w-lg bg-zinc-900 rounded-xl shadow-xl p-6 flex flex-col items-center">
          <VoiceRecorder onTranscript={handleTranscript} />

          <div className="flex flex-wrap gap-3 mt-4 w-full justify-center">
            <button
              onClick={sendQuestion}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition flex items-center gap-2"
              type="button"
              aria-label={t('voice.sendQuestion') || 'Enviar pergunta'}
            >
              {loading ? (
                <span>{t('voice.loading') || 'Carregando...'}</span>
              ) : (
                <>{t('voice.sendQuestion') || 'Enviar pergunta'}</>
              )}
            </button>
            <button
              onClick={generateDocument}
              disabled={loading}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition"
              type="button"
              aria-label={t('voice.generateDoc') || 'Gerar documento'}
            >
              {t('voice.generateDoc') || 'Gerar documento'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-red-400 text-center w-full">
              {error}
            </div>
          )}

          {loading && !answer && (
            <div className="mt-4 text-orange-400 animate-pulse">{t('voice.loading') || 'Carregando...'}</div>
          )}

          {answer && (
            <div className="w-full mt-6">
              <AnswerView
                question={finalTranscript || interimTranscript}
                answer={answer}
                references={references}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}