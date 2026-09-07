'use client'

import { useState, useEffect } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import {
  PlusIcon, TrashIcon, MagnifyingGlassIcon, PencilSquareIcon,
  CheckIcon, XMarkIcon,
} from '@heroicons/react/24/solid'
import { CustomLoader } from '@/components/ui/CustomLoader'


interface Keyword {
  _id: string
  id: string
  text: string
  platforms: string[]
  is_active: boolean
}

const PLATFORMS = ['linkedin', 'twitter', 'reddit', 'threads']

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin'])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editPlatforms, setEditPlatforms] = useState<string[]>([])
  const [isBulkAdd, setIsBulkAdd] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkPlatforms, setBulkPlatforms] = useState<string[]>(['linkedin'])
  const [search, setSearch] = useState('')

  const fetchKeywords = async () => {
    const token = await getFirebaseToken()
    if (!token) return
    try {
      const res = await fetch('/api/admin/keywords', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setKeywords(json.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchKeywords() }, [])

  const addKeyword = async () => {
    if (!newKeyword.trim()) return
    const token = await getFirebaseToken()
    const res = await fetch('/api/admin/keywords', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newKeyword.trim(), platforms: selectedPlatforms }),
    })
    if (res.ok) {
      setNewKeyword('')
      fetchKeywords()
    }
  }

  const bulkAdd = async () => {
    if (!bulkText.trim()) return
    const texts = bulkText.split('\n').filter(Boolean)
    const token = await getFirebaseToken()
    await fetch('/api/admin/keywords/bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, platforms: bulkPlatforms }),
    })
    setBulkText('')
    setIsBulkAdd(false)
    fetchKeywords()
  }

  const updateKeyword = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/keywords/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText.trim(), platforms: editPlatforms }),
    })
    setEditingId(null)
    fetchKeywords()
  }

  const deleteKeyword = async (id: string) => {
    const token = await getFirebaseToken()
    await fetch(`/api/admin/keywords/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchKeywords()
  }

  const bulkDelete = async () => {
    if (!selectedIds.length) return
    const token = await getFirebaseToken()
    await fetch('/api/admin/keywords/bulk', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    })
    setSelectedIds([])
    fetchKeywords()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const filtered = keywords.filter(k => k.text.toLowerCase().includes(search.toLowerCase()))

  const PlatformToggle = ({ platforms, onChange }: { platforms: string[]; onChange: (p: string[]) => void }) => (
    <div className="flex gap-1.5">
      {PLATFORMS.map(p => (
        <button key={p} onClick={() => onChange(platforms.includes(p) ? platforms.filter(x => x !== p) : [...platforms, p])}
          className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-all ${
            platforms.includes(p) ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/30' : 'bg-white/5 text-text-secondary border border-white/10'
          }`}
        >{p === 'linkedin' ? 'LI' : p === 'twitter' ? 'X' : p === 'reddit' ? 'RD' : 'TH'}</button>
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Search Keywords</h1>
          <p className="text-sm text-text-secondary mt-1">Manage keywords for social media lead discovery</p>
        </div>
        <button onClick={() => setIsBulkAdd(!isBulkAdd)}
          className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all"
        >{isBulkAdd ? 'Single Add' : 'Bulk Add'}</button>
      </div>

      {isBulkAdd ? (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Bulk Add Keywords</h3>
          <p className="text-xs text-text-secondary mb-3">One keyword per line</p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6}
            className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all p-4 text-sm mb-3 resize-none"
          />
          <div className="flex items-center gap-4">
            <PlatformToggle platforms={bulkPlatforms} onChange={setBulkPlatforms} />
            <button onClick={bulkAdd} disabled={!bulkText.trim()}
              className="px-5 py-2 rounded-xl bg-accent-mint text-white text-xs font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50"
            ><PlusIcon className="w-3.5 h-3.5 inline mr-1" />Add All</button>
          </div>
        </div>
      ) : (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Enter keyword..."
              className="flex-1 bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
            />
            <PlatformToggle platforms={selectedPlatforms} onChange={setSelectedPlatforms} />
            <button onClick={addKeyword} disabled={!newKeyword.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-mint text-white text-sm font-medium hover:bg-accent-mint/90 transition-all disabled:opacity-50"
            ><PlusIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="relative max-w-xs mb-6">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search keywords..."
          className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all pl-10 pr-4 py-2.5 text-sm"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <span className="text-xs text-text-secondary">{selectedIds.length} selected</span>
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all">
            <TrashIcon className="w-3.5 h-3.5" />Delete Selected
          </button>
        </div>
      )}

      {loading ? (
        <CustomLoader page="admin" />
      ) : (
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-10 px-4 py-4"><input type="checkbox" className="rounded" /></th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Keyword</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Platforms</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-text-secondary">No keywords found</td></tr>
              ) : filtered.map(k => (
                <tr key={k._id || k.id} className="border-b border-white/[0.03]">
                  <td className="px-4 py-4">
                    <input type="checkbox" checked={selectedIds.includes(k._id || k.id)} onChange={() => toggleSelect(k._id || k.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    {editingId === (k._id || k.id) ? (
                      <input value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                        className="bg-surface-elevated border border-white/5 text-white rounded-lg outline-none px-3 py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-text-primary">{k.text}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {editingId === (k._id || k.id) ? (
                      <PlatformToggle platforms={editPlatforms} onChange={setEditPlatforms} />
                    ) : (
                      <div className="flex gap-1.5">
                        {PLATFORMS.map(p => (
                          <span key={p} className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                            (k.platforms || []).includes(p) ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/30' : 'bg-white/5 text-text-secondary/40 border border-white/5'
                          }`}>{p === 'linkedin' ? 'LI' : p === 'twitter' ? 'X' : p === 'reddit' ? 'RD' : 'TH'}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      k.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                    }`}>{k.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {editingId === (k._id || k.id) ? (
                        <>
                          <button onClick={() => updateKeyword(k._id || k.id)} className="p-1.5 rounded-lg hover:bg-accent-mint/10 text-accent-mint transition-all">
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary transition-all">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(k._id || k.id); setEditText(k.text); setEditPlatforms(k.platforms || []) }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary transition-all">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteKeyword(k._id || k.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
