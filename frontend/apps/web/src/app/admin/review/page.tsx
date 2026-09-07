'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import Link from 'next/link'
import {
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  UserIcon,
  BriefcaseIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/solid'

interface ReviewUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  status: string
  plan: string
  createdAt: string
  portfolio: string | null
  website: string | null
  linkedin: string | null
  instagram: string | null
  dribbble: string | null
  behance: string | null
  github: string | null
  twitter: string | null
  servicesOffered: string[]
  preferredLeadCategories: string[]
  outreachExperience: string | null
  discoverySource: string | null
}

const PLANS = [
  { id: 'FREE', label: 'Free', credits: 50 },
  { id: 'FREELANCER', label: 'Freelancer', credits: 500 },
  { id: 'AGENCY', label: 'Agency', credits: 1000 },
]

export default function AdminReviewPage() {
  const [users, setUsers] = useState<ReviewUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users?status=PENDING&pageSize=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUsers(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleAction = async (userId: string, action: string, plan?: string) => {
    setActionLoading(`${userId}-${action}`)
    const token = await getFirebaseToken()
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, plan }),
    })
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setActionLoading(null)
  }

  const ensureUrl = (url: string) =>
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

  const socialLinks = (u: ReviewUser) => {
    const links: { url: string; label: string; color: string }[] = []
    if (u.portfolio) links.push({ url: ensureUrl(u.portfolio), label: 'Portfolio', color: 'text-accent-mint' })
    if (u.website) links.push({ url: ensureUrl(u.website), label: 'Website', color: 'text-accent-mint' })
    if (u.linkedin) links.push({ url: ensureUrl(u.linkedin), label: 'LinkedIn', color: 'text-accent-purple' })
    if (u.instagram) links.push({ url: ensureUrl(u.instagram), label: 'Instagram', color: 'text-accent-purple' })
    if (u.dribbble) links.push({ url: ensureUrl(u.dribbble), label: 'Dribbble', color: 'text-accent-mint' })
    if (u.behance) links.push({ url: ensureUrl(u.behance), label: 'Behance', color: 'text-blue-400' })
    if (u.github) links.push({ url: ensureUrl(u.github), label: 'GitHub', color: 'text-text-secondary' })
    if (u.twitter) links.push({ url: ensureUrl(u.twitter), label: 'Twitter', color: 'text-cyan-400' })
    return links
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Review Applications</h1>
          <p className="text-sm text-text-secondary mt-1">
            {users.length} pending application{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/users?status=PENDING"
          className="text-sm text-accent-mint hover:underline"
        >
          View all in table
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-12 text-center">
          <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">All caught up!</h3>
          <p className="text-sm text-text-secondary">No pending applications to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-accent-mint" />
                      <h3 className="text-base font-semibold text-text-primary">{u.name}</h3>
                    </div>
                    <p className="text-sm text-text-secondary mt-0.5 ml-6">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {u.phone && (
                      <p className="text-xs text-text-secondary">{u.phone}</p>
                    )}
                    <span className="text-xs text-text-secondary/60">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <BriefcaseIcon className="w-3 h-3" />
                      Services
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {u.servicesOffered.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <GlobeAltIcon className="w-3 h-3" />
                      Lead Categories
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {u.preferredLeadCategories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MusicalNoteIcon className="w-3 h-3" />
                      How they found us
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary">
                      {u.discoverySource || '—'}
                    </span>
                  </div>

                  {u.outreachExperience && (
                    <div>
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        Outreach Experience
                      </p>
                      <p className="text-xs text-text-secondary">{u.outreachExperience}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                      Profile Links
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {socialLinks(u).length > 0 ? (
                        socialLinks(u).map((link) => (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs ${link.color} hover:underline flex items-center gap-0.5`}
                          >
                            {link.label} <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-text-secondary/40">No links provided</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.06] p-4 bg-white/[0.02] flex items-center gap-2">
                <ReviewActions
                  userId={u.id}
                  actionLoading={actionLoading}
                  onAction={handleAction}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewActions({
  userId,
  actionLoading,
  onAction,
}: {
  userId: string
  actionLoading: string | null
  onAction: (userId: string, action: string, plan?: string) => void
}) {
  const [showPlans, setShowPlans] = useState(false)

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowPlans(!showPlans)}
          disabled={actionLoading === `${userId}-APPROVE` || actionLoading === `${userId}-REJECT`}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
        >
          <CheckCircleIcon className="w-4 h-4" />
          Approve
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>
        {showPlans && (
          <div className="absolute top-full left-0 mt-1 z-50 w-48 bg-surface-elevated border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setShowPlans(false)
                  onAction(userId, 'APPROVE', p.id)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors"
              >
                <span className="font-medium">{p.label}</span>
                <span className="text-text-secondary ml-2">({p.credits} credits)</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onAction(userId, 'REJECT')}
        disabled={actionLoading === `${userId}-REJECT`}
        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
      >
        <XCircleIcon className="w-4 h-4" />
        {actionLoading === `${userId}-REJECT` ? '...' : 'Reject'}
      </button>
    </>
  )
}
