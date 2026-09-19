'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrophyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

interface AdminProofItem {
  id: string
  userId: string
  type: string
  imageUrl: string
  note: string | null
  creditsAwarded: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    plan: string
  }
}

interface Stats {
  totalSubmissions: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  totalCreditsAwarded: number
}

const DEFAULT_REWARDS: Record<string, number> = {
  POSITIVE_REPLY: 10,
  MEETING_SCHEDULED: 25,
  DEAL_CLOSED: 50,
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  POSITIVE_REPLY: { label: 'Positive Reply', icon: '💬' },
  MEETING_SCHEDULED: { label: 'Meeting Scheduled', icon: '📅' },
  DEAL_CLOSED: { label: 'Deal Closed', icon: '🏆' },
}

export default function AdminRewardsPage() {
  const { addToast } = useToast()

  const [proofs, setProofs] = useState<AdminProofItem[]>([])
  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalCreditsAwarded: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')
  const [search, setSearch] = useState('')

  // Action Modals
  const [approveTarget, setApproveTarget] = useState<AdminProofItem | null>(null)
  const [customCredits, setCustomCredits] = useState<number>(10)
  const [approving, setApproving] = useState(false)

  const [rejectTarget, setRejectTarget] = useState<AdminProofItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Community Feature Modal
  const [featureTarget, setFeatureTarget] = useState<AdminProofItem | null>(null)
  const [featureForm, setFeatureForm] = useState({
    title: '',
    content: '',
    category: 'DEAL_CLOSED',
    dealSize: '',
    clientNiche: '',
    isPinned: false,
  })
  const [featuring, setFeaturing] = useState(false)

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fetchProofs = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch('/api/admin/rewards', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setProofs(data.data.proofs || [])
        setStats(data.data.stats)
      }
    } catch (err) {
      console.error('[AdminRewardsPage] Failed to fetch proofs:', err)
      addToast({ type: 'error', message: 'Failed to load milestone proofs' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchProofs()
  }, [fetchProofs])

  const openApproveModal = (proof: AdminProofItem) => {
    setApproveTarget(proof)
    setCustomCredits(DEFAULT_REWARDS[proof.type] || 10)
  }

  const handleApprove = async () => {
    if (!approveTarget) return
    setApproving(true)

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Authentication required')

      const res = await fetch('/api/admin/rewards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: approveTarget.id,
          action: 'APPROVE',
          creditsAwarded: customCredits,
        }),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to approve milestone')
      }

      addToast({
        type: 'success',
        message: result.message || `Awarded +${customCredits} credits!`,
      })
      setApproveTarget(null)
      await fetchProofs()
    } catch (err: any) {
      console.error('[AdminRewardsPage] Approve error:', err)
      addToast({ type: 'error', message: err.message || 'Error approving milestone' })
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setRejecting(true)

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Authentication required')

      const res = await fetch('/api/admin/rewards', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: rejectTarget.id,
          action: 'REJECT',
          adminNote: rejectReason,
        }),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to reject milestone')
      }

      addToast({ type: 'info', message: 'Milestone submission rejected' })
      setRejectTarget(null)
      setRejectReason('')
      await fetchProofs()
    } catch (err: any) {
      console.error('[AdminRewardsPage] Reject error:', err)
      addToast({ type: 'error', message: err.message || 'Error rejecting milestone' })
    } finally {
      setRejecting(false)
    }
  }

  const openFeatureModal = (proof: AdminProofItem) => {
    setFeatureTarget(proof)
    const category = proof.type || 'DEAL_CLOSED'
    const defaultTitle =
      category === 'DEAL_CLOSED'
        ? `${proof.user?.name || 'Member'} closed client contract via Lead Hunter`
        : category === 'MEETING_SCHEDULED'
        ? `${proof.user?.name || 'Member'} booked sales discovery call`
        : `${proof.user?.name || 'Member'} received warm positive reply`

    setFeatureForm({
      title: defaultTitle,
      content: proof.note || 'Verified outreach signal win generated through Lead Hunter leads.',
      category,
      dealSize: '',
      clientNiche: '',
      isPinned: false,
    })
  }

  const handleFeatureSubmit = async () => {
    if (!featureTarget) return
    setFeaturing(true)
    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Authentication required')

      const res = await fetch('/api/admin/community/from-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          proofId: featureTarget.id,
          title: featureForm.title,
          content: featureForm.content,
          category: featureForm.category,
          dealSize: featureForm.dealSize || undefined,
          clientNiche: featureForm.clientNiche || undefined,
          isPinned: featureForm.isPinned,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to feature proof')
      }

      addToast({
        type: 'success',
        message: '🎉 Successfully published win to Community Hub!',
      })
      setFeatureTarget(null)
    } catch (err: any) {
      console.error('[AdminRewardsPage] Feature error:', err)
      addToast({ type: 'error', message: err.message || 'Error featuring proof' })
    } finally {
      setFeaturing(false)
    }
  }

  const filteredProofs = proofs.filter((p) => {
    if (activeTab !== 'ALL' && p.status !== activeTab) return false
    if (search.trim()) {
      const query = search.toLowerCase()
      const userName = (p.user?.name || '').toLowerCase()
      const userEmail = (p.user?.email || '').toLowerCase()
      const note = (p.note || '').toLowerCase()
      const type = (p.type || '').toLowerCase()
      return (
        userName.includes(query) ||
        userEmail.includes(query) ||
        note.includes(query) ||
        type.includes(query)
      )
    }
    return true
  })

  if (loading) {
    return <CustomLoader page="admin" fullscreen />
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            <TrophyIcon className="w-7 h-7 text-accent-mint" />
            Milestone Rewards Review
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Review user-submitted outreach screenshot proofs and award bonus credits.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-elevated border border-white/[0.08] rounded-xl">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Total Proofs
          </span>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalSubmissions}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-amber-500/20 bg-amber-500/5 rounded-xl">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Pending Review
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pendingCount}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Approved Wins
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.approvedCount}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-accent-mint/20 bg-accent-mint/5 rounded-xl">
          <span className="text-xs font-semibold text-accent-mint uppercase tracking-wider">
            Bonus Credits Awarded
          </span>
          <div className="text-2xl font-bold text-accent-mint mt-1">+{stats.totalCreditsAwarded}</div>
        </div>
      </div>

      {/* Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-accent-mint text-black'
                    : 'bg-surface-elevated text-zinc-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <span>{tab === 'ALL' ? 'All Submissions' : tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
                {tab === 'PENDING' && stats.pendingCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-black text-white' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {stats.pendingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-surface-elevated border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
          />
        </div>
      </div>

      {/* Proofs Review Table / List */}
      {filteredProofs.length === 0 ? (
        <div className="py-16 text-center border border-white/[0.06] rounded-2xl bg-surface-elevated/40">
          <PhotoIcon className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <h3 className="text-sm font-bold text-white">No submissions found</h3>
          <p className="text-xs text-text-secondary mt-1">
            {activeTab === 'PENDING'
              ? 'All milestone proofs have been reviewed!'
              : 'No submissions match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProofs.map((proof) => {
            const typeInfo = TYPE_LABELS[proof.type] || { label: proof.type, icon: '🎯' }
            const defaultReward = DEFAULT_REWARDS[proof.type] || 10

            return (
              <div
                key={proof.id}
                className="bg-surface-elevated border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] transition-colors shadow-lg"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: User & Submission Details */}
                  <div className="flex items-start gap-4 min-w-0">
                    {/* Clickable Screenshot Thumbnail */}
                    <div
                      onClick={() => setLightboxImage(proof.imageUrl)}
                      className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/60 border border-white/[0.12] flex-shrink-0 cursor-pointer group"
                      title="Click to view full screenshot"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proof.imageUrl}
                        alt="Proof thumbnail"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ArrowTopRightOnSquareIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      {/* User & Plan Pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          {proof.user?.name || 'Unnamed User'}
                        </span>
                        <span className="text-xs text-text-secondary font-mono">
                          {proof.user?.email}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                          {proof.user?.plan || 'FREE'}
                        </span>
                      </div>

                      {/* Milestone Category & Note */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.05] text-white border border-white/[0.1]">
                          <span>{typeInfo.icon}</span>
                          <span>{typeInfo.label}</span>
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          Default: +{defaultReward} cr
                        </span>
                      </div>

                      {proof.note && (
                        <p className="text-xs text-zinc-300 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-white/[0.06] italic">
                          &ldquo;{proof.note}&rdquo;
                        </p>
                      )}

                      <div className="text-[11px] text-zinc-500">
                        Submitted on{' '}
                        {new Date(proof.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions / Status */}
                  <div className="flex items-center gap-3 lg:self-center flex-shrink-0">
                    {proof.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => openApproveModal(proof)}
                          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Approve (+{defaultReward})
                        </button>
                        <button
                          onClick={() => setRejectTarget(proof)}
                          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-surface-elevated hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    ) : proof.status === 'APPROVED' ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircleIcon className="w-4 h-4" />
                          Approved (+{proof.creditsAwarded} Credits)
                        </span>
                        <button
                          type="button"
                          onClick={() => openFeatureModal(proof)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-mint/10 hover:bg-accent-mint/20 text-accent-mint border border-accent-mint/30 text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          Feature in Community
                        </button>
                        {proof.reviewedAt && (
                          <div className="text-[10px] text-zinc-500">
                            {new Date(proof.reviewedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          <XCircleIcon className="w-4 h-4" />
                          Rejected
                        </span>
                        {proof.adminNote && (
                          <p className="text-[11px] text-red-400/80 mt-1 max-w-xs truncate">
                            {proof.adminNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Approve Modal (Confirm / Adjust Credits) */}
      <AnimatePresence>
        {approveTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-white/[0.12] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Approve Milestone Proof</h3>
                  <p className="text-xs text-text-secondary">Award platform bonus credits</p>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-white/[0.08] rounded-xl text-xs space-y-1">
                <div className="text-zinc-400">
                  User: <span className="text-white font-bold">{approveTarget.user?.name}</span> ({approveTarget.user?.email})
                </div>
                <div className="text-zinc-400">
                  Milestone: <span className="text-secondary font-bold">{TYPE_LABELS[approveTarget.type]?.label}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Bonus Credits to Award
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={customCredits || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomCredits(val === '' ? 0 : Math.max(1, parseInt(val, 10) || 0))
                  }}
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-white/20 rounded-xl text-base text-white font-mono font-bold focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/40 transition-all placeholder:text-zinc-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Credits are added immediately to the member&apos;s bonus balance.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  disabled={approving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {approving ? 'Granting Credits...' : `Confirm & Award +${customCredits} Credits`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-white/[0.12] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <XCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reject Milestone Proof</h3>
                  <p className="text-xs text-text-secondary">Provide feedback to the member</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Screenshot does not show client message or contract confirmation..."
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-white/20 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-error focus:ring-1 focus:ring-error/40 resize-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  disabled={rejecting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={rejecting}
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-colors"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feature in Community Hub Modal */}
      <AnimatePresence>
        {featureTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-white/[0.12] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center text-accent-mint">
                  <SparklesIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Feature in Community Hub</h3>
                  <p className="text-xs text-text-secondary">
                    Publish this verified win to the public member social proof feed.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-white/[0.08] rounded-xl text-xs space-y-1">
                <div className="text-zinc-400">
                  Member: <span className="text-white font-bold">{featureTarget.user?.name}</span> ({featureTarget.user?.plan || 'PRO'})
                </div>
                <div className="text-zinc-400">
                  Type: <span className="text-accent-mint font-bold">{featureTarget.type}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Headline / Title
                  </label>
                  <input
                    type="text"
                    value={featureForm.title}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Deal Size (e.g. $4,500/mo)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. $4,500/mo or $12,000"
                      value={featureForm.dealSize}
                      onChange={(e) => setFeatureForm((f) => ({ ...f, dealSize: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Client Niche
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B2B SaaS, E-Commerce"
                      value={featureForm.clientNiche}
                      onChange={(e) => setFeatureForm((f) => ({ ...f, clientNiche: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Story & Strategy Breakdown
                  </label>
                  <textarea
                    rows={3}
                    value={featureForm.content}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, content: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={featureForm.isPinned}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-surface-container-lowest text-accent-mint focus:ring-0"
                  />
                  <label htmlFor="pinCheck" className="text-xs text-zinc-300 font-medium">
                    Pin this win at the top of the Community Hub
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setFeatureTarget(null)}
                  disabled={featuring}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFeatureSubmit}
                  disabled={featuring || !featureForm.title.trim() || !featureForm.content.trim()}
                  className="px-5 py-2 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-accent-mint/20 disabled:opacity-50"
                >
                  {featuring ? 'Publishing...' : 'Publish to Community Feed'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Screenshot Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[90vh] bg-surface-elevated border border-white/[0.15] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Submitted Screenshot Proof</span>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImage}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-zinc-400 hover:text-white"
                    title="Open in new tab"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="p-1 rounded text-zinc-400 hover:text-white"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-2 overflow-auto bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxImage}
                  alt="Proof Full"
                  className="max-h-[80vh] w-auto object-contain rounded"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
