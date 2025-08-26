// src/components/ui/Spinner.tsx
'use client'

import React from 'react'

export interface SpinnerProps {
  /** tamanho em px (padrão 32) */
  size?: number
  /** texto para leitores de tela */
  label?: string
  /** cor opcional; se não passar, usa currentColor (melhor para theming) */
  color?: string
  className?: string
}

const Spinner: React.FC<SpinnerProps> = React.memo(
  ({ size = 32, label = 'Carregando...', color, className = '' }) => {
    const borderWidth = Math.max(2, Math.floor(size / 8))
    const chosenColor = color || 'currentColor'

    const styleRing: React.CSSProperties = {
      width: size,
      height: size,
      borderWidth,
      borderStyle: 'solid',
      borderRadius: '50%',
      borderColor: chosenColor,
      borderTopColor: 'transparent',
    }

    return (
      <span
        role="status"
        aria-label={label}
        aria-live="polite"
        className={`inline-flex items-center ${className}`}
      >
        <span
          className="inline-block animate-spin"
          style={styleRing}
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </span>
    )
  }
)

Spinner.displayName = 'Spinner'

export default Spinner