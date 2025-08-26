'use client'

import React from 'react'

export interface Capability {
  key: string
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

interface CapabilitiesRowProps {
  capabilities: Capability[]
  onExploreMore?: () => void
  className?: string
}

export default function CapabilitiesRow({
  capabilities,
  onExploreMore,
  className = '',
}: CapabilitiesRowProps) {
  return (
    <div className={`w-full max-w-[960px] flex flex-col items-center gap-2 mb-4 ${className}`}>
      <div className="flex flex-nowrap gap-3 overflow-x-auto py-1 justify-center w-full">
        {capabilities.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-[14px] font-medium border border-base bg-panel hover:bg-panel-2 transition whitespace-nowrap"
            type="button"
          >
            {c.icon && <span className="opacity-80" aria-hidden="true">{c.icon}</span>}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {onExploreMore && (
        <button
          onClick={onExploreMore}
          className="mt-1 inline-flex items-center gap-2 text-sm text-muted hover:underline"
          type="button"
        >
          <span>Explorar mais funcionalidades</span>
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="rotate-180 opacity-80"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}