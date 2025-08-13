// src/components/ui/Spinner.tsx
'use client'

import React from 'react'

export interface SpinnerProps {
  size?: number // em pixels, padrão 32
  label?: string // texto para leitores de tela
  color?: string // cor da borda (ex: '#2563eb' ou 'rgb(...)')
  className?: string
}

const Spinner: React.FC<SpinnerProps> = React.memo(
  ({ size = 32, label = 'Carregando...', color = '#2563eb', className = '' }) => {
    const borderWidth = Math.max(2, Math.floor(size / 8)) // proporcional
    const commonStyles: React.CSSProperties = {
      width: size,
      height: size,
      borderWidth: borderWidth,
      borderStyle: 'solid',
      borderRadius: '50%',
      borderColor: color,
      borderTopColor: 'transparent',
    }

    return (
      <div
        role="status"
        aria-label={label}
        aria-live="polite"
        className={`inline-block ${className}`}
      >
        <div
          className="animate-spin"
          style={commonStyles}
        />
        <span className="sr-only">{label}</span>
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

export default Spinner