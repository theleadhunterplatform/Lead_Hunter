'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MegaphoneIcon,
  CheckIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowTopRightOnSquareIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  SparklesIcon,
  BoltIcon,
  ShieldExclamationIcon,
  ChatBubbleLeftRightIcon,
  QrCodeIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/solid'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { useDebounce } from '@/hooks/useDebounce'

interface BroadcastTemplateItem {
  id: string
  name: string
  subject: string
  body: string
  category: string
  createdById?: string | null
  createdAt?: string
  updatedAt?: string
}

interface EmailLogItem {
  id: string
  to: string
  subject: string
  type: string
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error: string | null
  sentAt: string
}

interface BroadcastData {
  stats: {
    totalActive: number
    paidSubscribers: number
    freeStarters: number
  }
  smtpStatus: {
    configured: boolean
    provider: 'smtp' | 'resend' | 'mock'
    working: boolean
    message: string
  }
  automationSettings?: {
    auto_email_enabled: boolean
    renewal_reminders_enabled: boolean
    low_credits_nudge_enabled: boolean
    onboarding_emails_enabled: boolean
  }
  recentLogs: EmailLogItem[]
}

interface WhatsAppStatusData {
  status: 'connected' | 'connecting' | 'waiting_for_qr' | 'disconnected'
  botNumber: string | null
  configuredGroupId: string
  qrDataUrl: string | null
  hasQr: boolean
  groups: Array<{ id: string; subject: string; participantsCount: number }>
}

const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'automated', label: '⚡ Automated Lifecycle' },
  { id: 'general', label: 'General' },
  { id: 'leads', label: 'Leads Drop' },
  { id: 'update', label: 'Product Update' },
  { id: 'promo', label: 'Promotion' },
  { id: 'announcement', label: 'Announcement' },
]

const AUTOMATED_TRIGGER_OPTIONS = [
  { id: 'tpl-auto-account-approved', label: '⚡ When User Account is Approved (Welcome Email)' },
  { id: 'tpl-auto-low-credits', label: '📉 When Credits Drop <= 2 Coins (Low Credits Alert)' },
  { id: 'tpl-auto-renewal-reminder', label: '📅 3 Days Before Subscription Renews (Renewal Notice)' },
  { id: 'tpl-auto-application-received', label: '📝 When Onboarding / Application is Submitted' },
  { id: 'tpl-auto-account-rejected', label: '❌ When Application is Rejected' },
  { id: 'tpl-auto-account-suspended', label: '🚫 When Account is Suspended' },
]

export default function AdminBroadcastPage() {
  const { addToast } = useToast()

  const [data, setData] = useState<BroadcastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'composer' | 'templates' | 'logs'>('composer')

  // Composer Form
  const [audience, setAudience] = useState<'ALL' | 'PAID' | 'FREE'>('ALL')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false)
  const [automationSaving, setAutomationSaving] = useState<string | null>(null)
  const [isTriggeringLifecycle, setIsTriggeringLifecycle] = useState(false)

  // Preview Mode State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')

  // Templates Management State
  const [templates, setTemplates] = useState<BroadcastTemplateItem[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const debouncedTemplateSearch = useDebounce(templateSearch, 250)
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all')

  // Template Form (Create / Edit in Templates tab)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [tName, setTName] = useState('')
  const [tCategory, setTCategory] = useState('general')
  const [tTrigger, setTTrigger] = useState('tpl-auto-account-approved')
  const [tSubject, setTSubject] = useState('')
  const [tBody, setTBody] = useState('')
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Delivery Logs Filter State
  const [logSearch, setLogSearch] = useState('')
  const debouncedLogSearch = useDebounce(logSearch, 250)
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'SKIPPED'>('ALL')

  // WhatsApp Community Automation State
  const [waData, setWaData] = useState<WhatsAppStatusData | null>(null)
  const [waLoading, setWaLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [isSendingWaTest, setIsSendingWaTest] = useState(false)
  const [isReconnectingWa, setIsReconnectingWa] = useState(false)
  const [copiedJid, setCopiedJid] = useState<string | null>(null)

  const fetchWhatsAppStatus = useCallback(async (quiet = false) => {
    if (!quiet) setWaLoading(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/whatsapp', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setWaData(json.data)
      }
    } catch {
      console.warn('[WhatsApp] Failed to fetch status')
    } finally {
      if (!quiet) setWaLoading(false)
    }
  }, [])

  // Poll status while QR modal is open
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (showQrModal) {
      interval = setInterval(() => {
        fetchWhatsAppStatus(true)
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showQrModal, fetchWhatsAppStatus])

  const handleSendWaTest = async () => {
    setIsSendingWaTest(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'alert', leadCount: 3, niche: 'Web & App Development' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: 'Test lead drop alert dispatched to WhatsApp group!' })
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to dispatch WhatsApp alert' })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err?.message || 'Network error sending WhatsApp alert' })
    } finally {
      setIsSendingWaTest(false)
    }
  }

  const handleReconnectWa = async () => {
    setIsReconnectingWa(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'reconnect' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'info', message: 'WhatsApp reconnect requested. Fetching updated status...' })
        setTimeout(() => fetchWhatsAppStatus(), 1500)
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to reconnect WhatsApp' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error reconnecting WhatsApp' })
    } finally {
      setIsReconnectingWa(false)
    }
  }

  const handleCopyJid = (jid: string) => {
    navigator.clipboard.writeText(jid)
    setCopiedJid(jid)
    addToast({ type: 'success', message: `Copied group ID: ${jid}` })
    setTimeout(() => setCopiedJid(null), 3000)
  }

  const fetchTemplates = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast/templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setTemplates(json.templates || [])
      }
    } catch {
      console.warn('[Broadcast] Failed to fetch templates')
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json)
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to load broadcast center' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error loading broadcast data' })
    } finally {
      setLoading(false)
      setIsRefreshingDiagnostics(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
    fetchTemplates()
    fetchWhatsAppStatus()
  }, [fetchData, fetchTemplates, fetchWhatsAppStatus])

  const handleRefreshDiagnostics = async () => {
    setIsRefreshingDiagnostics(true)
    await fetchData()
    addToast({
      type: 'info',
      message: data?.smtpStatus.working
        ? 'Diagnostics updated: Mailer socket active'
        : 'Diagnostics updated: Verification refreshed',
    })
  }

  const handleToggleAutomation = async (key: string) => {
    if (!data?.automationSettings) return
    const currentValue = (data.automationSettings as any)[key] ?? true
    const newValue = !currentValue

    setAutomationSaving(key)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value: newValue }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                automationSettings: {
                  ...prev.automationSettings,
                  [key]: newValue,
                } as any,
              }
            : null,
        )
        addToast({
          type: 'success',
          message: `Email automation ${newValue ? 'enabled' : 'disabled'} successfully`,
        })
      } else {
        addToast({
          type: 'error',
          message: json.message || 'Failed to update automation',
        })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update automation' })
    } finally {
      setAutomationSaving(null)
    }
  }

  const handleTriggerLifecycleNow = async () => {
    setIsTriggeringLifecycle(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'trigger_now' }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          message: json.message || 'Lifecycle check completed',
        })
        fetchData()
      } else {
        addToast({
          type: 'error',
          message: json.message || 'Failed to execute lifecycle check',
        })
      }
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to execute trigger' })
    } finally {
      setIsTriggeringLifecycle(false)
    }
  }

  // Quick-load a template into the composer
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId)
    if (!tplId) return
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      setSubject(tpl.subject)
      setMessage(tpl.body)
      addToast({ type: 'info', message: `Loaded template "${tpl.name}"` })
    }
  }

  // Use template from the Templates tab in Composer
  const handleApplyTemplateToComposer = (tpl: BroadcastTemplateItem) => {
    setSubject(tpl.subject)
    setMessage(tpl.body)
    setSelectedTemplateId(tpl.id)
    setActiveTab('composer')
    addToast({ type: 'success', message: `Loaded "${tpl.name}" into Composer` })
  }

  // Populate editor in Templates tab
  const handleEditTemplate = (tpl: BroadcastTemplateItem) => {
    setEditingTemplateId(tpl.id)
    setTName(tpl.name)
    setTCategory(tpl.category || 'general')
    if (tpl.id.startsWith('tpl-auto-')) {
      setTTrigger(tpl.id)
    }
    setTSubject(tpl.subject)
    setTBody(tpl.body)
    // Scroll to form smoothly
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  // Reset template editor
  const handleResetTemplateForm = () => {
    setEditingTemplateId(null)
    setTName('')
    setTCategory('general')
    setTTrigger('tpl-auto-account-approved')
    setTSubject('')
    setTBody('')
  }

  // Save / Update Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tName.trim()) {
      addToast({ type: 'error', message: 'Please enter a template name' })
      return
    }
    if (!tSubject.trim()) {
      addToast({ type: 'error', message: 'Please enter a subject line' })
      return
    }
    if (!tBody.trim() || tBody.trim().length < 5) {
      addToast({ type: 'error', message: 'Message content must be at least 5 characters' })
      return
    }

    setIsSavingTemplate(true)
    try {
      const token = await getFirebaseToken()
      const targetId = editingTemplateId || (tCategory === 'automated' ? tTrigger : undefined)
      const url = targetId
        ? `/api/admin/broadcast/templates/${targetId}`
        : '/api/admin/broadcast/templates'
      const method = targetId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: targetId,
          name: tName.trim(),
          subject: tSubject.trim(),
          body: tBody.trim(),
          category: tCategory,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          message: editingTemplateId ? 'Template updated successfully' : 'Template created successfully',
        })
        handleResetTemplateForm()
        await fetchTemplates()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to save template' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error saving template' })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  // Delete Template
  const handleDeleteTemplate = async (id: string, name: string) => {
    const isAuto = id.startsWith('tpl-auto-')
    const confirmMsg = isAuto
      ? `Notice: "${name}" is an automated lifecycle template. If deleted, the system will fall back to its built-in default copy. Are you sure you want to delete it?`
      : `Are you sure you want to delete template "${name}"?`
    if (!confirm(confirmMsg)) return

    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/admin/broadcast/templates/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: 'Template deleted' })
        if (selectedTemplateId === id) setSelectedTemplateId('')
        if (editingTemplateId === id) handleResetTemplateForm()
        await fetchTemplates()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to delete template' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error deleting template' })
    }
  }

  // Send Broadcast Blast
  const handleSendBroadcast = async () => {
    if (!subject.trim()) {
      addToast({ type: 'error', message: 'Please enter a broadcast subject' })
      return
    }
    if (!message.trim() || message.length < 10) {
      addToast({ type: 'error', message: 'Message content must be at least 10 characters' })
      return
    }

    const recipientCount =
      audience === 'ALL'
        ? data?.stats.totalActive || 0
        : audience === 'PAID'
        ? data?.stats.paidSubscribers || 0
        : data?.stats.freeStarters || 0

    if (
      !confirm(
        `🚨 WARNING: You are about to blast this email announcement to ${recipientCount} member(s).\n\nSubject: "${subject}"\nAudience: ${audience}\n\nProceed?`,
      )
    ) {
      return
    }

    setIsSending(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ audience, subject, message }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: json.message })
        setSubject('')
        setMessage('')
        setSelectedTemplateId('')
        fetchData()
      } else {
        addToast({ type: 'error', message: json.message || 'Broadcast failed' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error sending broadcast' })
    } finally {
      setIsSending(false)
    }
  }

  // Send Single Test Preview
  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      addToast({ type: 'error', message: 'Please enter a valid destination email address for testing' })
      return
    }

    setIsSendingTest(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/broadcast/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          flowType: 'custom',
          toEmail: testEmail.trim(),
          testEmail: testEmail.trim(),
          subject: subject.trim() || 'Test Preview Subject',
          message: message.trim() || 'This is a test preview of your broadcast content.',
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          message: `Test email dispatched to ${testEmail}!`,
        })
        fetchData()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to dispatch test' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error dispatching test email' })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Computed Filtered Templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        templateCategoryFilter === 'all' || tpl.category.toLowerCase() === templateCategoryFilter.toLowerCase()
      const q = debouncedTemplateSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.subject.toLowerCase().includes(q) ||
        tpl.body.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [templates, debouncedTemplateSearch, templateCategoryFilter])

  // Computed Delivery Logs
  const filteredLogs = useMemo(() => {
    return (data?.recentLogs || []).filter((log) => {
      const matchesStatus = logStatusFilter === 'ALL' || log.status === logStatusFilter
      const q = debouncedLogSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        log.to.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q) ||
        log.type.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [data?.recentLogs, logStatusFilter, debouncedLogSearch])

  // Word & Character count
  const charCount = message.length
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0

  // Live Email Preview formatting
  const isRefillPreview = useMemo(() => {
    return /refill|credit|top-up|topup|bonus/i.test(`${subject} ${message}`)
  }, [subject, message])

  const previewCtaText = isRefillPreview ? 'Claim Refill Credits' : 'Open Lead Hunter Dashboard'

  const formattedPreviewMessage = useMemo(() => {
    if (!message.trim()) return ''
    return message
      .replace(/\{\{\s*name\s*\}\}/gi, 'there')
      .replace(/\{\{\s*appUrl\s*\}\}/gi, 'https://leadhunterclub.com')
      .replace(/\{\{\s*refillUrl\s*\}\}/gi, 'https://leadhunterclub.com/refill')
      .replace(/\{\{\s*dashboardUrl\s*\}\}/gi, 'https://leadhunterclub.com/dashboard')
      .replace(/\{\{\s*pricingUrl\s*\}\}/gi, 'https://leadhunterclub.com/pricing')
  }, [message])

  if (loading) {
    return <CustomLoader fullscreen />
  }

  const audienceCount =
    audience === 'ALL'
      ? data?.stats.totalActive || 0
      : audience === 'PAID'
      ? data?.stats.paidSubscribers || 0
      : data?.stats.freeStarters || 0

  // Calculate delivery stats
  const totalLogs = data?.recentLogs.length || 0
  const sentLogs = data?.recentLogs.filter((l) => l.status === 'SENT').length || 0
  const successRate = totalLogs > 0 ? Math.round((sentLogs / totalLogs) * 100) : 100

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <MegaphoneIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Communications &amp; Broadcast Hub
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-primary/15 text-primary border border-primary/30 uppercase tracking-wide">
                Live Mailer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
              Custom SMTP mail engine, targeted member announcement blasts, and reusable email templates.
            </p>
          </div>
        </div>

        {/* Diagnostics & Provider Health Card */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <div
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-sm transition-all ${
              data?.smtpStatus.working
                ? 'bg-secondary/10 border-secondary/30 text-secondary'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  data?.smtpStatus.working ? 'bg-secondary' : 'bg-red-500'
                }`}
              />
              {data?.smtpStatus.working && (
                <span className="absolute w-2.5 h-2.5 rounded-full bg-secondary animate-ping opacity-75" />
              )}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {data?.smtpStatus.provider === 'smtp'
                    ? 'Custom SMTP Mailer'
                    : data?.smtpStatus.provider === 'resend'
                    ? 'Resend Cloud API'
                    : 'Mailer Not Configured'}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                    data?.smtpStatus.working ? 'bg-secondary/20 text-secondary' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {data?.smtpStatus.working ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary max-w-[280px] line-clamp-2" title={data?.smtpStatus.message}>
                {data?.smtpStatus.message}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefreshDiagnostics}
            disabled={isRefreshingDiagnostics}
            title="Refresh mailer status"
            className="p-2.5 rounded-2xl bg-surface/50 border border-white/[0.08] text-text-secondary hover:text-white hover:bg-surface-elevated transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshingDiagnostics ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reachable Audience */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Reachable Audience</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <EnvelopeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {data?.stats.totalActive || 0}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>100% active verified accounts</span>
          </div>
        </div>

        {/* Paid Subscribers */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Paid Subscribers</span>
            <div className="p-2 rounded-xl bg-secondary/15 text-secondary">
              <SparklesIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-secondary tabular-nums tracking-tight">
            {data?.stats.paidSubscribers || 0}
          </div>
          <p className="text-xs text-text-secondary">Freelancer Pro &amp; Agency tier</p>
        </div>

        {/* Free Starters */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Free Starters</span>
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-primary tabular-nums tracking-tight">
            {data?.stats.freeStarters || 0}
          </div>
          <p className="text-xs text-text-secondary">Upgrade targets with 50 credits/mo</p>
        </div>

        {/* Delivery Reliability */}
        <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Delivery Reliability</span>
            <div className="p-2 rounded-xl bg-tertiary/15 text-tertiary">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {successRate}%
          </div>
          <p className="text-xs text-text-secondary">
            {sentLogs} delivered in recent batches
          </p>
        </div>
      </div>

      {/* Email Lifecycle Automations Banner / Controls */}
      <div className="bg-surface/50 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
              <BoltIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Email Automations &amp; Lifecycle Triggers</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    data?.automationSettings?.auto_email_enabled
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {data?.automationSettings?.auto_email_enabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically dispatch lifecycle emails for onboarding, approvals, 3-day renewal notices, and low-credit nudges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Manual Run Button */}
            <button
              onClick={handleTriggerLifecycleNow}
              disabled={isTriggeringLifecycle || !data?.automationSettings?.auto_email_enabled}
              title="Manually trigger renewal checks and lifecycle reminders now"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isTriggeringLifecycle ? 'animate-spin' : ''}`} />
              <span>{isTriggeringLifecycle ? 'Running Cycle...' : 'Run Cycle Now'}</span>
            </button>

            {/* Master Switch Button (Same style as Auto Scrape / Auto Enrich in Tokens) */}
            <button
              onClick={() => handleToggleAutomation('auto_email_enabled')}
              disabled={automationSaving === 'auto_email_enabled'}
              className={`h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                data?.automationSettings?.auto_email_enabled
                  ? 'bg-green-500 text-black hover:bg-green-400 shadow-green-500/20'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-black shadow-red-500/10'
              } ${automationSaving === 'auto_email_enabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {automationSaving === 'auto_email_enabled' ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : data?.automationSettings?.auto_email_enabled ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Auto Email: ON</span>
                </>
              ) : (
                <>
                  <ShieldExclamationIcon className="w-4 h-4" />
                  <span>Auto Email: OFF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-toggles grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Renewal Reminders */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/40 border border-white/[0.04]">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-white block">Renewal Reminders</span>
              <span className="text-[10px] text-text-secondary block">Notice 3 days before monthly renewal</span>
            </div>
            <button
              onClick={() => handleToggleAutomation('renewal_reminders_enabled')}
              disabled={automationSaving === 'renewal_reminders_enabled' || !data?.automationSettings?.auto_email_enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                data?.automationSettings?.renewal_reminders_enabled && data?.automationSettings?.auto_email_enabled
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-text-secondary border border-white/10'
              }`}
            >
              {data?.automationSettings?.renewal_reminders_enabled && data?.automationSettings?.auto_email_enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 2. Low Credits Nudge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/40 border border-white/[0.04]">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-white block">Low Credits Alert</span>
              <span className="text-[10px] text-text-secondary block">Nudge when balance drops &lt; 5 credits</span>
            </div>
            <button
              onClick={() => handleToggleAutomation('low_credits_nudge_enabled')}
              disabled={automationSaving === 'low_credits_nudge_enabled' || !data?.automationSettings?.auto_email_enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                data?.automationSettings?.low_credits_nudge_enabled && data?.automationSettings?.auto_email_enabled
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-text-secondary border border-white/10'
              }`}
            >
              {data?.automationSettings?.low_credits_nudge_enabled && data?.automationSettings?.auto_email_enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 3. Onboarding & Approval */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated/40 border border-white/[0.04]">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-white block">User Approval / Welcome</span>
              <span className="text-[10px] text-text-secondary block">Welcome email upon admin approval</span>
            </div>
            <button
              onClick={() => handleToggleAutomation('onboarding_emails_enabled')}
              disabled={automationSaving === 'onboarding_emails_enabled' || !data?.automationSettings?.auto_email_enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                data?.automationSettings?.onboarding_emails_enabled && data?.automationSettings?.auto_email_enabled
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-text-secondary border border-white/10'
              }`}
            >
              {data?.automationSettings?.onboarding_emails_enabled && data?.automationSettings?.auto_email_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Community Lead Drop Automation Banner */}
      <div className="bg-gradient-to-br from-emerald-950/20 via-surface/60 to-surface/40 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">WhatsApp Community Lead Drops</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    waData?.status === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : waData?.status === 'waiting_for_qr'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : waData?.status === 'connecting'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-zinc-700/40 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {waData?.status === 'connected'
                    ? 'Connected & Active'
                    : waData?.status === 'waiting_for_qr'
                    ? 'Action: Scan QR'
                    : waData?.status === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
                </span>
                {waData?.botNumber && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-900/30 text-emerald-300 border border-emerald-700/40">
                    +{waData.botNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically posts real-time qualified lead drop alerts into your WhatsApp community group so members never miss a lead.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* Scan QR Modal Trigger */}
            <button
              onClick={() => {
                setShowQrModal(true)
                fetchWhatsAppStatus(true)
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <QrCodeIcon className="w-3.5 h-3.5" />
              <span>{waData?.status === 'connected' ? 'View Device QR' : 'Scan QR Code'}</span>
            </button>

            {/* Test Drop Alert Button */}
            <button
              onClick={handleSendWaTest}
              disabled={isSendingWaTest || waData?.status !== 'connected'}
              title={
                waData?.status !== 'connected'
                  ? 'Connect WhatsApp bot first'
                  : 'Dispatch a sample lead drop announcement to community group'
              }
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <PaperAirplaneIcon className={`w-3.5 h-3.5 ${isSendingWaTest ? 'animate-pulse' : ''}`} />
              <span>{isSendingWaTest ? 'Sending Alert...' : 'Send Test Alert'}</span>
            </button>

            {/* Reconnect Button */}
            <button
              onClick={handleReconnectWa}
              disabled={isReconnectingWa}
              title="Restart WhatsApp socket & generate fresh QR code"
              className="p-2 rounded-xl text-text-secondary hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isReconnectingWa ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Group Binding Status & Detected Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Configured Group Banner */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-white/[0.04] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                <span>Target Community WhatsApp Group</span>
                {waData?.configuredGroupId ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <CheckCircleIcon className="w-3 h-3" /> Configured
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-bold">Not Set in .env</span>
                )}
              </div>
              <p className="text-[11px] font-mono text-text-secondary truncate">
                {waData?.configuredGroupId || 'WHATSAPP_GROUP_ID is empty (set in backend .env)'}
              </p>
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              Leads qualified by the scraping engine are automatically batched and announced to this WhatsApp group.
            </p>
          </div>

          {/* Bot-Joined Groups */}
          <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-white/[0.04] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
              <span>Detected WhatsApp Groups</span>
              <span className="text-[10px] text-text-secondary">
                {waData?.groups?.length || 0} group(s) found
              </span>
            </div>
            {waData?.groups && waData.groups.length > 0 ? (
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {waData.groups.map((grp) => (
                  <div
                    key={grp.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-black/30 border border-white/[0.05] text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-white block truncate">{grp.subject}</span>
                      <span className="font-mono text-[9px] text-text-secondary block truncate">{grp.id}</span>
                    </div>
                    <button
                      onClick={() => handleCopyJid(grp.id)}
                      title="Copy this group's JID to paste into WHATSAPP_GROUP_ID"
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white shrink-0 flex items-center gap-1 font-mono text-[10px] cursor-pointer"
                    >
                      {copiedJid === grp.id ? (
                        <>
                          <ClipboardDocumentCheckIcon className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-3 h-3" />
                          <span>Copy JID</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary mt-1">
                {waData?.status === 'connected'
                  ? 'Bot is not added to any groups yet. Add the bot number to your community group and make it an admin.'
                  : 'Link WhatsApp via QR code above to view groups.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'composer'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <PaperAirplaneIcon className="w-3.5 h-3.5" />
          <span>Broadcast Composer</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === 'composer' ? 'bg-black/20 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {audienceCount} Targets
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <BookmarkIcon className="w-3.5 h-3.5" />
          <span>Email Templates</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === 'templates' ? 'bg-black/20 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {templates.length} Saved
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <EnvelopeIcon className="w-3.5 h-3.5" />
          <span>Delivery Logs</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === 'logs' ? 'bg-black/20 text-black' : 'bg-white/10 text-white'
            }`}
          >
            {totalLogs}
          </span>
        </button>
      </div>

      {/* Tab 1: Broadcast Composer */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Composer Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Compose Broadcast Announcement
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Send direct email announcements to chosen member tiers
                  </p>
                </div>

                {(subject || message || selectedTemplateId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubject('')
                      setMessage('')
                      setSelectedTemplateId('')
                    }}
                    className="text-xs text-text-secondary hover:text-error transition-colors cursor-pointer"
                  >
                    Clear Form
                  </button>
                )}
              </div>

              {/* 1. Target Audience Segment */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>1. Target Audience Segment</span>
                  <span className="text-[11px] text-primary font-mono font-semibold">
                    Selected: {audienceCount} recipients
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* All Members */}
                  <button
                    type="button"
                    onClick={() => setAudience('ALL')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      audience === 'ALL'
                        ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--rgb-primary),0.1)] ring-1 ring-primary/40'
                        : 'border-white/[0.08] bg-surface/40 hover:border-white/20 hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white">All Members</div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          audience === 'ALL' ? 'border-primary bg-primary' : 'border-white/20'
                        }`}
                      >
                        {audience === 'ALL' && <CheckIcon className="w-2.5 h-2.5 text-black stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-white mt-2 tabular-nums">
                      {data?.stats.totalActive || 0}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">Entire community</p>
                  </button>

                  {/* Paid Subscribers */}
                  <button
                    type="button"
                    onClick={() => setAudience('PAID')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      audience === 'PAID'
                        ? 'border-secondary bg-secondary/10 shadow-[0_0_20px_rgba(67,237,158,0.1)] ring-1 ring-secondary/40'
                        : 'border-white/[0.08] bg-surface/40 hover:border-white/20 hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-secondary">Paid Subscribers</div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          audience === 'PAID' ? 'border-secondary bg-secondary' : 'border-white/20'
                        }`}
                      >
                        {audience === 'PAID' && <CheckIcon className="w-2.5 h-2.5 text-black stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-secondary mt-2 tabular-nums">
                      {data?.stats.paidSubscribers || 0}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">Pro &amp; Agency members</p>
                  </button>

                  {/* Free Starters */}
                  <button
                    type="button"
                    onClick={() => setAudience('FREE')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      audience === 'FREE'
                        ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--rgb-primary),0.1)] ring-1 ring-primary/40'
                        : 'border-white/[0.08] bg-surface/40 hover:border-white/20 hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-primary">Free Starters</div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          audience === 'FREE' ? 'border-primary bg-primary' : 'border-white/20'
                        }`}
                      >
                        {audience === 'FREE' && <CheckIcon className="w-2.5 h-2.5 text-black stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold text-primary mt-2 tabular-nums">
                      {data?.stats.freeStarters || 0}
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5">50 credits monthly tier</p>
                  </button>
                </div>
              </div>

              {/* 2. Load Preset Template (Optional Quick Selector) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <BookmarkIcon className="w-3.5 h-3.5 text-primary" />
                    <span>2. Load Saved Template (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Manage Templates &rarr;
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border border-white/10 text-white text-xs focus:outline-none focus:border-primary transition-all cursor-pointer font-medium appearance-none"
                  >
                    <option value="">Select a saved template to autofill subject &amp; body...</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.category.toUpperCase()}] {tpl.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-text-secondary">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 3. Subject Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>3. Email Subject Line</span>
                  <span className="text-[11px] text-text-secondary font-mono">
                    {subject.length} chars
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 🚀 Fresh High-Ticket Client Leads Just Dropped"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-text-secondary/50"
                />
              </div>

              {/* 4. Message Body (Increased Size & Cleaned Up) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    4. Message Body
                  </label>
                  <div className="text-[11px] text-text-secondary font-mono">
                    {wordCount} words &bull; {charCount} chars
                  </div>
                </div>

                {/* Variable Quick-Insert Chips */}
                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mr-1">
                    Insert:
                  </span>
                  {[
                    { token: '{{name}}', label: 'Name' },
                    { token: '{{appUrl}}/refill', label: 'Refill Page' },
                    { token: '{{appUrl}}', label: 'Base URL' },
                    { token: '{{dashboardUrl}}', label: 'Dashboard' },
                  ].map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() =>
                        setMessage((prev) =>
                          prev
                            ? prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + v.token
                            : v.token,
                        )
                      }
                      className="px-2 py-0.5 rounded-lg bg-surface-elevated hover:bg-primary/20 hover:text-primary text-text-secondary border border-white/10 text-[10px] font-mono transition-colors cursor-pointer"
                      title={`Click to insert ${v.token}`}
                    >
                      {v.token} <span className="opacity-50 text-[9px]">({v.label})</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={14}
                  placeholder="Write your email announcement here. Line breaks and paragraphs are automatically formatted into clean, responsive email blocks..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-white/10 text-white text-sm leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-y placeholder:text-text-secondary/50 font-normal min-h-[300px]"
                />
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-text-secondary">
                  Ready to dispatch to <strong className="text-white">{audienceCount} members</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isSending || audienceCount === 0 || !subject.trim() || !message.trim()}
                  className="px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>{isSending ? 'Blasting...' : `Dispatch Broadcast (${audienceCount} Recipients)`}</span>
                </button>
              </div>
            </div>

            {/* Test Send Card */}
            <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <EnvelopeIcon className="w-4 h-4 text-primary" />
                  <span>Send Test Preview:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email to test draft..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={isSendingTest || !testEmail}
                    className="px-4 py-2.5 rounded-xl bg-surface hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isSendingTest ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>

              {/* Real-time SMTP Status Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                <div className="flex items-center gap-2 max-w-[85%]">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      data?.smtpStatus.working ? 'bg-secondary' : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      data?.smtpStatus.working ? 'text-secondary font-medium' : 'text-red-400 font-medium'
                    }`}
                    title={data?.smtpStatus.message}
                  >
                    {data?.smtpStatus.working
                      ? `SMTP Ready: ${data?.smtpStatus.message}`
                      : `SMTP Not Ready: ${data?.smtpStatus.message || 'Credentials missing in Vercel'}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshDiagnostics}
                  disabled={isRefreshingDiagnostics}
                  className="text-text-secondary hover:text-white underline text-[10px] cursor-pointer shrink-0"
                >
                  {isRefreshingDiagnostics ? 'Checking...' : 'Re-verify'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Email Preview */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-8">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <EnvelopeIcon className="w-4 h-4 text-primary" />
                <span>Live Email Preview</span>
              </div>

              {/* Viewport switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-elevated border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-primary text-black font-bold shadow-xs'
                      : 'text-text-secondary hover:text-white'
                  }`}
                  title="Desktop View"
                >
                  <ComputerDesktopIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-primary text-black font-bold shadow-xs'
                      : 'text-text-secondary hover:text-white'
                  }`}
                  title="Smartphone View"
                >
                  <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Client Shell */}
            <div
              className={`transition-all duration-300 ${
                previewDevice === 'mobile' ? 'max-w-[360px] mx-auto' : 'w-full'
              }`}
            >
              <div className="rounded-3xl border border-white/10 bg-surface-container-lowest shadow-2xl overflow-hidden font-sans">
                {/* Simulated Window Top Bar */}
                <div className="px-4 py-3 bg-surface-container-low border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  </div>
                  <span className="text-[10px] text-text-secondary font-mono">
                    {previewDevice === 'mobile' ? 'iPhone Viewport' : 'Email Client Desktop'}
                  </span>
                  <span className="w-4" />
                </div>

                {/* Email Header Info */}
                <div className="p-4 bg-surface-container-low border-b border-white/5 space-y-1.5 text-xs text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">From:</span>
                    <span className="font-semibold text-white">
                      Lead Hunter Club &lt;noreply@leadhunterclub.com&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">To:</span>
                    <span className="text-text-secondary">
                      Recipient &lt;member@domain.com&gt;
                    </span>
                  </div>
                  <div className="pt-1 text-sm font-bold text-white border-t border-white/5 mt-2 truncate">
                    {subject.trim() ? subject : 'Subject: Platform Announcement'}
                  </div>
                </div>

                {/* Email Interior Canvas */}
                <div className="p-5 sm:p-6 bg-surface-container-lowest space-y-5 text-left">
                  {/* Branded Logo Bar */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-primary text-black flex items-center justify-center font-extrabold text-xs shadow-md">
                        LH
                      </div>
                      <span className="text-sm font-extrabold text-white tracking-tight">
                        Lead Hunter Club
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">
                      Announcement
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 rounded-2xl bg-surface-container border border-white/5 space-y-4">
                    <div className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line break-words">
                      {formattedPreviewMessage ? (
                        formattedPreviewMessage.split(/(https?:\/\/[^\s<]+)/g).map((part, i) =>
                          part.startsWith('http') ? (
                            <span key={i} className="text-primary underline font-medium">
                              {part}
                            </span>
                          ) : (
                            part
                          ),
                        )
                      ) : (
                        <span className="text-text-secondary/50 italic">
                          Type your announcement in the composer. Your formatted text, links, and line breaks
                          will render here in real time...
                        </span>
                      )}
                    </div>

                    {/* Action CTA Button */}
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black text-xs font-bold shadow-[0_2px_12px_rgba(var(--rgb-primary),0.3)] cursor-default">
                        <span>{previewCtaText}</span>
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-[11px] text-text-secondary/60 text-center space-y-1 pt-2 border-t border-white/5">
                    <p>Lead Hunter Club &bull; High-intent client discovery &amp; closing engine</p>
                    <p className="text-[10px]">
                      You are receiving this notification because you are a registered member.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Email Templates Management Studio */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Create or Edit Template Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/15 text-primary">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {editingTemplateId ? 'Edit Email Template' : 'Create New Template'}
                    </h3>
                    <p className="text-[11px] text-text-secondary">
                      {editingTemplateId
                        ? 'Update this template to reflect new changes'
                        : 'Save reusable templates for future broadcasts'}
                    </p>
                  </div>
                </div>

                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={handleResetTemplateForm}
                    className="text-xs text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                {/* Template Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Template Name / Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly Leads Alert, Feature Drop"
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Category Group</label>
                  <select
                    value={tCategory}
                    onChange={(e) => setTCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="general">General Broadcast</option>
                    <option value="automated">⚡ Automated Lifecycle</option>
                    <option value="leads">Leads Drop Alert</option>
                    <option value="update">Product Update</option>
                    <option value="promo">Promo &amp; Refill Special</option>
                    <option value="announcement">Announcement &amp; Maintenance</option>
                  </select>
                </div>

                {/* Conditional Trigger Event Field for Automated Lifecycle */}
                {tCategory === 'automated' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary">Trigger Event</label>
                    <select
                      value={tTrigger}
                      onChange={(e) => setTTrigger(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-primary/30 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {AUTOMATED_TRIGGER_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g., Fresh High-Ticket Client Leads Just Dropped"
                    value={tSubject}
                    onChange={(e) => setTSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Body Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-secondary">Message Content Body</label>
                    {tCategory === 'automated' && (
                      <span className="text-[10px] text-amber-400 font-medium">Click variable to insert</span>
                    )}
                  </div>
                  <textarea
                    rows={8}
                    placeholder="Write your template message body here..."
                    value={tBody}
                    onChange={(e) => setTBody(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white leading-relaxed focus:outline-none focus:border-primary resize-y"
                  />

                  {/* Automated Dynamic Variable Tokens */}
                  {tCategory === 'automated' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>Dynamic System Variables</span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal">
                        Auto-replaced when system triggers the email:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          '{{name}}',
                          '{{plan}}',
                          '{{credits}}',
                          '{{daysRemaining}}',
                          '{{renewalDate}}',
                          '{{ticketSubject}}',
                          '{{replyBody}}',
                          '{{verificationUrl}}',
                          '{{appUrl}}',
                        ].map((tok) => (
                          <button
                            key={tok}
                            type="button"
                            onClick={() => {
                              setTBody((prev) =>
                                prev
                                  ? prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + tok
                                  : tok,
                              )
                            }}
                            className="px-2 py-0.5 rounded bg-black/50 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono transition-colors cursor-pointer"
                            title={`Click to insert ${tok}`}
                          >
                            {tok}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={handleResetTemplateForm}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingTemplate}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-black text-xs font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <BookmarkIcon className="w-3.5 h-3.5" />
                    <span>
                      {isSavingTemplate
                        ? 'Saving...'
                        : editingTemplateId
                        ? 'Update Template'
                        : 'Save New Template'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Template Library List */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search and Category Filter Bar */}
            <div className="p-4 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search templates by title, subject, or content..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      templateCategoryFilter === cat.id
                        ? 'bg-primary text-black font-bold'
                        : 'bg-surface hover:bg-white/10 text-text-secondary hover:text-white border border-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Cards List */}
            <div className="space-y-3">
              {filteredTemplates.length === 0 ? (
                <div className="p-12 rounded-2xl bg-surface/30 border border-white/[0.06] text-center space-y-2">
                  <DocumentTextIcon className="w-10 h-10 text-text-secondary/40 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Templates Found</h4>
                  <p className="text-xs text-text-secondary">
                    {templates.length === 0
                      ? 'Use the form on the left to create your first email template.'
                      : 'No templates match your search or filter criteria.'}
                  </p>
                </div>
              ) : (
                filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-surface/40 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{tpl.name}</h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            tpl.category === 'automated'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : tpl.category === 'leads'
                              ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                              : tpl.category === 'update'
                              ? 'bg-secondary/15 text-secondary border-secondary/30'
                              : tpl.category === 'promo'
                              ? 'bg-primary/15 text-primary border-primary/30'
                              : 'bg-white/10 text-white border-white/20'
                          }`}
                        >
                          {tpl.category === 'automated' ? '⚡ Automated Lifecycle' : tpl.category}
                        </span>
                        {tpl.category === 'automated' && (
                          <span className="text-[10px] text-text-secondary/70 font-mono">
                            Auto-sent by system
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary font-medium">
                        <strong className="text-white">Subject:</strong> {tpl.subject}
                      </p>

                      <p className="text-xs text-text-secondary/70 line-clamp-3 leading-relaxed whitespace-pre-line">
                        {tpl.body}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplateToComposer(tpl)}
                        className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                        title="Load this template directly into Broadcast Composer"
                      >
                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        <span>Use in Composer</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditTemplate(tpl)}
                        className="p-2 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-all cursor-pointer"
                        title="Edit Template"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        className="p-2 rounded-xl hover:bg-error/15 text-text-secondary hover:text-error border border-white/10 transition-all cursor-pointer"
                        title="Delete Template"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Delivery Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter logs by recipient email, subject, or type..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'SENT', 'FAILED', 'SKIPPED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLogStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    logStatusFilter === st
                      ? 'bg-primary text-black font-bold'
                      : 'bg-surface hover:bg-white/10 text-text-secondary hover:text-white border border-white/10'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated/70 border-b border-white/[0.08] text-text-secondary uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Recipient</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Subject</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-text-primary">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-text-secondary">
                        No delivery logs recorded matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 font-mono text-white text-xs">{log.to}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] uppercase font-mono">
                            {log.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[280px] truncate text-text-secondary font-medium">
                          {log.subject}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'SENT'
                                ? 'bg-secondary/15 text-secondary border border-secondary/30'
                                : log.status === 'FAILED'
                                ? 'bg-error/15 text-error border border-error/30'
                                : 'bg-primary/15 text-primary border border-primary/30'
                            }`}
                          >
                            {log.status === 'SENT' ? (
                              <CheckCircleIcon className="w-3 h-3" />
                            ) : (
                              <XCircleIcon className="w-3 h-3" />
                            )}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-text-secondary text-[11px]">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp QR Code Pairing Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>

              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Link WhatsApp Community Bot</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Connect your bot number to start auto-posting lead drops into your community group.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center min-h-[260px] p-4 rounded-2xl bg-black/40 border border-white/[0.08]">
                {waData?.status === 'connected' ? (
                  <div className="py-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold text-white">WhatsApp Bot Connected!</p>
                      <p className="text-xs text-emerald-400 font-mono">
                        +{waData.botNumber || 'Active'}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        The bot session is saved. You can now add the bot to your community group.
                      </p>
                    </div>
                  </div>
                ) : waData?.qrDataUrl ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-2xl inline-block shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={waData.qrDataUrl}
                        alt="WhatsApp QR Code"
                        className="w-56 h-56 object-contain"
                      />
                    </div>
                    <p className="text-[11px] text-text-secondary animate-pulse">
                      Waiting for scan... Refreshing automatically
                    </p>
                  </div>
                ) : (
                  <div className="py-10 space-y-2 text-text-secondary">
                    <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Generating QR pairing code...</p>
                  </div>
                )}
              </div>

              {/* Step by step instructions */}
              <div className="text-left bg-surface-elevated/40 border border-white/[0.04] rounded-xl p-3.5 text-xs space-y-2">
                <p className="font-semibold text-white text-[11px] uppercase tracking-wider">How to link:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-text-secondary">
                  <li>Open WhatsApp on the bot&apos;s phone</li>
                  <li>Tap <strong className="text-white">Settings</strong> or <strong className="text-white">⋮ menu</strong> &gt; <strong className="text-white">Linked Devices</strong></li>
                  <li>Tap <strong className="text-white">Link a Device</strong> and point your camera at the QR code above</li>
                  <li>Add this bot number to your WhatsApp Community Group &amp; make it an Admin</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => fetchWhatsAppStatus()}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  <span>Refresh Code</span>
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-black text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
