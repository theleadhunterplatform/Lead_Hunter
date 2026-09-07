'use client'

import { useState, useEffect } from 'react'
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ViewfinderCircleIcon,
  ExclamationTriangleIcon,
  BookmarkIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AppLead } from '@/types/lead'
import { Badge, Button, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { toCsv, toTsv, downloadXlsx, leadsToRows } from '@/lib/csv'

export default function SavedLeadsPage() {
  const [activeTab, setActiveTab] = useState('All Leads')
  const [savedLeads, setSavedLeads] = useState<AppLead[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'tsv' | 'sheet' | null>(null)
  const { addToast } = useToast()

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
      icon: SparklesIcon,
    },
    {
      label: 'Ready to Contact',
      sub: 'Unlocked & waiting',
      count: `${readyCount} Ready`,
      accent: 'mint',
      icon: ViewfinderCircleIcon,
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
      if (res.ok) {
        setSavedLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: status as AppLead['status'] } : l)),
        )
        addToast({ type: 'success', message: `✓ Marked as ${label}` })
      }
    } catch {
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

  const handleExportSheet = () => {
    const rows = getRows()
    if (!rows) return
    setExporting('sheet')
    try {
      const date = new Date().toISOString().slice(0, 10)
      downloadXlsx(
        `leadhunter-leads-${date}.xlsx`,
        rows,
        `Exported ${date} | View: ${activeTab} | Count: ${filteredLeads.length}`,
      )
      addToast({ type: 'success', message: `✓ Downloaded ${filteredLeads.length} leads as Excel` })
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
        message: `✓ Copied ${filteredLeads.length} leads — paste into Excel/Sheets`,
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

  useEffect(() => {
    if (!exportOpen) return
    const close = () => setExportOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

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
    if (activeTab === 'All Leads') return true
    if (activeTab === 'In Progress') return ['drafting', 'sent', 'follow-up'].includes(lead.status)
    if (activeTab === 'Archived') return lead.status === 'replied'
    return true
  })

  const statusBadgeColor: Record<string, 'mint' | 'purple'> = {
    saved: 'mint',
    drafting: 'mint',
    sent: 'purple',
    replied: 'purple',
    'follow-up': 'purple',
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10 relative scrollbar-hide">
      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {dynamicSummaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
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
            </motion.div>
          ))}
        </div>

        {/* Table Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
              <BookmarkIcon className="w-6 h-6 text-text-secondary" />
              Saved Leads
            </h2>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {['All Leads', 'In Progress', 'Archived'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-11 font-bold uppercase tracking-widest transition-all ${
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

          <div className="flex items-center gap-3">
            <div className="relative group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search pipeline..."
                className="bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-border-subtle transition-all w-64"
              />
            </div>

            <Button variant="outline" color="mint" size="sm" onClick={handleSync} loading={syncing}>
              <ArrowPathIcon className="w-3 h-3" />
              Sync from Sheet
            </Button>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="primary"
                color="mint"
                size="sm"
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
                      <span className="block text-[10px] text-text-secondary mt-0.5">Comma-separated — for any app</span>
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
                      <span className="block text-[10px] text-text-secondary mt-0.5">Tab-separated — paste into Sheets/Excel</span>
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
                      <span className="block text-[10px] text-text-secondary mt-0.5">Formatted .xlsx — headers, filters, frozen row</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="metallic-card overflow-hidden">
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

          {filteredLeads.length > 0 && (
            <>
              <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-white/[0.05] text-xxs font-bold text-text-secondary uppercase tracking-super">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Lead</div>
                <div className="col-span-2">Stage</div>
                <div className="col-span-3">Urgency</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>

              <div className="divide-y divide-white/[0.03]">
                {filteredLeads.map((lead, i) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-8 py-4 items-center group hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="col-span-1 flex items-center">
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

                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-surface-elevated border border-white/10 flex items-center justify-center text-11 font-bold text-text-primary overflow-hidden shrink-0">
                        {lead.isRevealed
                          ? lead.name.split(' ').map((n) => n[0]).join('')
                          : '??'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text-primary truncate">
                          {lead.isRevealed ? lead.name : 'Unlocked Contact'}
                        </div>
                        <div className="text-xxs text-text-secondary truncate">
                          {lead.isRevealed ? lead.email : 'unlocked@leadhunterclub.com'}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Badge size="sm" color={statusBadgeColor[lead.status] || 'mint'}>
                        {lead.status}
                      </Badge>
                    </div>

                    <div className="col-span-3">
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

                    <div className="col-span-3 text-right flex items-center justify-end gap-2">
                      {lead.status === 'saved' || lead.status === 'new' ? (
                        <Button
                          variant="ghost"
                          color="mint"
                          size="sm"
                          onClick={() => handleMarkStatus(lead.id, 'sent', 'Sent')}
                        >
                          Mark Sent
                        </Button>
                      ) : lead.status === 'sent' || lead.status === 'follow-up' ? (
                        <Button
                          variant="ghost"
                          color="purple"
                          size="sm"
                          onClick={() => handleMarkStatus(lead.id, 'replied', 'Replied')}
                        >
                          Replied
                        </Button>
                      ) : lead.status === 'replied' ? (
                        <Badge size="sm" color="purple">
                          Done
                        </Badge>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
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
    </main>
  )
}
