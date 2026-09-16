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
    badgeColor: 'bg-tertiary/15 text-tertiary border-tertiary/30',
    desc: 'Client replied expressing genuine interest, requesting details, or asking for a quote.',
    criteria: 'Screenshot showing client positive message from LinkedIn, Twitter, or email.',
  },
  {
    id: 'MEETING_SCHEDULED',
    label: 'Discovery Call Booked',
    credits: '+25 Credits',
    bounty: 25,
    icon: CalendarDaysIcon,
    badgeColor: 'bg-secondary/15 text-secondary border-secondary/30',
    desc: 'Client confirmed a Zoom, Google Meet, or booked a slot via Calendly/Cal.com.',
    criteria: 'Screenshot of calendar invite, booked meeting link confirmation, or call confirmation.',
  },
  {
    id: 'DEAL_CLOSED',
    label: 'Deal Closed / Paid Client',
    credits: '+50 Credits',
    bounty: 50,
    icon: CurrencyDollarIcon,
    badgeColor: 'bg-primary/20 text-primary border-primary/40 font-extrabold',
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
        badgeColor: 'bg-white/10 text-white border-white/20',
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

  if (loading) {
    return <CustomLoader fullscreen />
  }

  const currentTier = getMilestoneInfo(selectedType)

  return (
    <div className="flex-1 overflow-y-auto bg-bg-main text-text-primary p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8 relative">
        {/* Top Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary w-fit">
            <TrophyIcon className="w-3.5 h-3.5" />
            <span>Outreach Milestone Bounties</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Turn Client Wins Into Free Credits
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl leading-relaxed">
            Close deals and book calls using Lead Hunter leads? Upload a quick screenshot of your win. When
            verified, you earn <strong className="text-primary">+10 to +50 bonus credits</strong> added
            directly into your reveal balance.
          </p>
        </div>

        {/* 4-Card Performance Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Credits Won */}
          <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Credits Earned</span>
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <TrophyIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-primary tabular-nums tracking-tight">
              +{totalEarned}
            </div>
            <p className="text-xs text-text-secondary">Added to your lead reveal balance</p>
          </div>

          {/* Verified Wins */}
          <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Verified Wins</span>
              <div className="p-2 rounded-xl bg-secondary/15 text-secondary">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-secondary tabular-nums tracking-tight">
              {approvedProofs.length}
            </div>
            <p className="text-xs text-text-secondary">Milestone proofs approved by admin</p>
          </div>

          {/* Pending Review */}
          <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Under Review</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ClockIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {pendingCount}
            </div>
            <p className="text-xs text-text-secondary">Audited by admin within 24 hours</p>
          </div>

          {/* Max Bounty Tier */}
          <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Top Bounty Tier</span>
              <div className="p-2 rounded-xl bg-tertiary/15 text-tertiary">
                <RocketLaunchIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-tertiary tabular-nums tracking-tight">
              +50 Credits
            </div>
            <p className="text-xs text-text-secondary">Per signed contract / paid client</p>
          </div>
        </div>

        {/* 3 Milestone Tier Selector Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              1. Select Milestone Category
            </h2>
            <span className="text-xs text-text-secondary">Click a tier to choose your proof bounty</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MILESTONE_TIERS.map((tier) => {
              const isSelected = selectedType === tier.id
              const Icon = tier.icon
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedType(tier.id)}
                  className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-surface/80 border-primary ring-1 ring-primary/40 shadow-[0_0_24px_rgba(var(--rgb-primary),0.15)] scale-[1.01]'
                      : 'bg-surface/40 border-white/[0.08] hover:border-white/20 hover:bg-surface/60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-2xl bg-surface-elevated border border-white/10 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${tier.badgeColor}`}
                      >
                        {tier.credits}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span>{tier.label}</span>
                        {isSelected && <CheckIcon className="w-4 h-4 text-primary stroke-[3]" />}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tier.desc}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/[0.08] text-[11px] text-text-secondary flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
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
            <div className="p-6 md:p-7 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <ArrowUpTrayIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">2. Submit Screenshot Proof</h2>
                    <p className="text-xs text-text-secondary">
                      Claiming: <strong className="text-primary">{currentTier.label}</strong> ({currentTier.credits})
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Dropzone */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                    <span>Attach Screenshot</span>
                    <span className="text-[11px] text-text-secondary font-normal">PNG, JPG, WebP up to 5MB</span>
                  </label>

                  {!previewUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        isDragging
                          ? 'border-primary bg-primary/10 scale-[1.01]'
                          : 'border-white/[0.15] hover:border-primary/50 bg-surface-container-lowest/50 hover:bg-surface-container-lowest'
                      }`}
                    >
                      <div className="p-3 rounded-2xl bg-surface-elevated border border-white/10 text-primary">
                        <PhotoIcon className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Drag and drop screenshot here
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          or <span className="text-primary underline font-semibold">browse files</span> from your device
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
                    <div className="relative rounded-2xl border border-white/10 overflow-hidden bg-surface-container-lowest shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Selected Proof Preview"
                        className="w-full max-h-56 object-contain bg-black/80"
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
                          className="p-1.5 rounded-xl bg-black/70 hover:bg-red-500 text-white backdrop-blur-sm transition-colors"
                          title="Remove Image"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="px-3.5 py-2.5 bg-surface-elevated/90 backdrop-blur-md border-t border-white/10 text-xs text-text-secondary flex items-center justify-between">
                        <span className="truncate max-w-xs font-medium text-white">
                          {selectedFile?.name}
                        </span>
                        <span className="font-mono text-[11px] text-text-secondary shrink-0">
                          {((selectedFile?.size || 0) / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Note / Context Details */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                    <span>Win Context / Client Details (Optional)</span>
                    <span className="text-[11px] font-normal text-text-secondary">
                      {note.length} / 500
                    </span>
                  </label>

                  <textarea
                    rows={3}
                    value={note}
                    maxLength={500}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Client accepted our $2,500 retainer quote for SEO redesign via LinkedIn..."
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border border-white/10 text-white text-xs font-sans placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-y leading-relaxed"
                  />

                  {/* Suggested Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-text-secondary mr-1">
                      Quick tags:
                    </span>
                    {QUICK_CONTEXT_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setNote((prev) => (prev ? `${prev} • ${chip}` : chip))}
                        className="px-2.5 py-1 rounded-xl bg-surface-elevated hover:bg-primary/15 hover:text-primary border border-white/10 text-[11px] font-medium text-text-secondary hover:border-primary/30 transition-all"
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
                  className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-black font-bold text-sm shadow-[0_4px_24px_rgba(var(--rgb-primary),0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Uploading & Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Submit Proof for Review ({currentTier.credits})</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 3-Step How It Works Card */}
            <div className="p-6 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <BoltIcon className="w-4 h-4 text-primary" />
                <span>How Bounty Credits Work</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-secondary">
                <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-white/5 space-y-1">
                  <div className="font-bold text-white">1. Pitch Leads</div>
                  <p className="text-[11px] leading-relaxed">
                    Contact decision makers using Lead Hunter verified emails/phones.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-white/5 space-y-1">
                  <div className="font-bold text-white">2. Snap Proof</div>
                  <p className="text-[11px] leading-relaxed">
                    Take a screenshot of client reply, booked call, or signed agreement.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-elevated/70 border border-white/5 space-y-1">
                  <div className="font-bold text-white">3. Get Rewarded</div>
                  <p className="text-[11px] leading-relaxed">
                    Admin audits within 24h and auto-deposits credits to your balance!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Proof Submission History */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 md:p-7 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-5">
              {/* Header & Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">Your Milestone Submissions</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Audit trail of all submitted proof screenshots and credit rewards
                  </p>
                </div>

                {/* Status Filter Tabs */}
                <div className="p-1 rounded-xl bg-surface-container-lowest border border-white/10 flex items-center gap-1 self-start sm:self-center">
                  {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === filter
                          ? 'bg-primary text-black font-extrabold shadow-sm'
                          : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {filter === 'ALL'
                        ? 'All'
                        : filter === 'APPROVED'
                        ? 'Approved'
                        : filter === 'PENDING'
                        ? 'Pending'
                        : 'Rejected'}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              {filteredProofs.length === 0 ? (
                <div className="py-16 text-center text-xs text-text-secondary border border-white/[0.06] rounded-2xl bg-surface-container-lowest/30 space-y-2">
                  <PhotoIcon className="w-8 h-8 text-text-secondary/50 mx-auto mb-1" />
                  <p className="font-bold text-white text-sm">No milestone proofs found</p>
                  <p className="max-w-xs mx-auto text-text-secondary">
                    Submit screenshot proof of a client conversation or contract to earn your first bounty reward!
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
                        className="p-4 rounded-2xl bg-surface-elevated/80 border border-white/[0.08] hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Thumbnail with overlay */}
                          <div
                            onClick={() => setLightboxImage(proof.imageUrl)}
                            className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-white/10 cursor-pointer shrink-0 hover:ring-2 hover:ring-primary/50 transition-all group"
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
                              <div className="p-1 rounded-md bg-surface text-primary">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <h4 className="text-xs font-bold text-white truncate">
                                {info.label}
                              </h4>
                            </div>

                            {proof.note && (
                              <p className="text-xs text-text-secondary italic line-clamp-2">
                                &ldquo;{proof.note}&rdquo;
                              </p>
                            )}

                            <div className="text-[11px] text-text-secondary/70 font-mono">
                              Submitted on{' '}
                              {new Date(proof.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>

                            {/* Admin Note on Rejection */}
                            {proof.status === 'REJECTED' && proof.adminNote && (
                              <div className="p-2.5 rounded-xl bg-error/10 border border-error/20 text-xs text-error mt-2 space-y-0.5">
                                <span className="font-bold uppercase tracking-wider text-[10px] block">
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
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/30">
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              <span>+{proof.creditsAwarded} Credits</span>
                            </span>
                          )}

                          {proof.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                              <ClockIcon className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pending Review</span>
                            </span>
                          )}

                          {proof.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-error/15 text-error border border-error/30">
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
                className="relative max-w-4xl max-h-[85vh] bg-surface border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <PhotoIcon className="w-4 h-4 text-primary" />
                    <span>Full-Resolution Screenshot Proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={lightboxImage}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white transition-all"
                      title="Open full image in new tab"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setLightboxImage(null)}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white transition-all"
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
    </div>
  )
}
