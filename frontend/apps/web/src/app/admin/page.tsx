'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  EyeIcon,
  LifebuoyIcon,
  EnvelopeIcon,
  TrophyIcon,
} from '@heroicons/react/24/solid'

interface AdminStats {
  totalUsers: number
  pendingUsers: number
  activeUsers: number
  rejectedUsers: number
  suspendedUsers: number
}

interface CountItem {
  label: string
  count: number
}

interface Insights {
  persona: {
    personaUsers: number
    servicesByGroup: { id: string; name: string; icon: string; count: number }[]
    topServices: CountItem[]
    experience: CountItem[]
    discoverySources: CountItem[]
    topLeadCategories: CountItem[]
  }
  growth: {
    weekly: CountItem[]
    totalUsers: number
    activeUsers: number
    onboarded: number
    conversionPct: number
    onboardingPct: number
    signups7d: number
    signups30d: number
  }
  revenue: {
    planMix: CountItem[]
    paidUsers: number
    totalRevenue: number
    monthRevenue: number
    paymentCount: number
  }
  activation: {
    signedUp: number
    onboarded: number
    revealedUsers: number
    savedUsers: number
  }
  ops: {
    openTickets: number
    pendingProofs: number
    subscribers: number
    referrals: number
  }
}

const BAR_COLORS = [
  'bg-accent-mint/40',
  'bg-accent-purple/40',
  'bg-accent-cyan/40',
  'bg-accent-orange/40',
  'bg-accent-pink/40',
]

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">{title}</h2>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  )
}

function BarRow({
  label,
  count,
  total,
  color,
  index = 0,
  href,
}: {
  label: string
  count: number
  total: number
  color: string
  index?: number
  href?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const row = (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5 gap-3">
        <span className="text-xs font-semibold text-text-primary truncate">{label}</span>
        <span className="text-xxs font-bold uppercase tracking-widest text-text-secondary tabular-nums shrink-0">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: index * 0.05, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
  return href ? (
    <Link href={href} className="block hover:opacity-80 transition-opacity">
      {row}
    </Link>
  ) : (
    row
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
      <p className="text-xl font-bold text-text-primary tabular-nums">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
      {sub && <p className="text-xxs text-text-secondary/70 mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-text-secondary py-6 text-center">{text}</p>
}

function InsightSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-surface/40 border border-white/[0.06] rounded-2xl p-6 h-56 animate-pulse"
        >
          <div className="h-3 w-32 bg-white/10 rounded mb-6" />
          <div className="space-y-4">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-1.5 bg-white/5 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlightPending, setHighlightPending] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.data) {
        setStats((prev) => {
          if (prev && json.data.pendingUsers > prev.pendingUsers) {
            setHighlightPending(true)
            setTimeout(() => setHighlightPending(false), 3000)
          }
          return json.data
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInsights = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) {
      setInsightsLoading(false)
      return
    }
    try {
      const res = await fetch('/api/admin/insights', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.data) setInsights(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    fetchInsights()
    const interval = setInterval(fetchInsights, 60000)
    return () => clearInterval(interval)
  }, [fetchInsights])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: UsersIcon,
      color: 'text-text-primary',
      bg: 'bg-white/[0.04]',
    },
    {
      label: 'Pending Review',
      value: stats?.pendingUsers ?? 0,
      icon: ClockIcon,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/5',
    },
    {
      label: 'Active',
      value: stats?.activeUsers ?? 0,
      icon: CheckCircleIcon,
      color: 'text-green-400',
      bg: 'bg-green-500/5',
    },
    {
      label: 'Rejected',
      value: stats?.rejectedUsers ?? 0,
      icon: XCircleIcon,
      color: 'text-red-400',
      bg: 'bg-red-500/5',
    },
  ]

  const maxWeekly = insights ? Math.max(1, ...insights.growth.weekly.map((w) => w.count)) : 1

  const opsChips = insights
    ? [
        {
          label: 'Open tickets',
          value: insights.ops.openTickets,
          icon: LifebuoyIcon,
          href: '/admin/support',
          color: 'text-accent-orange',
          bg: 'bg-accent-orange/10',
        },
        {
          label: 'Pending proofs',
          value: insights.ops.pendingProofs,
          icon: TrophyIcon,
          href: '/admin/rewards',
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
        },
        {
          label: 'Subscribers',
          value: insights.ops.subscribers,
          icon: EnvelopeIcon,
          href: '/admin/newsletter',
          color: 'text-accent-mint',
          bg: 'bg-accent-mint/10',
        },
        {
          label: 'Referrals',
          value: insights.ops.referrals,
          icon: UsersIcon,
          href: '',
          color: 'text-accent-cyan',
          bg: 'bg-accent-cyan/10',
        },
      ]
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Manage users and applications</p>
        </div>
        <Link
          href="/admin/users?status=PENDING"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all"
        >
          Review Pending
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 ${
              card.label === 'Pending Review' && highlightPending
                ? 'ring-2 ring-yellow-400/50 animate-pulse'
                : ''
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-4`}
            >
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{card.value}</p>
            <p className="text-xs text-text-secondary mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {stats && stats.pendingUsers > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Pending Reviews</h3>
          <p className="text-sm text-text-secondary">
            {stats.pendingUsers} user{stats.pendingUsers !== 1 ? 's' : ''} waiting for approval.{' '}
            <Link href="/admin/users?status=PENDING" className="text-accent-mint hover:underline">
              Review now
            </Link>
          </p>
        </div>
      )}

      {/* ── Insights ─────────────────────────────────────────────────── */}
      {insightsLoading ? (
        <InsightSkeleton />
      ) : insights ? (
        <div className="space-y-8">
          {/* Growth & funnel */}
          <div>
            <SectionTitle title="Growth & funnel" hint="Signups, activation and conversion" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-accent-mint" />
                  <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    Signups · last 8 weeks
                  </h3>
                </div>
                <p className="text-xxs text-text-secondary mb-6">
                  {insights.growth.signups7d} this week · {insights.growth.signups30d} last 30 days
                </p>
                <div className="flex items-end gap-2 h-36">
                  {insights.growth.weekly.map((w, i) => (
                    <div key={`${w.label}-${i}`} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xxs font-bold text-text-secondary tabular-nums">
                        {w.count || ''}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max((w.count / maxWeekly) * 100, 2)}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                        className="w-full min-h-[4px] rounded-t-md bg-gradient-to-t from-accent-mint/10 to-accent-mint/40"
                      />
                      <span className="text-xxs text-text-secondary whitespace-nowrap">{w.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Funnel
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Signed up" value={insights.growth.totalUsers} />
                  <MiniStat label="Active" value={insights.growth.activeUsers} sub={`${insights.growth.conversionPct}% of signups`} />
                  <MiniStat label="Onboarded" value={insights.growth.onboarded} sub={`${insights.growth.onboardingPct}% of signups`} />
                  <MiniStat label="Paid plans" value={insights.revenue.paidUsers} />
                </div>
              </Card>
            </div>
          </div>

          {/* User persona */}
          <div>
            <SectionTitle
              title="Who are our users"
              hint={`Persona signals from ${insights.persona.personaUsers} profile${insights.persona.personaUsers !== 1 ? 's' : ''} with services on file`}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Services they offer
                </h3>
                {insights.persona.servicesByGroup.some((g) => g.count > 0) ? (
                  <div className="space-y-3">
                    {insights.persona.servicesByGroup
                      .filter((g) => g.count > 0)
                      .map((g, i) => (
                        <BarRow
                          key={g.id}
                          label={`${g.icon} ${g.name}`}
                          count={g.count}
                          total={insights.persona.personaUsers || 1}
                          color={BAR_COLORS[i % BAR_COLORS.length]}
                          index={i}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState text="No services recorded yet" />
                )}
                {insights.persona.topServices.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-white/[0.06]">
                    <h4 className="text-xxs font-semibold text-text-secondary uppercase tracking-widest mb-3">
                      Top services · click to filter
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {insights.persona.topServices.map((s) => (
                        <Link
                          key={s.label}
                          href={`/admin/users?service=${encodeURIComponent(s.label)}&status=ALL`}
                          className="text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-text-primary hover:border-accent-mint/40 hover:text-accent-mint transition-all"
                        >
                          {s.label}{' '}
                          <span className="text-text-secondary tabular-nums">{s.count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Outreach experience
                </h3>
                {insights.persona.experience.some((e) => e.count > 0) ? (
                  <div className="space-y-3">
                    {insights.persona.experience
                      .filter((e) => e.count > 0)
                      .map((e, i) => (
                        <BarRow
                          key={e.label}
                          label={e.label}
                          count={e.count}
                          total={insights.persona.personaUsers || 1}
                          color={BAR_COLORS[i % BAR_COLORS.length]}
                          index={i}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState text="No experience data yet" />
                )}

                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mt-6 mb-4">
                  Lead categories they want
                </h3>
                {insights.persona.topLeadCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {insights.persona.topLeadCategories.map((c) => (
                      <span
                        key={c.label}
                        className="text-xs px-3 py-1.5 rounded-full bg-accent-mint/10 border border-accent-mint/20 text-accent-mint"
                      >
                        {c.label}{' '}
                        <span className="tabular-nums opacity-70">{c.count}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No category preferences yet" />
                )}
              </Card>

              <Card>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Where they come from
                </h3>
                {insights.persona.discoverySources.length > 0 ? (
                  <div className="space-y-3">
                    {insights.persona.discoverySources.map((s, i) => (
                      <BarRow
                        key={s.label}
                        label={s.label}
                        count={s.count}
                        total={insights.persona.personaUsers || 1}
                        color={BAR_COLORS[i % BAR_COLORS.length]}
                        index={i}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No discovery source data yet" />
                )}
              </Card>
            </div>
          </div>

          {/* Revenue & plans */}
          <div>
            <SectionTitle title="Revenue & plans" hint="Payment credit totals and plan distribution" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <BanknotesIcon className="w-4 h-4 text-accent-orange" />
                  <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    Totals
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="All-time revenue" value={INR.format(insights.revenue.totalRevenue)} />
                  <MiniStat label="This month" value={INR.format(insights.revenue.monthRevenue)} />
                  <MiniStat label="Paid users" value={insights.revenue.paidUsers} />
                  <MiniStat label="Payments" value={insights.revenue.paymentCount} />
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Plan mix
                </h3>
                {insights.revenue.planMix.length > 0 ? (
                  <div className="space-y-3">
                    {insights.revenue.planMix.map((p, i) => (
                      <BarRow
                        key={p.label}
                        label={p.label}
                        count={p.count}
                        total={insights.revenue.planMix.reduce((s, x) => s + x.count, 0) || 1}
                        color={BAR_COLORS[i % BAR_COLORS.length]}
                        index={i}
                        href={`/admin/users?search=&status=ALL`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No users yet" />
                )}
              </Card>
            </div>
          </div>

          {/* Activation & engagement */}
          <div>
            <SectionTitle title="Activation & engagement" hint="How far users get after signing up" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <EyeIcon className="w-4 h-4 text-accent-purple" />
                  <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    Engagement funnel
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Signed up', count: insights.activation.signedUp },
                    { label: 'Onboarded', count: insights.activation.onboarded },
                    { label: 'Revealed a lead', count: insights.activation.revealedUsers },
                    { label: 'Saved a lead', count: insights.activation.savedUsers },
                  ].map((step, i) => (
                    <BarRow
                      key={step.label}
                      label={step.label}
                      count={step.count}
                      total={insights.activation.signedUp || 1}
                      color={BAR_COLORS[i % BAR_COLORS.length]}
                      index={i}
                    />
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">
                  Ops & health
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {opsChips.map((chip) => {
                    const inner = (
                      <>
                        <div className={`w-9 h-9 rounded-xl ${chip.bg} flex items-center justify-center mb-3`}>
                          <chip.icon className={`w-4 h-4 ${chip.color}`} />
                        </div>
                        <p className="text-xl font-bold text-text-primary tabular-nums">{chip.value}</p>
                        <p className="text-xs text-text-secondary mt-1">{chip.label}</p>
                      </>
                    )
                    return chip.href ? (
                      <Link
                        key={chip.label}
                        href={chip.href}
                        className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 hover:border-white/15 transition-all"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={chip.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
                        {inner}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-secondary text-center py-8">
          Insights unavailable — refresh the page to retry.
        </p>
      )}
    </div>
  )
}
