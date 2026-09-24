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

const tabs = [
  { name: 'Feed', href: '/leads', icon: BanknotesIcon },
  { name: 'Saved', href: '/saved', icon: BookmarkIcon },
  { name: 'Home', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Support', href: '/support', icon: LifebuoyIcon },
]

const planLimits: Record<string, number> = { FREE: 50, FREELANCER: 1000, AGENCY: 1000 }

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  const creditTotal = user?.creditAccount?.total ?? 0
  const planMax = planLimits[user?.plan ?? 'FREE'] ?? 50

  const isMoreActive =
    pathname.startsWith('/referrals') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/analytics')

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-surface/90 backdrop-blur-xl border-t border-white/[0.06]"
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
            className="fixed inset-0 z-50 md:hidden"
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
                  className="w-full flex items-center gap-3 px-2 py-3.5 rounded-2xl text-text-primary hover:bg-white/5 transition-colors min-h-[56px]"
                >
                  <item.icon className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
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
