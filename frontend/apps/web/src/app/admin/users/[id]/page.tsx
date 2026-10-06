'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getFirebaseToken } from '@/lib/firebase'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  UserIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'
import type { PaymentRecord } from '@/lib/payments-format'


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
  { id: 'payments', label: 'Payments & Billing', icon: BanknotesIcon },
  { id: 'history', label: 'Status History', icon: ClockIcon },
  { id: 'notes', label: 'Internal Notes', icon: ChatBubbleLeftIcon },
]

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPage = searchParams.get('fromPage') || searchParams.get('page') || '1'
  const statusParam = searchParams.get('status') || ''
  const fromReview = searchParams.get('from') === 'review'

  const [user, setUser] = useState<UserDetail | null>(null)
  const [prevUser, setPrevUser] = useState<{ id: string; name: string } | null>(null)
  const [nextUser, setNextUser] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bonusCreditInput, setBonusCreditInput] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('FREELANCER')
  const [activeTab, setActiveTab] = useState('overview')

  const getDefaultRenewalDateStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }

  const [approvalRenewalDate, setApprovalRenewalDate] = useState(getDefaultRenewalDateStr)
  const [approvalCredits, setApprovalCredits] = useState('500')
  const [editRenewalDate, setEditRenewalDate] = useState('')
  const [editSubCredits, setEditSubCredits] = useState('')

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const [notes, setNotes] = useState<AdminNoteEntry[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteSending, setNoteSending] = useState(false)

  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const url = statusParam
        ? `/api/admin/users/${params.id}?status=${encodeURIComponent(statusParam)}`
        : `/api/admin/users/${params.id}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUser(json.data)
      setPrevUser(json.prevUser || null)
      setNextUser(json.nextUser || null)
      setBonusCreditInput('')
      if (json.data?.creditAccount?.renewalDate) {
        setEditRenewalDate(json.data.creditAccount.renewalDate.split('T')[0])
      }
      if (json.data?.creditAccount?.subscriptionBalance !== undefined) {
        setEditSubCredits(String(json.data.creditAccount.subscriptionBalance))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params.id, statusParam])

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

  const fetchPayments = useCallback(async () => {
    const token = await getFirebaseToken()
    if (!token) return
    setPaymentsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${params.id}/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setPayments(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setPaymentsLoading(false)
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

  useEffect(() => {
    if (activeTab === 'payments') fetchPayments()
  }, [activeTab, fetchPayments])

  const handleAction = async (
    action: string,
    plan?: string,
    extra?: { renewalDate?: string; subscriptionCredits?: number },
  ) => {
    setActionLoading(action)
    const token = await getFirebaseToken()
    const payload: Record<string, unknown> = { action, plan }
    if (extra?.renewalDate) payload.renewalDate = extra.renewalDate
    if (extra?.subscriptionCredits !== undefined) payload.subscriptionCredits = extra.subscriptionCredits

    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  const [isDeletingUser, setIsDeletingUser] = useState(false)

  const handleDeleteUser = async () => {
    if (!user) return
    const confirmed = confirm(
      `⚠️ PERMANENT USER DELETION\n\nAre you sure you want to permanently delete "${user.name}" (${user.email})?\n\nThis will:\n1. Delete their account completely from Firebase Authentication.\n2. Cascade delete all their credits, lead states, and records from the database.\n\nThis action CANNOT be undone. Proceed?`
    )
    if (!confirmed) return

    setIsDeletingUser(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        alert(`User "${user.name}" has been permanently deleted from Firebase Auth and the database.`)
        router.push('/admin/users')
      } else {
        alert(json.message || 'Failed to delete user.')
        setIsDeletingUser(false)
      }
    } catch {
      alert('Network error while deleting user.')
      setIsDeletingUser(false)
    }
  }

  const [renewalMessage, setRenewalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleUpdateRenewal = async () => {
    if (!editRenewalDate) {
      setRenewalMessage({ type: 'error', text: 'Please select a valid renewal date.' })
      return
    }
    setActionLoading('updateRenewal')
    setRenewalMessage(null)

    try {
      const token = await getFirebaseToken()
      if (!token) {
        setRenewalMessage({ type: 'error', text: 'Authentication session not found. Please re-login.' })
        setActionLoading(null)
        return
      }

      const payload: Record<string, unknown> = {
        renewalDate: editRenewalDate,
      }
      const parsedSub = parseInt(editSubCredits)
      if (!isNaN(parsedSub) && parsedSub >= 0) {
        payload.subscriptionCredits = parsedSub
      }

      const res = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (res.ok && json.data) {
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
        setRenewalMessage({ type: 'success', text: 'Renewal date & credit settings saved successfully!' })
        fetchUser()
        if (activeTab === 'history') fetchAuditLogs()
        setTimeout(() => setRenewalMessage(null), 4000)
      } else {
        setRenewalMessage({
          type: 'error',
          text: json.message || (json.details ? JSON.stringify(json.details) : 'Failed to update renewal settings'),
        })
      }
    } catch (err: any) {
      console.error('[handleUpdateRenewal] Error:', err)
      setRenewalMessage({ type: 'error', text: err?.message || 'Network error while saving settings' })
    } finally {
      setActionLoading(null)
    }
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

  const backUrl = fromReview
    ? '/admin/review'
    : `/admin/users?page=${fromPage}${statusParam ? `&status=${statusParam}` : ''}`
  const backLabel = fromReview ? 'Back to Applications' : `Back to Users (Page ${fromPage})`

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors group"
        >
          <ArrowLeftIcon className="w-[14px] h-[14px] group-hover:-translate-x-0.5 transition-transform" />
          {backLabel}
        </Link>

        <div className="flex items-center gap-2">
          {prevUser && (
            <Link
              href={`/admin/users/${prevUser.id}?fromPage=${fromPage}${statusParam ? `&status=${statusParam}` : ''}${fromReview ? '&from=review' : ''}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-text-secondary hover:text-white transition-all shadow-sm"
              title={`Previous: ${prevUser.name}`}
            >
              <ArrowLeftIcon className="w-3 h-3 text-accent-mint" />
              <span>Prev: <span className="text-text-primary font-medium">{prevUser.name}</span></span>
            </Link>
          )}
          {nextUser && (
            <Link
              href={`/admin/users/${nextUser.id}?fromPage=${fromPage}${statusParam ? `&status=${statusParam}` : ''}${fromReview ? '&from=review' : ''}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-text-secondary hover:text-white transition-all shadow-sm"
              title={`Next: ${nextUser.name}`}
            >
              <span>Next: <span className="text-text-primary font-medium">{nextUser.name}</span></span>
              <ArrowRightIcon className="w-3 h-3 text-accent-mint" />
            </Link>
          )}
        </div>
      </div>

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
                <div className="space-y-3">
                  <label className="text-xs text-text-secondary font-medium block">
                    Approve with Plan & Renewal
                  </label>
                  <div className="flex gap-1.5">
                    {PLANS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlan(p.id)
                          setApprovalCredits(String(p.credits))
                        }}
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

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-xxs text-text-secondary uppercase tracking-wider block mb-1">
                        Renewal Date
                      </label>
                      <input
                        type="date"
                        value={approvalRenewalDate}
                        onChange={(e) => setApprovalRenewalDate(e.target.value)}
                        className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-2.5 py-1.5 text-xs"
                      />
                      <span className="text-xxs text-text-muted mt-0.5 block">Next Autopay cycle</span>
                    </div>
                    <div>
                      <label className="text-xxs text-text-secondary uppercase tracking-wider block mb-1">
                        Initial Credits
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={approvalCredits}
                        onChange={(e) => setApprovalCredits(e.target.value)}
                        className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-2.5 py-1.5 text-xs"
                      />
                      <span className="text-xxs text-text-muted mt-0.5 block">Starting credits</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleAction('APPROVE', selectedPlan, {
                        renewalDate: approvalRenewalDate || undefined,
                        subscriptionCredits: approvalCredits ? parseInt(approvalCredits) : undefined,
                      })
                    }
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

              {/* Permanent Delete Button */}
              <div className="pt-3 border-t border-white/[0.06]">
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeletingUser || actionLoading !== null}
                  className="w-full px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-300 text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <TrashIcon className="w-4 h-4 text-red-400" />
                  <span>{isDeletingUser ? 'Deleting from Firebase & DB...' : 'Delete User (Permanent)'}</span>
                </button>
                <p className="text-[10px] text-text-secondary/60 text-center mt-1.5">
                  Permanently deletes from both Firebase Auth and the database.
                </p>
              </div>
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

            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Subscription & Renewal Date Settings
              </span>

              {renewalMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between border transition-all ${
                    renewalMessage.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <span className="font-medium">{renewalMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setRenewalMessage(null)}
                    className="text-text-muted hover:text-white ml-2 text-sm leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xxs text-text-secondary uppercase tracking-wider block mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={editRenewalDate}
                    onChange={(e) => setEditRenewalDate(e.target.value)}
                    className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                  />
                  <span className="text-xxs text-text-muted mt-0.5 block">Next Autopay cycle date</span>
                </div>
                <div>
                  <label className="text-xxs text-text-secondary uppercase tracking-wider block mb-1">
                    Subscription Credits
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSubCredits}
                    onChange={(e) => setEditSubCredits(e.target.value)}
                    placeholder="Credits"
                    className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                  />
                  <span className="text-xxs text-text-muted mt-0.5 block">Monthly credit pool</span>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleUpdateRenewal}
                    disabled={actionLoading === 'updateRenewal' || !editRenewalDate}
                    className="w-full px-4 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'updateRenewal' ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : renewalMessage?.type === 'success' ? (
                      '✓ Settings Saved!'
                    ) : (
                      'Save Renewal Settings'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Quick Payment Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
              <span className="text-xxs text-text-secondary uppercase tracking-wider block font-semibold">
                Total Revenue from User
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                ₹{payments.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-text-muted mt-0.5 block">Lifetime successful charges</span>
            </div>

            <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
              <span className="text-xxs text-text-secondary uppercase tracking-wider block font-semibold">
                Total Transactions
              </span>
              <div className="text-2xl font-bold text-accent-mint mt-1">
                {payments.length}
              </div>
              <span className="text-xs text-text-muted mt-0.5 block">Subscriptions & Credit Refills</span>
            </div>

            <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
              <span className="text-xxs text-text-secondary uppercase tracking-wider block font-semibold">
                Latest Transaction
              </span>
              <div className="text-base font-semibold text-white mt-1">
                {payments.length > 0
                  ? new Date(payments[0].createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </div>
              <span className="text-xs text-text-muted mt-0.5 block truncate">
                {payments.length > 0 ? payments[0].itemLabel : 'No transactions recorded'}
              </span>
            </div>
          </div>

          {/* Transactions Table Card */}
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Payment Transactions ({payments.length})
              </h3>
              <button
                onClick={fetchPayments}
                disabled={paymentsLoading}
                className="text-xs text-text-secondary hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>↻ Refresh</span>
              </button>
            </div>

            {paymentsLoading ? (
              <CustomLoader page="admin" />
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <BanknotesIcon className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-white">No payment transactions found</p>
                <p className="text-xs text-text-secondary mt-1">
                  Completed Razorpay payments and top-ups will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-xxs uppercase tracking-wider text-text-secondary font-semibold">
                      <th className="pb-3 pr-4">Date & Time</th>
                      <th className="pb-3 px-4">Item / Description</th>
                      <th className="pb-3 px-4">Amount</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Razorpay Payment ID</th>
                      <th className="pb-3 pl-4">Order ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4 text-xs text-white/80 whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xxs px-2 py-0.5 rounded-full font-medium ${
                                p.itemType === 'topup'
                                  ? 'bg-accent-mint/10 text-accent-mint border border-accent-mint/20'
                                  : 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20'
                              }`}
                            >
                              {p.itemType === 'topup' ? 'Refill' : 'Plan'}
                            </span>
                            <span className="font-medium text-white">{p.itemLabel}</span>
                          </div>
                          {p.tokensAdded > 0 && (
                            <span className="text-xxs text-accent-mint block mt-0.5">
                              +{p.tokensAdded} Credits added
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xxs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Paid & Credited
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white/70">{p.paymentId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(p.paymentId)
                                setCopiedId(p.paymentId)
                                setTimeout(() => setCopiedId(null), 2000)
                              }}
                              className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                              title="Copy Payment ID"
                            >
                              {copiedId === p.paymentId ? (
                                <span className="text-xxs text-accent-mint font-semibold">Copied!</span>
                              ) : (
                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 pl-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white/50">{p.orderId}</span>
                            {p.orderId !== '—' && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.orderId)
                                  setCopiedId(p.orderId)
                                  setTimeout(() => setCopiedId(null), 2000)
                                }}
                                className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                                title="Copy Order ID"
                              >
                                {copiedId === p.orderId ? (
                                  <span className="text-xxs text-accent-mint font-semibold">Copied!</span>
                                ) : (
                                  <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
