'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { getFirebaseToken } from '@/lib/firebase'
import {
  ViewfinderCircleIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'

const iconMap: Record<string, typeof ViewfinderCircleIcon> = {
  'Signals Intercepted': ViewfinderCircleIcon,
  'Active Conversations': ChatBubbleLeftRightIcon,
  'Response Rate': BoltIcon,
  'Credits Remaining': BanknotesIcon,
}

interface Stat {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  accent: string
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stat[]>([])
  const [activity, setActivity] = useState<{ day: string; value: number }[]>([])
  const [distribution, setDistribution] = useState<
    { label: string; count: number; color: string }[]
  >([])
  const [readyLeadCount, setReadyLeadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getFirebaseToken()
      const res = await fetch('/api/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.data) {
        if (json.data.stats) setStats(json.data.stats)
        if (json.data.activity) setActivity(json.data.activity)
        if (json.data.distribution) setDistribution(json.data.distribution)
        if (json.data.readyForOutreachCount !== undefined)
          setReadyLeadCount(json.data.readyForOutreachCount)
      } else {
        setError(json.message || 'Failed to load analytics.')
      }
    } catch {
      setError('Could not load your analytics. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalDistribution = distribution.reduce((sum, d) => sum + d.count, 0)

  return (
    <main data-lenis-prevent className="flex-1 h-full min-h-0 overflow-y-auto px-8 py-10 relative">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Analytics</h1>
            <p className="text-text-secondary mt-2">Lead intelligence and pipeline performance at a glance.</p>
          </header>

          {loading ? (
            <CustomLoader page="analytics" />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-secondary/20 border border-white/[0.04] rounded-3xl max-w-md mx-auto">
              <h3 className="text-base font-bold text-text-primary mb-2">Couldn&apos;t load analytics</h3>
              <p className="text-sm text-text-secondary/70 mb-6">{error}</p>
              <button
                onClick={load}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-text-primary transition-all inline-flex items-center gap-2"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Stat summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, i) => {
                  const Icon = iconMap[stat.label] || ViewfinderCircleIcon
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="metallic-card p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`p-3 rounded-xl bg-accent-${stat.accent}/10 text-accent-${stat.accent}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {stat.trend && (
                          <span
                            className={`text-11 font-bold ${stat.trendUp ? 'text-accent-mint' : 'text-text-secondary'} bg-white/5 px-2 py-1 rounded-md`}
                          >
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <h3 className="text-3xl font-bold text-text-primary mb-1">{stat.value}</h3>
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        {stat.label}
                      </p>
                    </motion.div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Weekly activity */}
                <div className="lg:col-span-2 metallic-card p-8">
                  <div className="mb-10">
                    <h3 className="text-lg font-bold text-text-primary tracking-tight">
                      Weekly Activity
                    </h3>
                    <p className="text-sm text-text-secondary">Actions over the last 7 days</p>
                  </div>
                  <div className="h-[220px] flex items-end justify-between gap-4">
                    {activity.length > 0 ? (
                      activity.map((data, i) => {
                        const maxValue = Math.max(...activity.map((a) => a.value), 1)
                        const heightPercent = (data.value / maxValue) * 100
                        return (
                          <div key={data.day} className="flex-1 flex flex-col items-center gap-4">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(heightPercent * 2, 4)}px` }}
                              transition={{ duration: 1, delay: i * 0.08, ease: 'circOut' }}
                              className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-accent-mint/10 to-accent-mint/40"
                            >
                              <span className="hidden" />
                            </motion.div>
                            <span className="text-xxs font-bold text-text-secondary uppercase tracking-widest">
                              {data.day}
                            </span>
                          </div>
                        )
                      })
                    ) : (
                      <div className="w-full text-center text-text-secondary text-sm">
                        No activity yet this week
                      </div>
                    )}
                  </div>
                </div>

                {/* Distribution + ready */}
                <div className="space-y-6">
                  <div className="metallic-card p-8">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-2">
                      Lead Distribution
                    </h3>
                    {distribution.length > 0 ? (
                      <>
                        {distribution.map((item) => {
                          const pct = totalDistribution > 0 ? Math.round((item.count / totalDistribution) * 100) : 0
                          return (
                            <div key={item.label} className="mb-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-text-primary">
                                  {item.label}
                                </span>
                                <span
                                  className={`text-xxs font-bold uppercase tracking-widest text-accent-${item.color}`}
                                >
                                  {item.count} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-accent-${item.color}/40`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <div className="text-text-secondary text-xs text-center py-6">
                        Save leads to see distribution
                      </div>
                    )}
                  </div>

                  <div className="p-8 rounded-4xl bg-accent-mint text-text-on-accent">
                    <h3 className="text-lg font-bold mb-1">Ready to work</h3>
                    <p className="text-3xl font-bold">{readyLeadCount}</p>
                    <p className="text-sm opacity-80 mt-2">
                      High-intent leads revealed and ready for outreach.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
  )
}
