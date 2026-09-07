'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarSquareIcon,
  LockClosedIcon,
  BanknotesIcon,
  BookmarkIcon,
} from '@heroicons/react/24/solid'
import { Card, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { AppLead } from '@/types/lead'
import { getFirebaseToken } from '@/lib/firebase'

type UrgencyTheme = {
  textAccent: string
  dotColor: string
  glow: string
  selected: string
  bookmarkActive: string
  topLine: string
}

const urgencyTheme: Record<AppLead['urgency'], UrgencyTheme> = {
  critical: {
    textAccent: 'text-accent-purple',
    dotColor: 'bg-accent-purple',
    glow: 'hover:shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.10)] hover:border-accent-purple/25',
    selected: 'ring-1 ring-accent-purple shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.18)] bg-accent-purple/[0.03]',
    bookmarkActive: 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple',
    topLine: 'from-transparent via-accent-purple to-transparent',
  },
  high: {
    textAccent: 'text-accent-purple',
    dotColor: 'bg-accent-purple',
    glow: 'hover:shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.07)] hover:border-accent-purple/20',
    selected: 'ring-1 ring-accent-purple shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.12)] bg-accent-purple/[0.02]',
    bookmarkActive: 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple',
    topLine: 'from-transparent via-accent-purple to-transparent',
  },
  medium: {
    textAccent: 'text-accent-purple',
    dotColor: 'bg-accent-purple',
    glow: 'hover:shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.07)] hover:border-accent-purple/20',
    selected: 'ring-1 ring-accent-purple shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.12)] bg-accent-purple/[0.02]',
    bookmarkActive: 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple',
    topLine: 'from-transparent via-accent-purple to-transparent',
  },
  low: {
    textAccent: 'text-accent-purple',
    dotColor: 'bg-accent-purple',
    glow: 'hover:shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.05)] hover:border-accent-purple/15',
    selected: 'ring-1 ring-accent-purple shadow-[0_8px_30px_rgba(var(--rgb-accent-purple),0.08)] bg-accent-purple/[0.02]',
    bookmarkActive: 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple',
    topLine: 'from-transparent via-accent-purple to-transparent',
  },
}

const urgencyLabel: Record<AppLead['urgency'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const urgencyBadgeColor: Record<
  AppLead['urgency'],
  'mint' | 'purple'
> = {
  critical: 'mint',
  high: 'mint',
  medium: 'purple',
  low: 'purple',
}

export default function LeadCard({
  lead,
  isSelected,
  onClick,
  onSaveToggle,
  onReveal,
}: {
  lead: AppLead
  isSelected?: boolean
  onClick?: () => void
  onSaveToggle?: (isSaved: boolean) => void
  onReveal?: (leadId: string, name: string, email: string, phone?: string | null) => void
}) {
  const theme = urgencyTheme[lead.urgency]
  const [isSaved, setIsSaved] = useState(lead.status === 'saved')
  const [isRevealed, setIsRevealed] = useState(lead.isRevealed)
  const { addToast } = useToast()

  useEffect(() => {
    setIsSaved(lead.status === 'saved')
  }, [lead.status])

  useEffect(() => {
    setIsRevealed(lead.isRevealed)
  }, [lead.isRevealed])

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newState = !isSaved
    setIsSaved(newState)
    addToast({
      type: 'success',
      message: newState ? '✓ Saved to pipeline' : 'Removed from pipeline',
    })
    if (onSaveToggle) {
      onSaveToggle(newState)
    }
  }

  const handleReveal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!lead.isClaimable) {
      addToast({ type: 'error', message: 'This lead is not yet approved. Intelligence is still being generated.' })
      return
    }
    const token = await getFirebaseToken()
    try {
      const res = await fetch('/api/leads/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        addToast({ type: 'error', message: json.message || json.code || 'Failed to unlock lead' })
        return
      }
      setIsRevealed(true)
      if (onReveal) {
        onReveal(lead.id, json.name, json.email, json.phone)
      }
      addToast({ type: 'success', message: '✓ Contact unlocked' })
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    }
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`group relative text-left flex flex-col overflow-hidden h-full col-span-1 transition-all duration-300 ${
        isSelected ? `${theme.selected} rounded-2xl` : `rounded-2xl ${theme.glow}`}
      `}
    >
      <Card variant="elevated" padding="md" hover className={`h-full flex flex-col ${isSelected ? 'border-transparent' : ''}`}>
        {/* Top edge highlight */}
        <div
          className={`absolute top-0 left-0 right-0 h-[1px] opacity-25 transition-opacity bg-gradient-to-r ${theme.topLine} ${
            isSelected ? 'opacity-60' : 'group-hover:opacity-60'
          }`}
        />

        {/* Header: Source badge + Urgency badge + Bookmark */}
        <div className="flex items-center justify-between mb-5 w-full shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
            <Badge size="sm" color="purple">
              Lead Hunter Club
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Badge size="sm" color={urgencyBadgeColor[lead.urgency]}>
              <ChartBarSquareIcon className="w-[10px] h-[10px] mr-1" />
              {urgencyLabel[lead.urgency]}
            </Badge>
            <div
              onClick={handleSave}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSave(e as unknown as React.MouseEvent)
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSaved
                  ? theme.bookmarkActive
                  : 'bg-white/5 border-transparent text-text-secondary hover:bg-white/10 hover:text-white hover:border-border-subtle'
              }`}
            >
              <BookmarkIcon className={`w-[14px] h-[14px] ${isSaved ? 'text-current' : 'text-text-secondary/30'}`} />
            </div>
          </div>
        </div>

        {/* Category label */}
        <h4 className="text-11 font-semibold tracking-[0.18em] text-text-secondary/60 uppercase mb-3 shrink-0">
          {lead.category}
        </h4>

        {/* Signal quote - clamped to 2 lines */}
        <h3 className="text-[17px] font-normal tracking-tight leading-[1.55] text-text-primary mb-6 line-clamp-2 max-h-[4.5rem]">
          {'"'} {lead.signalContext} {'"'}
        </h3>

        {/* Tags row + AI Reply Probability */}
        <div className="flex flex-wrap gap-2 mb-2 shrink-0">
          {lead.replyProbability > 0 && (
            <Badge size="sm" color={lead.replyProbability >= 80 ? 'mint' : 'purple'}>
              {lead.replyProbability}% Reply Match
            </Badge>
          )}
          {lead.niches &&
            lead.niches.map((niche) => (
              <Badge key={niche} size="sm" color="mint">
                {niche}
              </Badge>
            ))}
          {lead.nicheTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-[10px] font-medium rounded-md border bg-white/[0.03] text-text-secondary/50 border-white/[0.05] hover:bg-white/[0.07] hover:text-text-secondary hover:border-white/10 transition-all duration-200 cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="w-full pt-5 flex items-center justify-between shrink-0 border-t border-border-subtle mt-auto gap-3">
          <div className="flex items-center gap-3 select-none min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 overflow-hidden shrink-0">
              {lead.isRevealed ? (
                <span className="text-11 font-bold text-text-primary uppercase">
                  {lead.name.split(' ').map((n) => n[0]).join('')}
                </span>
              ) : (
                <LockClosedIcon className="w-[14px] h-[14px] text-text-secondary" />
              )}
            </div>
            <div className="flex flex-col gap-1.5 pointer-events-none min-w-0">
              {lead.isRevealed ? (
                <>
                  <div className="text-sm font-bold text-text-primary truncate">{lead.name}</div>
                  <div className="text-[10px] text-text-secondary truncate">
                    {lead.email}
                    {lead.phone && <span className="ml-1 opacity-70">• {lead.phone}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-2 w-24 rounded-[4px] bg-white/10 blur-[1px]" />
                  <div className="h-2 w-32 rounded-[4px] bg-white/5 blur-[1px]" />
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.isClaimable || isRevealed ? (
              <div
                onClick={isRevealed ? undefined : handleReveal}
                className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[12px] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/10 text-white border border-border-subtle'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-border-subtle text-text-primary/90'
                }`}
              >
                {isRevealed ? 'View Details' : 'Reveal'}
                {!isRevealed && (
                  <span className="flex items-center gap-1 text-[10px] text-text-secondary uppercase tracking-widest ml-1">
                    <BanknotesIcon className="w-3 h-3" /> -{lead.revealCost ?? '–'}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </motion.button>
  )
}