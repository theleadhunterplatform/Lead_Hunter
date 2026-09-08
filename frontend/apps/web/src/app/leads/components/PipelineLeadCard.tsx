'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, Coins, Mail, Phone, Loader2 } from 'lucide-react'
import { AppLead } from '@/types/lead'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { sanitizePublicText, sanitizeHeadline } from '@/lib/claim-reveal'
import { triggerUnlockConfetti } from '@/lib/confetti'
import { NicheBadge } from '@/components/ui/NicheBadge'

const themeMap = {
  mint: {
    cardBg: 'bg-[#B8F36B]',
    text: 'text-[#11150C]',
    textMuted: 'text-[#11150C]/65',
    tagBg: 'bg-[#11150C]/10 border-[#11150C]/10 text-[#11150C]',
    matchTag: 'bg-[#11150C] text-[#B8F36B]',
    button: 'bg-[#11150C] hover:bg-black text-[#B8F36B]',
    blurBg: 'bg-[#11150C]/10',
    blurLine: 'bg-[#11150C]/15',
    savedButton: 'bg-[#11150C]/20 text-[#11150C] border-[#11150C]/30',
    saveButton: 'bg-[#11150C] hover:bg-black text-white',
  },
  purple: {
    cardBg: 'bg-[#A78BFA]',
    text: 'text-white',
    textMuted: 'text-white/75',
    tagBg: 'bg-white/15 border-white/20 text-white',
    matchTag: 'bg-white text-[#11150C]',
    button: 'bg-white hover:bg-white/90 text-[#11150C]',
    blurBg: 'bg-white/15',
    blurLine: 'bg-white/25',
    savedButton: 'bg-white/25 text-white border-white/35',
    saveButton: 'bg-white hover:bg-white/90 text-[#11150C]',
  },
  cyan: {
    cardBg: 'bg-[#7DD3FC]',
    text: 'text-[#11150C]',
    textMuted: 'text-[#11150C]/65',
    tagBg: 'bg-[#11150C]/10 border-[#11150C]/10 text-[#11150C]',
    matchTag: 'bg-[#11150C] text-[#7DD3FC]',
    button: 'bg-[#11150C] hover:bg-black text-[#7DD3FC]',
    blurBg: 'bg-[#11150C]/10',
    blurLine: 'bg-[#11150C]/15',
    savedButton: 'bg-[#11150C]/20 text-[#11150C] border-[#11150C]/30',
    saveButton: 'bg-[#11150C] hover:bg-black text-white',
  },
  orange: {
    cardBg: 'bg-[#FFB86B]',
    text: 'text-[#11150C]',
    textMuted: 'text-[#11150C]/65',
    tagBg: 'bg-[#11150C]/10 border-[#11150C]/10 text-[#11150C]',
    matchTag: 'bg-[#11150C] text-[#FFB86B]',
    button: 'bg-[#11150C] hover:bg-black text-[#FFB86B]',
    blurBg: 'bg-[#11150C]/10',
    blurLine: 'bg-[#11150C]/15',
    savedButton: 'bg-[#11150C]/20 text-[#11150C] border-[#11150C]/30',
    saveButton: 'bg-[#11150C] hover:bg-black text-white',
  },
  pink: {
    cardBg: 'bg-[#F9A8D4]',
    text: 'text-[#11150C]',
    textMuted: 'text-[#11150C]/65',
    tagBg: 'bg-[#11150C]/10 border-[#11150C]/10 text-[#11150C]',
    matchTag: 'bg-[#11150C] text-[#F9A8D4]',
    button: 'bg-[#11150C] hover:bg-black text-[#F9A8D4]',
    blurBg: 'bg-[#11150C]/10',
    blurLine: 'bg-[#11150C]/15',
    savedButton: 'bg-[#11150C]/20 text-[#11150C] border-[#11150C]/30',
    saveButton: 'bg-[#11150C] hover:bg-black text-white',
  },
}

const ACCENT_ORDER: (keyof typeof themeMap)[] = ['purple', 'pink', 'cyan', 'mint', 'orange']

export default function PipelineLeadCard({
  lead,
  index,
  isSelected,
  onClick,
  onSaveToggle,
  onReveal,
}: {
  lead: AppLead
  index?: number
  isSelected?: boolean
  onClick?: () => void
  onSaveToggle?: (isSaved: boolean) => void
  onReveal?: (leadId: string, name: string, email: string, phone?: string | null) => void
}) {
  const { addToast } = useToast()

  const [isSaved, setIsSaved] = useState(lead.status === 'saved')
  const [isRevealed, setIsRevealed] = useState(lead.isRevealed)
  const [isRevealing, setIsRevealing] = useState(false)

  useEffect(() => {
    setIsSaved(lead.status === 'saved')
  }, [lead.status])

  useEffect(() => {
    setIsRevealed(lead.isRevealed)
  }, [lead.isRevealed])

  // Alternate pastel accents across leads (cycles Purple, Pink, Cyan, Mint, Orange)
  const resolvedAccent: keyof typeof themeMap =
    typeof index === 'number'
      ? ACCENT_ORDER[index % ACCENT_ORDER.length]
      : lead.accent && ACCENT_ORDER.includes(lead.accent as keyof typeof themeMap) && lead.accent !== 'mint'
        ? (lead.accent as keyof typeof themeMap)
        : ACCENT_ORDER[
            Math.abs(
              lead.id.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
            ) % ACCENT_ORDER.length
          ]

  const theme = themeMap[resolvedAccent]

  // Top Left Category / Niche (Zero social sources: no Twitter/LinkedIn)
  const topCategory =
    (lead.niches && lead.niches.length > 0 && lead.niches[0]) ||
    (lead.category && lead.category.toLowerCase() !== 'general' ? lead.category : 'LEAD SIGNAL')

  // Headline (sanitized to prevent person names, company names, or contacts)
  const displayHeadline = sanitizeHeadline(lead.title, topCategory)

  // Main Quote content (strictly sanitized to prevent WhatsApp/phone/email/contact leaks)
  const rawQuote =
    lead.taskScope && lead.taskScope.trim() !== ''
      ? lead.taskScope
      : lead.category && lead.category.toLowerCase() !== 'general'
        ? lead.category
        : 'Verified service demand opportunity.'

  const quoteContent = sanitizePublicText(rawQuote)

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
    if (isRevealing) return

    // Capture click position synchronously before any async ticks
    const clickCoords =
      e && typeof e.clientX === 'number' && e.clientX > 0
        ? { x: e.clientX, y: e.clientY }
        : null

    // Smooth client-side reveal for landing page demos / mock cards
    if (
      lead.id.startsWith('mock') ||
      lead.id.startsWith('hero') ||
      lead.id.startsWith('card') ||
      ['checkout', 'shopify', 'rebrand', 'freelancers', 'agencies', 'consultants'].includes(lead.id)
    ) {
      setIsRevealing(true)
      await new Promise((resolve) => setTimeout(resolve, 550))
      setIsRevealed(true)
      setIsRevealing(false)
      triggerUnlockConfetti(clickCoords)
      addToast({
        type: 'success',
        message: `Unlocked contact for ${lead.name || 'lead'}!`,
      })
      if (onReveal) {
        onReveal(lead.id, lead.name, lead.email, lead.phone)
      }
      return
    }

    if (!lead.isClaimable) {
      addToast({
        type: 'error',
        message: 'This lead is not yet approved. Intelligence is still being generated.',
      })
      return
    }

    try {
      setIsRevealing(true)
      const token = await getFirebaseToken()
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
        addToast({
          type: 'error',
          message: json.message || json.code || 'Failed to reveal lead',
        })
        return
      }

      setIsRevealed(true)
      triggerUnlockConfetti(clickCoords)
      addToast({
        type: 'success',
        message: `Unlocked contact for ${json.name || 'lead'}!`,
      })

      if (typeof json.creditsRemaining === 'number') {
        window.dispatchEvent(
          new CustomEvent('credits-updated', { detail: { creditsRemaining: json.creditsRemaining } }),
        )
      }

      if (onReveal) {
        onReveal(lead.id, json.name, json.email, json.phone)
      }
    } catch {
      addToast({
        type: 'error',
        message: 'Network error while unlocking lead. Please try again.',
      })
    } finally {
      setIsRevealing(false)
    }
  }

  const visibleTags = (lead.nicheTags || [])
    .filter((tag) => {
      if (!tag) return false
      const t = tag.trim()
      const lower = t.toLowerCase()
      if (['linkedin', 'reddit', 'twitter', 'github', 'seed', 'external'].includes(lower)) return false
      const words = t.split(/\s+/)
      if (words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z][a-z]+$/.test(w))) return false
      if (words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Z]{3,}$/.test(w))) return false
      return true
    })
    .slice(0, 3)

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`group relative text-left flex flex-col justify-between p-5 rounded-[22px] overflow-hidden h-[260px] min-h-[260px] max-h-[260px] w-full col-span-1 shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer ${
        theme.cardBg
      } ${isSelected ? 'ring-3 ring-black/30' : ''}`}
    >
      {/* Top & Content Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header: Niche Badge & Timestamp */}
        <div className="flex items-center justify-between mb-2 w-full select-none shrink-0 h-[22px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <NicheBadge niche={(lead as any).niche} keyword={lead.category} content={lead.signalContext} />
          </div>

          {lead.timestamp && (
            <span className={`text-[10px] font-medium tracking-tight shrink-0 ml-2 opacity-60 ${theme.textMuted}`}>
              {lead.timestamp}
            </span>
          )}
        </div>

        {/* Scaled-down Headline */}
        <h4 className={`text-[10.5px] font-bold tracking-[0.12em] uppercase mb-1.5 line-clamp-1 select-none opacity-90 shrink-0 h-[16px] ${theme.text}`}>
          {displayHeadline}
        </h4>

        {/* Scaled-down Quote: fixed height container ensures 100% uniform card layout regardless of copy length */}
        <div className="h-[52px] mb-2.5 flex items-start select-none overflow-hidden shrink-0">
          <h3 className={`text-[13px] sm:text-[13.5px] font-semibold tracking-tight leading-[1.35] line-clamp-2 ${theme.text}`}>
            &quot;{quoteContent}&quot;
          </h3>
        </div>

        {/* Clean Tags Row without match score badge */}
        <div className="flex items-center gap-1.5 mb-2.5 shrink-0 select-none overflow-hidden flex-nowrap h-[22px]">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border backdrop-blur-sm shrink-0 whitespace-nowrap ${theme.tagBg}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Area: Cute scaled-down lock and reveal button */}
      <div className="w-full h-[34px] flex items-center justify-between shrink-0 mt-auto pt-1 border-t border-black/[0.06]">
        {!isRevealed ? (
          <>
            {/* Cute Micro Locked Placeholder */}
            <div className="flex items-center gap-2 select-none shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${theme.blurBg}`}
              >
                <Lock size={12} className={theme.textMuted} />
              </div>
              <div className="flex flex-col gap-1 pointer-events-none shrink-0">
                <div className={`h-2 w-14 rounded-[3px] blur-[1.5px] ${theme.blurLine}`} />
                <div className={`h-1.5 w-20 rounded-[3px] blur-[1.5px] ${theme.blurBg}`} />
              </div>
            </div>

            {/* Cute Scaled-down Reveal Action Button with Loading Animation */}
            <button
              type="button"
              onClick={handleReveal}
              disabled={isRevealing}
              className={`w-[96px] h-[30px] rounded-xl font-bold text-[10.5px] shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 ${theme.button} ${
                isRevealing ? 'opacity-85 cursor-wait pointer-events-none' : 'cursor-pointer'
              }`}
            >
              {isRevealing ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin shrink-0" />
                  <span className="text-[10px] font-semibold tracking-tight">Unlocking...</span>
                </span>
              ) : (
                <>
                  <span>Reveal</span>
                  <span className="flex items-center gap-0.5 opacity-90 text-[10px] font-semibold tabular-nums">
                    <Coins size={11} className="shrink-0" />
                    <span>-{lead.revealCost ?? 3}</span>
                  </span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Cute Scaled-down Unlocked Contact Details with Smooth Pop-in */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="flex items-center gap-2 min-w-0 flex-1 mr-1.5"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${theme.matchTag}`}
              >
                {lead.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-bold truncate leading-tight ${theme.text}`}>{lead.name}</div>
                {lead.email ? (
                  <div
                    className={`text-[9.5px] truncate select-all flex items-center gap-1 mt-0.5 ${theme.textMuted}`}
                    title={lead.email}
                  >
                    <Mail size={9.5} className="shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                ) : lead.phone ? (
                  <div
                    className={`text-[9.5px] truncate select-all flex items-center gap-1 mt-0.5 ${theme.textMuted}`}
                    title={lead.phone}
                  >
                    <Phone size={9.5} className="shrink-0" />
                    <span className="truncate">{lead.phone}</span>
                  </div>
                ) : null}
              </div>
            </motion.div>

            {/* Scaled-down Save Button */}
            <button
              type="button"
              onClick={handleSave}
              className={`w-[66px] h-[30px] rounded-xl text-[9.5px] font-extrabold tracking-wider uppercase transition-all shrink-0 cursor-pointer border flex items-center justify-center ${
                isSaved ? theme.savedButton : theme.saveButton
              }`}
            >
              {isSaved ? '✓ Saved' : 'Save'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
