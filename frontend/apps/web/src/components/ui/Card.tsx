'use client'

import type { ReactNode } from 'react'

type CardVariant = 'metallic' | 'glass' | 'elevated' | 'flat'
type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  hover?: boolean
  className?: string
  children: ReactNode
}

const variantStyles: Record<CardVariant, string> = {
  metallic: 'metallic-card',
  glass: 'glass-panel',
  elevated: 'bg-surface border border-border-subtle rounded-xl shadow-elevation-3',
  flat: 'bg-surface-secondary border border-border-subtle rounded-xl',
}

const paddingStyles: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  variant = 'elevated',
  padding = 'md',
  hover = false,
  className = '',
  children,
}: CardProps) {
  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${
        hover ? 'hover:scale-102 transition-all duration-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
