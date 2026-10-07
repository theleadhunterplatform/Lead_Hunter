'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BanknotesIcon,
  BookmarkIcon,
  Squares2X2Icon,
  LifebuoyIcon,
  EllipsisHorizontalIcon,
  GiftIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'
import { useAuth } from '@/hooks/useAuth'
import { WolfOrb } from '@/components/chat/WolfOrb'
import { copilotStore, useCopilot } from '@/lib/copilot-store'

const tabs = [
  { name: 'Feed', href: '/leads', icon: BanknotesIcon },
  { name: 'Saved', href: '/saved', icon: BookmarkIcon },
  { name: 'Home', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Support', href: '/support', icon: LifebuoyIcon },
]

const planLimits: Record<string, number> = { FREE: 50, FREELANCER: 1000, AGENCY: 1000 }

interface MobileBottomNavProps {
  /** Renders inline inside a demo frame (no fixed positioning, no real navigation) */
  isDemo?: boolean
  activePathOverride?: string
  onNavigate?: (href: string) => void
  /** Demo-mode credit balance override (avoids reading auth state) */
  demoCredits?: number
  /** Demo-mode plan credit cap override */
  demoPlanMax?: number
}

export function MobileBottomNav({
  isDemo = false,
  activePathOverride,
  onNavigate,
  demoCredits,
  demoPlanMax,
}: MobileBottomNavProps = {}) {
  const routerPathname = usePathname()
  const pathname = activePathOverride || routerPathname
  const { user, logout } = useAuth()
  const copilot = useCopilot()
  const [moreOpen, setMoreOpen] = useState(false)

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isDemo) {
      e.preventDefault()
      onNavigate?.(href)
    }
  }

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    // Demo mode lives inside the hero frame — never lock the landing page scroll.
    if (isDemo) return
    document.body.style.overflow = moreOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen, isDemo])

  const creditTotal = isDemo && demoCredits !== undefined ? demoCredits : user?.creditAccount?.total ?? 0
  const planMax =
    isDemo && demoPlanMax !== undefined ? demoPlanMax : planLimits[user?.plan ?? 'FREE'] ?? 50

  const isMoreActive =
    pathname.startsWith('/referrals') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/analytics')

  return (
    <>
      <nav
        aria-label="Primary"
        className={`${
          isDemo ? 'relative z-40 bottom-auto inset-x-auto' : 'fixed bottom-0 inset-x-0 z-40'
        } md:hidden bg-surface/90 backdrop-blur-xl border-t border-white/[0.06]`}
      >
        <div className="flex items-stretch h-16 safe-area-bottom">
          {tabs.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.name}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleNavClick(e, tab.href)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors active:scale-95 ${
                  isActive ? 'text-accent-orange' : 'text-text-secondary'
                }`}
              >
                <tab.icon className="w-[22px] h-[22px]" />
                <span className="text-[10px] font-semibold leading-none">{tab.name}</span>
                <span
                  className={`h-1 w-1 rounded-full transition-opacity ${
                    isActive ? 'bg-accent-orange opacity-100' : 'opacity-0'
                  }`}
                />
              </Link>
            )
          })}
          {!isDemo && (
            <button
              type="button"
              onClick={() => copilotStore.open()}
              aria-label="Open Hunter Copilot"
              aria-haspopup="dialog"
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors active:scale-95 ${
                copilot.open ? 'text-accent-orange' : 'text-text-secondary'
              }`}
            >
              <WolfOrb
                size="xxs"
                state={copilot.open ? 'online' : 'idle'}
                showRing={false}
                showStatus={false}
                showGlow={false}
                trackPointer={false}
                ariaLabel="Hunter Copilot"
              />
              <span className="text-[10px] font-semibold leading-none">Copilot</span>
              <span
                className={`h-1 w-1 rounded-full transition-opacity ${
                  copilot.open ? 'bg-accent-orange opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More options"
            aria-expanded={moreOpen}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors active:scale-95 ${
              isMoreActive ? 'text-accent-orange' : 'text-text-secondary'
            }`}
          >
            <EllipsisHorizontalIcon className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-semibold leading-none">More</span>
            <span
              className={`h-1 w-1 rounded-full transition-opacity ${
                isMoreActive ? 'bg-accent-orange opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`${
              isDemo ? 'absolute inset-0 z-50' : 'fixed inset-0 z-50'
            } md:hidden`}
            role="dialog"
            aria-modal="true"
            aria-label="More options"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 bg-surface-elevated border-t border-white/10 rounded-t-3xl p-4 pb-6 safe-area-bottom"
            >
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />
              <div className="flex items-center justify-between px-2 py-3 mb-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Credits
                </span>
                <span className="text-sm font-bold text-accent-orange tabular-nums">
                  {creditTotal} / {planMax}
                </span>
              </div>
              {[
                { name: 'Refer & Earn', href: '/referrals', icon: GiftIcon },
                { name: 'Analytics', href: '/analytics', icon: Squares2X2Icon },
                { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="w-full flex items-center gap-3 px-2 py-3.5 rounded-2xl text-text-primary hover:bg-white/5 transition-colors min-h-[56px]"
                >
                  <item.icon className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
              <button
                type="button"
                onClick={(e) => {
                  if (isDemo) {
                    e.preventDefault()
                    setMoreOpen(false)
                    return
                  }
                  setMoreOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-3 px-2 py-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors min-h-[56px]"
              >
                <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 p-2 rounded-full text-text-secondary hover:bg-white/5 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
