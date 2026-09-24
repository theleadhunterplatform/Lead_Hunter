'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  BookmarkIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  TrashIcon,
  LockClosedIcon,
  PhoneIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { AppLead } from '@/types/lead'
import { Badge, Button, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { toCsv, toTsv, downloadXlsx, leadsToRows } from '@/lib/csv'

export default function SavedLeadsPage() {
  const [activeTab, setActiveTab] = useState('All Leads')
  const [searchTerm, setSearchTerm] = useState('')
  const [savedLeads, setSavedLeads] = useState<AppLead[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'tsv' | 'sheet' | null>(null)
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [scrollHintSeen, setScrollHintSeen] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('lhc-saved-scrollhint') === '1',
  )
  const actionBtnRefs = useRef(new Map<string, HTMLButtonElement>())
  const { addToast } = useToast()

  const toggleActionMenu = (leadId: string) => {
    if (openActionDropdownId === leadId) {
      setOpenActionDropdownId(null)
      setMenuPos(null)
      return
    }
    const btn = actionBtnRefs.current.get(leadId)
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const W = 208
      const GAP = 8
      const EST_H = 360
      const openUp = window.innerHeight - rect.bottom < EST_H + GAP
      setMenuPos({
        left: Math.max(8, Math.min(rect.right - W, window.innerWidth - W - 8)),
        top: openUp ? Math.max(8, rect.top - EST_H - GAP) : rect.bottom + GAP,
      })
    } else {
      setMenuPos(null)
    }
    setOpenActionDropdownId(leadId)
  }

  useEffect(() => {
    if (!openActionDropdownId) {
      setMenuPos(null)
      return
    }
    const close = () => {
      setOpenActionDropdownId(null)
      setMenuPos(null)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [openActionDropdownId])

  const dismissScrollHint = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollLeft > 24 && !scrollHintSeen) {
      setScrollHintSeen(true)
      window.localStorage.setItem('lhc-saved-scrollhint', '1')
    }
  }

  // --- Hover card: reveal contact details when hovering a lead's name ---
  const [hoverCard, setHoverCard] = useState<{
    leadId: string
    top: number
    left: number
  } | null>(null)
  const hoverShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimers = () => {
    if (hoverShowTimer.current) clearTimeout(hoverShowTimer.current)
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current)
  }

  const openLeadHoverCard = (lead: AppLead, el: HTMLElement, immediate = false) => {
    if (openActionDropdownId === lead.id) return
    clearHoverTimers()
    const show = () => {
      const rect = el.getBoundingClientRect()
      const CARD_W = 300
      const CARD_H = 248
      const GAP = 10
      const top =
        rect.bottom + GAP + CARD_H > window.innerHeight
          ? Math.max(8, rect.top - GAP - CARD_H)
          : rect.bottom + GAP
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - CARD_W - 8),
      )
      setHoverCard({ leadId: lead.id, top, left })
    }
    if (immediate) show()
    else hoverShowTimer.current = setTimeout(show, 240)
  }

  const scheduleCloseLeadHoverCard = () => {
    clearHoverTimers()
    hoverHideTimer.current = setTimeout(() => setHoverCard(null), 160)
  }

  const keepLeadHoverCardOpen = () => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current)
  }

  const closeLeadHoverCard = () => {
    clearHoverTimers()
    setHoverCard(null)
  }

  useEffect(() => () => clearHoverTimers(), [])

  // Close the hover card on scroll / resize / Escape
  useEffect(() => {
    if (!hoverCard) return
    const close = () => setHoverCard(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHoverCard(null)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [hoverCard])

  const readyCount = savedLeads.filter(
    (l) => l.isRevealed && (l.status === 'new' || l.status === 'saved'),
  ).length
  const activeCount = savedLeads.filter((l) =>
    ['drafting', 'sent', 'follow-up'].includes(l.status),
  ).length
  const repliedCount = savedLeads.filter((l) => l.status === 'replied').length
  const priorityCount = savedLeads.filter(
    (l) => l.urgency === 'critical' || l.urgency === 'high',
  ).length

  const dynamicSummaryCards = [
    {
      label: 'Reply Received',
      sub: 'Awaiting negotiation',
      count: `${repliedCount} Leads`,
      accent: 'purple',
      icon: ChatBubbleLeftRightIcon,
    },
    {
      label: 'Active Conversations',
      sub: 'Currently being contacted',
      count: `${activeCount} Active`,
      accent: 'purple',
      icon: PaperAirplaneIcon,
    },
    {
      label: 'Ready to Contact',
      sub: 'Unlocked & waiting',
      count: `${readyCount} Ready`,
      accent: 'mint',
      icon: PhoneIcon,
    },
    {
      label: 'High Priority Targets',
      sub: 'Critical & High Urgency',
      count: `${priorityCount} Urgent`,
      accent: 'purple',
      icon: ExclamationTriangleIcon,
    },
  ]

  const handleMarkStatus = async (leadId: string, status: string, label: string) => {
    // 1. Optimistic UI update (instant response)
    const prevLeads = savedLeads
    setSavedLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: status as AppLead['status'] } : l)),
    )
    addToast({ type: 'success', message: `✓ Marked as ${label}` })

    // 2. Background sync
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        setSavedLeads(prevLeads)
        addToast({ type: 'error', message: 'Failed to update status on server' })
      }
    } catch {
      setSavedLeads(prevLeads)
      addToast({ type: 'error', message: 'Failed to update status' })
    }
  }

  const getRows = () => {
    if (filteredLeads.length === 0) {
      addToast({ type: 'error', message: 'No leads to export' })
      return null
    }
    return leadsToRows(filteredLeads)
  }

  const handleExportSheet = async () => {
    const rows = getRows()
    if (!rows) return
    setExporting('sheet')
    try {
      const date = new Date().toISOString().slice(0, 10)
      await downloadXlsx(
        `leadhunter-leads-${date}.xlsx`,
        rows,
        `Exported ${date} | View: ${activeTab} | Count: ${filteredLeads.length}`,
      )
      addToast({ type: 'success', message: `✓ Downloaded ${filteredLeads.length} leads as Excel` })
    } catch {
      addToast({ type: 'error', message: 'Failed to download Excel file' })
    } finally {
      setExporting(null)
      setExportOpen(false)
    }
  }

  const handleCopyTsv = async () => {
    const rows = getRows()
    if (!rows) return
    setExporting('tsv')
    try {
      await navigator.clipboard.writeText(toTsv(rows))
      addToast({
        type: 'success',
        message: `✓ Copied ${filteredLeads.length} leads · Paste into Excel/Sheets`,
      })
    } catch {
      addToast({ type: 'error', message: 'Clipboard access blocked' })
    } finally {
      setExporting(null)
      setExportOpen(false)
    }
  }

  const handleCopyCsv = async () => {
    const rows = getRows()
    if (!rows) return
    setExporting('csv')
    try {
      await navigator.clipboard.writeText(toCsv(rows))
      addToast({
        type: 'success',
        message: `✓ Copied ${filteredLeads.length} leads as CSV`,
      })
    } catch {
      addToast({ type: 'error', message: 'Clipboard access blocked' })
    } finally {
      setExporting(null)
      setExportOpen(false)
    }
  }

  const handleCopyEmail = async (lead: AppLead) => {
    if (!lead.isRevealed) {
      addToast({ type: 'info', message: 'Reveal contact info to view and copy email' })
      return
    }
    if (!lead.email || lead.email.includes('hidden')) {
      addToast({ type: 'error', message: 'No valid email available for this lead' })
      return
    }
    try {
      await navigator.clipboard.writeText(lead.email)
      addToast({ type: 'success', message: `✓ Copied ${lead.email}` })
    } catch {
      addToast({ type: 'error', message: 'Clipboard access blocked' })
    }
  }

  const handleCopyLeadInfo = async (lead: AppLead) => {
    if (!lead.isRevealed) {
      addToast({ type: 'info', message: 'Unlock the lead to copy lead intel' })
      return
    }
    const revealed = Boolean(lead.isRevealed)
    const emailVisible = revealed && !!lead.email && !lead.email.includes('hidden')
    const phoneVisible = revealed && !!lead.phone
    const displayName =
      revealed && lead.name ? lead.name : lead.title || lead.category || 'Saved Lead'

    const role = Array.from(
      new Set([lead.role, lead.title].filter(Boolean) as string[]),
    ).join(' · ')

    const lines: string[] = [`Lead: ${displayName}`]
    if (role) lines.push(`Role: ${role}`)
    if (lead.company) lines.push(`Company: ${lead.company}`)
    lines.push(`Email: ${emailVisible ? lead.email : 'Locked — reveal to view'}`)
    if (phoneVisible) lines.push(`Phone: ${lead.phone}`)
    else if (lead.hasPhone) lines.push('Phone: Locked — reveal to view')
    if (lead.source) lines.push(`Source: ${lead.source}`)
    if (lead.category) lines.push(`Category: ${lead.category}`)
    lines.push(`Urgency: ${lead.urgency}`)
    lines.push(`Status: ${lead.status}`)
    if (lead.replyProbability > 0) lines.push(`Reply probability: ${lead.replyProbability}%`)
    if (lead.signalContext) lines.push(`Signal: ${lead.signalContext}`)
    if (lead.nicheTags?.length) lines.push(`Niches: ${lead.nicheTags.join(', ')}`)

    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      addToast({ type: 'success', message: `✓ Copied info for ${displayName}` })
    } catch {
      addToast({ type: 'error', message: 'Clipboard access blocked' })
    }
  }

  const handleRemoveSaved = async (leadId: string) => {
    // 1. Optimistic UI update (instant response)
    const prevLeads = savedLeads
    setSavedLeads((prev) => prev.filter((l) => l.id !== leadId))
    addToast({ type: 'success', message: '✓ Removed from saved leads' })

    // 2. Background sync
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isSaved: false, status: 'new' }),
      })
      if (!res.ok) {
        setSavedLeads(prevLeads)
        addToast({ type: 'error', message: 'Failed to remove from saved leads on server' })
      }
    } catch {
      setSavedLeads(prevLeads)
      addToast({ type: 'error', message: 'Network error removing lead' })
    }
  }

  useEffect(() => {
    if (!exportOpen && !openActionDropdownId) return
    const close = () => {
      setExportOpen(false)
      setOpenActionDropdownId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExportOpen(false)
        setOpenActionDropdownId(null)
      }
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [exportOpen, openActionDropdownId])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const token = await getFirebaseToken()
      const authHeaders: Record<string, string> = {}
      if (token) authHeaders['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: authHeaders,
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          message: `✓ Synced ${json.data.updatedCount} status updates from sheet`,
        })
        const fetchRes = await fetch('/api/leads?saved=true', { headers: authHeaders })
        const fetchJson = await fetchRes.json()
        if (fetchJson.data) setSavedLeads(fetchJson.data)
      } else {
        addToast({ type: 'error', message: json.message || 'Sync failed' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error during sync' })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const fetchSavedLeads = async () => {
      try {
        const token = await getFirebaseToken()
        const res = await fetch('/api/leads?saved=true', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (json.data) setSavedLeads(json.data)
      } catch {
        console.error('Failed to fetch saved leads')
      } finally {
        setLoading(false)
      }
    }
    fetchSavedLeads()
  }, [])

  const filteredLeads = savedLeads.filter((lead) => {
    if (activeTab === 'In Progress') return ['drafting', 'sent', 'follow-up'].includes(lead.status)
    if (activeTab === 'Archived') return lead.status === 'replied'
    const term = searchTerm.trim().toLowerCase()
    if (term) {
      const name = (lead.isRevealed ? lead.name : '').toLowerCase()
      const email = (lead.isRevealed ? lead.email : '').toLowerCase()
      const company = (lead.company ?? '').toLowerCase()
      if (!(name.includes(term) || email.includes(term) || company.includes(term))) return false
    }
    return true
  })

  const statusBadgeColor: Record<string, 'mint' | 'purple'> = {
    new: 'mint',
    saved: 'mint',
    drafting: 'mint',
    sent: 'purple',
    replied: 'purple',
    'follow-up': 'purple',
  }

  const statusActionConfig: Record<
    string,
    { label: string; icon: typeof BookmarkIcon }
  > = {
    saved: { label: 'Mark as Saved', icon: BookmarkIcon },
    new: { label: 'Mark as Saved', icon: BookmarkIcon },
    drafting: { label: 'Mark as Drafting', icon: PencilSquareIcon },
    sent: { label: 'Mark as Sent', icon: PaperAirplaneIcon },
    'follow-up': { label: 'Mark as Follow-up', icon: ArrowPathIcon },
    replied: { label: 'Mark as Replied', icon: ChatBubbleLeftRightIcon },
  }

  return (
    <main data-lenis-prevent className="flex-1 h-full min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:py-10 relative scrollbar-hide">
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {dynamicSummaryCards.map((card) => (
            <div
              key={card.label}
              className="group relative p-6 metallic-card transition-all duration-300 overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`p-3 rounded-2xl bg-accent-${card.accent}/10 text-accent-${card.accent} shadow-inner`}
                >
                  <card.icon className="w-[22px] h-[22px]" />
                </div>
                <span
                  className={`text-xxs font-bold uppercase tracking-widest text-accent-${card.accent}`}
                >
                  {card.count}
                </span>
              </div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">{card.label}</h3>
              <p className="text-xs text-text-secondary mt-1">{card.sub}</p>
              <div
                className={`absolute bottom-0 left-0 w-full h-1 bg-accent-${card.accent}/20 group-hover:bg-accent-${card.accent}/40 transition-all`}
              />
            </div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 shrink-0">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3 whitespace-nowrap shrink-0">
              <BookmarkIcon className="w-6 h-6 text-text-secondary" />
              Saved Leads
            </h2>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
              {['All Leads', 'In Progress', 'Archived'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-11 font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab
                      ? 'bg-accent-purple text-text-on-accent shadow-lg'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 min-h-[44px] pl-10 pr-4 text-xs focus:outline-none focus:border-border-subtle transition-all w-48 sm:w-60 focus:w-64"
              />
            </div>

            <Button variant="outline" color="mint" size="sm" className="min-h-[44px]" onClick={handleSync} loading={syncing}>
              <ArrowPathIcon className="w-3 h-3" />
              Sync from Sheet
            </Button>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="primary"
                color="mint"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setExportOpen((o) => !o)}
              >
                <DocumentArrowDownIcon className="w-3 h-3" />
                Export
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </Button>

              {exportOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-elevated border border-white/10 shadow-2xl shadow-black/40 overflow-hidden z-50">
                  <button
                    onClick={handleCopyCsv}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="w-4 h-4 text-accent-mint shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Copy as CSV</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">Comma-separated · Universal format</span>
                    </span>
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={handleCopyTsv}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="w-4 h-4 text-accent-purple shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Copy as TSV</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">Tab-separated · Paste into Sheets/Excel</span>
                    </span>
                  </button>
                  <div className="h-px bg-white/[0.05]" />
                  <button
                    onClick={handleExportSheet}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 text-accent-mint shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-text-primary">Download Sheet</span>
                      <span className="block text-[10px] text-text-secondary mt-0.5">Formatted .xlsx · Headers, filters, frozen row</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="metallic-card min-h-[420px] pb-16">
          {filteredLeads.length === 0 && !loading && (
            <div className="p-12 text-center">
              <p className="text-text-secondary text-sm">No leads match this view.</p>
              {activeTab !== 'All Leads' && (
                <button
                  onClick={() => setActiveTab('All Leads')}
                  className="mt-3 text-accent-mint text-xs hover:underline"
                >
                  View all leads
                </button>
              )}
            </div>
          )}

          {!scrollHintSeen && filteredLeads.length > 0 && (
            <div className="pointer-events-none md:hidden absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-2.5 py-2 rounded-full bg-black/70 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-text-secondary backdrop-blur">
              Scroll
              <ChevronRightIcon className="w-3 h-3" />
            </div>
          )}

          {filteredLeads.length > 0 && (
            <div className="overflow-x-auto scrollbar-hide" onScroll={dismissScrollHint}>
              <div className="min-w-[760px]">
                <div className="grid grid-cols-12 gap-4 px-6 sm:px-8 py-4 border-b border-white/[0.05] text-xxs font-bold text-text-secondary uppercase tracking-super">
                  <div className="col-span-1 sticky left-0 z-20 -ml-6 pl-6 sm:-ml-8 sm:pl-8 bg-surface border-r border-white/5">Status</div>
                  <div className="col-span-4">Lead</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Urgency</div>
                  <div className="col-span-3 text-right pr-2">Actions</div>
                </div>

                <div className="divide-y divide-white/[0.03]">
                  {filteredLeads.map((lead) => {
                    const isDropdownOpen = openActionDropdownId === lead.id

                    return (
                      <div
                        key={lead.id}
                        className={`grid grid-cols-12 gap-4 px-6 sm:px-8 py-4 items-center group hover:bg-white/[0.02] transition-colors relative ${
                          isDropdownOpen ? 'z-30' : 'z-10'
                        }`}
                      >
                        <div className="col-span-1 sticky left-0 z-10 -ml-6 pl-6 sm:-ml-8 sm:pl-8 bg-surface border-r border-white/5 flex items-center self-stretch py-4">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              lead.status === 'replied'
                                ? 'bg-accent-purple'
                                : lead.status === 'sent' || lead.status === 'follow-up'
                                  ? 'bg-accent-purple'
                                  : 'bg-accent-mint'
                            } ${lead.isActionable ? 'animate-pulse ring-4 ring-accent-purple/20' : ''}`}
                          />
                        </div>

                        <div className="col-span-4 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-11 font-bold overflow-hidden shrink-0 ${
                            lead.isRevealed
                              ? 'bg-surface-elevated border-white/10 text-text-primary'
                              : 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple'
                          }`}>
                            {lead.isRevealed
                              ? lead.name.split(' ').map((n) => n[0]).join('')
                              : <LockClosedIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div
                            className="min-w-0 rounded-md -m-1 p-1 outline-none focus-visible:ring-1 focus-visible:ring-accent-purple/50"
                            tabIndex={0}
                            onMouseEnter={(e) => openLeadHoverCard(lead, e.currentTarget)}
                            onMouseLeave={scheduleCloseLeadHoverCard}
                            onFocus={(e) => openLeadHoverCard(lead, e.currentTarget, true)}
                            onBlur={closeLeadHoverCard}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') closeLeadHoverCard()
                            }}
                          >
                            <div className="text-sm font-bold text-text-primary truncate flex items-center gap-1.5">
                              {lead.isRevealed ? lead.name : (lead.title || lead.category || 'Saved Lead')}
                              {!lead.isRevealed && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  Locked
                                </span>
                              )}
                            </div>
                            <div className="text-xxs text-text-secondary truncate">
                              {lead.isRevealed
                                ? lead.email
                                : (lead.nicheTags?.slice(0, 3).join(' · ') || lead.category || 'Reveal to see contact')}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <Badge size="sm" color={statusBadgeColor[lead.status] || 'mint'}>
                            {lead.status}
                          </Badge>
                        </div>

                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              size="sm"
                              color={
                                lead.urgency === 'critical' || lead.urgency === 'high'
                                  ? 'mint'
                                  : 'purple'
                              }
                            >
                              {lead.urgency}
                            </Badge>
                            {lead.replyProbability > 0 && (
                              <span className="text-xxs text-text-secondary">
                                {lead.replyProbability}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-3 text-right flex items-center justify-end relative pr-2">
                          <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const currentAction = statusActionConfig[lead.status] || {
                                label: 'Actions',
                                icon: BookmarkIcon,
                              }
                              const ActionIcon = currentAction.icon

                              return (
                                <button
                                  type="button"
                                  ref={(el) => {
                                    if (el) actionBtnRefs.current.set(lead.id, el)
                                    else actionBtnRefs.current.delete(lead.id)
                                  }}
                                  onClick={() => toggleActionMenu(lead.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold border transition-all ${
                                    isDropdownOpen
                                      ? 'bg-white/15 text-text-primary border-primary/40 shadow-sm'
                                      : 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary border-white/10'
                                  }`}
                                  aria-expanded={isDropdownOpen}
                                  aria-haspopup="true"
                                >
                                  <ActionIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{currentAction.label}</span>
                                  <ChevronDownIcon
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                      isDropdownOpen ? 'rotate-180 text-primary' : 'text-text-secondary'
                                    }`}
                                  />
                                </button>
                              )
                            })()}

                            {isDropdownOpen && menuPos && createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-50 cursor-default"
                                  onClick={() => {
                                    setOpenActionDropdownId(null)
                                    setMenuPos(null)
                                  }}
                                />
                                <div
                                  role="menu"
                                  style={{ top: menuPos.top, left: menuPos.left }}
                                  className="fixed w-52 max-h-[320px] overflow-y-auto scrollbar-hide rounded-2xl bg-surface-elevated/95 border border-white/10 shadow-2xl shadow-black/80 py-2 z-50 text-left backdrop-blur-xl"
                                >
                                <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary/70">
                                  Stage / Status
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkStatus(lead.id, 'saved', 'Saved')
                                    setOpenActionDropdownId(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                    lead.status === 'saved' || lead.status === 'new'
                                      ? 'text-primary font-semibold bg-primary/10'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <BookmarkIcon className={`w-3.5 h-3.5 shrink-0 ${lead.status === 'saved' || lead.status === 'new' ? 'text-primary' : 'text-text-secondary'}`} />
                                    Mark as Saved
                                  </span>
                                  {(lead.status === 'saved' || lead.status === 'new') && (
                                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkStatus(lead.id, 'drafting', 'Drafting')
                                    setOpenActionDropdownId(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                    lead.status === 'drafting'
                                      ? 'text-primary font-semibold bg-primary/10'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <PencilSquareIcon className={`w-3.5 h-3.5 shrink-0 ${lead.status === 'drafting' ? 'text-primary' : 'text-text-secondary'}`} />
                                    Mark as Drafting
                                  </span>
                                  {lead.status === 'drafting' && (
                                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkStatus(lead.id, 'sent', 'Sent')
                                    setOpenActionDropdownId(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                    lead.status === 'sent'
                                      ? 'text-primary font-semibold bg-primary/10'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <PaperAirplaneIcon className={`w-3.5 h-3.5 shrink-0 ${lead.status === 'sent' ? 'text-primary' : 'text-text-secondary'}`} />
                                    Mark as Sent
                                  </span>
                                  {lead.status === 'sent' && (
                                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkStatus(lead.id, 'follow-up', 'Follow-up')
                                    setOpenActionDropdownId(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                    lead.status === 'follow-up'
                                      ? 'text-primary font-semibold bg-primary/10'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <ArrowPathIcon className={`w-3.5 h-3.5 shrink-0 ${lead.status === 'follow-up' ? 'text-primary' : 'text-text-secondary'}`} />
                                    Mark as Follow-up
                                  </span>
                                  {lead.status === 'follow-up' && (
                                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleMarkStatus(lead.id, 'replied', 'Replied')
                                    setOpenActionDropdownId(null)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${
                                    lead.status === 'replied'
                                      ? 'text-primary font-semibold bg-primary/10'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <ChatBubbleLeftRightIcon className={`w-3.5 h-3.5 shrink-0 ${lead.status === 'replied' ? 'text-primary' : 'text-text-secondary'}`} />
                                    Mark as Replied
                                  </span>
                                  {lead.status === 'replied' && (
                                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                                  )}
                                </button>

                                <div className="h-px bg-white/[0.08] my-1" />

                                <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary/70">
                                  Lead Actions
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCopyEmail(lead)
                                    setOpenActionDropdownId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-primary hover:bg-white/5 transition-colors"
                                >
                                  <EnvelopeIcon className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                                  Copy Email
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCopyLeadInfo(lead)
                                    setOpenActionDropdownId(null)
                                  }}
                                  disabled={!lead.isRevealed}
                                  title={lead.isRevealed ? 'Copy lead intel' : 'Unlock the lead to copy lead intel'}
                                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                                    lead.isRevealed
                                      ? 'text-text-primary hover:bg-white/5 cursor-pointer'
                                      : 'text-text-secondary/40 cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-accent-mint shrink-0" />
                                  Copy lead intel
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveSaved(lead.id)
                                    setOpenActionDropdownId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <TrashIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  Remove from Saved
                                </button>
                                </div>
                              </>,
                              document.body,
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {loading && <CustomLoader page="saved" />}
          {!loading && savedLeads.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-text-secondary text-sm mb-4">No saved leads yet.</p>
              <Link href="/leads">
                <Button variant="primary" color="mint" size="md">
                  Go to Lead Feed
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Hover card: contact details revealed when hovering a lead's name */}
      {hoverCard &&
        (() => {
          const lead = savedLeads.find((l) => l.id === hoverCard.leadId)
          if (!lead) return null
          const revealed = Boolean(lead.isRevealed)
          const emailVisible = revealed && !!lead.email && !lead.email.includes('hidden')
          const phoneVisible = revealed && !!lead.phone
          const displayName =
            revealed && lead.name ? lead.name : lead.title || lead.category || 'Saved Lead'
          const role = Array.from(
            new Set([lead.role, lead.title].filter(Boolean) as string[]),
          ).join(' · ')
          const showPhoneRow = phoneVisible || lead.hasPhone

          return createPortal(
            <div
              role="tooltip"
              onMouseEnter={keepLeadHoverCardOpen}
              onMouseLeave={scheduleCloseLeadHoverCard}
              style={{ top: hoverCard.top, left: hoverCard.left, width: 300 }}
              className="fixed z-[60] rounded-2xl bg-surface-elevated/95 border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-xl p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full border flex items-center justify-center text-11 font-bold overflow-hidden shrink-0 ${
                    revealed
                      ? 'bg-surface-elevated border-white/10 text-text-primary'
                      : 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple'
                  }`}
                >
                  {revealed && lead.name ? (
                    lead.name.split(' ').map((n) => n[0]).join('')
                  ) : (
                    <LockClosedIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text-primary truncate">{displayName}</div>
                  <div className="text-[10px] text-text-secondary truncate">
                    {[role, lead.company].filter(Boolean).join(' @ ') ||
                      lead.category ||
                      'Saved lead'}
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.08] my-3" />

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <EnvelopeIcon className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                  <span className={emailVisible ? 'text-text-primary break-all' : 'text-text-secondary italic'}>
                    {emailVisible ? lead.email : 'Locked — reveal to view'}
                  </span>
                </div>
                {showPhoneRow && (
                  <div className="flex items-start gap-2 text-xs">
                    <PhoneIcon className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                    <span className={phoneVisible ? 'text-text-primary' : 'text-text-secondary italic'}>
                      {phoneVisible ? lead.phone : 'Locked — reveal to view'}
                    </span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-start gap-2 text-xs">
                    <BuildingOffice2Icon className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                    <span className="text-text-primary truncate">{lead.company}</span>
                  </div>
                )}
                {lead.source && (
                  <div className="flex items-start gap-2 text-xs">
                    <GlobeAltIcon className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
                    <span className="text-text-secondary truncate">Source: {lead.source}</span>
                  </div>
                )}
              </div>

              {lead.signalContext && (
                <p className="text-[10px] text-text-secondary leading-relaxed mt-2.5 line-clamp-2">
                  {lead.signalContext}
                </p>
              )}
              {!revealed && (
                <p className="text-[10px] text-accent-purple mt-2.5">
                  Reveal this lead to unlock full contact details.
                </p>
              )}

              <div className="h-px bg-white/[0.08] my-3" />
              <div className="flex items-center justify-between gap-2">
                <Badge size="sm" color={statusBadgeColor[lead.status] || 'mint'}>
                  {lead.status}
                </Badge>
                <Badge
                  size="sm"
                  color={lead.urgency === 'critical' || lead.urgency === 'high' ? 'mint' : 'purple'}
                >
                  {lead.urgency} urgency
                </Badge>
                {lead.replyProbability > 0 && (
                  <span className="text-xxs text-text-secondary">{lead.replyProbability}% reply</span>
                )}
              </div>
            </div>,
            document.body,
          )
        })()}
    </main>
  )
}
