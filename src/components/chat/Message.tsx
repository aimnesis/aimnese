// src/components/chat/Message.tsx
'use client'

import { ReactNode } from 'react'

type MsgProps = {
  role: 'user' | 'assistant'
  children: ReactNode
}

export default function Message({ role, children }: MsgProps) {
  const base = 'rounded-2xl px-4 py-3 border border-base max-w-3xl leading-7'
  const bubble =
    role === 'user'
      ? `${base} bg-panel`
      : `${base} bg-panel-2`

  const label =
    role === 'user'
      ? <span className="text-xs text-muted">Você</span>
      : <span className="text-xs text-muted">Aimnesis</span>

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-3xl px-4">
        <div className="mb-2">{label}</div>
        <div className={bubble}>{children}</div>
      </div>
    </div>
  )
}