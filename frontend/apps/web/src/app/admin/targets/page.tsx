'use client'

import { useState, useEffect } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import {
  PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon, UserGroupIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'



interface Target {
  _id: string
  id: string
  name: string
  url: string
  platform: string
  notes?: string
  is_active: boolean
  last_scraped_at?: string | null
  last_comments_found?: number
  monthly_comments_found?: number
}

export default function AdminTargetsPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [scrapingAll, setScrapingAll] = useState(false)
  const [search, setSearch] = useState('')

  const fetchTargets = async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const res = await fetch('/api/admin/targets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setTargets(json.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTargets() }, [])

  const addTarget = async () => {
    if (!name.trim() || !url.trim()) return
    const token = await getFirebaseToken()
    const res = await fetch('/api/admin/targets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), url: url.trim(), notes: notes.trim() || undefined }),
    })
    if (res.ok) {
      setName(''); setUrl(''); setNotes('')
      fetchTargets()
    } else {
      const err = await res.json()
      alert(err.message || 'Failed to add target')
    }
  }

  const updateTarget = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/targets/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), url: editUrl.trim(), notes: editNotes.trim() || null }),
    })
    setEditingId(null)
    fetchTargets()
  }

  const deleteTarget = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/targets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchTargets()
  }

  const triggerScrapeAll = async () => {
    setScrapingAll(true)
    const token = await getFirebaseToken()
    await fetch('/api/admin/targets/scrape-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setTimeout(() => setScrapingAll(false), 2000)
  }

  const filtered = targets.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Watchlist</h1>
          <p className="text-sm text-text-secondary mt-1">Monitor specific profiles for new content</p>
        </div>
        <button onClick={triggerScrapeAll} disabled={scrapingAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50">
          <ArrowPathIcon className={`w-4 h-4 ${scrapingAll ? 'animate-spin' : ''}`} />
          {scrapingAll ? 'Scraping...' : 'Scrape All'}
        </button>
      </div>

      <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3"><UserGroupIcon className="w-4 h-4 inline mr-1.5" />Add Profile</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Profile URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://linkedin.com/in/..."
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
              className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
            />
          </div>
          <button onClick={addTarget} disabled={!name.trim() || !url.trim()}
            className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50">
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative max-w-xs mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search profiles..."
          className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
        />
      </div>

      {loading ? (
        <CustomLoader page="admin" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-sm text-text-secondary py-12">No targets found</div>
          ) : filtered.map(t => (
            <div key={t._id || t.id} className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5">
              {editingId === (t._id || t.id) ? (
                <div className="space-y-3">
                  <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                    className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                  />
                  <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                    className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                  />
                  <input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes"
                    className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => updateTarget(t._id || t.id)} className="px-4 py-1.5 rounded-lg bg-accent-mint text-white text-xs font-medium"><CheckIcon className="w-3.5 h-3.5 inline mr-1" />Save</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg bg-white/5 text-text-secondary text-xs font-medium"><XMarkIcon className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{t.name}</h3>
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-mint hover:underline flex items-center gap-1 mt-0.5">
                        {t.url.replace(/^https?:\/\//, '').substring(0, 40)}{t.url.length > 40 ? '...' : ''} <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                      }`}>{t.is_active ? 'Active' : 'Paused'}</span>
                    </div>
                  </div>
                  {t.notes && <p className="text-xs text-text-secondary mb-3">{t.notes}</p>}
                  <div className="flex items-center gap-4 text-[10px] text-text-secondary mb-4">
                    <span>{t.platform}</span>
                    <span>Comments found: {t.monthly_comments_found ?? t.last_comments_found ?? 0}</span>
                    {t.last_scraped_at && <span>Last scraped: {new Date(t.last_scraped_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <button onClick={() => { setEditingId(t._id || t.id); setEditName(t.name); setEditUrl(t.url); setEditNotes(t.notes || '') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-text-secondary text-xs font-medium transition-all">
                      <PencilSquareIcon className="w-3.5 h-3.5" />Edit
                    </button>
                    <button onClick={() => deleteTarget(t._id || t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 text-xs font-medium transition-all ml-auto">
                      <TrashIcon className="w-3.5 h-3.5" />Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
