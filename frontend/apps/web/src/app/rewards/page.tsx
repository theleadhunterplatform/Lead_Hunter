'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
} from '@heroicons/react/24/solid'
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

const MILESTONE_OPTIONS = [
  {
    id: 'POSITIVE_REPLY',
    label: 'Positive Client Reply',
    credits: '+10 Credits',
    icon: '💬',
    desc: 'Client replied showing direct interest in your outreach pitch',
  },
  {
    id: 'MEETING_SCHEDULED',
    label: 'Meeting / Call Scheduled',
    credits: '+25 Credits',
    icon: '📅',
    desc: 'Client agreed to a discovery call or sent a calendar invite',
  },
  {
    id: 'DEAL_CLOSED',
    label: 'Deal Closed / Contract Signed',
    credits: '+50 Credits',
    icon: '🏆',
    desc: 'Client hired you, signed an agreement, or paid an invoice/deposit',
  },
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WebP)', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be under 5MB', 'error')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
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
      addToast('Please upload a screenshot proof', 'error')
      return
    }

    setSubmitting(true)

    try {
      const token = await getFirebaseToken()
      if (!token || !user) {
        addToast('Please log in to submit proof', 'error')
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
          note,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit proof')
      }

      addToast('🎉 Screenshot submitted for admin review!', 'success')
      handleClearFile()
      setNote('')
      await fetchProofs()
    } catch (err: any) {
      console.error('[RewardsPage] Submit error:', err)
      addToast(err.message || 'Failed to submit screenshot proof', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const getMilestoneInfo = (type: string) => {
    return MILESTONE_OPTIONS.find((m) => m.id === type) || {
      id: type,
      label: type.replace(/_/g, ' '),
      credits: '',
      icon: '🎯',
      desc: '',
    }
  }

  if (loading) {
    return <CustomLoader fullscreen />
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary px-4 py-8 md:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center text-accent-mint">
            <TrophyIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Outreach Milestone Rewards</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Turn your real-world client wins into free platform credits. Upload screenshot proof to earn bonuses.
            </p>
          </div>
        </div>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {MILESTONE_OPTIONS.map((m) => {
          const isSelected = selectedType === m.id
          return (
            <div
              key={m.id}
              onClick={() => setSelectedType(m.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-accent-mint/5 border-accent-mint shadow-lg shadow-accent-mint/10 ring-1 ring-accent-mint/50'
                  : 'bg-surface-elevated border-white/[0.08] hover:border-white/[0.2]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{m.icon}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-mint/15 text-accent-mint border border-accent-mint/30">
                  {m.credits}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{m.label}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{m.desc}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-surface-elevated border border-white/[0.08] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-accent-mint" />
              <h2 className="text-base font-bold text-white">Submit New Screenshot Proof</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Milestone Category
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-base border border-white/[0.12] rounded-xl text-sm text-white focus:outline-none focus:border-accent-mint"
                >
                  {MILESTONE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.icon} {opt.label} ({opt.credits})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Screenshot Proof (PNG, JPG, WebP)
                </label>

                {!previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/[0.15] hover:border-accent-mint/50 bg-surface-base/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <ArrowUpTrayIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-text-secondary">PNG, JPG, or WebP up to 5MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-xl border border-white/[0.12] overflow-hidden bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-56 object-contain bg-black/60"
                    />
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-500/80 text-white transition-colors"
                      title="Remove image"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-surface-base text-[11px] text-zinc-400 truncate flex items-center justify-between">
                      <span className="truncate">{selectedFile?.name}</span>
                      <span className="font-mono flex-shrink-0">
                        {((selectedFile?.size || 0) / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Details */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Details / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Client from LinkedIn accepted my $2,500 quote for website redesign..."
                  className="w-full px-3.5 py-2.5 bg-surface-base border border-white/[0.12] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedFile}
                className="w-full py-3 px-4 bg-accent-mint hover:bg-accent-mint/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-accent-mint/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Uploading & Submitting Proof...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Submit Proof for Review
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Stats & Submission History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-elevated border border-white/[0.08] rounded-xl p-4">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                Credits Won from Wins
              </span>
              <div className="text-2xl font-bold text-accent-mint mt-1">+{totalEarned}</div>
            </div>
            <div className="bg-surface-elevated border border-white/[0.08] rounded-xl p-4">
              <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">
                Pending Review
              </span>
              <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-surface-elevated border border-white/[0.08] rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Your Proof Submissions</h2>
              <span className="text-xs text-zinc-500">{proofs.length} total</span>
            </div>

            {proofs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 border border-white/[0.05] rounded-xl bg-surface-base/30">
                <PhotoIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-zinc-400">No milestone proofs submitted yet</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Submit a screenshot of a client reply or closed contract to earn bonus credits.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {proofs.map((proof) => {
                  const info = getMilestoneInfo(proof.type)
                  return (
                    <div
                      key={proof.id}
                      className="p-3.5 bg-surface-base border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 hover:border-white/[0.12] transition-colors"
                    >
                      {/* Left: Thumbnail & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.imageUrl}
                          alt="Proof"
                          onClick={() => setLightboxImage(proof.imageUrl)}
                          className="w-12 h-12 rounded-lg object-cover bg-black/50 border border-white/[0.1] cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {info.icon} {info.label}
                            </span>
                          </div>
                          {proof.note && (
                            <p className="text-[11px] text-text-secondary truncate mt-0.5">
                              &ldquo;{proof.note}&rdquo;
                            </p>
                          )}
                          <div className="text-[10px] text-zinc-500 mt-1">
                            {new Date(proof.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        {proof.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            +{proof.creditsAwarded} Credits
                          </span>
                        )}
                        {proof.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ClockIcon className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                        {proof.status === 'REJECTED' && (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <XCircleIcon className="w-3 h-3" />
                              Rejected
                            </span>
                            {proof.adminNote && (
                              <p className="text-[10px] text-red-400/80 max-w-[140px] truncate mt-1">
                                {proof.adminNote}
                              </p>
                            )}
                          </div>
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-surface-elevated border border-white/[0.15] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Screenshot Proof</span>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImage}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-zinc-400 hover:text-white"
                    title="Open full image in new tab"
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
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
