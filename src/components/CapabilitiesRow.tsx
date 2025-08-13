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
      <div className="flex flex-nowrap gap-4 overflow-x-auto py-1 justify-center w-full">
        {capabilities.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            className="flex flex-shrink-0 items-center gap-2 border border-white rounded-lg px-6 py-3 text-white text-base font-medium hover:bg-[#1f1f1f] transition whitespace-nowrap"
            type="button"
          >
            {c.icon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {c.icon}
              </span>
            )}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {onExploreMore && (
        <button
          onClick={onExploreMore}
          className="mt-1 flex items-center gap-2 bg-transparent border-none text-white font-medium text-base hover:underline transition"
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
            className="rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}