// src/components/ui/Topbar.tsx
'use client'

import Image from 'next/image'

type Props = {
  title: string
  userLabel?: string | null
  onNew?: () => void
  onOpenSidebar?: () => void
}

export default function Topbar({ title, userLabel, onNew, onOpenSidebar }: Props) {
  return (
    <div className="h-12 border-b border-base bg-panel flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden text-sm px-3 py-2 rounded-md border border-base hover:bg-panel-2"
            aria-label="Abrir menu"
            type="button"
          >
            ☰
          </button>
        )}

        <Image src="/logo-aimnesis.svg" alt="Aimnesis" width={18} height={18} className="opacity-90" priority />
        <span className="text-sm font-medium">Aimnesis</span>
        <span className="mx-2 text-muted">/</span>
        <span className="text-sm truncate">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {userLabel && (
          <span className="hidden sm:inline text-xs text-muted max-w-[24ch] truncate">{userLabel}</span>
        )}
        {onNew && (
          <button
            onClick={onNew}
            className="text-xs px-3 py-1.5 rounded-md border border-base hover:bg-panel-2 transition"
            type="button"
            aria-label="Novo chat"
            title="Novo chat"
          >
            + Novo chat
          </button>
        )}
      </div>
    </div>
  )
}