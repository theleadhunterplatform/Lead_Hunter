'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  SparklesIcon,
  TrophyIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  ArrowRightIcon,
  BookmarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid'
import { MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

interface CommunityPostItem {
  id: string
  title: string
  content: string
  category: 'DEAL_CLOSED' | 'MEETING_SCHEDULED' | 'POSITIVE_REPLY' | 'SPOTLIGHT'
  dealSize: string | null
  clientNiche: string | null
  imageUrl: string | null
  authorName: string
  authorPlan: string | null
  isPinned: boolean
  reactions: {
    fire: number
    rocket: number
    clap: number
    heart: number
  }
  userReactions: string[]
  createdAt: string
}

interface Stats {
  totalDeals: number
  totalMeetings: number
  totalWins: number
}

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Wins', icon: SparklesIcon },
  { id: 'DEAL_CLOSED', label: 'Deals Closed', icon: TrophyIcon, emoji: '🏆' },
  { id: 'MEETING_SCHEDULED', label: 'Meetings Booked', icon: CalendarDaysIcon, emoji: '📅' },
  { id: 'POSITIVE_REPLY', label: 'Positive Replies', icon: ChatBubbleLeftRightIcon, emoji: '💬' },
  { id: 'SPOTLIGHT', label: 'Spotlights', icon: CheckBadgeIcon, emoji: '⭐' },
] as const

const REACTION_CONFIG = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'rocket', emoji: '🚀', label: 'Rocket' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'heart', emoji: '❤️', label: 'Love' },
] as const

export default function CommunityPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [posts, setPosts] = useState<CommunityPostItem[]>([])
  const [stats, setStats] = useState<Stats>({ totalDeals: 0, totalMeetings: 0, totalWins: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // Lightbox modal for viewing verified screenshots
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fetchCommunityPosts = useCallback(async (cat: string) => {
    try {
      const token = await getFirebaseToken().catch(() => null)
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const query = cat !== 'ALL' ? `?category=${cat}` : ''
      const res = await fetch(`/api/community${query}`, { headers })
      const data = await res.json()

      if (data.success) {
        setPosts(data.posts || [])
        if (data.stats) {
          setStats(data.stats)
        }
      }
    } catch (err) {
      console.error('[CommunityPage] Fetch error:', err)
      addToast({ type: 'error', message: 'Failed to load community feed' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchCommunityPosts(selectedCategory)
  }, [selectedCategory, fetchCommunityPosts])

  // Reaction handler with optimistic updates
  const handleToggleReaction = async (postId: string, reactionType: string) => {
    if (!user) {
      addToast({ type: 'info', message: 'Please log in to react and celebrate member wins!' })
      return
    }

    // Optimistic UI update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post

        const hasReacted = post.userReactions.includes(reactionType)
        const updatedUserReactions = hasReacted
          ? post.userReactions.filter((r) => r !== reactionType)
          : [...post.userReactions, reactionType]

        const currentCount = post.reactions[reactionType as keyof typeof post.reactions] || 0
        const updatedCount = hasReacted ? Math.max(0, currentCount - 1) : currentCount + 1

        return {
          ...post,
          userReactions: updatedUserReactions,
          reactions: {
            ...post.reactions,
            [reactionType]: updatedCount,
          },
        }
      }),
    )

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`/api/community/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reactionType }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        // Revert on failure
        fetchCommunityPosts(selectedCategory)
      } else {
        // Sync with true server state
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  reactions: data.reactions,
                  userReactions: data.userReactions,
                }
              : p,
          ),
        )
      }
    } catch (err) {
      console.error('[CommunityPage] Reaction error:', err)
      fetchCommunityPosts(selectedCategory)
    }
  }

  if (loading) {
    return <CustomLoader fullscreen />
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-main text-text-primary p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8 relative">
        {/* Hero Section */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-mint/10 border border-accent-mint/20 text-xs font-semibold text-accent-mint w-fit">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Verified Social Proof & Member Wins</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Community Wins Hub
              </h1>
              <p className="text-sm md:text-base text-text-secondary max-w-2xl mt-1 leading-relaxed">
                Real contracts closed, discovery meetings booked, and warm outreach replies generated
                by Lead Hunter members. Curated and verified by platform administrators.
              </p>
            </div>

            {/* Link banner to rewards for members who have a win to submit for admin review */}
            <Link
              href="/rewards"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-white/[0.06] border border-white/[0.12] text-xs font-bold text-white transition-all group shrink-0 shadow-lg"
            >
              <span>Have a win to submit?</span>
              <span className="text-accent-mint flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Earn Bounty Credits <ArrowRightIcon className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>
        </div>

        {/* Real-time Metric Ticker Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="metallic-card p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Verified Deals Closed</span>
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <TrophyIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-primary tabular-nums tracking-tight">
              {stats.totalDeals}
            </div>
            <p className="text-xs text-text-secondary">Signed client contracts & retainers</p>
          </div>

          <div className="metallic-card p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Meetings Booked</span>
              <div className="p-2 rounded-xl bg-secondary/15 text-secondary">
                <CalendarDaysIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-secondary tabular-nums tracking-tight">
              {stats.totalMeetings}
            </div>
            <p className="text-xs text-text-secondary">Sales discovery calls scheduled</p>
          </div>

          <div className="metallic-card p-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Total Verified Wins</span>
              <div className="p-2 rounded-xl bg-secondary/15 text-secondary">
                <CheckBadgeIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-secondary tabular-nums tracking-tight">
              {stats.totalWins}
            </div>
            <p className="text-xs text-text-secondary">Total admin-approved social proofs</p>
          </div>
        </div>

{/* Category Filters Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.08]">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'metallic-card text-text-secondary hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <div className="metallic-card py-20 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto text-text-secondary">
              <SparklesIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No wins found in this category</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Check back soon as our team regularly reviews and publishes genuine member wins.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })

              return (
                <div
                  key={post.id}
                  className={`metallic-card p-6 md:p-8 space-y-5 transition-all ${
                    post.isPinned
                      ? 'ring-1 ring-accent-mint/20 bg-gradient-to-b from-accent-mint/[0.03] to-surface/60'
                      : 'hover:ring-1 ring-white/10'
                  }`}
                >
                  {/* Top Bar: Pinned Badge + Category + Deal Metrics */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
                          📌 Pinned Featured Win
                        </span>
                      )}

                      {/* Category Badge */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                        {post.category === 'DEAL_CLOSED' && <span>Deal Closed</span>}
                        {post.category === 'MEETING_SCHEDULED' && <span>Meeting Booked</span>}
                        {post.category === 'POSITIVE_REPLY' && <span>Warm Reply</span>}
                        {post.category === 'SPOTLIGHT' && <span>Member Spotlight</span>}
                      </span>

                      {/* Deal Size Pill */}
                      {post.dealSize && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-tertiary/15 text-tertiary border border-tertiary/30 font-mono">
                          {post.dealSize}
                        </span>
                      )}

                      {/* Client Niche Pill */}
                      {post.clientNiche && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-tertiary/10 text-tertiary border border-tertiary/20">
                          {post.clientNiche}
                        </span>
                      )}
                    </div>

                    {/* Verified Guarantee Badge */}
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-mint">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Verified Win</span>
                    </div>
                  </div>

                  {/* Header: Title */}
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                    {post.title}
                  </h2>

                  {/* Story Content */}
                  <p className="text-sm md:text-base text-zinc-300 leading-relaxed whitespace-pre-line font-normal">
                    {post.content}
                  </p>

                  {/* Verified Screenshot Attachment (Clickable to Lightbox) */}
                  {post.imageUrl && (
                    <div className="pt-1">
                      <div
                        onClick={() => setLightboxImage(post.imageUrl)}
                        className="relative max-w-lg rounded-2xl overflow-hidden border border-white/[0.12] bg-black/60 cursor-pointer group shadow-2xl"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.imageUrl}
                          alt="Verified screenshot proof"
                          className="w-full max-h-80 object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 shadow-lg">
                            <MagnifyingGlassPlusIcon className="w-4 h-4 text-accent-mint" />
                            View Full Screenshot
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Bar: Member Author & Reactions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/[0.06]">
                    {/* Author Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent-mint/20 border border-accent-mint/30 flex items-center justify-center text-accent-mint font-bold text-xs uppercase">
                        {post.authorName.slice(0, 2)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{post.authorName}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-accent-mint/15 text-accent-mint border border-accent-mint/30">
                            {post.authorPlan || 'MEMBER'}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-secondary">{formattedDate}</div>
                      </div>
                    </div>

                    {/* Celebration Reaction Buttons */}
                    <div className="flex items-center gap-1.5">
                      {REACTION_CONFIG.map((react) => {
                        const count = post.reactions[react.type] || 0
                        const isReacted = post.userReactions.includes(react.type)

                        return (
                          <button
                            key={react.type}
                            onClick={() => handleToggleReaction(post.id, react.type)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 metallic-card ${
                              isReacted
                                ? 'bg-primary/15 border-primary/40 text-primary shadow-md shadow-primary/10'
                                : 'border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20'
                            }`}
                            title={`Celebrate with ${react.label}`}
                          >
                            <span>{react.emoji}</span>
                            <span className="font-mono text-[11px]">{count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Motivational Callout to Earn Rewards */}
        <div className="metallic-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-primary/[0.08] via-surface-elevated to-primary/[0.08] border border-white/[0.1] shadow-2xl">
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-primary" />
              Did you close a client with Lead Hunter?
            </h3>
            <p className="text-xs md:text-sm text-text-secondary max-w-xl">
              Upload your outreach proof in Milestone Rewards. Once verified by an admin, you earn free bonus
              reveal credits and get spotlighted right here in the Community Hub!
            </p>
          </div>
          <Link
            href="/rewards"
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
          >
            <span>Submit Milestone Proof</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
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
                className="relative max-w-4xl max-h-[85vh] metallic-card shadow-2xl rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between metallic-card">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheckIcon className="w-4 h-4 text-accent-mint" />
                    <span>Verified Screenshot Proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={lightboxImage}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white transition-all"
                      title="Open in new tab"
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
                    alt="Verified Proof Full Resolution"
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
