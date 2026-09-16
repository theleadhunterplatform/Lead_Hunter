'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrophyIcon,
  SparklesIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/solid'
import {
  MagnifyingGlassPlusIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { getFirebaseToken, storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { CustomLoader } from '@/components/ui/CustomLoader'

interface MilestoneProofItem {
  id: string
  type: string
  imageUrl: string
  note: string | null
  creditsAwarded: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote: string | null
  createdAt: string
}

const MILESTONE_TIERS = [
  {
    id: 'POSITIVE_REPLY',
    label: 'Positive Client Reply',
    credits: '+10 Credits',
    bounty: 10,
    icon: ChatBubbleLeftRightIcon,
    badgeColor: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400',
    accentColor: 'border-sky-500/50 shadow-sky-500/10',
    desc: 'Client replied expressing genuine interest, requesting details, or asking for a quote.',
    criteria: 'Screenshot showing client positive message from LinkedIn, Twitter, or email.',
  },
  {
    id: 'MEETING_SCHEDULED',
    label: 'Discovery Call Booked',
    credits: '+25 Credits',
    bounty: 25,
    icon: CalendarDaysIcon,
    badgeColor: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400',
    accentColor: 'border-indigo-500/50 shadow-indigo-500/10',
    desc: 'Client confirmed a Zoom, Google Meet, or booked a slot via Calendly/Cal.com.',
    criteria: 'Screenshot of calendar invite, booked meeting link confirmation, or call confirmation.',
  },
  {
    id: 'DEAL_CLOSED',
    label: 'Deal Closed / Paid Client',
    credits: '+50 Credits',
    bounty: 50,
    icon: CurrencyDollarIcon,
    badgeColor: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    accentColor: 'border-amber-500/50 shadow-amber-500/15',
    desc: 'Client signed an agreement, paid a deposit/retainer, or finalized a service contract.',
    criteria: 'Screenshot of paid invoice receipt, signed proposal, or contract confirmation.',
  },
]

const QUICK_CONTEXT_CHIPS = [
  'LinkedIn Outreach',
  'Twitter/X Lead',
  'Closed Website Retainer',
  'Booked 30-Min Discovery Call',
  'Accepted $2,500 Quote',
  'Paid 50% Deposit',
]

export default function RewardsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [proofs, setProofs] = useState<MilestoneProofItem[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [selectedType, setSelectedType] = useState('POSITIVE_REPLY')
  const [note, setNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL')

  // Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProofs = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch('/api/rewards/proof', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setProofs(data.data.proofs || [])
        setTotalEarned(data.data.totalApprovedCredits || 0)
        setPendingCount(data.data.pendingCount || 0)
      }
    } catch (err) {
      console.error('[RewardsPage] Failed to fetch proofs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProofs()
  }, [fetchProofs])

  const handleValidateAndSetFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'Please select an image file (PNG, JPG, or WebP)' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image size must be under 5MB' })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    addToast({ type: 'info', message: `Selected: ${file.name}` })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleValidateAndSetFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleValidateAndSetFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      addToast({ type: 'error', message: 'Please attach a screenshot proof before submitting' })
      return
    }

    setSubmitting(true)

    try {
      const token = await getFirebaseToken()
      if (!token || !user) {
        addToast({ type: 'error', message: 'Please log in to submit proof' })
        return
      }

      // 1. Upload to Cloud Storage (Firebase Storage)
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `proofs/${user.id}/${Date.now()}_${cleanFileName}`
      const storageRef = ref(storage, storagePath)

      await uploadBytes(storageRef, selectedFile)
      const downloadUrl = await getDownloadURL(storageRef)

      // 2. Submit to Database API
      const res = await fetch('/api/rewards/proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: selectedType,
          imageUrl: downloadUrl,
          note: note.trim() || undefined,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit proof')
      }

      addToast({
        type: 'success',
        message: '🎉 Screenshot proof submitted! Admin will audit and award credits within 24h.',
      })
      handleClearFile()
      setNote('')
      await fetchProofs()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit screenshot proof'
      console.error('[RewardsPage] Submit error:', err)
      addToast({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const getMilestoneInfo = (type: string) => {
    return (
      MILESTONE_TIERS.find((m) => m.id === type) || {
        id: type,
        label: type.replace(/_/g, ' '),
        credits: '+Credits',
        bounty: 0,
        icon: SparklesIcon,
        badgeColor: 'from-zinc-500/20 to-zinc-500/10 border-zinc-500/30 text-zinc-400',
        accentColor: 'border-zinc-500/40',
        desc: '',
        criteria: '',
      }
    )
  }

  // Filtered proofs list
  const filteredProofs = useMemo(() => {
    if (statusFilter === 'ALL') return proofs
    return proofs.filter((p) => p.status === statusFilter)
  }, [proofs, statusFilter])

  const approvedProofs = useMemo(() => proofs.filter((p) => p.status === 'APPROVED'), [proofs])
  const rejectedProofs = useMemo(() => proofs.filter((p) => p.status === 'REJECTED'), [proofs])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <TrophyIcon className="w-5 h-5 text-brand absolute inset-0 m-auto" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-text-primary">Loading Milestone Rewards</p>
          <p className="text-xs text-text-tertiary">Retrieving your bounty wins and submission audit logs...</p>
        </div>
      </div>
    )
  }

  const currentTier = getMilestoneInfo(selectedType)

  return (
    <div className="min-h-screen text-text-primary px-4 py-8 md:px-8 max-w-6xl mx-auto space-y-8 relative">
      {/* Ambient Top Glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-4/5 h-60 bg-gradient-to-b from-amber-500/10 via-brand/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-transparent border border-amber-500/30 text-amber-400 shadow-xl shadow-amber-500/10 shrink-0">
            <TrophyIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Outreach Milestone Bounties
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                Earn Credits
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-tertiary mt-1 max-w-2xl leading-relaxed">
              Turn your real-world client wins into free platform credits. Upload screenshot proof of a client
              reply, booked call, or closed deal to earn automatic bounty rewards.
            </p>
          </div>
        </div>

        {/* Total Earned Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-surface/80 border border-border/70 backdrop-blur-md shadow-sm self-start md:self-center shrink-0">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary">
              Total Bonus Credits Won
            </div>
            <div className="text-xl font-black text-amber-400 tabular-nums tracking-tight">
              +{totalEarned} Credits
            </div>
          </div>
        </div>
      </div>

      {/* 4-Card Performance Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credits Won */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-amber-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Credits Earned</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <TrophyIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tabular-nums tracking-tight">
            +{totalEarned}
          </div>
          <p className="text-[11px] text-text-tertiary">Added directly to your reveal balance</p>
        </div>

        {/* Verified Wins */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-emerald-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Verified Wins</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
            {approvedProofs.length}
          </div>
          <p className="text-[11px] text-text-tertiary">Milestone proofs approved by admin</p>
        </div>

        {/* Pending Review */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-brand/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Under Review</span>
            <div className="p-2 rounded-xl bg-brand/10 text-brand group-hover:scale-110 transition-transform">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-text-primary tabular-nums tracking-tight">
            {pendingCount}
          </div>
          <p className="text-[11px] text-text-tertiary">Manual review within ~12-24 hours</p>
        </div>

        {/* Max Bounty Tier */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-purple-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Top Bounty Tier</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <RocketLaunchIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-400 tabular-nums tracking-tight">
            +50 Credits
          </div>
          <p className="text-[11px] text-text-tertiary">Awarded per closed contract / client</p>
        </div>
      </div>

      {/* 3 Milestone Tier Selector Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Select Milestone to Claim
          </label>
          <span className="text-[11px] text-text-tertiary">Click a tier to choose your proof category</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MILESTONE_TIERS.map((tier) => {
            const isSelected = selectedType === tier.id
            const Icon = tier.icon
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedType(tier.id)}
                className={`p-5 rounded-3xl border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? `bg-surface/90 ${tier.accentColor} shadow-xl ring-2 ring-brand/40 scale-[1.02]`
                    : 'bg-surface/40 border-border/70 hover:border-border hover:bg-surface/70'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-2xl bg-surface border border-border/60 text-brand">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-gradient-to-r ${tier.badgeColor}`}
                    >
                      {tier.credits}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <span>{tier.label}</span>
                      {isSelected && <CheckIcon className="w-4 h-4 text-brand stroke-[3]" />}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tier.desc}</p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border/40 text-[11px] text-text-tertiary flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{tier.criteria}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Grid: Upload Form + Submission History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand/15 text-brand">
                  <ArrowUpTrayIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Upload Screenshot Proof</h2>
                  <p className="text-xs text-text-tertiary">
                    Selected category: <strong className="text-brand">{currentTier.label}</strong> ({currentTier.credits})
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>Screenshot Image</span>
                  <span className="text-[11px] font-normal text-text-tertiary">PNG, JPG, WebP &le; 5MB</span>
                </label>

                {!previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? 'border-brand bg-brand/10 scale-[1.01]'
                        : 'border-border/70 hover:border-brand/40 bg-background/40 hover:bg-background/70'
                    }`}
                  >
                    <div className="p-3 rounded-2xl bg-surface border border-border/70 text-text-tertiary group-hover:text-brand">
                      <PhotoIcon className="w-8 h-8 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        Drag and drop your screenshot here
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        or <span className="text-brand underline font-semibold">browse files</span> from your device
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-border/80 overflow-hidden bg-black/60 shadow-lg group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected Proof Preview"
                      className="w-full max-h-60 object-contain bg-black/80"
                    />

                    {/* Image Top Overlay Bar */}
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLightboxImage(previewUrl)}
                        className="p-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm transition-colors"
                        title="View Fullscreen"
                      >
                        <MagnifyingGlassPlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="p-1.5 rounded-xl bg-black/70 hover:bg-rose-600 text-white backdrop-blur-sm transition-colors"
                        title="Remove Image"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="px-3.5 py-2 bg-surface/90 backdrop-blur-md border-t border-border/60 text-xs text-text-secondary flex items-center justify-between">
                      <span className="truncate max-w-xs font-medium text-text-primary">
                        {selectedFile?.name}
                      </span>
                      <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                        {((selectedFile?.size || 0) / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Context Details */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>Win Context / Client Details (Optional)</span>
                  <span className="text-[11px] font-normal text-text-tertiary">
                    {note.length} / 500 chars
                  </span>
                </label>

                <textarea
                  rows={3}
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., Client accepted our $2,500 retainer quote for SEO redesign via LinkedIn..."
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border/80 text-text-primary text-xs font-sans focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-y leading-relaxed"
                />

                {/* Suggested Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-text-tertiary mr-1">
                    Quick tags:
                  </span>
                  {QUICK_CONTEXT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNote((prev) => (prev ? `${prev} &bull; ${chip}` : chip))}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-brand/15 hover:text-brand border border-border/70 text-[10.5px] font-medium text-text-tertiary hover:border-brand/40 transition-all"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-brand to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs shadow-xl shadow-brand/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Uploading Screenshot &amp; Submitting Proof...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Submit Proof for Review ({currentTier.credits})</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 3-Step How It Works Card */}
          <div className="p-5 rounded-3xl border border-border/60 bg-surface/30 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-amber-400" />
              <span>How Bounty Credits Work</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-text-secondary">
              <div className="p-3 rounded-2xl bg-background/50 border border-border/50 space-y-1">
                <div className="font-bold text-text-primary">1. Pitch Decision Makers</div>
                <p className="text-text-tertiary leading-relaxed">
                  Use Lead Hunter verified contacts to pitch qualified clients.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-background/50 border border-border/50 space-y-1">
                <div className="font-bold text-text-primary">2. Snap Your Win</div>
                <p className="text-text-tertiary leading-relaxed">
                  Capture a screenshot of their positive reply, invite, or agreement.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-background/50 border border-border/50 space-y-1">
                <div className="font-bold text-text-primary">3. Unlock Free Credits</div>
                <p className="text-text-tertiary leading-relaxed">
                  Admin audits your win within 24h and auto-deposits credits to your balance!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Proof Submission History */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl shadow-xl space-y-5">
            {/* Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span>Your Milestone Submissions</span>
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Audit trail of all submitted proof screenshots and credit rewards
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="p-1 rounded-xl bg-background border border-border/80 flex items-center gap-1 self-start sm:self-center">
                {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                      statusFilter === filter
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter === 'APPROVED' ? 'Approved' : filter === 'PENDING' ? 'Pending' : 'Rejected'}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredProofs.length === 0 ? (
              <div className="py-16 text-center text-xs text-text-tertiary border border-border/40 rounded-2xl bg-background/30 space-y-2">
                <PhotoIcon className="w-8 h-8 text-text-tertiary mx-auto opacity-40" />
                <p className="font-semibold text-text-secondary text-sm">No submissions in this filter</p>
                <p className="max-w-xs mx-auto text-text-tertiary">
                  Upload screenshot proof of a client conversation or contract to earn your first bounty reward!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredProofs.map((proof) => {
                  const info = getMilestoneInfo(proof.type)
                  const Icon = info.icon

                  return (
                    <div
                      key={proof.id}
                      className="p-4 rounded-2xl border border-border/70 bg-background/50 hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm group"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Thumbnail with overlay */}
                        <div
                          onClick={() => setLightboxImage(proof.imageUrl)}
                          className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/50 border border-border/70 cursor-pointer shrink-0 group-hover:ring-2 group-hover:ring-brand/40 transition-all"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proof.imageUrl}
                            alt="Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <MagnifyingGlassPlusIcon className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-surface text-brand">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-xs font-bold text-text-primary truncate">
                              {info.label}
                            </h4>
                          </div>

                          {proof.note && (
                            <p className="text-[11px] text-text-secondary italic line-clamp-2">
                              &ldquo;{proof.note}&rdquo;
                            </p>
                          )}

                          <div className="text-[10px] text-text-tertiary font-mono">
                            Submitted on{' '}
                            {new Date(proof.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>

                          {/* Admin Note on Rejection */}
                          {proof.status === 'REJECTED' && proof.adminNote && (
                            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10.5px] text-rose-300 mt-1.5 space-y-0.5">
                              <span className="font-bold uppercase tracking-wider text-[9.5px] text-rose-400 block">
                                Admin Feedback:
                              </span>
                              <span>{proof.adminNote}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Status Pill */}
                      <div className="flex flex-col items-end shrink-0 self-end sm:self-center">
                        {proof.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-xs">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            <span>+{proof.creditsAwarded} Credits</span>
                          </span>
                        )}

                        {proof.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                            <ClockIcon className="w-3.5 h-3.5 animate-pulse" />
                            <span>Pending Review</span>
                          </span>
                        )}

                        {proof.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-surface border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border/60 flex items-center justify-between bg-surface/90 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <PhotoIcon className="w-4 h-4 text-brand" />
                  <span>Full-Resolution Screenshot Proof</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImage}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-all"
                    title="Open full image in new tab"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 rounded-xl hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-all"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-3 overflow-auto bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxImage}
                  alt="Proof Full Resolution"
                  className="max-h-[72vh] w-auto object-contain rounded-xl shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
