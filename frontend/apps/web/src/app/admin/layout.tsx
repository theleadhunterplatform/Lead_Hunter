'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'
import { CustomLoader } from '@/components/ui/CustomLoader'

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
} from '@heroicons/react/24/solid'

const adminNav = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Review', href: '/admin/review', icon: ClockIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Contacts', href: '/admin/contacts', icon: UserGroupIcon },
  { name: 'Credits', href: '/admin/credits', icon: CurrencyDollarIcon },
  { name: 'Keywords', href: '/admin/keywords', icon: HashtagIcon },
  { name: 'Watchlist', href: '/admin/targets', icon: EyeIcon },
  { name: 'Leads', href: '/admin/leads', icon: SparklesIcon },
  { name: 'Tokens', href: '/admin/tokens', icon: KeyIcon },
  { name: 'RBAC', href: '/admin/rbac', icon: ShieldCheckIcon },
  { name: 'Support', href: '/admin/support', icon: LifebuoyIcon },
  { name: 'Newsletter', href: '/admin/newsletter', icon: EnvelopeIcon },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (loading || !user) return
    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      router.push('/pending-approval')
      return
    }
    if (user.role !== 'admin') {
      router.push('/admin-register')
    }
  }, [user, loading, router])

  if (loading) {
    return <CustomLoader page="admin" fullscreen />
  }

  if (!user || user.role !== 'admin' || user.status === 'SUSPENDED' || user.status === 'REJECTED')
    return null

  return (
    <div className="min-h-screen bg-bg-main flex">
      <aside className="w-64 border-r border-white/[0.06] bg-surface/30 p-6 flex flex-col">
        <Link href="/admin" className="text-lg font-bold text-text-primary tracking-tight mb-8">
          Admin Panel
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
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
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        >
          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
          Sign Out
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
