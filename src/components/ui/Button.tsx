// src/components/ui/Button.tsx
'use client'

import React, { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'default'
  className?: string
}

/**
 * Simples helper para concatenar classes sem dependência externa.
 */
const cx = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(' ')

const variantStyles: Record<string, string> = {
  primary: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400',
  secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-600',
  ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-white',
  default: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-400',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', className = '', disabled, ...rest }, ref) => {
    const base =
      'inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    const variantClass = variantStyles[variant] ?? variantStyles.primary

    return (
      <button
        ref={ref}
        className={cx(base, variantClass, className)}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button