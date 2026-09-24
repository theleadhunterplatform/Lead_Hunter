'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Squares2X2Icon,
  BanknotesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  LifebuoyIcon,
  GiftIcon,
  TrophyIcon,
  SparklesIcon,
  CreditCardIcon,
} from '@heroicons/react/24/solid'

const navItems = [
  { name: 'Lead Feed', href: '/leads', icon: BanknotesIcon },
  { name: 'Saved Leads', href: '/saved', icon: BookmarkIcon },
  { name: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Pricing & Plans', href: '/pricing', icon: CreditCardIcon },
  { name: 'Refer & Earn', href: '/referrals', icon: GiftIcon },
  { name: 'Milestone Rewards', href: '/rewards', icon: TrophyIcon },
  { name: 'Community Wins', href: '/community', icon: SparklesIcon },
  { name: 'Support', href: '/support', icon: LifebuoyIcon },
]

interface AppSidebarProps {
  activePathOverride?: string
  isDemo?: boolean
  isSneakPeek?: boolean
  onNavItemClick?: (href: string) => void
}

export default function AppSidebar({
  activePathOverride,
  isDemo = false,
  isSneakPeek = false,
  onNavItemClick,
}: AppSidebarProps = {}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-collapse on small screens so content keeps room on mobile
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setIsCollapsed(true)
    }
  }, [])
  const routerPathname = usePathname()
  const pathname = activePathOverride || routerPathname
  const { user, logout } = useAuth()
  const router = useRouter()

  const planLimits: Record<string, number> = { FREE: 50, FREELANCER: 500, AGENCY: 1000 }
  const planMax = planLimits[user?.plan ?? 'FREE'] ?? 50
  const creditTotal = user?.creditAccount?.total ?? 0
  const creditPercentage = Math.min(100, (creditTotal / planMax) * 100)

  return (
    <aside
      style={{
        width: isCollapsed ? '68px' : isDemo ? '170px' : '215px',
        transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className={
        isDemo
          ? 'h-full bg-surface/90 border-r border-white/[0.06] flex flex-col z-40 transition-colors rounded-l-[16px] overflow-hidden select-none shrink-0'
          : 'h-[calc(100vh-24px)] my-3 ml-3 bg-surface/70 backdrop-blur-lg border border-white/[0.06] shadow-2xl flex flex-col z-40 transition-all duration-200 rounded-2xl overflow-hidden shrink-0'
      }
    >
      {/* Sidebar Header */}
      <div
        className={`h-14 flex items-center shrink-0 border-b border-white/[0.04] transition-all duration-200 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
        }`}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap min-w-0">
              <Image
                src="/logo.svg"
                alt="Lead Hunter Club"
                width={24}
                height={24}
                className="w-6 h-6 rounded-lg shrink-0"
              />
              <span className="font-semibold text-sm text-text-primary tracking-tight truncate">
                Lead Hunter Club
              </span>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              className="min-w-[24px] min-h-[24px] p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors active:scale-95 shrink-0 flex items-center justify-center"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand sidebar"
            className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center text-text-secondary hover:text-accent-orange transition-all relative group"
          >
            <Image
              src="/logo.svg"
              alt="Lead Hunter Club"
              width={22}
              height={22}
              className="w-[22px] h-[22px] rounded-md transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 group-hover:-translate-x-0.5 shrink-0 absolute"
            />
            <ChevronRightIcon className="w-5 h-5 absolute opacity-0 scale-75 -translate-x-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <div
        className={`flex-1 py-3 space-y-1.5 overflow-y-auto scrollbar-hide ${
          isCollapsed ? 'px-2' : 'px-3'
        }`}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href + '/')) ||
            (isSneakPeek && item.name === 'Lead Feed')
          const isBlurred = isSneakPeek && item.name !== 'Lead Feed'

          return (
            <Link
              key={item.href}
              href={isDemo || isBlurred ? '#' : item.href}
              title={isCollapsed ? item.name : undefined}
              onClick={(e) => {
                if (isDemo || isBlurred) {
                  e.preventDefault()
                  if (isDemo && onNavItemClick) {
                    onNavItemClick(item.href)
                  }
                }
              }}
              className={`block relative ${isBlurred ? 'opacity-40 blur-[2px] cursor-not-allowed select-none' : ''}`}
            >
              <div
                className={`flex items-center rounded-xl transition-all duration-200 ${
                  isCollapsed
                    ? `w-10 h-10 mx-auto justify-center ${
                        isActive
                          ? 'text-accent-orange bg-accent-orange/10 border border-accent-orange/25 shadow-[inset_0_0_12px_rgba(var(--rgb-accent-orange),0.15)]'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                      }`
                    : `gap-3 px-3 py-2.5 ${
                        isActive
                          ? 'text-accent-orange bg-accent-orange/10 border border-accent-orange/20 shadow-[inset_0_0_12px_rgba(var(--rgb-accent-orange),0.15)]'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                      }`
                }`}
              >
                <item.icon className="w-[18px] h-[18px] text-current shrink-0" />

                {!isCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden truncate">
                    {item.name}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Token Status */}
      {!isCollapsed ? (
        <div className="px-3 mb-4 shrink-0 overflow-hidden whitespace-nowrap">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BanknotesIcon className="w-[14px] h-[14px] text-accent-orange" />
                <span className="text-xxs font-bold text-text-primary uppercase tracking-widest">
                  Credits
                </span>
              </div>
              <span className="text-xxs font-bold text-text-secondary tabular-nums">
                {creditTotal} / {planMax}
              </span>
            </div>

            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${creditPercentage}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-accent-orange shadow-[0_0_10px_rgba(var(--rgb-accent-orange),0.5)]"
              />
            </div>

            {user?.creditAccount?.rolloverBalance ? (
              <div className="flex items-center justify-between text-xxs">
                <span className="text-text-secondary">Rollover</span>
                <span className="font-bold text-accent-orange">
                  {user.creditAccount.rolloverBalance}
                  {user.creditAccount.rolloverExpiresAt
                    ? ` · expires ${new Date(user.creditAccount.rolloverExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : ''}
                </span>
              </div>
            ) : null}

            <Link
              href="/pricing?tab=refills"
              className="min-h-[24px] text-9 font-bold text-accent-orange uppercase tracking-super hover:opacity-80 transition-opacity block pt-0.5"
            >
              Refill Pipeline →
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-2 mb-3 shrink-0 flex justify-center group/credit relative">
          <Link
            href="/pricing"
            title={`Credits: ${creditTotal} / ${planMax} · Click to view plans & refill`}
            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center relative cursor-pointer hover:border-accent-orange/30 hover:bg-white/[0.06] transition-all duration-300"
          >
            {/* Dynamic Radial Progress SVG */}
            <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
              {/* Background ring */}
              <circle
                cx="18"
                cy="18"
                r="14"
                className="text-white/10"
                strokeWidth="2.5"
                stroke="currentColor"
                fill="none"
              />
              {/* Progress ring */}
              <motion.circle
                cx="18"
                cy="18"
                r="14"
                className="text-accent-orange"
                strokeWidth="2.5"
                strokeDasharray={2 * Math.PI * 14}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - creditPercentage / 100) }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(255, 184, 107, 0.45))',
                }}
              />
            </svg>

            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <BanknotesIcon className="w-3.5 h-3.5 text-accent-orange group-hover/credit:scale-110 transition-transform duration-200" />
            </div>
          </Link>

          {/* Hover Tooltip */}
          <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-surface-elevated border border-white/10 shadow-2xl backdrop-blur-xl opacity-0 pointer-events-none group-hover/credit:opacity-100 group-hover/credit:pointer-events-auto transition-all duration-200 z-50 whitespace-nowrap">
            <div className="flex items-center gap-1.5 text-xxs font-bold text-text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse" />
              <span>Credits: {creditTotal} / {planMax}</span>
              <span className="text-text-secondary font-normal">({Math.round(creditPercentage)}%)</span>
            </div>
            {user?.creditAccount?.rolloverBalance ? (
              <div className="text-[10px] text-accent-orange font-medium mt-0.5">
                +{user.creditAccount.rolloverBalance} Rollover
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sidebar Footer */}
      <div
        className={`py-3 border-t border-white/[0.04] space-y-1 shrink-0 ${
          isCollapsed ? 'px-2' : 'px-3'
        }`}
      >
        <Link
          href={isDemo || isSneakPeek ? '#' : '/settings'}
          title={isCollapsed ? 'Settings' : undefined}
          onClick={(e) => {
            if (isDemo || isSneakPeek) {
              e.preventDefault()
              if (isDemo && onNavItemClick) {
                onNavItemClick('/settings')
              }
            }
          }}
          className={`block relative ${isSneakPeek ? 'opacity-40 blur-[2px] cursor-not-allowed select-none' : ''}`}
        >
          <div
            className={`flex items-center rounded-xl transition-all duration-200 ${
              isCollapsed
                ? `w-10 h-10 mx-auto justify-center ${
                    pathname === '/settings' || pathname.startsWith('/settings/')
                      ? 'text-accent-orange bg-accent-orange/10 border border-accent-orange/25'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  }`
                : `gap-3 px-3 py-2.5 ${
                    pathname === '/settings' || pathname.startsWith('/settings/')
                      ? 'text-accent-orange bg-accent-orange/10 border border-accent-orange/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                  }`
            }`}
          >
            <Cog6ToothIcon className="w-[18px] h-[18px] text-current shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden truncate">
                Settings
              </span>
            )}
          </div>
        </Link>
        <button
          className={`w-full relative ${isSneakPeek ? 'opacity-40 blur-[2px] cursor-not-allowed select-none' : ''}`}
          title={isCollapsed ? 'Sign Out' : undefined}
          onClick={(e) => {
            if (isSneakPeek) {
              e.preventDefault()
              return
            }
            logout()
          }}
        >
          <div
            className={`flex items-center rounded-xl text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200 ${
              isCollapsed ? 'w-10 h-10 mx-auto justify-center' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <ArrowLeftStartOnRectangleIcon className="w-[18px] h-[18px] text-current shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap overflow-hidden truncate">
                Sign Out
              </span>
            )}
          </div>
        </button>
      </div>
    </aside>
  )
}
