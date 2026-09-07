'use client'

import type { ReactNode } from 'react'

type BadgeColor = 'mint' | 'purple'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  color?: BadgeColor
  size?: BadgeSize
  className?: string
  children: ReactNode
}

const colorStyles: Record<BadgeColor, string> = {
  mint: 'bg-accent-orange/10 border border-accent-orange/20 text-accent-orange',
  purple: 'bg-accent-orange/10 border border-accent-orange/20 text-accent-orange',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-9 rounded-md',
  md: 'px-3 py-1 text-11 rounded-lg',
}

export function Badge({ color = 'mint', size = 'md', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider ${colorStyles[color]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  )
}
