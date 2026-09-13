'use client'

import { BanknotesIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/solid'
import { Modal } from './Modal'
import { Button } from './Button'

export type UpgradeNudgeVariant = 'upgrade' | 'renewal' | 'low-credits' | 'out-of-credits'

interface UpgradeNudgePopupProps {
  open: boolean
  variant?: UpgradeNudgeVariant
  plan?: string
  creditsRemaining?: number
  planMax?: number
  renewalDate?: string
  onClose: () => void
  // You wire this to your upgrade / billing flow. UI only — no API calls here.
  onUpgrade?: () => void
}

const copy: Record<UpgradeNudgeVariant, { title: string; heading: string; body: string; cta: string }> = {
  upgrade: {
    title: 'Upgrade plan',
    heading: 'You’re on Free — unlock more pipeline',
    body: 'Paid plans get more credits, faster reveals and priority signals. Upgrade when you’re ready — your saved leads stay put.',
    cta: 'View paid plans',
  },
  renewal: {
    title: 'Plan renewal',
    heading: 'Your plan renews soon',
    body: 'Renew to keep your credits flowing and avoid a gap in reveals. Your saved leads and outreach history are untouched.',
    cta: 'Renew plan',
  },
  'low-credits': {
    title: 'Credits running low',
    heading: 'You’re almost out of credits',
    body: 'Top up or upgrade so you can keep unlocking contacts without interruption.',
    cta: 'Top up credits',
  },
  'out-of-credits': {
    title: 'Out of credits',
    heading: 'You’ve used all your credits',
    body: 'Unlocks are paused until you top up or renew. Upgrade for a bigger monthly allowance.',
    cta: 'Get more credits',
  },
}

export function UpgradeNudgePopup({
  open,
  variant = 'upgrade',
  plan = 'FREE',
  creditsRemaining,
  planMax,
  renewalDate,
  onClose,
  onUpgrade,
}: UpgradeNudgePopupProps) {
  const c = copy[variant]
  const showCredits = typeof creditsRemaining === 'number'
  const pct =
    showCredits && planMax && planMax > 0
      ? Math.min(100, Math.max(0, (creditsRemaining! / planMax) * 100))
      : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={c.title}
      size="sm"
      actions={
        <>
          <Button variant="ghost" color="mint" onClick={onClose}>
            Maybe later
          </Button>
          <Button variant="primary" color="mint" onClick={onUpgrade ?? onClose}>
            {c.cta} →
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center shrink-0">
          {variant === 'renewal' ? (
            <ArrowPathIcon className="w-5 h-5 text-accent-orange" />
          ) : variant === 'upgrade' ? (
            <SparklesIcon className="w-5 h-5 text-accent-orange" />
          ) : (
            <BanknotesIcon className="w-5 h-5 text-accent-orange" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-text-primary font-bold leading-snug">{c.heading}</p>
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mt-0.5">
            Current plan · {plan}
          </p>
        </div>
      </div>

      <p>{c.body}</p>

      {showCredits && (
        <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-text-primary uppercase tracking-widest text-[10px]">
              Credits remaining
            </span>
            <span className="font-bold text-text-secondary tabular-nums">
              {creditsRemaining}
              {typeof planMax === 'number' ? ` / ${planMax}` : ''}
            </span>
          </div>
          {pct !== null && (
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                style={{ width: `${pct}%` }}
                className="h-full bg-accent-orange rounded-full transition-all"
              />
            </div>
          )}
        </div>
      )}

      {variant === 'renewal' && renewalDate && (
        <p className="mt-3 text-xs">Renews on {renewalDate}.</p>
      )}
    </Modal>
  )
}
