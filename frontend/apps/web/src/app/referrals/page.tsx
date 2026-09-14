'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  GiftIcon,
  ClipboardDocumentCheckIcon,
  Square2StackIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  ShareIcon,
} from '@heroicons/react/24/solid'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { getFirebaseToken } from '@/lib/firebase'

interface ReferralHistoryItem {
  id: string
  name: string
  maskedEmail: string
  joinedAt: string
  creditsAwarded: number
  status: string
}

interface ReferralData {
  referralCode: string
  referralUrl: string
  stats: {
    totalInvited: number
    creditsEarned: number
    currentBonusBalance: number
  }
  history: ReferralHistoryItem[]
}

export default function ReferralsPage() {
  const { user, firebaseUser } = useAuth()
  const { addToast } = useToast()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [claimCode, setClaimCode] = useState('')
  const [claiming, setClaiming] = useState(false)

  const fetchReferralData = useCallback(async () => {
    try {
      setLoading(true)
      const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
      if (!token) return

      const res = await fetch('/api/referrals', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json.data)
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to load referral data' })
      }
    } catch (err) {
      console.error('Error fetching referrals:', err)
      addToast({ type: 'error', message: 'Failed to connect to referral service' })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, addToast])

  useEffect(() => {
    fetchReferralData()
  }, [fetchReferralData])

  const copyToClipboard = async (text: string, isCode = false) => {
    try {
      await navigator.clipboard.writeText(text)
      if (isCode) {
        setCopiedCode(true)
        setTimeout(() => setCopiedCode(false), 2000)
        addToast({ type: 'success', message: 'Referral code copied to clipboard!' })
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        addToast({ type: 'success', message: 'Referral link copied to clipboard!' })
      }
    } catch {
      addToast({ type: 'error', message: 'Could not copy to clipboard' })
    }
  }

  const handleShare = (platform: 'whatsapp' | 'twitter' | 'linkedin' | 'email') => {
    if (!data) return
    const shareText = `Hey! Join Lead Hunter Club using my referral link to get +5 free lead reveal credits: ${data.referralUrl}`
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(data.referralUrl)

    let url = ''
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedText}`
        break
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`
        break
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
      case 'email':
        url = `mailto:?subject=${encodeURIComponent('Invitation to Lead Hunter Club (+5 Free Credits)')}&body=${encodedText}`
        break
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleClaimCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = claimCode.trim().toUpperCase()
    if (!clean) return

    setClaiming(true)
    try {
      const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referralCode: clean }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: json.message || 'Code applied successfully!' })
        setClaimCode('')
        fetchReferralData()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to apply referral code' })
      }
    } catch {
      addToast({ type: 'error', message: 'Error applying referral code' })
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-main text-text-primary p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary w-fit">
            <GiftIcon className="w-3.5 h-3.5" />
            <span>Referral & Rewards Program</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Invite Friends, Earn Platform Credits
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-2xl">
            Give your peers an edge in cold outreach. When they sign up with your link, they get{' '}
            <strong className="text-white">+5 welcome credits</strong>, and you earn{' '}
            <strong className="text-primary">+10 credits</strong> directly into your balance.
          </p>
        </div>

        {/* Hero Share Widget */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl p-6 md:p-8 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_top_right,rgba(var(--rgb-primary),0.12)_0%,transparent_70%)] pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShareIcon className="w-5 h-5 text-primary" />
                  Your Unique Invite Link
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Share this link anywhere — anyone who registers using it is automatically attributed to you.
                </p>
              </div>

              {data?.referralCode && (
                <div className="flex items-center gap-2 bg-surface-elevated/80 border border-white/10 px-3.5 py-1.5 rounded-xl w-fit">
                  <span className="text-xs text-text-secondary">Code:</span>
                  <span className="font-mono font-bold text-sm text-primary tracking-wider">
                    {data.referralCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(data.referralCode, true)}
                    className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copiedCode ? (
                      <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square2StackIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Link Copy Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 bg-surface-elevated border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-text-primary font-mono select-all overflow-x-auto whitespace-nowrap">
                {loading ? 'Generating your personal link...' : data?.referralUrl || 'Loading...'}
              </div>
              <button
                onClick={() => data?.referralUrl && copyToClipboard(data.referralUrl)}
                disabled={loading || !data?.referralUrl}
                className="shrink-0 bg-primary hover:bg-primary/90 text-black font-semibold rounded-2xl px-6 py-3.5 flex items-center justify-center gap-2 active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <ClipboardDocumentCheckIcon className="w-5 h-5 text-black" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Square2StackIcon className="w-5 h-5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Quick Share */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-text-secondary">Quick Share:</span>
              <button
                onClick={() => handleShare('whatsapp')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#25D366]/20 border border-white/[0.08] hover:border-[#25D366]/40 text-xs font-medium text-text-primary transition-all flex items-center gap-1.5"
              >
                <span>💬</span> WhatsApp
              </button>
              <button
                onClick={() => handleShare('linkedin')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#0077B5]/20 border border-white/[0.08] hover:border-[#0077B5]/40 text-xs font-medium text-text-primary transition-all flex items-center gap-1.5"
              >
                <span>💼</span> LinkedIn
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#1DA1F2]/20 border border-white/[0.08] hover:border-[#1DA1F2]/40 text-xs font-medium text-text-primary transition-all flex items-center gap-1.5"
              >
                <span>🐦</span> X / Twitter
              </button>
              <button
                onClick={() => handleShare('email')}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/[0.08] text-xs font-medium text-text-primary transition-all flex items-center gap-1.5"
              >
                <span>✉️</span> Email
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-surface/40 border border-white/[0.06] backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Friends Joined
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <UserGroupIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-white mt-3">
              {loading ? '...' : data?.stats.totalInvited ?? 0}
            </p>
            <p className="text-xs text-text-secondary mt-1">Verified registrations</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl bg-surface/40 border border-white/[0.06] backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Credits Earned
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ArrowTrendingUpIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-3">
              {loading ? '...' : `+${data?.stats.creditsEarned ?? 0}`}
            </p>
            <p className="text-xs text-text-secondary mt-1">+10 credits per friend</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-surface/40 border border-white/[0.06] backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Available Bonus
              </span>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                <SparklesIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-yellow-400 mt-3">
              {loading ? '...' : data?.stats.currentBonusBalance ?? 0}
            </p>
            <p className="text-xs text-text-secondary mt-1">Never expires</p>
          </motion.div>
        </div>

        {/* How It Works */}
        <div className="p-6 md:p-8 rounded-3xl bg-surface/30 border border-white/[0.06]">
          <h3 className="text-base font-bold text-white mb-6">How Referral Rewards Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                1
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Share Your Link</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Send your personal invite link to agency owners, freelancers, or founders looking for warm leads.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                2
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Friend Gets +5 Credits</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  When they register through your link, they receive 5 welcome credits to test out verified contact reveals.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                3
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">You Get +10 Credits</h4>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  As soon as their account is verified, +10 platform credits are automatically added to your balance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* History & Manual Claim */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Referral Activity Table (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-white">Referral Activity</h3>

            <div className="rounded-2xl border border-white/[0.06] bg-surface/20 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-sm text-text-secondary">Loading history...</div>
              ) : !data?.history || data.history.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                  <span className="text-3xl">🎁</span>
                  <p className="text-sm font-medium text-white">No referrals yet</p>
                  <p className="text-xs text-text-secondary max-w-sm">
                    Share your invite link with your network to start unlocking bonus credits!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/[0.06] text-text-secondary uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-5 py-3.5">Friend</th>
                        <th className="px-5 py-3.5">Date Joined</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {data.history.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-white">
                            <div>{item.name}</div>
                            <div className="text-[11px] text-text-secondary font-mono">
                              {item.maskedEmail}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-text-secondary">
                            {new Date(item.joinedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-[11px]">
                              <CheckCircleIcon className="w-3 h-3" />
                              {item.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-primary font-mono">
                            +{item.creditsAwarded} credits
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Claim Code Box (1 column) */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Have a Friend&apos;s Code?</h3>
            <div className="p-6 rounded-2xl bg-surface/30 border border-white/[0.06] flex flex-col gap-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                If someone invited you and you missed entering their code during registration, you can claim your{' '}
                <strong className="text-white">+5 welcome credits</strong> here.
              </p>

              <form onSubmit={handleClaimCode} className="space-y-3">
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="e.g. LH9K4M2P"
                  className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3 uppercase text-sm font-mono tracking-wider"
                  required
                />
                <button
                  type="submit"
                  disabled={claiming || !claimCode.trim()}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl px-4 py-3 text-xs tracking-wider uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-3.5 h-3.5" />
                      <span>Apply Referral Code</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
