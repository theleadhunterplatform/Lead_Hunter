'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getFirebaseToken } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { TutorialPopup } from '@/components/onboarding/TutorialPopup'

import {
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'

export default function DashboardPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<any[]>([])
  const [activity, setActivity] = useState<{ day: string; value: number }[]>([])
  const [distribution, setDistribution] = useState<
    { label: string; count: number; color: string }[]
  >([])
  const [readyLeadCount, setReadyLeadCount] = useState(0)
  const [selectedBar, setSelectedBar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (userInitiated = false) => {
    try {
      if (userInitiated) setLoading(true)
      setError(null)
      const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
      if (!token) {
        if (!authLoading) {
          router.push('/login')
        }
        return
      }
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.data) {
        if (json.data.stats) setStats(json.data.stats)
        if (json.data.activity) setActivity(json.data.activity)
        if (json.data.distribution) setDistribution(json.data.distribution)
        if (json.data.readyForOutreachCount !== undefined)
          setReadyLeadCount(json.data.readyForOutreachCount)
      } else {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        if (json.code === 'EMAIL_NOT_VERIFIED') {
          router.push('/verify-email')
          return
        }
        if (json.code === 'ONBOARDING_REQUIRED') {
          router.push('/onboarding')
          return
        }
        if (json.code === 'INACTIVE' || json.code === 'PENDING_APPROVAL') {
          router.push('/pending-approval')
          return
        }
        setError(json.message || 'Failed to load dashboard data.')
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Could not load your dashboard. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, authLoading, router])

  useEffect(() => {
    if (!authLoading) {
      load()
    }
  }, [authLoading, load])

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <CustomLoader page="dashboard" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-secondary/20 border border-white/[0.04] rounded-3xl max-w-md">
          <h3 className="text-base font-bold text-text-primary mb-2">Couldn&apos;t load your dashboard</h3>
          <p className="text-sm text-text-secondary/70 mb-6">{error}</p>
          <button
            onClick={() => load(true)}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-text-primary transition-all inline-flex items-center gap-2"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main data-lenis-prevent className="flex-1 h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-10 pt-8 pb-28 md:py-12 relative scrollbar-hide">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Operational Overview
          </h1>
          <p className="text-text-secondary mt-2">
            Welcome back. Here is your pipeline at a glance.
          </p>
        </div>

        <div className="metallic-card overflow-hidden mb-8 md:mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const isLast = i === stats.length - 1
              const classes = [
                'p-5 sm:p-6',
                !isLast && 'border-b border-white/[0.06]',
                i % 2 === 0 && 'sm:border-r sm:border-white/[0.06]',
                i >= 2 && 'sm:border-b-0',
                'lg:border-b-0',
                !isLast && 'lg:border-r lg:border-white/[0.06]',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div key={stat.label} className={classes}>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                    {stat.label}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={`text-3xl font-extrabold tabular-nums tracking-tight ${
                        stat.label === 'Credits Remaining' ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span
                        className={`text-[11px] font-bold ${
                          stat.trendUp ? 'text-accent-mint' : 'text-text-secondary'
                        }`}
                      >
                        {stat.trend}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 metallic-card p-5 sm:p-8">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Conversion Velocity
                </h3>
                <p className="text-sm text-text-secondary">Activity over the last 7 days</p>
              </div>
            </div>

            <div className="h-[200px] flex items-end justify-between gap-2 sm:gap-4">
              {activity.length > 0 ? (
                activity.map((data) => {
                  const maxValue = Math.max(...activity.map((a) => a.value), 1)
                  const heightPercent = (data.value / maxValue) * 100
                  const isBarOpen = selectedBar === data.day
                  return (
                    <div
                      key={data.day}
                      role="button"
                      tabIndex={0}
                      aria-label={`${data.day}: ${data.value} action${data.value !== 1 ? 's' : ''}`}
                      onClick={() => setSelectedBar(isBarOpen ? null : data.day)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedBar(isBarOpen ? null : data.day)
                        }
                      }}
                      className="flex-1 flex flex-col items-center gap-4 group cursor-pointer min-w-[28px]"
                    >
                      <div
                        style={{ height: `${Math.max(heightPercent * 2, 4)}px`, transition: 'height 400ms ease' }}
                        className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-accent-mint/10 to-accent-mint/40 group-hover:to-accent-mint/60 transition-all relative"
                      >
                        <div className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-opacity text-xxs font-bold text-text-secondary bg-surface-elevated px-2 py-1 rounded border border-border-subtle whitespace-nowrap ${isBarOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {data.value} action{data.value !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className="text-xxs font-bold text-text-secondary uppercase tracking-widest">
                        {data.day}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="w-full flex items-center justify-center text-text-secondary text-sm">
                  No activity yet this week
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="p-5 sm:p-8 metallic-card bg-gradient-to-br from-accent-mint/20 to-accent-mint/5 border-accent-mint/30 relative overflow-hidden group">
              <h3 className="text-xl font-bold mb-2">Revealed Leads</h3>
              <p className="text-sm opacity-80 mb-6 md:mb-8 leading-relaxed">
                You have {readyLeadCount} high-intent lead{readyLeadCount === 1 ? '' : 's'} revealed
                and ready to work. Save them to your pipeline or export as CSV/Excel.
              </p>
              <Link href="/leads">
                <button className="w-full py-4 bg-accent-mint text-text-on-accent font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]">
                  Review New Leads
                  <ArrowTopRightOnSquareIcon className="w-[18px] h-[18px]" />
                </button>
              </Link>
            </div>

            <div className="metallic-card p-5 sm:p-8">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 md:mb-6">
                Lead Distribution
              </h3>
              <div className="space-y-4">
                {distribution.length > 0 ? (
                  distribution.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                      <span
                        className={`text-xxs font-bold uppercase tracking-widest text-accent-${item.color}`}
                      >
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-text-secondary text-xs text-center py-4">
                    Save leads to see distribution
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <TutorialPopup />
    </main>
  )
}
