// src/components/chat/Message.tsx
'use client'

import { ReactNode } from 'react'

type MsgProps = {
  role: 'user' | 'assistant'
  children: ReactNode
  /** mostra cursor pulsando quando estiver streamando a última resposta */
  streaming?: boolean
}

export default function Message({ role, children, streaming }: MsgProps) {
  const isUser = role === 'user'

  const base =
    'rounded-2xl px-5 py-4 border border-base max-w-3xl w-full mx-auto leading-[1.7] sm:leading-[1.75]'
  const bubble = isUser
    ? `${base} bg-panel text-[15px]`
    : `${base} bg-panel-2 text-[16px] leading-[1.8]`

  const label = (
    <span className="block text-xs text-muted mb-1">
      {isUser ? 'Você' : 'Aimnesis'}
    </span>
  )

  return (
    <section
      className="w-full px-4"
      role="article"
      aria-live={isUser ? undefined : 'polite'}
      aria-atomic={!isUser || undefined}
      data-role={role}
    >
      <div className="max-w-3xl mx-auto">
        {label}
        <div className={bubble}>
          <div className="whitespace-pre-wrap break-words">
            {children}
            {!isUser && streaming && <span className="animate-pulse">▍</span>}
          </div>
        </div>
      </div>
    </section>
  )
}