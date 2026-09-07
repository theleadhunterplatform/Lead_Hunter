'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import {
  ArrowRightIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'

interface AdminStats {
  totalUsers: number
  pendingUsers: number
  activeUsers: number
  rejectedUsers: number
  suspendedUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlightPending, setHighlightPending] = useState(false)

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

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

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
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Pending Reviews</h3>
          <p className="text-sm text-text-secondary">
            {stats.pendingUsers} user{stats.pendingUsers !== 1 ? 's' : ''} waiting for approval.{' '}
            <Link href="/admin/users?status=PENDING" className="text-accent-mint hover:underline">
              Review now
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
