'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SparklesIcon,
  TrophyIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  BookmarkSquareIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  EyeIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/solid'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

interface CommunityPost {
  id: string
  title: string
  content: string
  category: 'DEAL_CLOSED' | 'MEETING_SCHEDULED' | 'POSITIVE_REPLY' | 'SPOTLIGHT'
  dealSize: string | null
  clientNiche: string | null
  imageUrl: string | null
  authorName: string
  authorPlan: string | null
  proofId: string | null
  isPinned: boolean
  status: 'PUBLISHED' | 'ARCHIVED'
  reactions: {
    fire: number
    rocket: number
    clap: number
    heart: number
  }
  createdAt: string
}

interface EligibleProof {
  id: string
  userId: string
  type: string
  imageUrl: string
  note: string | null
  creditsAwarded: number
  reviewedAt: string | null
  user: {
    id: string
    name: string
    email: string
    plan: string
  }
  isFeatured: boolean
}

export default function AdminCommunityPage() {
  const { addToast } = useToast()

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [eligibleProofs, setEligibleProofs] = useState<EligibleProof[]>([])
  const [stats, setStats] = useState({ totalCount: 0, publishedCount: 0, archivedCount: 0 })
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'FEED' | 'ELIGIBLE_PROOFS' | 'CREATE'>('FEED')
  const [search, setSearch] = useState('')

  // Create Post Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    category: 'DEAL_CLOSED' as const,
    dealSize: '',
    clientNiche: '',
    imageUrl: '',
    authorName: '',
    authorPlan: 'Pro Member',
    isPinned: false,
  })
  const [creating, setCreating] = useState(false)

  // Edit Post State
  const [editTarget, setEditTarget] = useState<CommunityPost | null>(null)
  const [editing, setEditing] = useState(false)

  // Feature From Proof Modal State
  const [featureTarget, setFeatureTarget] = useState<EligibleProof | null>(null)
  const [featureForm, setFeatureForm] = useState({
    title: '',
    content: '',
    category: 'DEAL_CLOSED' as const,
    dealSize: '',
    clientNiche: '',
    isPinned: false,
  })
  const [featuring, setFeaturing] = useState(false)

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const fetchAdminCommunity = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch('/api/admin/community', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data.success) {
        setPosts(data.posts || [])
        setEligibleProofs(data.eligibleProofs || [])
        setStats(data.stats || { totalCount: 0, publishedCount: 0, archivedCount: 0 })
      }
    } catch (err) {
      console.error('[AdminCommunityPage] Fetch error:', err)
      addToast({ type: 'error', message: 'Failed to load community administration data' })
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchAdminCommunity()
  }, [fetchAdminCommunity])

  // Toggle Pin Status
  const handleTogglePin = async (post: CommunityPost) => {
    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch(`/api/admin/community/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned: !post.isPinned }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({
          type: 'success',
          message: post.isPinned ? 'Post unpinned' : 'Post pinned to top of Community Hub',
        })
        fetchAdminCommunity()
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update pin status' })
    }
  }

  // Toggle Publish / Archive Status
  const handleToggleStatus = async (post: CommunityPost) => {
    const newStatus = post.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED'
    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch(`/api/admin/community/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({
          type: 'info',
          message: `Post ${newStatus === 'PUBLISHED' ? 'published' : 'archived'}`,
        })
        fetchAdminCommunity()
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update post status' })
    }
  }

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this community post?')) return

    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch(`/api/admin/community/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', message: 'Post deleted successfully' })
        fetchAdminCommunity()
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to delete post' })
    }
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setEditing(true)

    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch(`/api/admin/community/${editTarget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTarget.title,
          content: editTarget.content,
          category: editTarget.category,
          dealSize: editTarget.dealSize || null,
          clientNiche: editTarget.clientNiche || null,
          authorName: editTarget.authorName,
          authorPlan: editTarget.authorPlan || 'Pro Member',
          isPinned: editTarget.isPinned,
          imageUrl: editTarget.imageUrl || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', message: 'Post updated successfully' })
        setEditTarget(null)
        fetchAdminCommunity()
      } else {
        addToast({ type: 'error', message: data.message || 'Failed to update post' })
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to update post' })
    } finally {
      setEditing(false)
    }
  }

  // Handle Create Post
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const token = await getFirebaseToken()
      if (!token) return

      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: createForm.title,
          content: createForm.content,
          category: createForm.category,
          dealSize: createForm.dealSize || null,
          clientNiche: createForm.clientNiche || null,
          imageUrl: createForm.imageUrl || null,
          authorName: createForm.authorName,
          authorPlan: createForm.authorPlan,
          isPinned: createForm.isPinned,
        }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', message: '🎉 Community win published to feed!' })
        setCreateForm({
          title: '',
          content: '',
          category: 'DEAL_CLOSED',
          dealSize: '',
          clientNiche: '',
          imageUrl: '',
          authorName: '',
          authorPlan: 'Pro Member',
          isPinned: false,
        })
        setActiveTab('FEED')
        fetchAdminCommunity()
      } else {
        addToast({ type: 'error', message: data.message || 'Failed to create post' })
      }
    } catch {
      addToast({ type: 'error', message: 'Error creating post' })
    } finally {
      setCreating(false)
    }
  }

  // Open Feature Proof Modal
  const openFeatureModal = (proof: EligibleProof) => {
    setFeatureTarget(proof)
    const category = (proof.type as any) || 'DEAL_CLOSED'
    const defaultTitle =
      category === 'DEAL_CLOSED'
        ? `${proof.user?.name || 'Member'} closed client contract via Lead Hunter`
        : category === 'MEETING_SCHEDULED'
        ? `${proof.user?.name || 'Member'} booked sales discovery meeting`
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

  // Submit Feature From Proof
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

      addToast({ type: 'success', message: '🎉 Proof successfully featured in Community Hub!' })
      setFeatureTarget(null)
      fetchAdminCommunity()
      setActiveTab('FEED')
    } catch (err: any) {
      console.error('[AdminCommunityPage] Feature error:', err)
      addToast({ type: 'error', message: err.message || 'Failed to feature proof' })
    } finally {
      setFeaturing(false)
    }
  }

  const filteredPosts = posts.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.clientNiche && p.clientNiche.toLowerCase().includes(q))
    )
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
            <SparklesIcon className="w-7 h-7 text-accent-mint" />
            Community Hub Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Curate verified member wins, publish platform spotlights, and feature approved milestone proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('CREATE')}
            className="px-4 py-2 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-accent-mint/20"
          >
            <PlusIcon className="w-4 h-4" />
            Create Custom Win Post
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-elevated border border-white/[0.08] rounded-xl">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Total Posts
          </span>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalCount}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Published Live
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.publishedCount}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-amber-500/20 bg-amber-500/5 rounded-xl">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Archived
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.archivedCount}</div>
        </div>
        <div className="p-4 bg-surface-elevated border border-accent-mint/20 bg-accent-mint/5 rounded-xl">
          <span className="text-xs font-semibold text-accent-mint uppercase tracking-wider">
            Available Proofs
          </span>
          <div className="text-2xl font-bold text-accent-mint mt-1">
            {eligibleProofs.filter((p) => !p.isFeatured).length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => setActiveTab('FEED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'FEED'
              ? 'bg-accent-mint text-black'
              : 'bg-surface-elevated text-zinc-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          <span>Live Feed ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ELIGIBLE_PROOFS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ELIGIBLE_PROOFS'
              ? 'bg-accent-mint text-black'
              : 'bg-surface-elevated text-zinc-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <TrophyIcon className="w-4 h-4" />
          <span>1-Click Feature from Rewards ({eligibleProofs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CREATE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CREATE'
              ? 'bg-accent-mint text-black'
              : 'bg-surface-elevated text-zinc-400 hover:text-white border border-white/[0.08]'
          }`}
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create New Win Post</span>
        </button>
      </div>

      {/* Tab 1: Live Feed Manager */}
      {activeTab === 'FEED' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search posts by title, member, or niche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-surface-elevated border border-white/[0.08] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
            />
          </div>

          {filteredPosts.length === 0 ? (
            <div className="py-16 text-center border border-white/[0.06] rounded-2xl bg-surface-elevated/40">
              <PhotoIcon className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
              <h3 className="text-sm font-bold text-white">No community posts found</h3>
              <p className="text-xs text-text-secondary mt-1">
                Feature an approved proof or click &quot;Create New Win Post&quot; to publish one.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className={`p-5 rounded-2xl bg-surface-elevated border transition-all ${
                    post.isPinned
                      ? 'border-accent-mint/40 bg-accent-mint/[0.02]'
                      : 'border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start gap-4 min-w-0">
                      {post.imageUrl && (
                        <div
                          onClick={() => setLightboxImage(post.imageUrl)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/[0.12] flex-shrink-0 cursor-pointer group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt="Post Thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.isPinned && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-mint/20 text-accent-mint border border-accent-mint/30">
                              PINNED
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              post.status === 'PUBLISHED'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {post.status}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-white border border-white/[0.1]">
                            {post.category}
                          </span>
                          {post.dealSize && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400">
                              {post.dealSize}
                            </span>
                          )}
                          {post.clientNiche && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-300">
                              {post.clientNiche}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white tracking-tight">{post.title}</h3>
                        <p className="text-xs text-zinc-300 line-clamp-2">{post.content}</p>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                          <span>
                            By <strong className="text-zinc-300">{post.authorName}</strong> (
                            {post.authorPlan || 'Pro'})
                          </span>
                          <span>•</span>
                          <span>Reactions: 🔥 {post.reactions.fire || 0} • 🚀 {post.reactions.rocket || 0} • 👏 {post.reactions.clap || 0}</span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 lg:self-center flex-shrink-0">
                      <button
                        onClick={() => handleTogglePin(post)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
                          post.isPinned
                            ? 'bg-accent-mint/15 text-accent-mint border-accent-mint/30 hover:bg-accent-mint/20'
                            : 'bg-surface-container-lowest text-zinc-400 border-white/[0.08] hover:text-white'
                        }`}
                        title={post.isPinned ? 'Unpin from top' : 'Pin to top'}
                      >
                        <BookmarkSquareIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(post)}
                        className="p-2 rounded-xl bg-surface-container-lowest text-zinc-400 hover:text-white border border-white/[0.08] transition-colors"
                        title={post.status === 'PUBLISHED' ? 'Archive post' : 'Publish post'}
                      >
                        <ArchiveBoxIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setEditTarget(post)}
                        className="p-2 rounded-xl bg-surface-container-lowest text-zinc-400 hover:text-white border border-white/[0.08] transition-colors"
                        title="Edit post"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-2 rounded-xl bg-surface-container-lowest text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                        title="Delete post"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 1-Click Feature from Approved Proofs */}
      {activeTab === 'ELIGIBLE_PROOFS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-accent-mint/5 border border-accent-mint/20 text-xs text-accent-mint flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 shrink-0" />
            <span>
              These are verified milestone outreach proofs approved by your admin team in Milestone Rewards.
              Click &quot;Feature in Hub&quot; to format and publish any win to the Community Hub!
            </span>
          </div>

          {eligibleProofs.length === 0 ? (
            <div className="py-16 text-center border border-white/[0.06] rounded-2xl bg-surface-elevated/40">
              <TrophyIcon className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
              <h3 className="text-sm font-bold text-white">No approved proofs found</h3>
              <p className="text-xs text-text-secondary mt-1">
                Approve submitted proofs in the Rewards section first to feature them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleProofs.map((proof) => (
                <div
                  key={proof.id}
                  className="p-5 rounded-2xl bg-surface-elevated border border-white/[0.08] hover:border-white/[0.15] space-y-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Thumbnail */}
                    <div
                      onClick={() => setLightboxImage(proof.imageUrl)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/60 border border-white/[0.12] flex-shrink-0 cursor-pointer group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proof.imageUrl}
                        alt="Proof screenshot"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {proof.user?.name || 'Member'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-zinc-400">
                          {proof.type}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">{proof.user?.email}</div>
                      {proof.note && (
                        <p className="text-xs text-zinc-300 italic line-clamp-2 bg-surface-container-lowest px-2.5 py-1 rounded">
                          &ldquo;{proof.note}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[11px] text-zinc-500">
                      Approved: {proof.reviewedAt ? new Date(proof.reviewedAt).toLocaleDateString() : 'Yes'}
                    </span>

                    {proof.isFeatured ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Featured in Hub
                      </span>
                    ) : (
                      <button
                        onClick={() => openFeatureModal(proof)}
                        className="px-4 py-1.5 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-accent-mint/20"
                      >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        Feature in Hub
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Create Custom Post Form */}
      {activeTab === 'CREATE' && (
        <div className="max-w-2xl bg-surface-elevated border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Create Custom Win or Spotlight Post</h3>
            <p className="text-xs text-text-secondary">
              Directly publish an inspiring outreach breakdown, member spotlight, or platform milestone.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Headline / Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Agency Closed $6,000/mo Retainer from Lead Hunter LinkedIn Post"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Category *
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-accent-mint"
                >
                  <option value="DEAL_CLOSED">🏆 Deal Closed</option>
                  <option value="MEETING_SCHEDULED">📅 Meeting Booked</option>
                  <option value="POSITIVE_REPLY">💬 Positive Reply</option>
                  <option value="SPOTLIGHT">⭐ Member Spotlight</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Deal Size (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. $4,500/mo or $15,000"
                  value={createForm.dealSize}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dealSize: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Client Niche (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS, E-Commerce, Real Estate"
                  value={createForm.clientNiche}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientNiche: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Author Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marcus Vance or Liam K."
                  value={createForm.authorName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, authorName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Author Plan Tier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Agency Member or Pro Member"
                  value={createForm.authorPlan}
                  onChange={(e) => setCreateForm((f) => ({ ...f, authorPlan: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Proof Image / Screenshot URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or base64 data URL"
                  value={createForm.imageUrl}
                  onChange={(e) => setCreateForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Story / Strategy Breakdown *
              </label>
              <textarea
                rows={5}
                required
                placeholder="Explain the outreach strategy, what signal was captured in Lead Hunter, and the result..."
                value={createForm.content}
                onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full px-4 py-2.5 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="createPin"
                checked={createForm.isPinned}
                onChange={(e) => setCreateForm((f) => ({ ...f, isPinned: e.target.checked }))}
                className="w-4 h-4 rounded border-white/20 bg-surface-container-lowest text-accent-mint focus:ring-0"
              />
              <label htmlFor="createPin" className="text-xs text-zinc-300 font-medium">
                Pin this win to the top of the Community Hub
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('FEED')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-accent-mint/20"
              >
                {creating ? 'Publishing...' : 'Publish to Live Feed'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feature From Proof Modal */}
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
                    Review and customize details before publishing to member feed.
                  </p>
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
                      placeholder="e.g. $4,500/mo"
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
                      placeholder="e.g. B2B SaaS"
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
                    rows={4}
                    value={featureForm.content}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, content: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent-mint resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="modalPinCheck"
                    checked={featureForm.isPinned}
                    onChange={(e) => setFeatureForm((f) => ({ ...f, isPinned: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-surface-container-lowest text-accent-mint focus:ring-0"
                  />
                  <label htmlFor="modalPinCheck" className="text-xs text-zinc-300 font-medium">
                    Pin this win at top of feed
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

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-elevated border border-white/[0.12] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Edit Community Post</h3>
                <button
                  onClick={() => setEditTarget(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTarget.title}
                    onChange={(e) => setEditTarget({ ...editTarget, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-accent-mint"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Deal Size
                    </label>
                    <input
                      type="text"
                      value={editTarget.dealSize || ''}
                      onChange={(e) => setEditTarget({ ...editTarget, dealSize: e.target.value })}
                      className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-accent-mint"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Client Niche
                    </label>
                    <input
                      type="text"
                      value={editTarget.clientNiche || ''}
                      onChange={(e) => setEditTarget({ ...editTarget, clientNiche: e.target.value })}
                      className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-accent-mint"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Story Content
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editTarget.content}
                    onChange={(e) => setEditTarget({ ...editTarget, content: e.target.value })}
                    className="w-full px-3.5 py-2 bg-surface-container-lowest border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-accent-mint resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editPin"
                    checked={editTarget.isPinned}
                    onChange={(e) => setEditTarget({ ...editTarget, isPinned: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-surface-container-lowest text-accent-mint focus:ring-0"
                  />
                  <label htmlFor="editPin" className="text-xs text-zinc-300 font-medium">
                    Pin post at top of feed
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    disabled={editing}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editing}
                    className="px-5 py-2 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-black font-bold text-xs transition-colors"
                  >
                    {editing ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative max-w-5xl max-h-[90vh] bg-surface-elevated border border-white/[0.15] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary">Proof Screenshot</span>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImage}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded text-zinc-400 hover:text-white"
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
