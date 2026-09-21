'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getFirebaseToken } from '@/lib/firebase'
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'


interface CreditAccountInfo {
  subscriptionBalance: number
  bonusBalance: number
  total: number
}

interface AdminUser {
  id: string
  email: string
  name: string
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

const PLANS = [
  { id: 'FREE', label: 'Free', credits: 50 },
  { id: 'FREELANCER', label: 'Freelancer', credits: 500 },
  { id: 'AGENCY', label: 'Agency', credits: 1000 },
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
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'PENDING')
  const [serviceFilter, setServiceFilter] = useState('')
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const [approveDropdown, setApproveDropdown] = useState<string | null>(null)

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
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-text-secondary">
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
                          href={`/admin/users/${u.id}`}
                          className="text-sm font-medium text-text-primary hover:text-accent-mint transition-colors"
                        >
                          {u.name}
                        </Link>
                        <p className="text-xs text-text-secondary mt-0.5">{u.email}</p>
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
                          {u.plan === 'FREE'
                            ? '50'
                            : u.plan === 'FREELANCER'
                              ? 'Freelancer'
                              : u.plan === 'AGENCY'
                                ? 'Agency'
                                : u.plan}
                        </span>
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
                            <button
                              onClick={() =>
                                setApproveDropdown(approveDropdown === u.id ? null : u.id)
                              }
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
                            {approveDropdown === u.id && (
                              <div className="absolute top-full right-0 mt-1 z-50 w-44 bg-surface-elevated border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
                                {PLANS.map((p) => (
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
                                      ({p.credits} credits)
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => handleAction(u.id, 'REJECT')}
                              disabled={actionLoading === `${u.id}-REJECT`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              {actionLoading === `${u.id}-REJECT` ? '...' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary/60">
                            {u.status === 'ACTIVE'
                              ? 'Approved'
                              : u.status === 'REJECTED'
                                ? 'Rejected'
                                : u.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary px-3">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.06] text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
