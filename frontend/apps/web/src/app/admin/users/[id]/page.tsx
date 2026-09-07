'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getFirebaseToken } from '@/lib/firebase'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  CreditCardIcon,
  UserIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'


const PLANS = [
  { id: 'FREE', label: 'Free', credits: 50 },
  { id: 'FREELANCER', label: 'Freelancer', credits: 500 },
  { id: 'AGENCY', label: 'Agency', credits: 1000 },
]

const PLAN_BADGES: Record<string, string> = {
  FREE: 'text-text-secondary bg-white/5',
  FREELANCER: 'text-accent-mint bg-accent-mint/10',
  AGENCY: 'text-accent-purple bg-accent-purple/10',
}

const ensureUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

interface CreditAccountInfo {
  subscriptionBalance: number
  bonusBalance: number
  rolloverBalance: number
  rolloverExpiresAt: string | null
  total: number
  renewalDate: string | null
}

interface UserDetail {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  creditAccount: CreditAccountInfo
  status: string
  plan: string
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
  createdAt: string
  updatedAt: string
}

interface AuditLogEntry {
  id: string
  action: string
  details: Record<string, unknown>
  adminName: string
  createdAt: string
}

interface AdminNoteEntry {
  id: string
  content: string
  adminName: string
  createdAt: string
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/20',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/20',
  SUSPENDED: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: UserIcon },
  { id: 'credits', label: 'Credits & Plan', icon: CreditCardIcon },
  { id: 'history', label: 'Status History', icon: ClockIcon },
  { id: 'notes', label: 'Internal Notes', icon: ChatBubbleLeftIcon },
]

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bonusCreditInput, setBonusCreditInput] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('FREELANCER')
  const [activeTab, setActiveTab] = useState('overview')

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const [notes, setNotes] = useState<AdminNoteEntry[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteSending, setNoteSending] = useState(false)

  const fetchUser = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const res = await fetch(`/api/admin/users/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUser(json.data)
      setBonusCreditInput('')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const fetchAuditLogs = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${params.id}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setAuditLogs(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLogsLoading(false)
    }
  }, [params.id])

  const fetchNotes = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    setNotesLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${params.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setNotes(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setNotesLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (activeTab === 'history') fetchAuditLogs()
  }, [activeTab, fetchAuditLogs])

  useEffect(() => {
    if (activeTab === 'notes') fetchNotes()
  }, [activeTab, fetchNotes])

  const handleAction = async (action: string, plan?: string) => {
    setActionLoading(action)
    const token = await getFirebaseToken()
    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, plan }),
    })
    const json = await res.json()
    if (json.data) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              status: json.data.status || prev.status,
              plan: json.data.plan || prev.plan,
              creditAccount: json.data.creditAccount || prev.creditAccount,
            }
          : prev,
      )
    }
    setActionLoading(null)
  }

  const handleBonusCreditGrant = async () => {
    const amount = parseInt(bonusCreditInput)
    if (isNaN(amount) || amount <= 0) return
    setActionLoading('bonusCredits')
    const token = await getFirebaseToken()
    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bonusCredits: amount }),
    })
    const json = await res.json()
    if (json.data?.creditAccount) {
      setUser((prev) => (prev ? { ...prev, creditAccount: json.data.creditAccount } : prev))
      setBonusCreditInput('')
    }
    setActionLoading(null)
  }

  const handleSendNote = async () => {
    if (!noteInput.trim()) return
    setNoteSending(true)
    const token = await getFirebaseToken()
    const res = await fetch(`/api/admin/users/${params.id}/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteInput.trim() }),
    })
    const json = await res.json()
    if (json.data) {
      setNotes((prev) => [json.data, ...prev])
      setNoteInput('')
    }
    setNoteSending(false)
  }

  if (loading) {
    return <CustomLoader page="admin" />
  }

  if (!user) {
    return <div className="text-sm text-text-secondary">User not found</div>
  }

  const formatLogAction = (entry: AuditLogEntry) => {
    const details = entry.details as Record<string, string> | undefined
    switch (entry.action) {
      case 'STATUS_CHANGE':
        return `Status changed ${details?.from || '?'} → ${details?.to || '?'}${details?.plan ? ` (plan: ${details.plan})` : ''}`
      case 'CREDIT_CHANGE':
        return `Credit change: ${details?.reason || 'no reason'}`
      default:
        return `${entry.action}${details?.method ? ` (${details.method})` : ''}`
    }
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeftIcon className="w-[14px] h-[14px] group-hover:-translate-x-0.5 transition-transform" />
        Back to Users
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{user.name}</h1>
            <span
              className={`inline-flex text-xs font-medium px-3 py-1 rounded-full border ${STATUS_BADGES[user.status] || ''}`}
            >
              {user.status}
            </span>
          </div>
          <p className="text-sm text-text-secondary">{user.email}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-accent-mint text-white'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Account Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm items-center">
                <span className="text-text-secondary">Plan</span>
                <span
                  className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_BADGES[user.plan] || 'text-text-secondary bg-white/5'}`}
                >
                  {user.plan === 'FREE'
                    ? '50'
                    : user.plan === 'FREELANCER'
                      ? 'Freelancer'
                      : user.plan === 'AGENCY'
                        ? 'Agency'
                        : user.plan}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Role</span>
                <span className="text-text-primary font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Phone</span>
                <span className="text-text-primary font-medium">{user.phone || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Joined</span>
                <span className="text-text-primary font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Actions
            </h3>
            <div className="space-y-3">
              {user.status !== 'ACTIVE' && (
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary font-medium">
                    Approve with Plan
                  </label>
                  <div className="flex gap-1.5">
                    {PLANS.filter((p) => p.id !== 'FREE').map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          selectedPlan === p.id
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {p.label}
                        <span className="block text-xxs opacity-60">{p.credits} credits</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAction('APPROVE', selectedPlan)}
                    disabled={actionLoading === 'APPROVE'}
                    className="w-full px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'APPROVE'
                      ? 'Approving...'
                      : `Approve as ${PLANS.find((p) => p.id === selectedPlan)?.label}`}
                  </button>
                </div>
              )}
              {user.status !== 'SUSPENDED' && (
                <button
                  onClick={() => handleAction('SUSPEND')}
                  disabled={actionLoading === 'SUSPEND'}
                  className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'SUSPEND' ? 'Suspending...' : 'Suspend User'}
                </button>
              )}
              {user.status !== 'ACTIVE' && (
                <button
                  onClick={() => handleAction('REJECT')}
                  disabled={actionLoading === 'REJECT'}
                  className="w-full px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'REJECT' ? 'Rejecting...' : 'Reject User'}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm(`Permanently delete ${user.email}? This also removes them from Firebase.`)) return
                  setActionLoading('DELETE')
                  const token = await getFirebaseToken()
                  const res = await fetch(`/api/admin/users/${params.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (res.ok) {
                    router.push('/admin/users')
                  }
                  setActionLoading(null)
                }}
                disabled={actionLoading === 'DELETE'}
                className="w-full px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-800/30 text-red-500 text-sm font-medium hover:bg-red-900/40 transition-all disabled:opacity-50"
              >
                {actionLoading === 'DELETE' ? 'Deleting...' : '🗑 Delete User Permanently'}
              </button>
            </div>
          </div>

          {user.servicesOffered.length > 0 && (
            <div className="md:col-span-2 bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Onboarding Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Services Offered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.servicesOffered.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs text-text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Preferred Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.preferredLeadCategories.map((c) => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-xs text-text-primary"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                {user.outreachExperience && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Outreach Experience</p>
                    <p className="text-sm text-text-primary">{user.outreachExperience}</p>
                  </div>
                )}
                {user.discoverySource && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Discovery Source</p>
                    <p className="text-sm text-text-primary">{user.discoverySource}</p>
                  </div>
                )}
                {user.portfolio && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Portfolio</p>
                    <a
                      href={ensureUrl(user.portfolio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-mint hover:underline"
                    >
                      {user.portfolio}
                    </a>
                  </div>
                )}
                {user.website && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Website</p>
                    <a
                      href={ensureUrl(user.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-mint hover:underline"
                    >
                      {user.website}
                    </a>
                  </div>
                )}
                {user.linkedin && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">LinkedIn</p>
                    <a
                      href={ensureUrl(user.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-mint hover:underline"
                    >
                      {user.linkedin}
                    </a>
                  </div>
                )}
                {user.dribbble && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Dribbble</p>
                    <a
                      href={ensureUrl(user.dribbble)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-accent-mint hover:underline"
                    >
                      {user.dribbble}
                    </a>
                  </div>
                )}
                {user.behance && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Behance</p>
                    <a
                      href={ensureUrl(user.behance)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {user.behance}
                    </a>
                  </div>
                )}
                {user.github && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">GitHub</p>
                    <a
                      href={ensureUrl(user.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-text-secondary hover:text-white"
                    >
                      {user.github}
                    </a>
                  </div>
                )}
                {user.twitter && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Twitter / X</p>
                    <a
                      href={ensureUrl(user.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cyan-400 hover:underline"
                    >
                      {user.twitter}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'credits' && (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Credit Management
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-xs text-text-secondary block mb-1">Subscription</span>
                <span className="text-lg font-bold text-text-primary">
                  {user.creditAccount?.subscriptionBalance ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-xs text-text-secondary block mb-1">Bonus</span>
                <span className="text-lg font-bold text-text-primary">
                  {user.creditAccount?.bonusBalance ?? 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-xs text-text-secondary block mb-1">Total</span>
                <span className="text-lg font-bold text-accent-mint">
                  {user.creditAccount?.total ?? 0}
                </span>
              </div>
            </div>
            {user.creditAccount?.rolloverBalance ? (
              <p className="text-xs text-accent-purple flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" />
                Rollover: {user.creditAccount.rolloverBalance}
                {user.creditAccount.rolloverExpiresAt
                  ? ` · expires ${new Date(user.creditAccount.rolloverExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : ''}
              </p>
            ) : null}
            {user.creditAccount?.renewalDate && (
              <p className="text-xs text-text-secondary flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" />
                Renewal: {new Date(user.creditAccount.renewalDate).toLocaleDateString()}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">Grant Bonus:</span>
                <input
                  type="number"
                  value={bonusCreditInput}
                  onChange={(e) => setBonusCreditInput(e.target.value)}
                  min="0"
                  placeholder="Amount"
                  className="w-24 bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                />
                <button
                  onClick={handleBonusCreditGrant}
                  disabled={actionLoading === 'bonusCredits'}
                  className="px-4 py-2 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'bonusCredits' ? 'Granting...' : 'Grant'}
                </button>
              </div>
              <button
                onClick={() => handleAction('RENEW_NOW')}
                disabled={actionLoading === 'RENEW_NOW'}
                className="px-4 py-2 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-accent-mint text-sm font-medium hover:bg-accent-mint/20 transition-all disabled:opacity-50"
              >
                {actionLoading === 'RENEW_NOW' ? 'Renewing...' : 'Renew Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            Status History
          </h3>
          {logsLoading ? (
            <CustomLoader page="admin" />
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              No status history available
            </p>
          ) : (
            <div className="space-y-0">
              {auditLogs.map((log, i) => (
                <div key={log.id} className="flex gap-4 pb-4 relative">
                  {i < auditLogs.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/[0.06]" />
                  )}
                  <div
                    className={`w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      log.action === 'STATUS_CHANGE'
                        ? 'bg-accent-mint/20 text-accent-mint'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{formatLogAction(log)}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      by {log.adminName} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Add Note
            </h3>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write an internal note about this user..."
              rows={3}
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all p-3 text-sm resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSendNote}
                disabled={noteSending || !noteInput.trim()}
                className="px-4 py-2 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50"
              >
                {noteSending ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Notes
            </h3>
            {notesLoading ? (
              <CustomLoader page="admin" />
            ) : notes.length === 0 ? (
              <p className="text-sm text-text-secondary py-8 text-center">No notes yet</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="border-b border-white/[0.04] pb-4 last:border-0 last:pb-0"
                  >
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {note.adminName} · {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
