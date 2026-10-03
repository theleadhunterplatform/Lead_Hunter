'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import { useToast } from '@/components/ui/Toast'
import type { PaymentRecord } from '@/lib/payments-format'
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  UserIcon,
} from '@heroicons/react/24/solid'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'plan' | 'topup'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const { addToast } = useToast()

  const fetchPayments = useCallback(async (searchQuery = search, pageNum = page) => {
    try {
      setLoading(true)
      const token = await getFirebaseToken()
      if (!token) return

      const params = new URLSearchParams({
        page: String(pageNum),
        limit: '25',
      })
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()

      if (json.success && Array.isArray(json.data)) {
        setPayments(json.data)
        setTotalPages(json.pagination?.pages || 1)
        setTotalCount(json.pagination?.total || 0)
      } else {
        throw new Error(json.message || 'Failed to fetch payments')
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error loading payments' })
    } finally {
      setLoading(false)
    }
  }, [search, page, addToast])

  useEffect(() => {
    fetchPayments(search, page)
  }, [fetchPayments, page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPayments(search, 1)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', message: `Copied ${label} to clipboard` })
  }

  const filteredPayments = payments.filter((p) => {
    if (filterType === 'all') return true
    return p.itemType === filterType
  })

  const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center">
              <BanknotesIcon className="w-5 h-5 text-accent-mint" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Payments & Billing</h1>
              <p className="text-xs text-text-secondary">
                Track all completed user subscriptions and credit top-up transactions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-surface-elevated border border-white/[0.08] text-right">
            <span className="text-[10px] text-text-secondary uppercase font-semibold block">Total Transactions</span>
            <span className="text-base font-bold text-white tabular-nums">{totalCount}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-surface-elevated border border-accent-mint/20 text-right">
            <span className="text-[10px] text-accent-mint uppercase font-semibold block">Page Volume</span>
            <span className="text-base font-bold text-white tabular-nums">₹{totalVolume.toLocaleString('en-IN')}</span>
          </div>
          <button
            onClick={() => fetchPayments(search, page)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-secondary hover:text-white transition-all"
            title="Refresh list"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search user, email, payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-elevated border border-white/[0.08] text-xs text-white placeholder-text-secondary/50 outline-none focus:border-accent-mint/50 transition-all"
          />
        </form>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-elevated border border-white/[0.06] self-start sm:self-auto">
          {(['all', 'plan', 'topup'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterType === type
                  ? 'bg-accent-mint text-black shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Types' : type === 'plan' ? 'Subscriptions' : 'Refills'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-surface border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent-mint/20 border-t-accent-mint animate-spin" />
            <span className="text-xs text-text-secondary">Loading payment transactions...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center px-4">
            <CreditCardIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">No payment records found</p>
            <p className="text-xs text-text-secondary mt-1">
              {search ? 'Try adjusting your search query' : 'Completed Razorpay transactions will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-text-secondary uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Product / Plan</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Razorpay Identifiers</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.userName ? (
                        <Link
                          href={`/admin/users/${p.userId}`}
                          className="font-medium text-white hover:text-accent-mint flex items-center gap-1.5 transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-text-secondary" />
                          <span>{p.userName}</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/users/${p.userId}`}
                          className="font-mono text-xs text-text-secondary hover:text-accent-mint"
                        >
                          {p.userId.slice(0, 10)}...
                        </Link>
                      )}
                      {p.userEmail && (
                        <span className="text-[11px] text-text-secondary/70 block">{p.userEmail}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white block">{p.itemLabel}</span>
                      {p.tokensAdded > 0 && (
                        <span className="text-[10px] text-accent-mint font-medium">
                          +{p.tokensAdded.toLocaleString()} Credits
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-white text-sm">
                        ₹{p.amount?.toLocaleString('en-IN') || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium">{p.paymentId}</span>
                        <button
                          onClick={() => copyToClipboard(p.paymentId, 'Payment ID')}
                          className="text-text-secondary hover:text-white p-0.5"
                          title="Copy Payment ID"
                        >
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {p.orderId && p.orderId !== '—' && (
                        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary/60">
                          <span>Order: {p.orderId}</span>
                          <button
                            onClick={() => copyToClipboard(p.orderId, 'Order ID')}
                            className="text-text-secondary hover:text-white p-0.5"
                            title="Copy Order ID"
                          >
                            <DocumentDuplicateIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircleIcon className="w-3 h-3" />
                        Paid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-text-secondary">
            <span>
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
