'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getFirebaseToken } from '@/lib/firebase'
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  TrashIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { PortalMenu } from '@/components/ui/PortalMenu'
import { useToast } from '@/components/ui/Toast'


interface CreditAccountInfo {
  subscriptionBalance: number
  bonusBalance: number
  total: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  creditAccount: CreditAccountInfo
  status: string
  plan: string
  createdAt: string
  servicesOffered: string[]
  portfolio: string | null
  website: string | null
  linkedin: string | null
  instagram: string | null
  dribbble: string | null
  behance: string | null
  github: string | null
  twitter: string | null
  outreachExperience: string | null
  discoverySource: string | null
  preferredLeadCategories: string[]
}

const PLAN_BADGES: Record<string, string> = {
  FREE: 'text-text-secondary bg-white/5',
  FREELANCER: 'text-accent-mint bg-accent-mint/10',
  AGENCY: 'text-accent-purple bg-accent-purple/10',
}

interface ApprovePlanOption {
  id: string
  label: string
  credits: number
}

const DEFAULT_APPROVE_PLANS: ApprovePlanOption[] = [
  { id: 'FREE', label: 'Free Starter', credits: 50 },
  { id: 'FREELANCER', label: 'Freelancer Pro', credits: 1000 },
]

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const ensureUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10',
  ACTIVE: 'text-green-400 bg-green-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
  SUSPENDED: 'text-red-400 bg-red-500/10',
}

export default function AdminUsersPage() {
  const { addToast } = useToast()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [plans, setPlans] = useState<ApprovePlanOption[]>(DEFAULT_APPROVE_PLANS)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'PENDING')
  const [serviceFilter, setServiceFilter] = useState(searchParams.get('service') || '')
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') || '1', 10)))
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.plans?.length) {
          setPlans(
            json.data.plans.map((p: any) => ({
              id: p.id,
              label: p.name || p.id,
              credits: p.credits,
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  const isOnboardingComplete = (u: AdminUser) =>
    Boolean(u.linkedin && (u.servicesOffered?.length ?? 0) > 0)

  const handleSendReminder = async (userId: string, email: string) => {
    setActionLoading(`${userId}-REMIND`)
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_ONBOARDING_REMINDER' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: `Onboarding reminder sent to ${email}` })
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to send reminder email' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error sending reminder email' })
    } finally {
      setActionLoading(null)
    }
  }

  // Sync state to URL without full reload so back button / refreshes stay on the exact page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('page', page.toString())
    if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter)
    else url.searchParams.delete('status')
    if (search.trim()) url.searchParams.set('search', search.trim())
    else url.searchParams.delete('search')
    if (serviceFilter) url.searchParams.set('service', serviceFilter)
    else url.searchParams.delete('service')
    window.history.replaceState({}, '', url.toString())
  }, [page, statusFilter, search, serviceFilter])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const token = await getFirebaseToken()
    if (!token) return

    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', '20')
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())
    if (serviceFilter) params.set('service', serviceFilter)

    try {
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUsers(json.data)
      setPagination(json.pagination)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search, serviceFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAction = async (userId: string, action: string, plan?: string) => {
    setActionLoading(`${userId}-${action}`)
    const token = await getFirebaseToken()
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, plan }),
    })
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status:
                action === 'APPROVE'
                  ? 'ACTIVE'
                  : action === 'REJECT'
                    ? 'REJECTED'
                    : action === 'SUSPEND'
                      ? 'SUSPENDED'
                      : 'ACTIVE',
              plan: plan || u.plan,
            }
          : u,
      ),
    )
    setActionLoading(null)
  }

  const handleResendEmail = async (userId: string, email: string) => {
    setActionLoading(`${userId}-RESEND`)
    const token = await getFirebaseToken()
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESEND_APPROVAL_EMAIL' }),
      })
      const json = await res.json()
      if (json.success) {
        alert(`Welcome email successfully dispatched to ${email}!`)
      } else {
        alert(`Failed to send email to ${email}: ${json.emailError || json.message}`)
      }
    } catch {
      alert(`Network error dispatching email to ${email}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string, userEmail: string) => {
    const confirmed = confirm(
      `⚠️ PERMANENT USER DELETION\n\nAre you sure you want to permanently delete "${userName}" (${userEmail})?\n\nThis will remove their account from Firebase Auth and delete all their records from the database.\n\nThis action CANNOT be undone.`
    )
    if (!confirmed) return

    setActionLoading(`${userId}-DELETE`)
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        if (pagination) {
          setPagination({ ...pagination, total: Math.max(0, pagination.total - 1) })
        }
      } else {
        alert(json.message || 'Failed to delete user.')
      }
    } catch {
      alert('Network error deleting user.')
    } finally {
      setActionLoading(null)
    }
  }

  const [approveDropdown, setApproveDropdown] = useState<string | null>(null)
  const approveBtnRef = useRef<HTMLButtonElement | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Users</h1>
          <p className="text-sm text-text-secondary mt-1">
            {pagination
              ? `${pagination.total} user${pagination.total !== 1 ? 's' : ''}`
              : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search by name or email..."
            className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value)
              setPage(1)
            }}
            className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2.5 text-sm appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">All Services</option>
            {users.length > 0 &&
              [...new Set(users.flatMap((u) => u.servicesOffered))].sort().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s)
                setPage(1)
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/30'
                  : 'text-text-secondary hover:text-text-primary bg-white/[0.02] border border-white/[0.06]'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CustomLoader page="admin" />
      ) : (
        <>
          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Name / Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Onboarding
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Services
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Links
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-text-secondary">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/users/${u.id}?fromPage=${page}&status=${statusFilter}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-mint transition-colors"
                        >
                          {u.name}
                        </Link>
                        <p className="text-xs text-text-secondary mt-0.5">{u.email}</p>
                        {u.phone && (
                          <p className="text-xxs font-mono text-accent-mint/90 mt-0.5">
                            {u.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[u.status] || 'text-text-secondary bg-white/5'}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_BADGES[u.plan] || 'text-text-secondary bg-white/5'}`}
                        >
                          {plans.find((p) => p.id === u.plan)?.label || (u.plan === 'FREE' ? 'Free Starter' : u.plan)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isOnboardingComplete(u) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            Incomplete
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.servicesOffered.length > 0 ? (
                            u.servicesOffered.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-text-secondary/40">—</span>
                          )}
                          {u.servicesOffered.length > 2 && (
                            <span className="text-xs text-text-secondary/40">
                              +{u.servicesOffered.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          {u.portfolio && (
                            <a
                              href={ensureUrl(u.portfolio)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-mint hover:underline flex items-center gap-0.5"
                              title="Portfolio"
                            >
                              PF <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.website && (
                            <a
                              href={ensureUrl(u.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-mint hover:underline flex items-center gap-0.5"
                              title="Website"
                            >
                              Web <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.linkedin && (
                            <a
                              href={ensureUrl(u.linkedin)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-purple hover:underline flex items-center gap-0.5"
                              title="LinkedIn"
                            >
                              Li <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.instagram && (
                            <a
                              href={ensureUrl(u.instagram)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-purple hover:underline flex items-center gap-0.5"
                              title="Instagram"
                            >
                              Ig <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.dribbble && (
                            <a
                              href={ensureUrl(u.dribbble)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent-mint hover:underline flex items-center gap-0.5"
                              title="Dribbble"
                            >
                              Dr <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.behance && (
                            <a
                              href={ensureUrl(u.behance)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-0.5"
                              title="Behance"
                            >
                              Be <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.github && (
                            <a
                              href={ensureUrl(u.github)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-text-secondary hover:text-white flex items-center gap-0.5"
                              title="GitHub"
                            >
                              Gh <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {u.twitter && (
                            <a
                              href={ensureUrl(u.twitter)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5"
                              title="Twitter / X"
                            >
                              Tw <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                            </a>
                          )}
                          {!u.portfolio && !u.website && !u.linkedin && !u.instagram && !u.dribbble && !u.behance && !u.github && !u.twitter && (
                            <span className="text-xs text-text-secondary/40">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2 relative">
                            {!isOnboardingComplete(u) && (
                              <button
                                onClick={() => handleSendReminder(u.id, u.email)}
                                disabled={actionLoading === `${u.id}-REMIND`}
                                title="Send onboarding reminder email"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all disabled:opacity-50"
                              >
                                <EnvelopeIcon className="w-3.5 h-3.5" />
                                {actionLoading === `${u.id}-REMIND` ? 'Sending...' : 'Remind'}
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                approveBtnRef.current = e.currentTarget
                                setApproveDropdown(
                                  approveDropdown === u.id ? null : u.id,
                                )
                              }}
                              disabled={
                                actionLoading === `${u.id}-APPROVE` ||
                                actionLoading === `${u.id}-REJECT`
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Approve
                              <ChevronDownIcon className="w-3 h-3" />
                            </button>
                            <PortalMenu
                              open={approveDropdown === u.id}
                              onClose={() => setApproveDropdown(null)}
                              anchorRef={approveBtnRef}
                              align="right"
                              width={196}
                              estimatedHeight={plans.length * 40 + 8}
                            >
                              {plans.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setApproveDropdown(null)
                                    handleAction(u.id, 'APPROVE', p.id)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors"
                                >
                                  <span className="font-medium">{p.label}</span>
                                  <span className="text-text-secondary ml-2">
                                    ({p.credits.toLocaleString()} credits)
                                  </span>
                                </button>
                              ))}
                            </PortalMenu>
                            <button
                              onClick={() => handleAction(u.id, 'REJECT')}
                              disabled={actionLoading === `${u.id}-REJECT`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              {actionLoading === `${u.id}-REJECT` ? '...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name, u.email)}
                              disabled={actionLoading === `${u.id}-DELETE`}
                              title="Delete user from database and Firebase Auth"
                              className="p-1.5 rounded-lg text-text-secondary/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-text-secondary/60">
                              {u.status === 'ACTIVE'
                                ? 'Approved'
                                : u.status === 'REJECTED'
                                  ? 'Rejected'
                                  : u.status}
                            </span>
                            {u.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleResendEmail(u.id, u.email)}
                                disabled={actionLoading === `${u.id}-RESEND`}
                                title="Resend Welcome Approval Email"
                                className="p-1.5 rounded-lg text-text-secondary/60 hover:text-accent-mint hover:bg-accent-mint/10 border border-transparent hover:border-accent-mint/20 transition-all cursor-pointer"
                              >
                                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name, u.email)}
                              disabled={actionLoading === `${u.id}-DELETE`}
                              title="Delete user from database and Firebase Auth"
                              className="p-1.5 rounded-lg text-text-secondary/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
              <p className="text-xs text-text-secondary">
                Showing{' '}
                <span className="text-text-primary font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="text-text-primary font-medium">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="text-text-primary font-medium">{pagination.total}</span> members
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>

                {/* Page number pills */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (pagination.totalPages <= 7) return true
                    if (p === 1 || p === pagination.totalPages) return true
                    return Math.abs(p - pagination.page) <= 1
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`dots-${idx}`} className="px-2 text-xs text-text-secondary/50">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item)}
                        className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-medium border transition-all ${
                          item === pagination.page
                            ? 'bg-accent-mint text-surface font-semibold border-accent-mint shadow-sm'
                            : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
