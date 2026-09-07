'use client'

import type { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'outline'
type ButtonColor = 'mint' | 'purple'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  color?: ButtonColor
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantColorStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  primary: {
    mint: 'bg-primary-container text-on-primary-container hover:brightness-110 active:scale-98',
    purple: 'bg-primary-container text-on-primary-container hover:brightness-110 active:scale-98',
  },
  ghost: {
    mint: 'bg-white/5 text-text-secondary hover:text-primary hover:bg-primary/10 active:scale-98',
    purple:
      'bg-white/5 text-text-secondary hover:text-primary hover:bg-primary/10 active:scale-98',
  },
  outline: {
    mint: 'border border-primary/25 text-primary hover:bg-primary/10 active:scale-98',
    purple:
      'border border-primary/25 text-primary hover:bg-primary/10 active:scale-98',
  },
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-11 rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-sm rounded-xl font-bold',
}

export function Button({
  variant = 'primary',
  color = 'mint',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variantColorStyles[variant][color]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
