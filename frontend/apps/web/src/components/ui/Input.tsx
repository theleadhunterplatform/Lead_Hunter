'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'search' | 'default'
  size?: 'sm' | 'md'
  icon?: ReactNode
}

const variantStyles = {
  search: 'glass-panel rounded-xl pl-10',
  default: 'bg-surface border border-border-subtle rounded-xl',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

export function Input({
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          {icon}
        </div>
      )}
      <input
        className={`w-full text-text-primary placeholder:text-text-muted
          font-medium transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange/60
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    </div>
  )
}
