'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

import {
  MagnifyingGlassIcon,
  UserIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  MusicalNoteIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid'

interface ContactUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  status: string
  plan: string
  createdAt: string
  portfolio: string | null
  website: string | null
  linkedin: string | null
  instagram: string | null
  dribbble: string | null
  behance: string | null
  github: string | null
  twitter: string | null
  servicesOffered: string[]
  preferredLeadCategories: string[]
  outreachExperience: string | null
  discoverySource: string | null
  tags: string[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-500/10',
  ACTIVE: 'text-green-400 bg-green-500/10',
  REJECTED: 'text-red-400 bg-red-500/10',
  SUSPENDED: 'text-red-400 bg-red-500/10',
}

const PLAN_BADGES: Record<string, string> = {
  FREE: 'text-text-secondary bg-white/5',
  FREELANCER: 'text-accent-mint bg-accent-mint/10',
  AGENCY: 'text-accent-purple bg-accent-purple/10',
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const

const TAG_COLORS = [
  'bg-blue-500/10 text-blue-400',
  'bg-purple-500/10 text-purple-400',
  'bg-pink-500/10 text-pink-400',
  'bg-amber-500/10 text-amber-400',
  'bg-emerald-500/10 text-emerald-400',
  'bg-cyan-500/10 text-cyan-400',
  'bg-rose-500/10 text-rose-400',
  'bg-indigo-500/10 text-indigo-400',
]

export default function AdminContactsPage() {
  const [users, setUsers] = useState<ContactUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [serviceFilter, setServiceFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [savingTag, setSavingTag] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const token = await getFirebaseToken()
    if (!token) return

    const params = new URLSearchParams()
    params.set('pageSize', '200')
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (search.trim()) params.set('search', search.trim())
    if (serviceFilter) params.set('service', serviceFilter)

    try {
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setUsers(json.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, serviceFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const addTag = async (userId: string, tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    const user = users.find((u) => u.id === userId)
    if (!user || user.tags.includes(trimmed)) return
    const newTags = [...user.tags, trimmed]
    setSavingTag(userId)
    const token = await getFirebaseToken()
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u)))
    setTagInputs((prev) => ({ ...prev, [userId]: '' }))
    setSavingTag(null)
  }

  const removeTag = async (userId: string, tag: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    const newTags = user.tags.filter((t) => t !== tag)
    setSavingTag(userId)
    const token = await getFirebaseToken()
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags }),
    })
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tags: newTags } : u)))
    setSavingTag(null)
  }

  const allTags = [...new Set(users.flatMap((u) => u.tags))].sort()
  const allServices = [...new Set(users.flatMap((u) => u.servicesOffered))].sort()

  const filteredUsers = tagFilter
    ? users.filter((u) => u.tags.includes(tagFilter))
    : users

  if (loading) {
    return <CustomLoader page="admin" />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Contacts</h1>
          <p className="text-sm text-text-secondary mt-1">
            {filteredUsers.length} contact{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2.5 text-sm appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="">All Services</option>
          {allServices.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2.5 text-sm appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
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

      {filteredUsers.length === 0 ? (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-12 text-center">
          <UserIcon className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">No contacts found</h3>
          <p className="text-sm text-text-secondary">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((u) => {
            const tagColorIndex =
              u.tags.reduce((acc, t) => acc + t.charCodeAt(0), 0) % TAG_COLORS.length

            return (
              <div
                key={u.id}
                className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-base font-semibold text-text-primary hover:text-accent-mint transition-colors"
                      >
                        {u.name}
                      </Link>
                      <p className="text-sm text-text-secondary truncate">{u.email}</p>
                      {u.phone && (
                        <p className="text-xs text-text-secondary/60 mt-0.5">{u.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[u.status] || 'text-text-secondary bg-white/5'}`}
                      >
                        {u.status}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_BADGES[u.plan] || 'text-text-secondary bg-white/5'}`}
                      >
                        {u.plan === 'FREE' ? 'Free' : u.plan === 'FREELANCER' ? 'Freelancer' : u.plan === 'AGENCY' ? 'Agency' : u.plan}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {u.servicesOffered.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
                          <BriefcaseIcon className="w-3 h-3" />
                          Services
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {u.servicesOffered.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary">
                              {s}
                            </span>
                          ))}
                          {u.servicesOffered.length > 3 && (
                            <span className="text-xs text-text-secondary/40">
                              +{u.servicesOffered.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {u.preferredLeadCategories.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 flex items-center gap-1">
                          <GlobeAltIcon className="w-3 h-3" />
                          Categories
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {u.preferredLeadCategories.map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-md bg-white/[0.04] text-xs text-text-secondary">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 text-xs text-text-secondary">
                      {u.discoverySource && (
                        <span className="flex items-center gap-1">
                          <MusicalNoteIcon className="w-3 h-3" />
                          {u.discoverySource}
                        </span>
                      )}
                      {u.outreachExperience && (
                        <span>{u.outreachExperience}</span>
                      )}
                      <span className="text-text-secondary/40">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {u.tags.map((tag) => {
                      const idx = tag.charCodeAt(0) % TAG_COLORS.length
                      return (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${TAG_COLORS[idx]}`}
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(u.id, tag)}
                            disabled={savingTag === u.id}
                            className="hover:opacity-60 transition-opacity"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={tagInputs[u.id] || ''}
                      onChange={(e) =>
                        setTagInputs((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTag(u.id, tagInputs[u.id] || '')
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 min-w-0 bg-surface-elevated border border-white/5 text-white rounded-lg outline-none focus:ring-1 focus:ring-accent-mint/30 transition-all px-2.5 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => addTag(u.id, tagInputs[u.id] || '')}
                      disabled={savingTag === u.id || !(tagInputs[u.id] || '').trim()}
                      className="p-1.5 rounded-lg bg-accent-mint/10 text-accent-mint hover:bg-accent-mint/20 transition-all disabled:opacity-40"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
