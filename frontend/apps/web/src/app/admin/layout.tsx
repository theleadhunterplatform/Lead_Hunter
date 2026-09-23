'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState, useCallback } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { ApifyExhaustionModal } from '@/components/admin/ApifyExhaustionModal'
import { ApifyExhaustionBanner } from '@/components/admin/ApifyExhaustionBanner'

import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftOnRectangleIcon,
  HashtagIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LifebuoyIcon,
  EnvelopeIcon,
  TrophyIcon,
  MegaphoneIcon,
  ChatBubbleBottomCenterTextIcon,
  CreditCardIcon,
} from '@heroicons/react/24/solid'

const adminNav = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Review', href: '/admin/review', icon: ClockIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Contacts', href: '/admin/contacts', icon: UserGroupIcon },
  { name: 'Credits', href: '/admin/credits', icon: CurrencyDollarIcon },
  { name: 'Plans & Pricing', href: '/admin/plans', icon: CreditCardIcon },
  { name: 'Keywords', href: '/admin/keywords', icon: HashtagIcon },
  { name: 'Watchlist', href: '/admin/targets', icon: EyeIcon },
  { name: 'Leads', href: '/admin/leads', icon: SparklesIcon },
  { name: 'Tokens', href: '/admin/tokens', icon: KeyIcon },
  { name: 'RBAC', href: '/admin/rbac', icon: ShieldCheckIcon },
  { name: 'Support', href: '/admin/support', icon: LifebuoyIcon },
  { name: 'Broadcast', href: '/admin/broadcast', icon: MegaphoneIcon },
  { name: 'Newsletter', href: '/admin/newsletter', icon: EnvelopeIcon },
  { name: 'Rewards', href: '/admin/rewards', icon: TrophyIcon },
  { name: 'Community Hub', href: '/admin/community', icon: ChatBubbleBottomCenterTextIcon },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout, firebaseUser } = useAuth()

  const [apifyStatus, setApifyStatus] = useState<{
    exhausted: boolean
    totalKeys: number
    activeKeys: number
    totalRemaining: number
    totalLimit: number
    reason: string
  } | null>(null)

  const checkApifyStatus = useCallback(async () => {
    try {
      const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
      if (!token) return

      const res = await fetch('/api/admin/apify-keys/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()

      if (json.success) {
        setApifyStatus(json)
        if (json.exhausted) {
          const dismissed =
            typeof window !== 'undefined'
              ? sessionStorage.getItem('apify_exhausted_modal_dismissed')
              : null
          if (!dismissed) {
            window.dispatchEvent(
              new CustomEvent('show-apify-exhaustion', {
                detail: {
                  title: 'Apify Scraper Tokens Exhausted',
                  message:
                    json.reason ||
                    'Automatic lead scraping has stopped because all configured Apify tokens have reached their monthly quota.',
                  activeKeys: json.activeKeys,
                  totalKeys: json.totalKeys,
                  totalRemaining: json.totalRemaining,
                  totalLimit: json.totalLimit,
                },
              }),
            )
          }
        }
      }
    } catch (e) {
      console.warn('[Admin Layout] Failed to check Apify token status:', e)
    }
  }, [firebaseUser])

  useEffect(() => {
    if (loading || !user) return
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      router.push('/pending-approval')
      return
    }
    if (user.role !== 'admin') {
      router.push('/admin-register')
      return
    }

    checkApifyStatus()

    const handleKeyUpdate = () => {
      checkApifyStatus()
    }
    window.addEventListener('apify-keys-updated', handleKeyUpdate)
    return () => window.removeEventListener('apify-keys-updated', handleKeyUpdate)
  }, [user, loading, router, checkApifyStatus])

  if (loading) {
    return <CustomLoader page="admin" fullscreen />
  }

  if (!user || user.role !== 'admin' || user.status === 'SUSPENDED' || user.status === 'REJECTED')
    return null

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {apifyStatus?.exhausted && (
        <ApifyExhaustionBanner
          activeKeys={apifyStatus.activeKeys}
          totalKeys={apifyStatus.totalKeys}
          totalRemaining={apifyStatus.totalRemaining}
        />
      )}

      <div className="flex-1 flex min-h-0">
        <aside className="w-64 border-r border-white/[0.06] bg-surface/30 p-6 flex flex-col">
          <Link href="/admin" className="text-lg font-bold text-text-primary tracking-tight mb-8">
            Admin Panel
          </Link>

          <nav className="flex flex-col gap-1 flex-1 overflow-y-auto scrollbar-hide">
            {adminNav.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-mint/10 text-accent-mint border border-accent-mint/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 mt-4"
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            Sign Out
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>

      <ApifyExhaustionModal />
    </div>
  )
}
