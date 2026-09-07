'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

import {
  BoltIcon,
  ViewfinderCircleIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/solid'

const iconMap: Record<string, typeof ViewfinderCircleIcon> = {
  'Signals Intercepted': ViewfinderCircleIcon,
  'Active Conversations': ChatBubbleLeftRightIcon,
  'Avg. Reply Probability': BoltIcon,
  'Credits Remaining': BanknotesIcon,
}

const accentColors = ['mint', 'purple'] as const

export default function DashboardPage() {
  const [stats, setStats] = useState<any[]>([])
  const [activity, setActivity] = useState<{ day: string; value: number }[]>([])
  const [distribution, setDistribution] = useState<
    { label: string; count: number; color: string }[]
  >([])
  const [readyLeadCount, setReadyLeadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getFirebaseToken()
        const res = await fetch('/api/dashboard', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (json.data) {
          if (json.data.stats) setStats(json.data.stats)
          if (json.data.activity) setActivity(json.data.activity)
          if (json.data.distribution) setDistribution(json.data.distribution)
          if (json.data.readyForOutreachCount !== undefined)
            setReadyLeadCount(json.data.readyForOutreachCount)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <CustomLoader page="dashboard" />
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto px-10 py-12 relative scrollbar-hide">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] glow-purple-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">
            Operational Overview
          </h1>
          <p className="text-text-secondary mt-2">
            Welcome back. Here is your pipeline at a glance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => {
            const Icon = iconMap[stat.label] || ViewfinderCircleIcon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group metallic-card p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`p-3 rounded-xl bg-accent-${stat.accent}/10 text-accent-${stat.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {stat.trend && (
                    <span
                      className={`text-11 font-bold ${stat.trendUp ? 'text-accent-mint' : 'text-text-secondary'} flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md`}
                    >
                      {stat.trend}
                    </span>
                  )}
                </div>

                <h3 className="text-3xl font-bold text-text-primary mb-1">{stat.value}</h3>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {stat.label}
                </p>

                <div
                  className={`absolute bottom-0 left-0 w-full h-[2px] bg-accent-${stat.accent}/20 group-hover:bg-accent-${stat.accent}/40 transition-all`}
                />
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 metallic-card p-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Conversion Velocity
                </h3>
                <p className="text-sm text-text-secondary">Activity over the last 7 days</p>
              </div>
            </div>

            <div className="h-[200px] flex items-end justify-between gap-4">
              {activity.length > 0 ? (
                activity.map((data, i) => {
                  const maxValue = Math.max(...activity.map((a) => a.value), 1)
                  const heightPercent = (data.value / maxValue) * 100
                  return (
                    <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPercent * 2, 4)}px` }}
                        transition={{ duration: 1, delay: i * 0.1, ease: 'circOut' }}
                        className="w-full max-w-[40px] rounded-t-xl bg-gradient-to-t from-accent-mint/10 to-accent-mint/40 group-hover:to-accent-mint/60 transition-all relative"
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xxs font-bold text-text-secondary bg-surface-elevated px-2 py-1 rounded border border-border-subtle whitespace-nowrap">
                          {data.value} action{data.value !== 1 ? 's' : ''}
                        </div>
                      </motion.div>
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

          <div className="space-y-6">
            <div className="p-8 rounded-4xl bg-accent-mint text-text-on-accent relative overflow-hidden group">
              <h3 className="text-xl font-bold mb-2">Revealed Leads</h3>
              <p className="text-sm opacity-80 mb-8 leading-relaxed">
                You have {readyLeadCount} high-intent lead{readyLeadCount === 1 ? '' : 's'} revealed
                and ready to work. Save them to your pipeline or export as CSV/Excel.
              </p>
              <Link href="/leads">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-text-on-accent text-accent-mint font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl"
                >
                  Review New Leads
                  <ArrowTopRightOnSquareIcon className="w-[18px] h-[18px]" />
                </motion.button>
              </Link>
            </div>

            <div className="metallic-card p-8">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-6">
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
    </main>
  )
}
