'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  XMarkIcon,
  LockClosedIcon,
  BanknotesIcon,
  ArrowPathIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/solid'
import { AppLead } from '@/types/lead'
import { Modal, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

import { sanitizePublicText } from '@/lib/claim-reveal'
import { triggerUnlockConfetti } from '@/lib/confetti'
import { NicheBadge } from '@/components/ui/NicheBadge'

export default function LeadDrawer({
  lead,
  onClose,
  onReveal,
}: {
  lead: AppLead
  onClose: () => void
  onReveal: (name: string, email: string, phone?: string | null, fullLead?: Partial<AppLead>) => void
}) {
  const [isRevealing, setIsRevealing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const copyMenuRef = useRef<HTMLDivElement | null>(null)
  const { addToast } = useToast()
  const tokenCost = lead.revealCost ?? null

  useEffect(() => {
    if (!copyMenuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCopyMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [copyMenuOpen])

  const displayTitle = !lead.isRevealed
    ? lead.title || 'OPPORTUNITY FOR —'
    : lead.title && lead.title !== '--' && lead.title !== '-'
      ? lead.title.replace(/FOR —|FOR -/i, `FOR ${lead.company || lead.name}`)
      : lead.company || lead.name || 'Lead Signal'

  const taskScopeDisplay = lead.isRevealed ? lead.taskScope : sanitizePublicText(lead.taskScope || '')
  const detailsSummaryDisplay =
    lead.detailsSummary && lead.detailsSummary.trim() !== ''
      ? (lead.isRevealed ? lead.detailsSummary : sanitizePublicText(lead.detailsSummary))
      : lead.summary && lead.summary.trim() !== ''
        ? (lead.isRevealed ? lead.summary : sanitizePublicText(lead.summary))
        : taskScopeDisplay

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
      } catch {
        return false
      }
    }
  }, [])

  const buildIntelText = useCallback(() => {
    if (!lead.isRevealed) {
      const lines = [
        `${displayTitle}`,
        detailsSummaryDisplay ? `Summary: ${detailsSummaryDisplay}` : '',
        `Tags: ${(lead.nicheTags || []).join(', ') || '—'}`,
        lead.replyProbability > 0 ? `Reply probability: ${lead.replyProbability}%` : '',
        'Strategic Intel & Contact: Locked — unlock lead to reveal full strategic brief & verified contact info',
        `via Lead Hunter Club${lead.timestamp ? ` · ${lead.timestamp}` : ''}`,
      ]
      return lines.filter(Boolean).join('\n')
    }
    const lines = [
      `${displayTitle}`,
      detailsSummaryDisplay ? `Summary: ${detailsSummaryDisplay}` : '',
      `Buyer: ${lead.buyerType || lead.role || '—'}`,
      `Scope: ${lead.taskScope || lead.category || '—'}`,
      `Requirements: ${lead.mustHave || '—'}`,
      lead.nicheBonus ? `Bonus: ${lead.nicheBonus}` : '',
      `Tags: ${(lead.nicheTags || []).join(', ') || '—'}`,
      lead.replyProbability > 0 ? `Reply probability: ${lead.replyProbability}%` : '',
      `Contact: ${lead.name}${lead.email ? ` <${lead.email}>` : ''}${lead.phone ? ` · ${lead.phone}` : ''}`,
      `via Lead Hunter Club${lead.timestamp ? ` · ${lead.timestamp}` : ''}`,
    ]
    return lines.filter(Boolean).join('\n')
  }, [displayTitle, detailsSummaryDisplay, lead])

  const handleCopyIntel = async () => {
    if (!lead.isRevealed) {
      if (lead.isClaimedByOther) {
        addToast({
          type: 'error',
          message: 'This lead is claimed by another member. Intel cannot be copied.',
        })
      } else {
        addToast({
          type: 'info',
          message: 'Unlock this lead to reveal and copy full lead intel',
        })
      }
      return
    }
    const ok = await copyText(buildIntelText())
    setCopyMenuOpen(false)
    addToast(
      ok
        ? { type: 'success', message: 'Lead intel copied to clipboard' }
        : { type: 'error', message: 'Could not copy — select and copy manually' },
    )
  }

  const handleCopyEmail = async () => {
    setCopyMenuOpen(false)
    if (!lead.isRevealed || !lead.email || lead.email.includes('hidden')) {
      addToast({ type: 'info', message: 'Reveal contact info to copy email' })
      return
    }
    const ok = await copyText(lead.email)
    addToast(
      ok
        ? { type: 'success', message: `✓ Copied ${lead.email}` }
        : { type: 'error', message: 'Clipboard access blocked' },
    )
  }

  const handleCopyContact = async () => {
    setCopyMenuOpen(false)
    if (!lead.isRevealed) {
      addToast({ type: 'info', message: 'Reveal contact info to copy contact details' })
      return
    }
    const ok = await copyText([lead.name, lead.email, lead.phone].filter(Boolean).join('\n'))
    addToast(
      ok
        ? { type: 'success', message: 'Contact details copied to clipboard' }
        : { type: 'error', message: 'Clipboard access blocked' },
    )
  }

  const handleRevealClick = async () => {
    if (lead.isClaimedByOther) {
      setErrorMsg('This lead has already been claimed by another member to prevent client fatigue.')
      return
    }
    if (!lead.isClaimable) {
      setErrorMsg('This lead is not yet approved. Intelligence is still being generated.')
      return
    }
    if (tokenCost === null) {
      setErrorMsg('No contact info found on this lead. Reveal is not available.')
      return
    }
    setShowCreditModal(true)
  }

  const confirmReveal = async () => {
    // Smooth reveal for demo/mock leads
    if (
      lead.id.startsWith('mock') ||
      lead.id.startsWith('hero') ||
      lead.id.startsWith('card') ||
      ['checkout', 'shopify', 'rebrand', 'freelancers', 'agencies', 'consultants'].includes(lead.id)
    ) {
      setIsRevealing(true)
      setErrorMsg(null)
      setShowCreditModal(false)
      await new Promise((resolve) => setTimeout(resolve, 550))
      onReveal(lead.name, lead.email, lead.phone)
      triggerUnlockConfetti()
      addToast({
        type: 'success',
        message: `✓ Contact information unlocked for ${lead.name}`,
      })
      setIsRevealing(false)
      return
    }

    try {
      setIsRevealing(true)
      setErrorMsg(null)
      setShowCreditModal(false)
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
      if (res.ok && json.success) {
        try {
          const freshRes = await fetch(`/api/leads/${lead.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          const freshJson = await freshRes.json()
          if (freshJson.data) {
            onReveal(
              freshJson.data.name || json.name,
              freshJson.data.email || json.email,
              freshJson.data.phone || json.phone,
              freshJson.data,
            )
          } else {
            onReveal(json.name, json.email, json.phone)
          }
        } catch {
          onReveal(json.name, json.email, json.phone)
        }
        triggerUnlockConfetti()
        addToast({
          type: 'success',
          message: `✓ Contact information unlocked${json.coinsUsed ? ` · ${json.coinsUsed} coins` : ''}`,
        })
        if (typeof json.creditsRemaining === 'number') {
          window.dispatchEvent(
            new CustomEvent('credits-updated', { detail: { creditsRemaining: json.creditsRemaining } }),
          )
        }
        window.dispatchEvent(new Event('user-refetch'))
      } else {
        setErrorMsg(json.message || 'Failed to unlock lead')
      }
    } catch {
      setErrorMsg('An unexpected network error occurred')
    } finally {
      setIsRevealing(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.1] bg-surface-container-low/98 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:rounded-[22px]">
      {/* Credit confirmation modal */}
      <Modal
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        title="Unlock Contact Information"
        size="sm"
        actions={
          <>
            <Button variant="ghost" color="mint" onClick={() => setShowCreditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" color="mint" onClick={confirmReveal} loading={isRevealing}>
              Unlock - {tokenCost} Credits
            </Button>
          </>
        }
      >
        <p className="mb-2">
          This costs <strong>{tokenCost} credits</strong>.
        </p>
        <p>
          You will get access to the lead&apos;s name, email{lead.hasPhone ? ', phone,' : ','} and
          company details.
        </p>
      </Modal>

      {/* Obsidian shell: rim light + grain + ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 128 128\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
        aria-hidden
      />

      {/* Drag handle (mobile) */}
      <div className="flex justify-center pt-2.5 pb-1 shrink-0 sm:hidden" aria-hidden>
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-white/[0.08] bg-gradient-to-b from-surface-container-high/70 to-surface-elevated/25 px-4 pt-3 pb-3.5 sm:px-6 sm:pt-5 sm:pb-4 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
              Lead intel
            </span>
            <span className="h-px w-8 bg-gradient-to-r from-primary/40 to-transparent" aria-hidden />
            <NicheBadge niche={lead.niche} keyword={lead.category} content={lead.signalContext} />
          </div>

          <h2 className="text-lg sm:text-[22px] font-bold tracking-[-0.01em] text-white leading-[1.25]">
            {displayTitle}
          </h2>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 select-none text-[11px]">
            {lead.timestamp && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-text-secondary">
                <ClockIcon className="w-3 h-3 text-text-secondary/70" />
                Posted {lead.timestamp}
              </span>
            )}
            {lead.replyProbability > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-medium tabular-nums text-text-secondary">
                {lead.replyProbability}% reply odds
              </span>
            )}
            {lead.winProb === 'high' && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-1 font-medium text-secondary">
                High win odds
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close lead details"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-black/30 text-text-secondary transition-all hover:border-white/15 hover:text-white active:scale-90"
        >
          <XMarkIcon className="w-[17px] h-[17px]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-5 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Summary + skills layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            {detailsSummaryDisplay && detailsSummaryDisplay.trim() !== '' && (
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-elevated/55 p-4">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-secondary/50 via-secondary/10 to-transparent" aria-hidden />
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-secondary">
                    Lead summary
                  </span>
                  <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
                </div>
                <p className="text-[13.5px] font-medium leading-relaxed text-text-primary whitespace-pre-line">
                  {detailsSummaryDisplay}
                </p>
              </section>
            )}

            {lead.nicheTags && lead.nicheTags.length > 0 && (
              <section className="mt-5">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    Required skills
                  </span>
                  <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.nicheTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:border-primary/35 hover:bg-primary/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}


            {lead.hashtags && lead.hashtags.length > 0 && (
              <section className="mt-5">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    Tags
                  </span>
                  <span className="h-px flex-1 bg-white/[0.06]" aria-hidden />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.hashtags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[12px] font-medium text-text-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Deep intel — nested scroller so outer layout stays put */}
          <section className="relative flex min-w-0 flex-col">
            <div className="mb-2.5 flex items-center gap-2 shrink-0">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">
                Deep intel
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-primary/35 to-transparent" aria-hidden />
            </div>

            <div className="relative flex min-h-[240px] max-h-[min(58vh,520px)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] lg:sticky lg:top-0">
              {!lead.isRevealed && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-surface-container-low/70 backdrop-blur-[7px]">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-primary/30 bg-primary/10 mb-2.5">
                    <LockClosedIcon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    Intel locked
                  </p>
                  <p className="mt-1 max-w-[200px] text-center text-[11px] text-text-secondary">
                    Reveal contact to unlock buyer, scope & requirements
                  </p>
                </div>
              )}

              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 scrollbar-hide ${
                  !lead.isRevealed ? 'opacity-30 blur-[2.5px] select-none pointer-events-none' : ''
                }`}
                style={{ WebkitOverflowScrolling: 'touch', userSelect: !lead.isRevealed ? 'none' : 'auto' }}
              >
                {lead.isRevealed ? (
                  <div className="grid grid-cols-1 gap-4">
                    <IntelBlock label="Target buyer" value={lead.buyerType} />
                    <IntelBlock label="Ideal candidate" value={lead.role} />
                    <IntelBlock label="Core scope" value={lead.taskScope} />
                    <IntelBlock label="Requirements" value={lead.mustHave} />
                    <IntelBlock label="Bonus points" value={lead.nicheBonus} />
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-1 gap-4 select-none pointer-events-none"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    aria-hidden="true"
                  >
                    <IntelBlock label="Target buyer" value="Enterprise decision maker actively looking for specialized services." />
                    <IntelBlock label="Ideal candidate" value="Expert partner with proven track record in modern delivery." />
                    <IntelBlock label="Core scope" value="Detailed project deliverables, technical execution scope, and timelines." />
                    <IntelBlock label="Requirements" value="Specific technical criteria, deliverables, and turnaround requirements." />
                    <IntelBlock label="Bonus points" value="Actionable strategic tips to win this client proposal." />
                  </div>
                )}
              </div>

              {/* Fade hint when more content below */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-container-low/90 to-transparent"
                aria-hidden
              />
            </div>
          </section>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="relative z-10 shrink-0 border-t border-white/[0.08] bg-surface-container-high/55 px-4 py-3.5 sm:px-6 sm:py-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            {lead.isRevealed ? (
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-secondary/35 bg-secondary/12 text-secondary">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold text-white">{lead.name}</span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1 truncate text-xs font-medium text-secondary hover:underline"
                  >
                    <EnvelopeIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </a>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-secondary hover:underline"
                    >
                      <PhoneIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{lead.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-3 select-none">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04]">
                  <LockClosedIcon className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="flex flex-col gap-1.5 pointer-events-none">
                  <div className="h-2 w-32 rounded-full bg-white/10 blur-[1px]" />
                  <div className="h-2 w-24 rounded-full bg-white/5 blur-[1px]" />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons: copy dropdown + copy lead intel (or unlock when locked) */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-2.5">
            {!lead.isRevealed ? (
              lead.isClaimedByOther ? (
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-500 select-none">
                  <LockClosedIcon className="h-4 w-4 shrink-0" />
                  <span>Claimed by a member</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  color="mint"
                  size="sm"
                  onClick={handleRevealClick}
                  loading={isRevealing}
                  className="h-11 min-h-0 shrink-0 rounded-xl px-3.5 text-[11px] sm:h-11"
                >
                  {isRevealing ? (
                    <>
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      Unlock & Save
                      <span className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums text-text-secondary">
                        <BanknotesIcon className="w-3 h-3" />{tokenCost ?? '–'}
                      </span>
                    </>
                  )}
                </Button>
              )
            ) : null}

            {/* Copy contact dropdown */}
            <div className="relative shrink-0" ref={copyMenuRef}>
              <button
                type="button"
                onClick={() => setCopyMenuOpen((v) => !v)}
                aria-label="Copy contact options"
                aria-expanded={copyMenuOpen}
                title="Copy contact"
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[11px] font-bold transition-all active:scale-95 ${
                  copyMenuOpen
                    ? 'border-primary/45 bg-primary/12 text-primary'
                    : lead.isRevealed
                      ? 'border-white/[0.12] bg-white/[0.05] text-text-primary hover:border-primary/35 hover:text-primary'
                      : 'border-white/[0.08] bg-white/[0.03] text-text-secondary/60'
                }`}
              >
                <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Copy contact</span>
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${copyMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {copyMenuOpen && (
                <div className="absolute bottom-[calc(100%+8px)] right-0 z-40 w-52 rounded-xl border border-white/[0.1] bg-surface-container-high p-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85)]">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold text-text-primary transition-colors hover:bg-white/5"
                  >
                    <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    Copy email
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyContact}
                    disabled={!lead.isRevealed}
                    title={lead.isRevealed ? 'Copy all contact details' : 'Unlock the lead to copy contact details'}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                      lead.isRevealed
                        ? 'text-text-primary hover:bg-white/5'
                        : 'cursor-not-allowed text-text-secondary/50'
                    }`}
                  >
                    <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                    Copy contact details
                  </button>
                </div>
              )}
            </div>

            {/* Copy lead intel */}
            <button
              type="button"
              onClick={handleCopyIntel}
              disabled={!lead.isRevealed}
              title={lead.isRevealed ? 'Copy lead intel' : 'Unlock lead to copy lead intel'}
              aria-label="Copy lead intel"
              className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[11px] font-bold transition-all ${
                lead.isRevealed
                  ? 'border-secondary/35 bg-secondary/12 text-secondary hover:border-secondary/55 hover:bg-secondary/18 active:scale-95 cursor-pointer'
                  : 'border-white/[0.08] bg-white/[0.03] text-text-secondary/40 cursor-not-allowed opacity-50'
              }`}
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Copy lead intel</span>
            </button>
          </div>
        </div>
        {errorMsg && <div className="mt-2.5 text-xs font-medium text-red-400">{errorMsg}</div>}
      </div>
    </div>
  )
}

function IntelBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-primary/85">
        {label}
      </span>
      <span className="block break-words text-[13px] font-medium leading-relaxed text-text-primary">
        {value}
      </span>
    </div>
  )
}
