'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExternalLink,
  User,
  ImageIcon,
  Mail,
  Loader2,
  BrainCircuit,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Trash2,
  Plus,
  Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { LinkedinLogo, XLogo, RedditLogo, ThreadsLogo } from '@/components/BrandIcons'
import ManualLeadModal from './ManualLeadModal'
import { NicheBadge } from '@/components/ui/NicheBadge'
import RefineLeadModal from './RefineLeadModal'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { applyClaimResponseToLead } from '@/lib/claim-reveal'
import {
  formatVerifiedByLabel,
  getEmailStatusBadge,
} from '@/lib/email-verification'
import type { ExternalPost } from '@/lib/external-api/client'

interface LeadStats {
  qualified_today?: number
  qualified_total?: number
  scraped_today?: number
  scraped_total?: number
  pending?: number
  with_email?: number
  awaiting_review?: number
  with_contact?: number
  watchlist_active?: number
}

interface AiMetrics {
  accuracy: number | null
  samples: number
  relevant_count: number
  irrelevant_count: number
  model_ready: boolean
  status: string
  message?: string
}

interface IntelSettings {
  is_configured: boolean
  model?: string
}

type TabKey = 'all' | 'irrelevant' | 'pending' | 'relevant' | 'with_contact' | 'review' | 'approved'

interface LeadCounts {
  all?: number
  irrelevant?: number
  pending?: number
  relevant?: number
  with_contact?: number
  review?: number
  approved?: number
}

interface EmailEntry {
  email: string
  found_by?: string[]
  email_status?: string
  email_source?: string
  find_note?: string
  verification_note?: string
  verified_by?: string[]
  is_primary?: boolean
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<ExternalPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false)
  const [refineLead, setRefineLead] = useState<ExternalPost | null>(null)
  const [claimingIds, setClaimingIds] = useState<string[]>([])
  const [bulkReanalysing, setBulkReanalysing] = useState(false)
  const [reanalysePolling, setReanalysePolling] = useState(false)
  const [bulkReenriching, setBulkReenriching] = useState(false)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [enrichingIds, setEnrichingIds] = useState<string[]>([])
  const [reviewActionIds, setReviewActionIds] = useState<string[]>([])
  const [intelActionIds, setIntelActionIds] = useState<string[]>([])
  const [titleActionIds, setTitleActionIds] = useState<string[]>([])
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [bulkSelectionBusy, setBulkSelectionBusy] = useState(false)
  const [aiMetrics, setAiMetrics] = useState<AiMetrics | null>(null)
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabKey>('relevant')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [counts, setCounts] = useState<LeadCounts>({})
  const [isTrainingAi, setIsTrainingAi] = useState(false)
  const [isBulkTitling, setIsBulkTitling] = useState(false)
  const [isBulkInteling, setIsBulkInteling] = useState(false)
  const [intelConfigured, setIntelConfigured] = useState<boolean | null>(null)
  const [intelModel, setIntelModel] = useState('')
  const { addToast } = useToast()
  const perPage = 10

  // Manual contact state — keyed by lead ID
  const [manualContactOpen, setManualContactOpen] = useState<string | null>(null)
  const [manualContactEmail, setManualContactEmail] = useState('')
  const [manualContactPhone, setManualContactPhone] = useState('')
  const [manualContactNote, setManualContactNote] = useState('')
  const [savingManualContact, setSavingManualContact] = useState(false)

  const apiGet = useCallback(async (path: string) => {
    const token = await getFirebaseToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } })
    return res
  }, [])

  const apiPost = useCallback(async (path: string, body?: unknown) => {
    const token = await getFirebaseToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return res
  }, [])

  const apiPut = useCallback(async (path: string, body?: unknown) => {
    const token = await getFirebaseToken()
    if (!token) throw new Error('Not authenticated')
    const res = await fetch(path, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return res
  }, [])

  const handleSaveManualContact = async (leadId: string) => {
    if (!manualContactEmail.trim() && !manualContactPhone.trim()) return
    setSavingManualContact(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/admin/leads/${leadId}/contact`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: manualContactEmail.trim() || undefined,
          phone: manualContactPhone.trim() || undefined,
          note: manualContactNote.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, ...json.data } : l))
        setManualContactOpen(null)
        setManualContactEmail('')
        setManualContactPhone('')
        setManualContactNote('')
        addToast({ type: 'success', message: 'Contact details saved successfully' })
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to save contact' })
      }
    } catch (e) {
      addToast({ type: 'error', message: 'Failed to save contact' })
    }
    setSavingManualContact(false)
  }

  const fetchAiMetrics = useCallback(async () => {
    try {
      const res = await apiGet('/api/admin/leads/stats')
      const json = await res.json()
      if (json.success && json.data?.aiMetrics) setAiMetrics(json.data.aiMetrics)
    } catch (error) {
      console.error('Failed to fetch AI metrics', error)
    }
  }, [apiGet])

  const fetchLeadStats = useCallback(async () => {
    try {
      const res = await apiGet('/api/admin/leads/stats')
      const json = await res.json()
      if (json.success && json.data?.stats) setLeadStats(json.data.stats)
    } catch (error) {
      console.error('Failed to fetch lead stats', error)
    }
  }, [apiGet])

  const fetchIntelSettings = useCallback(async () => {
    try {
      const res = await apiGet('/api/admin/leads/stats')
      const json = await res.json()
      if (json.success && json.data?.intelSettings) {
        setIntelConfigured(Boolean(json.data.intelSettings.is_configured))
        setIntelModel(json.data.intelSettings.model || '')
      }
    } catch {
      setIntelConfigured(false)
    }
  }, [apiGet])

  const fetchLeads = useCallback(
    async (page = currentPage, status = activeTab, search = searchQuery, silent = false) => {
      try {
        if (!silent) setIsLoading(true)
        const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
        if (status !== 'all') params.set('status', status)
        if (search) params.set('search', search)
        if (selectedPlatforms.length > 0) params.set('platform', selectedPlatforms.join(','))
        const res = await apiGet(`/api/admin/leads?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || 'Failed to fetch leads')
        const { data, total, pages, counts: backendCounts } = json
        setLeads(data || [])
        setTotalCount(total ?? 0)
        setTotalPages(pages ?? 1)
        setCurrentPage(page)
        if (backendCounts) setCounts(backendCounts)
      } catch (error) {
        console.error('Failed to fetch leads', error)
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [apiGet, currentPage, activeTab, searchQuery, selectedPlatforms],
  )

  useEffect(() => {
    fetchIntelSettings()
    fetchAiMetrics()
    fetchLeadStats()
    fetchLeads()
    const interval = setInterval(() => {
      fetchAiMetrics()
      fetchLeadStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchIntelSettings, fetchAiMetrics, fetchLeadStats, fetchLeads])

  useEffect(() => {
    setSelectedLeadIds([])
  }, [activeTab])

  useEffect(() => {
    const hasSearching = leads.some((lead) => lead.enrichment_status === 'searching')
    if (!hasSearching) return
    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, true)
    }, 8000)
    return () => clearInterval(interval)
  }, [leads, currentPage, activeTab, searchQuery, fetchLeads])

  useEffect(() => {
    const awaitingIntel = leads.some(
      (lead) => lead.review_status === 'approved' && !lead.intelligence,
    )
    if (!awaitingIntel) return
    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, true)
    }, 6000)
    return () => clearInterval(interval)
  }, [leads, currentPage, activeTab, searchQuery, fetchLeads])

  useEffect(() => {
    const shouldPoll = reanalysePolling || (counts.pending ?? 0) > 0
    if (!shouldPoll) return
    const interval = setInterval(() => {
      fetchLeads(currentPage, activeTab, searchQuery, true)
    }, 4000)
    return () => clearInterval(interval)
  }, [reanalysePolling, counts.pending, currentPage, activeTab, searchQuery, fetchLeads])

  useEffect(() => {
    if (!reanalysePolling || (counts.pending ?? 0) > 0) return
    setReanalysePolling(false)
    addToast({ type: 'info', message: 'Re-analysis finished. Check Relevant or Noise for results.' })
  }, [reanalysePolling, counts.pending, addToast])

  const updateLeadLabel = async (id: string, data: { status?: string; is_training_data?: boolean }) => {
    try {
      setLeads(prev => prev.map(lead => (lead.id === id ? { ...lead, ...data } : lead)))
      const res = await apiPost(`/api/admin/leads/${id}`, { action: 'label', ...data })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to update lead label' })
        fetchLeads()
        return
      }
      setTimeout(() => fetchAiMetrics(), 10000)
    } catch (error) {
      console.error('Failed to update lead label', error)
      fetchLeads()
    }
  }

  const handleReExtract = async (id: string) => {
    try {
      const res = await apiPost(`/api/admin/leads/${id}`, { action: 're-extract' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'AI Re-extraction failed. The image might be too complex.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'AI re-extraction queued' })
      fetchLeads()
    } catch (error) {
      console.error('Failed to re-extract lead', error)
      addToast({ type: 'error', message: 'AI Re-extraction failed. The image might be too complex.' })
    }
  }

  const getBulkFilters = () => ({
    status: activeTab,
    search: searchQuery || undefined,
    platform: selectedPlatforms.length ? selectedPlatforms.join(',') : undefined,
  })

  const handleBulkReanalyse = async () => {
    try {
      setBulkReanalysing(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-reanalyse', filters: getBulkFilters() })
      const json = await res.json()
      const queued = json.queued ?? 0
      if (queued > 0) {
        addToast({ type: 'success', message: `${queued} lead(s) queued for re-analysis. Watch the Pending tab while they process.` })
        setReanalysePolling(true)
        setActiveTab('pending')
      } else {
        addToast({ type: 'info', message: json.message || 'No leads matched the current filters.' })
      }
      fetchLeads(1, 'pending', searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to queue bulk re-analysis.' })
    } finally {
      setBulkReanalysing(false)
    }
  }

  const handleBulkReEnrich = async () => {
    try {
      setBulkReenriching(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-re-enrich', filters: getBulkFilters() })
      const json = await res.json()
      if (json.queued > 0) {
        addToast({ type: 'success', message: json.message || 'Bulk re-enrichment queued.' })
      } else {
        addToast({ type: 'info', message: json.message || 'No enrichable leads matched the current filters.' })
      }
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to queue bulk re-enrichment.' })
    } finally {
      setBulkReenriching(false)
    }
  }

  const handleReEnrichLead = async (leadId: string) => {
    try {
      setEnrichingIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 're-enrich' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to queue enrichment.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Enrichment queued.' })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to queue enrichment.' })
    } finally {
      setEnrichingIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleApproveReview = async (leadId: string) => {
    try {
      setReviewActionIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 'approve' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to approve lead.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Lead approved for release.' })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to approve lead.' })
    } finally {
      setReviewActionIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleRejectReview = async (leadId: string) => {
    try {
      setReviewActionIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 'reject' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to reject lead.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Lead rejected.' })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to reject lead.' })
    } finally {
      setReviewActionIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleRegenerateIntel = async (leadId: string) => {
    try {
      setIntelActionIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 'regenerate-intel' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to generate intelligence.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Intelligence generation started.' })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to generate intelligence.' })
    } finally {
      setIntelActionIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleGenerateTitle = async (leadId: string) => {
    try {
      setTitleActionIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 'generate-title' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to generate title.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Title generated successfully.' })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to generate title.' })
    } finally {
      setTitleActionIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleDeleteLead = async (lead: ExternalPost) => {
    const label = lead.author?.name || lead.keyword || 'this lead'
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return
    try {
      setDeletingIds(prev => [...prev, lead.id])
      const res = await apiPost(`/api/admin/leads/${lead.id}`, { action: 'delete' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to delete lead.' })
        return
      }
      addToast({ type: 'success', message: 'Lead deleted.' })
      setLeads(prev => prev.filter(l => l.id !== lead.id))
      setSelectedLeadIds(prev => prev.filter(id => id !== lead.id))
      fetchLeadStats()
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete lead.' })
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== lead.id))
    }
  }

  const handleClaim = async (leadId: string) => {
    try {
      setClaimingIds(prev => [...prev, leadId])
      const res = await apiPost(`/api/admin/leads/${leadId}`, { action: 'claim' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to claim lead.' })
        return
      }
      setLeads(prev => prev.map(l =>
        l.id === leadId ? applyClaimResponseToLead(l, json) : l,
      ))
      addToast({ type: 'success', message: 'Lead claimed! Contact details unlocked.' })
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to claim lead.' })
    } finally {
      setClaimingIds(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleTrainAi = async () => {
    try {
      setIsTrainingAi(true)
      const res = await apiPost('/api/admin/leads', { action: 'train-ai' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'AI training failed. Ensure the Python AI service is running.' })
        return
      }
      if (json.data) setAiMetrics(json.data)
      addToast({ type: 'success', message: json.message || json.data?.message || 'AI training complete.' })
      fetchAiMetrics()
    } catch (err) {
      addToast({ type: 'error', message: 'AI training failed. Ensure the Python AI service is running.' })
    } finally {
      setIsTrainingAi(false)
    }
  }

  const handleBulkTitle = async () => {
    try {
      setIsBulkTitling(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-title', filters: getBulkFilters() })
      const json = await res.json()
      addToast({ type: 'success', message: json?.message || `Queued ${json?.queued || 0} leads for titling` })
    } catch {
      addToast({ type: 'error', message: 'Failed to queue titles' })
    } finally {
      setIsBulkTitling(false)
    }
  }

  const handleBulkIntel = async () => {
    try {
      setIsBulkInteling(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-intelligence', filters: getBulkFilters() })
      const json = await res.json()
      addToast({ type: 'success', message: json?.message || `Queued ${json?.queued || 0} leads for intelligence generation` })
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch {
      addToast({ type: 'error', message: 'Failed to queue intelligence' })
    } finally {
      setIsBulkInteling(false)
    }
  }

  const handleBulkApproveSelected = async () => {    if (selectedLeadIds.length === 0) return
    try {
      setBulkSelectionBusy(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-approve', ids: selectedLeadIds })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to approve selected leads.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Selected leads approved.' })
      setSelectedLeadIds([])
      fetchLeads(currentPage, activeTab, searchQuery, true)
      fetchLeadStats()
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to approve selected leads.' })
    } finally {
      setBulkSelectionBusy(false)
    }
  }

  const handleBulkDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) return
    if (!window.confirm(`Delete ${selectedLeadIds.length} selected lead(s)? This cannot be undone.`)) return
    try {
      setBulkSelectionBusy(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-delete', ids: selectedLeadIds })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json?.message || 'Failed to delete selected leads.' })
        return
      }
      addToast({ type: 'success', message: json.message || 'Selected leads deleted.' })
      setSelectedLeadIds([])
      fetchLeads(currentPage, activeTab, searchQuery, true)
      fetchLeadStats()
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete selected leads.' })
    } finally {
      setBulkSelectionBusy(false)
    }
  }

  const handleBulkApprove = async () => {
    try {
      setBulkApproving(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-approve', filters: getBulkFilters() })
      const json = await res.json()
      if (json.approved > 0) {
        addToast({ type: 'success', message: json.message || 'Bulk approval complete.' })
      } else if (json.skipped > 0) {
        addToast({ type: 'info', message: json.message || 'No leads with contact details to approve.' })
      } else {
        addToast({ type: 'info', message: json.message || 'No leads awaiting review matched the current filters.' })
      }
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to bulk approve leads.' })
    } finally {
      setBulkApproving(false)
    }
  }

  const handleBulkReject = async () => {
    try {
      setBulkRejecting(true)
      const res = await apiPost('/api/admin/leads', { action: 'bulk-reject', filters: getBulkFilters() })
      const json = await res.json()
      if (json.rejected > 0) {
        addToast({ type: 'success', message: json.message || 'Bulk rejection complete.' })
      } else {
        addToast({ type: 'info', message: json.message || 'No leads awaiting review matched the current filters.' })
      }
      fetchLeads(currentPage, activeTab, searchQuery, true)
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to bulk reject leads.' })
    } finally {
      setBulkRejecting(false)
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId],
    )
  }

  const allPageSelected = leads.length > 0 && leads.every((lead) => selectedLeadIds.includes(lead.id))

  const toggleSelectAllPage = () => {
    const pageIds = leads.map((lead) => lead.id)
    if (allPageSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedLeadIds(prev => [...new Set([...prev, ...pageIds])])
    }
  }

  const renderEmailBadge = (status?: string, source?: string) => {
    const badge = getEmailStatusBadge(status, source)
    return (
      <span className={`text-[8px] px-1.5 py-0.5 uppercase font-black rounded-sm border ${badge.className}`}>
        {badge.label}
      </span>
    )
  }

  const formatFoundBy = (foundBy?: string[]) => {
    if (!foundBy?.length) return null
    const labels: Record<string, string> = {
      contact_compass: 'Contact Compass',
      hunter_finder: 'Hunter.io',
      contactout: 'ContactOut',
      apollo: 'Apollo.io',
    }
    return foundBy.map((s) => labels[s] || s).join(' + ')
  }

  const isRedundantEmailNote = (note?: string) => {
    if (!note) return true
    return /^Found by /i.test(note) || /^Verified by /i.test(note)
  }

  const getLeadEmailEntries = (lead: ExternalPost): EmailEntry[] => {
    if (lead.contact_info?.emails?.length) {
      return lead.contact_info.emails
    }
    if (lead.email) {
      return [{
        email: lead.email,
        found_by: lead.contact_info?.found_by,
        email_status: lead.contact_info?.email_status,
        email_source: lead.contact_info?.email_source,
        find_note: lead.contact_info?.find_note,
        verification_note: lead.contact_info?.verification_note,
        verified_by: lead.contact_info?.verified_by,
        is_primary: true,
      }]
    }
    return []
  }

  const canEnrichLead = (lead: ExternalPost) =>
    lead.status === 'relevant' &&
    ['linkedin', 'threads', 'twitter', 'reddit'].includes(lead.platform)

  const getEnrichButtonLabel = (lead: ExternalPost) => {
    if (!lead.enrichment_status || lead.enrichment_status === 'pending') return 'Find Contacts'
    return 'Re-enrich'
  }

  const leadHasDiscoverableContact = (lead: ExternalPost) => {
    if (lead.email?.trim()) return true
    if (lead.contact_info?.emails?.some((e) => e.email?.trim())) return true
    if (lead.contact_info?.phone_numbers?.some((p) => p.number?.trim())) return true
    return false
  }

  const leadHasContactDetails = (lead: ExternalPost) =>
    (lead.enrichment_status === 'found' || lead.enrichment_status === 'partial') &&
    leadHasDiscoverableContact(lead)

  const leadCanBulkApprove = (lead: ExternalPost) =>
    lead.status === 'relevant' &&
    lead.review_status === 'awaiting_review' &&
    leadHasContactDetails(lead)

  const selectedApprovableCount = leads.filter(
    (lead) => selectedLeadIds.includes(lead.id) && leadCanBulkApprove(lead),
  ).length

  const getEnrichmentStatusLabel = (status: NonNullable<ExternalPost['enrichment_status']>) => {
    switch (status) {
      case 'found':
        return 'Found (verified)'
      case 'partial':
        return 'Partial (found, not verified)'
      case 'not_found':
        return 'Not found'
      case 'pending':
        return 'Not started'
      default:
        return status.replace(/_/g, ' ')
    }
  }

  const getEmailSourceLabel = (source?: string) => {
    const labels: Record<string, string> = {
      post_text: 'From post',
      apify_profile: 'LinkedIn profile',
      contact_compass: 'Contact Compass',
      hunter_finder: 'Hunter.io',
      compass_and_hunter: 'Contact Compass + Hunter.io',
      pattern_guess: 'Pattern guess',
      threads_profile: 'Threads profile',
      contactout: 'ContactOut',
      apollo: 'Apollo.io',
      website: 'Company website',
      author_info: 'LinkedIn author info',
      google_maps: 'Google Maps',
      twitter_profile: 'X profile',
      reddit_profile: 'Reddit profile',
    }
    return source ? labels[source] || source : null
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchLeads(newPage, activeTab, searchQuery)
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    fetchLeads(1, activeTab, searchQuery)
  }

  const tabs: { id: TabKey; label: string; count?: number }[] = [
    { id: 'all', label: 'All Leads', count: counts.all },
    { id: 'irrelevant', label: 'Noise', count: counts.irrelevant },
    { id: 'pending', label: 'Needs Review', count: counts.pending },
    { id: 'relevant', label: 'Relevant', count: counts.relevant },
    { id: 'with_contact', label: 'Contact Found', count: counts.with_contact },
    { id: 'review', label: 'Awaiting Approval', count: counts.review },
    { id: 'approved', label: 'Approved', count: counts.approved },
  ]

  const statsCards = [
    { label: 'All Leads', value: leadStats?.scraped_total ?? counts.all ?? 0, sub: 'total ingested' },
    { label: 'Relevant', value: counts.relevant ?? 0, sub: 'AI-qualified leads' },
    { label: 'Contact Found', value: leadStats?.with_contact ?? counts.with_contact ?? 0, sub: 'partial or verified' },
    { label: 'Awaiting Approval', value: leadStats?.awaiting_review ?? counts.review ?? 0, sub: 'needs sign-off', highlight: true },
    { label: 'Approved', value: counts.approved ?? 0, sub: 'released to clients' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight">
            Lead <span className="text-accent-mint italic underline">Intelligence.</span>
          </h1>

          {intelConfigured === false && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500/50 rounded-lg">
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
                OpenRouter API not configured
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Strategic reports cannot be generated until you set{' '}
                <code className="text-accent-mint">OPEN_ROUTER_API</code> in{' '}
                <code className="text-accent-mint">backend/.env</code> and restart the backend.
                Get a key at{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent-mint underline">
                  openrouter.ai/keys
                </a>
                {intelModel ? ` (model: ${intelModel})` : ''}.
              </p>
            </div>
          )}

          {leadStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl">
              {statsCards.map((stat) => (
                <div key={stat.label} className={`${
                  'bg-surface/40 backdrop-blur-xl border rounded-2xl p-4 ' +
                  (stat.highlight && stat.value > 0 ? 'border-accent-mint/40 border-l-4 border-l-accent-mint' : 'border-white/[0.06]')
                }`}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mt-1">{stat.sub}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-surface/40 backdrop-blur-xl border border-white/[0.06] border-l-4 border-l-blue-500 rounded-2xl max-w-4xl">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck size={16} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Stage 5 — Admin Review</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pipeline: <span className="text-zinc-400 font-bold">Pending Analysis</span> →
              <span className="text-white font-bold"> Relevant</span> →
              <span className="text-accent-mint font-bold"> Contact Found</span> →
              <span className="text-blue-400 font-bold"> Awaiting Approval</span> →
              <span className="text-green-400 font-bold"> Approved</span>
            </p>
          </div>

          {aiMetrics && (
            <div className="p-4 bg-surface/40 backdrop-blur-xl border border-white/[0.06] border-l-4 border-l-accent-mint rounded-2xl max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={16} className="text-accent-mint" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Local AI Learning</span>
                {aiMetrics.status === 'training' && (
                  <Loader2 size={14} className="animate-spin text-accent-mint" />
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                {aiMetrics.model_ready && aiMetrics.accuracy !== null ? (
                  <span className="text-green-400">{aiMetrics.accuracy}% Accuracy</span>
                ) : (
                  <span className="text-zinc-500">Accuracy: pending</span>
                )}
                <span className="text-zinc-400">
                  Training samples: <span className="text-white">{aiMetrics.samples}</span>
                </span>
                <span className="text-green-400">{aiMetrics.relevant_count} relevant</span>
                <span className="text-red-400">{aiMetrics.irrelevant_count} irrelevant</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2 normal-case font-medium tracking-normal">
                {aiMetrics.message || 'Approve, reject, or label leads — each decision trains the model automatically.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleTrainAi}
                  disabled={isTrainingAi || aiMetrics.samples < 8}
                  className="h-8 px-4 text-[9px] uppercase font-black rounded-lg bg-accent-mint text-black hover:bg-accent-mint/80 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isTrainingAi ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Training...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={12} />
                      Train AI Now
                    </>
                  )}
                </button>
                {aiMetrics.samples < 8 && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 self-center">
                    Need {8 - aiMetrics.samples} more labeled leads
                  </span>
                )}
              </div>
              {aiMetrics.samples < 10 && (
                <div className="mt-3 h-1.5 w-full max-w-md bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-mint transition-all"
                    style={{ width: `${Math.min(100, (aiMetrics.samples / 8) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap gap-2 p-1 bg-surface/60 backdrop-blur-xl border border-white/[0.06] rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 rounded-lg ${
                activeTab === tab.id
                  ? 'bg-accent-mint text-black'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 text-[8px] rounded-full ${activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'}`}>
                {tab.count ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(activeTab === 'review' || activeTab === 'with_contact') && (
            <>
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all disabled:opacity-50"
              >
                {bulkApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {bulkApproving ? 'Approving...' : 'Approve All'}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkRejecting}
                className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black transition-all disabled:opacity-50"
              >
                {bulkRejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {bulkRejecting ? 'Rejecting...' : 'Reject All'}
              </button>
              <button
                onClick={handleBulkTitle}
                disabled={isBulkTitling}
                className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-black transition-all disabled:opacity-50"
              >
                {isBulkTitling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isBulkTitling ? 'Queueing...' : 'Generate Titles'}
              </button>
              <button
                onClick={handleBulkIntel}
                disabled={isBulkInteling}
                className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-black transition-all disabled:opacity-50"
              >
                {isBulkInteling ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                {isBulkInteling ? 'Queueing...' : 'Generate Intel'}
              </button>
            </>
          )}
          <button
            onClick={handleBulkReanalyse}
            disabled={bulkReanalysing}
            className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-white/5 text-zinc-300 border border-white/10 hover:bg-accent-mint hover:text-black transition-all disabled:opacity-50"
          >
            {bulkReanalysing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
            {bulkReanalysing ? 'Queueing...' : 'Re-analyse All'}
          </button>
          <button
            onClick={handleBulkReEnrich}
            disabled={bulkReenriching}
            className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-accent-mint/10 text-accent-mint border border-accent-mint/30 hover:bg-accent-mint hover:text-black transition-all disabled:opacity-50"
          >
            {bulkReenriching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {bulkReenriching ? 'Queueing...' : 'Re-enrich All'}
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="h-10 px-5 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-white text-black border border-white hover:bg-accent-mint hover:text-black transition-all"
          >
            <Plus size={14} /> Add Lead Manually
          </button>
        </div>

        {leads.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-surface/40 backdrop-blur-xl border border-white/[0.08] rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAllPage}
                className="w-4 h-4 accent-accent-mint cursor-pointer"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Select all on page ({leads.length})
              </span>
            </label>

            {selectedLeadIds.length > 0 && (
              <>
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-mint">
                  {selectedLeadIds.length} selected
                </span>
                <button
                  onClick={handleBulkApproveSelected}
                  disabled={bulkSelectionBusy || selectedApprovableCount === 0}
                  title={
                    selectedApprovableCount === 0
                      ? 'Selected leads must be awaiting approval with contact details'
                      : undefined
                  }
                  className="h-9 px-4 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all disabled:opacity-50"
                >
                  {bulkSelectionBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve Selected{selectedApprovableCount > 0 ? ` (${selectedApprovableCount})` : ''}
                </button>
                <button
                  onClick={handleBulkDeleteSelected}
                  disabled={bulkSelectionBusy}
                  className="h-9 px-4 text-[10px] uppercase font-black rounded-xl flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black transition-all disabled:opacity-50"
                >
                  {bulkSelectionBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Selected ({selectedLeadIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mb-8 flex items-center gap-2">
        <div className="h-[1px] flex-1 bg-white/[0.06]" />
        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
          Showing {leads.length} of {totalCount} {activeTab} posts (Page {currentPage} of {totalPages})
        </span>
        <div className="h-[1px] flex-1 bg-white/[0.06]" />
      </div>

      <form onSubmit={handleSearch} className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-10 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <input
            placeholder="Search by name, keyword, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-2.5 text-sm"
          />
        </div>
        <button type="submit" className="md:w-32 h-10 rounded-xl bg-accent-mint text-black text-xs font-black uppercase hover:bg-accent-mint/80 transition-all">
          Search
        </button>
      </form>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
            Loading Posts...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl border-dashed">
            <p className="text-zinc-500 font-bold uppercase tracking-widest">
              No posts found matching your criteria.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {leads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 flex flex-col hover:border-accent-mint/40 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <label className="mt-2 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="w-4 h-4 accent-accent-mint cursor-pointer"
                      aria-label={`Select ${lead.author?.name || 'lead'}`}
                    />
                  </label>

                  <div className="w-10 h-10 bg-surface-elevated border border-white/[0.08] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:border-accent-mint/40 transition-colors">
                    {lead.is_claimed && lead.author.avatar?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lead.author.avatar.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-base font-bold uppercase tracking-tight group-hover:text-accent-mint transition-colors truncate">
                          {lead.author?.name || 'Unknown'}
                          {lead.is_claimed && lead.author?.handle && (
                            <span className="text-[10px] text-zinc-500 lowercase font-bold">@{lead.author.handle}</span>
                          )}
                        </h3>
                        {lead.platform === 'linkedin' && <LinkedinLogo className="w-3 h-3 text-[#0A66C2]" />}
                        {lead.platform === 'twitter' && <XLogo className="w-3 h-3 text-white" />}
                        {lead.platform === 'reddit' && <RedditLogo className="w-3 h-3 text-[#FF4500]" />}
                        {lead.platform === 'threads' && <ThreadsLogo className="w-3 h-3 text-white" />}

                        {lead.url && lead.url.startsWith('http') && (
                          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {lead.source === 'manual' && (
                          <div className="px-1.5 py-0.5 bg-accent-mint/10 border border-accent-mint/30 text-accent-mint text-[7px] font-black uppercase tracking-widest rounded">
                            Manual
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-0.5 bg-surface-elevated border border-white/[0.08] text-zinc-400 text-[8px] font-black uppercase tracking-widest flex-shrink-0 rounded">
                        KW: <span className="text-accent-mint">{lead.keyword}</span>
                      </div>
                    </div>

                    {/* Lead Title & Niche */}
                    <div className="mb-3 flex items-center gap-2 flex-wrap">
                      <NicheBadge niche={(lead as any).niche} keyword={lead.keyword} content={lead.content} intelligence={lead.intelligence} />
                      {(lead as any).title && (
                        <span className="text-sm font-bold text-white">{(lead as any).title}</span>
                      )}
                    </div>

                    {lead.qualification_reason && lead.status !== 'pending' && (
                      <div className={`mb-4 p-3 border border-l-2 rounded-lg ${
                        lead.status === 'relevant'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : 'bg-red-500/5 border-red-500/30 border-l-red-500'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <BrainCircuit size={12} className={lead.status === 'relevant' ? 'text-green-400' : 'text-red-400'} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            AI Review {lead.ai_score ? `(${lead.ai_score}%)` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{lead.qualification_reason}</p>
                      </div>
                    )}

                    {lead.status === 'relevant' && lead.review_status === 'awaiting_review' && (
                      <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/30 border-l-2 border-l-blue-500 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck size={14} className="text-blue-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                            {leadHasContactDetails(lead)
                              ? 'Contact found — ready to approve (verification optional)'
                              : 'No contact yet — run enrichment before approving'}
                          </span>
                        </div>
                      </div>
                    )}

                    {lead.review_status === 'approved' && (
                      <div className="mb-4 p-3 bg-green-500/5 border border-green-500/30 border-l-2 border-l-green-500 rounded-lg">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                            {lead.intelligence
                              ? 'Approved — visible on Lead Feed'
                              : 'Approved — not on feed until intel is ready'}
                          </span>
                          {!lead.intelligence && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-accent-mint flex items-center gap-1">
                              {intelActionIds.includes(lead.id) ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Generating intel...
                                </>
                              ) : (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Intel pending — claim locked
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        {!lead.intelligence && (
                          <button
                            type="button"
                            onClick={() => handleRegenerateIntel(lead.id)}
                            disabled={intelActionIds.includes(lead.id)}
                            className="mt-2 text-[9px] font-black uppercase tracking-widest text-accent-mint hover:text-white disabled:opacity-50"
                          >
                            Retry intel generation
                          </button>
                        )}
                        {lead.reviewed_by_name && (
                          <p className="text-[10px] text-zinc-500">
                            Reviewed by {lead.reviewed_by_name}
                            {lead.reviewed_at ? ` · ${new Date(lead.reviewed_at).toLocaleString()}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {lead.status === 'pending' && (
                      <div className={`mb-4 p-3 border border-l-2 rounded-lg flex flex-col gap-2 ${
                        lead.qualification_reason
                          ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                          : 'bg-surface/50 border-white/[0.06] border-l-zinc-600'
                      }`}>
                        <div className="flex items-center gap-2">
                          {lead.qualification_reason ? (
                            <BrainCircuit size={14} className="text-yellow-400" />
                          ) : (
                            <Loader2 size={14} className="animate-spin text-zinc-500" />
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            lead.qualification_reason ? 'text-yellow-300' : 'text-zinc-500'
                          }`}>
                            {lead.qualification_reason ? 'Needs your label — trains the AI' : 'Waiting for AI analysis...'}
                          </span>
                        </div>
                        {lead.qualification_reason && (
                          <>
                            <p className="text-xs text-zinc-400">{lead.qualification_reason}</p>
                            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                              Mark Relevant or Irrelevant — your label trains the AI
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {canEnrichLead(lead) && lead.enrichment_status === 'searching' && (
                      <div className="mb-4 p-3 bg-accent-mint/5 border border-accent-mint/20 rounded-lg flex items-center gap-3">
                        <Loader2 size={14} className="animate-spin text-accent-mint" />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent-mint block">
                            Enriching Contacts
                          </span>
                          <span className="text-[10px] text-zinc-500 normal-case font-medium">
                            Searching post, profile, websites, Google Maps, Apollo...
                          </span>
                        </div>
                      </div>
                    )}

                    {canEnrichLead(lead) && lead.enrichment_status !== 'searching' && (
                      <div className={`mb-4 p-3 border border-l-2 rounded-lg ${
                        lead.enrichment_status === 'found'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : lead.enrichment_status === 'partial'
                            ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                            : lead.enrichment_status === 'not_found'
                              ? 'bg-red-500/5 border-red-500/30 border-l-red-500'
                              : 'bg-surface/50 border-white/[0.06] border-l-zinc-600'
                      }`}>
                        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Mail size={12} className={
                              lead.enrichment_status === 'found'
                                ? 'text-green-400'
                                : lead.enrichment_status === 'partial'
                                  ? 'text-yellow-400'
                                  : lead.enrichment_status === 'not_found'
                                    ? 'text-red-400'
                                    : 'text-zinc-500'
                            } />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                              Contact Enrichment{lead.enrichment_status ? `: ${getEnrichmentStatusLabel(lead.enrichment_status)}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {leadHasContactDetails(lead) && (
                              <>
                                <button
                                  onClick={() => handleGenerateTitle(lead.id)}
                                  disabled={titleActionIds.includes(lead.id)}
                                  className="h-8 px-3 text-[9px] uppercase font-black rounded-lg flex items-center gap-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500 hover:text-black transition-all disabled:opacity-50"
                                >
                                  {titleActionIds.includes(lead.id) ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={12} />
                                  )}
                                  {titleActionIds.includes(lead.id) ? 'Generating...' : 'Generate Title'}
                                </button>
                                <button
                                  onClick={() => handleRegenerateIntel(lead.id)}
                                  disabled={intelActionIds.includes(lead.id)}
                                  className="h-8 px-3 text-[9px] uppercase font-black rounded-lg flex items-center gap-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-black transition-all disabled:opacity-50"
                                >
                                  {intelActionIds.includes(lead.id) ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <BrainCircuit size={12} />
                                  )}
                                  {intelActionIds.includes(lead.id) ? 'Generating...' : 'Generate Intel'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleReEnrichLead(lead.id)}
                              disabled={enrichingIds.includes(lead.id)}
                              className="h-8 px-3 text-[9px] uppercase font-black rounded-lg flex items-center gap-1.5 bg-accent-mint/10 text-accent-mint border border-accent-mint/30 hover:bg-accent-mint hover:text-black transition-all disabled:opacity-50"
                            >
                              {enrichingIds.includes(lead.id) ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <RefreshCw size={12} />
                              )}
                              {enrichingIds.includes(lead.id) ? 'Queueing...' : getEnrichButtonLabel(lead)}
                            </button>
                          </div>
                        </div>
                        {(!lead.enrichment_status || lead.enrichment_status === 'pending') && (
                          <p className="text-xs text-zinc-500">
                            Enrichment is manual — click Find Contacts when you want to spend API credits.
                          </p>
                        )}
                        {lead.enrichment_message && (
                          <p className="text-xs text-zinc-400">{lead.enrichment_message}</p>
                        )}
                      </div>
                    )}

                    {/* Manual Contact Input */}
                    {lead.status === 'relevant' && (
                      <div className="mb-4">
                        {manualContactOpen === lead.id ? (
                          <div className="p-4 bg-surface/50 border border-accent-mint/20 rounded-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent-mint mb-3">Add Contact Manually</p>
                            <div className="flex flex-col gap-2">
                              <input
                                type="email"
                                placeholder="Email address"
                                value={manualContactEmail}
                                onChange={(e) => setManualContactEmail(e.target.value)}
                                className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-mint/50"
                              />
                              <input
                                type="tel"
                                placeholder="Phone number (optional)"
                                value={manualContactPhone}
                                onChange={(e) => setManualContactPhone(e.target.value)}
                                className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-mint/50"
                              />
                              <input
                                type="text"
                                placeholder="Note (optional)"
                                value={manualContactNote}
                                onChange={(e) => setManualContactNote(e.target.value)}
                                className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-mint/50"
                              />
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => handleSaveManualContact(lead.id)}
                                  disabled={savingManualContact}
                                  className="flex-1 py-2 rounded-lg bg-accent-mint text-black text-xs font-black uppercase tracking-widest hover:bg-accent-mint/90 transition-all disabled:opacity-50"
                                >
                                  {savingManualContact ? 'Saving...' : 'Save Contact'}
                                </button>
                                <button
                                  onClick={() => { setManualContactOpen(null); setManualContactEmail(''); setManualContactPhone(''); setManualContactNote('') }}
                                  className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setManualContactOpen(lead.id)}
                            className="w-full py-2 rounded-lg border border-dashed border-white/10 text-zinc-500 text-xs font-black uppercase tracking-widest hover:border-accent-mint/30 hover:text-accent-mint transition-all"
                          >
                            + Add Contact Manually
                          </button>
                        )}
                      </div>
                    )}

                    {lead.status === 'relevant' && !canEnrichLead(lead) && lead.enrichment_status && lead.enrichment_status !== 'searching' && (
                      <div className={`mb-4 p-3 border border-l-2 rounded-lg ${
                        lead.enrichment_status === 'found'
                          ? 'bg-green-500/5 border-green-500/30 border-l-green-500'
                          : lead.enrichment_status === 'partial'
                            ? 'bg-yellow-500/5 border-yellow-500/30 border-l-yellow-500'
                            : lead.enrichment_status === 'not_found'
                              ? 'bg-red-500/5 border-red-500/30 border-l-red-500'
                              : 'bg-surface/50 border-white/[0.06] border-l-zinc-600'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Mail size={12} className={
                            lead.enrichment_status === 'found'
                              ? 'text-green-400'
                              : lead.enrichment_status === 'partial'
                                ? 'text-yellow-400'
                                : lead.enrichment_status === 'not_found'
                                  ? 'text-red-400'
                                  : 'text-zinc-500'
                          } />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">
                            Contact Enrichment: {getEnrichmentStatusLabel(lead.enrichment_status)}
                          </span>
                        </div>
                        {lead.enrichment_message && (
                          <p className="text-xs text-zinc-400">{lead.enrichment_message}</p>
                        )}
                      </div>
                    )}

                    {lead.intelligence && (
                      <div
                        id={`lead-intel-${lead.id}`}
                        className="mb-4 p-3 bg-surface/50 border border-white/[0.06] border-l-accent-mint border-l-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Zap size={12} className="text-accent-mint" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Lead Intelligence</span>
                        </div>
                        <div className="text-xs text-zinc-400 leading-relaxed italic max-w-none">
                          <ReactMarkdown>{lead.intelligence}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-medium">
                      {lead.content}
                    </p>

                    {getLeadEmailEntries(lead).length > 0 || (lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0) ? (
                      <div className="mb-6 p-4 bg-accent-mint/5 border border-accent-mint/20 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-accent-mint/5 -rotate-45 translate-x-8 -translate-y-8" />
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-accent-mint/10 flex items-center justify-center rounded border border-accent-mint/30">
                            <Mail size={12} className="text-accent-mint" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent-mint">
                            {getLeadEmailEntries(lead).length > 1 ? 'Contact Emails' : 'Contact Email'}
                          </span>
                          {lead.contact_info?.email_conflict && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 uppercase font-black rounded">
                              Conflict
                            </span>
                          )}
                        </div>

                        {lead.contact_info?.email_conflict && (
                          <p className="text-[10px] text-yellow-500/90 mb-4 normal-case font-medium">
                            Contact Compass and Hunter.io found different emails. Review both below.
                          </p>
                        )}

                        <div className="space-y-4">
                          {getLeadEmailEntries(lead).map((entry, index) => (
                            <div
                              key={`${entry.email}-${index}`}
                              className={`p-3 border rounded-lg bg-black/20 ${
                                entry.is_primary && getLeadEmailEntries(lead).length > 1 ? 'border-accent-mint/40' : 'border-white/[0.08]'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="text-lg font-bold text-white tracking-tight break-all">{entry.email}</p>
                                {renderEmailBadge(entry.email_status, entry.email_source)}
                                {entry.is_primary && getLeadEmailEntries(lead).length > 1 && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-accent-mint/10 text-accent-mint border border-accent-mint/30 uppercase font-black rounded">
                                    Primary
                                  </span>
                                )}
                              </div>
                              {formatFoundBy(entry.found_by) && (
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                  Found by: {formatFoundBy(entry.found_by)}
                                </p>
                              )}
                              {formatVerifiedByLabel(entry.verified_by) && (
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                  {formatVerifiedByLabel(entry.verified_by)}
                                </p>
                              )}
                              {!isRedundantEmailNote(entry.find_note) && (
                                <p className="text-[10px] text-zinc-500 mt-1 normal-case font-medium">{entry.find_note}</p>
                              )}
                              {!isRedundantEmailNote(entry.verification_note) && (
                                <p className="text-[10px] text-zinc-400 mt-1 normal-case font-medium">{entry.verification_note}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {lead.contact_info?.phone_numbers?.map((p, i) => (
                          <div key={i} className="mt-3">
                            <p className="text-sm font-bold text-zinc-400">{p.number}</p>
                            {getEmailSourceLabel(p.source) && (
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                Found via: {getEmailSourceLabel(p.source)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : lead.status === 'relevant' && canEnrichLead(lead) ? (
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="p-4 bg-surface/50 border border-white/[0.06] rounded-xl space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contact Details</p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Email</p>
                              <p className="text-xs text-zinc-400">Not found yet</p>
                            </div>
                            {lead.contact_info?.phone_numbers && lead.contact_info.phone_numbers.length > 0 ? (
                              lead.contact_info.phone_numbers.map((p, i) => (
                                <div key={i}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Phone</p>
                                  <p className="text-xs text-zinc-300">{p.number}</p>
                                  {getEmailSourceLabel(p.source) && (
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                      {getEmailSourceLabel(p.source)}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Phone</p>
                                <p className="text-xs text-zinc-400">Not found yet</p>
                              </div>
                            )}
                          </div>
                          {(lead.author?.url || lead.url) && (lead.author?.url || lead.url) !== '#' && (
                            <a
                              href={lead.author?.url || lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[9px] text-accent-mint font-black uppercase hover:underline"
                            >
                              View LinkedIn Profile <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {lead.image_url && (
                        <div
                          className="flex items-center gap-2 p-2 bg-black/20 border border-white/[0.06] rounded-lg w-fit cursor-pointer hover:border-zinc-600 transition-colors group/img"
                          onClick={() => {
                            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '')
                            const cleanUrl = lead.image_url?.startsWith('/') ? lead.image_url : `/${lead.image_url}`
                            window.open(`${baseUrl}${cleanUrl}`, '_blank')
                          }}
                        >
                          <ImageIcon size={14} className="text-zinc-500 group-hover/img:text-accent-mint" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">View Source Image</span>
                        </div>
                      )}

                      {lead.content === 'Manual Extraction Required' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRefineLead(lead)
                              setIsRefineModalOpen(true)
                            }}
                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg bg-surface-elevated text-zinc-300 border border-white/10 hover:bg-white/10 transition-all"
                          >
                            Manual Refine
                          </button>
                          <button
                            onClick={() => handleReExtract(lead.id)}
                            className="h-8 px-3 text-[9px] font-black uppercase rounded-lg bg-accent-mint text-black hover:bg-accent-mint/80 transition-all"
                          >
                            Re-extract with AI
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {lead.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateLeadLabel(lead.id, { status: 'relevant' })}
                              className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-black transition-all"
                            >
                              Mark Relevant
                            </button>
                            <button
                              onClick={() => updateLeadLabel(lead.id, { status: 'irrelevant' })}
                              className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              Irrelevant
                            </button>
                          </>
                        )}

                        {lead.status === 'relevant' && lead.review_status === 'awaiting_review' && (
                          <>
                            <button
                              onClick={() => handleApproveReview(lead.id)}
                              disabled={reviewActionIds.includes(lead.id) || !leadHasContactDetails(lead)}
                              title={!leadHasContactDetails(lead) ? 'Contact details required before approval' : undefined}
                              className={`h-7 text-[8px] uppercase font-black px-3 rounded-lg transition-all ${
                                leadHasContactDetails(lead)
                                  ? 'bg-green-500 text-black border border-green-500 hover:bg-green-600'
                                  : 'bg-surface-elevated text-zinc-500 border border-white/10 cursor-not-allowed'
                              }`}
                            >
                              {reviewActionIds.includes(lead.id) ? (
                                <Loader2 size={12} className="animate-spin inline" />
                              ) : (
                                <CheckCircle2 size={12} className="inline mr-1" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectReview(lead.id)}
                              disabled={reviewActionIds.includes(lead.id)}
                              className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => updateLeadLabel(lead.id, { status: 'pending' })}
                              className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              Reset
                            </button>
                          </>
                        )}

                        {lead.status === 'irrelevant' && (
                          <button
                            onClick={() => updateLeadLabel(lead.id, { status: 'pending' })}
                            className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <div className={`px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter rounded border ${
                          lead.status === 'relevant' ? 'bg-green-500/10 text-green-500 border-green-500/50' :
                            lead.status === 'irrelevant' ? 'bg-red-500/10 text-red-500 border-red-500/50' :
                              'bg-surface-elevated text-zinc-500 border-white/10'
                        }`}>
                          {lead.status || 'pending'}
                        </div>
                        {lead.review_status === 'awaiting_review' && (
                          <div className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter rounded border bg-blue-500/10 text-blue-400 border-blue-500/50">
                            awaiting approval
                          </div>
                        )}
                        {lead.review_status === 'approved' && (
                          <div className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-tighter rounded border bg-green-500/10 text-green-400 border-green-500/50">
                            approved
                          </div>
                        )}
                        {lead.review_status === 'approved' && lead.intelligence && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById(`lead-intel-${lead.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              className="h-7 text-[8px] uppercase font-black px-4 rounded-lg bg-surface-elevated text-white border border-white/10 hover:border-accent-mint flex items-center gap-2 transition-all"
                            >
                              <BrainCircuit size={12} /> View Intel
                            </button>
                            <Link href={`/leads`}>
                              <button className="h-7 text-[8px] uppercase font-black px-4 rounded-lg bg-accent-mint text-black border border-black flex items-center gap-2 transition-all">
                                <ExternalLink size={12} /> Hunter Preview
                              </button>
                            </Link>
                          </>
                        )}
                        {lead.review_status === 'approved' && (
                          <button
                            className={`h-7 text-[8px] uppercase font-black px-4 rounded-lg transition-all ${
                              lead.is_claimed
                                ? 'bg-surface-elevated text-zinc-500 border border-white/10 pointer-events-none'
                                : 'bg-white text-black hover:bg-accent-mint hover:text-black border border-white'
                            }`}
                            onClick={() => handleClaim(lead.id)}
                            disabled={claimingIds.includes(lead.id) || lead.is_claimed || !lead.intelligence}
                          >
                            {claimingIds.includes(lead.id) ? (
                              <Loader2 size={12} className="animate-spin inline" />
                            ) : lead.is_claimed ? (
                              'Claimed'
                            ) : !lead.intelligence ? (
                              'Intel pending'
                            ) : (
                              `Claim (${lead.claimed_count || 0}/25)`
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead)}
                          disabled={deletingIds.includes(lead.id)}
                          className="h-7 text-[8px] uppercase font-black px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black transition-all disabled:opacity-50"
                          title="Delete lead"
                        >
                          {deletingIds.includes(lead.id) ? (
                            <Loader2 size={12} className="animate-spin inline" />
                          ) : (
                            <>
                              <Trash2 size={12} className="inline mr-1" />
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-24 h-8 rounded-lg bg-surface-elevated text-zinc-400 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 text-[10px] font-black uppercase"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 font-bold text-xs rounded-lg transition-all border ${
                      currentPage === pageNum
                        ? 'bg-accent-mint text-black border-accent-mint'
                        : 'bg-surface-elevated text-zinc-500 border-white/10 hover:border-accent-mint'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              } else if (
                pageNum === currentPage - 2 ||
                pageNum === currentPage + 2
              ) {
                return <span key={pageNum} className="text-zinc-700">...</span>
              }
              return null
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-24 h-8 rounded-lg bg-surface-elevated text-zinc-400 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50 text-[10px] font-black uppercase"
          >
            Next
          </button>
        </div>
      )}

      <ManualLeadModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={() => {
          fetchLeads()
          setIsManualModalOpen(false)
        }}
      />
      <RefineLeadModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onSuccess={fetchLeads}
        lead={refineLead}
      />
    </div>
  )
}
