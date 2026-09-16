'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MegaphoneIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ServerIcon,
  ShieldCheckIcon,
  BookmarkIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  BoltIcon,
  SignalIcon,
} from '@heroicons/react/24/solid'
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

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
  recentLogs: EmailLogItem[]
}

const AUTOMATED_FLOWS = [
  {
    id: 'application_received',
    title: 'Application Received',
    badge: 'Onboarding',
    accent: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    trigger: 'Fired immediately upon onboarding submission',
    timing: 'Instant (0s delay)',
    rateLimit: 'Once per registration attempt',
    description:
      'Informs candidate members that their profile, service offerings, and portfolio links were safely received and queued for manual admin review.',
    templateName: 'renderApplicationReceived',
  },
  {
    id: 'approved',
    title: 'Account Approved & Credits Unlocked',
    badge: 'Activation',
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    trigger: 'Fired when admin approves an applicant from /admin/review',
    timing: 'Instant upon review click',
    rateLimit: 'Once per approved status flip',
    description:
      'Congratulates the member on joining Lead Hunter Club, confirms their allocated tier, and notifies them of their starter credits balance ready to spend.',
    templateName: 'renderApproved',
  },
  {
    id: 'low_credits',
    title: 'Low Credits Nudge (≤ 2 Credits)',
    badge: 'Retention',
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    trigger: 'Fired when balance hits ≤ 2 credits after a lead reveal',
    timing: 'Asynchronous post-reveal background task',
    rateLimit: 'Strict anti-spam debounce: Max 1 email per 48 hours',
    description:
      'Warns members that their credit pool is running low to prevent pausing their outreach pipeline, with 1-click CTA links to refill or upgrade.',
    templateName: 'renderLowCreditsNudge',
  },
  {
    id: 'renewal_reminder',
    title: '3-Day Renewal Notice',
    badge: 'Billing',
    accent: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    trigger: 'Scanned daily by background cron 3 days before renewal date',
    timing: 'Daily at 00:00 UTC automated cron',
    rateLimit: 'Throttled: Max 1 notice per 7 days',
    description:
      'Reminds paying subscribers of their upcoming monthly renewal and reassures them that unused credits roll over safely.',
    templateName: 'renderRenewalReminder',
  },
]

const DYNAMIC_VARIABLES = [
  { key: '{{name}}', label: 'Member Name', sample: 'Alex Morgan' },
  { key: '{{email}}', label: 'Email', sample: 'alex@company.com' },
  { key: '{{plan}}', label: 'Plan Name', sample: 'Freelancer Pro' },
  { key: '{{credits}}', label: 'Credits Balance', sample: '45' },
  { key: '{{appUrl}}', label: 'Platform URL', sample: 'https://leadhunterclub.com' },
]

export default function AdminBroadcastPage() {
  const { addToast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [data, setData] = useState<BroadcastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'composer' | 'flows' | 'logs'>('composer')

  // Composer Form
  const [audience, setAudience] = useState<'ALL' | 'PAID' | 'FREE'>('ALL')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false)

  // Preview Mode State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [useSampleData, setUseSampleData] = useState(true)

  // Template Management State
  const [templates, setTemplates] = useState<BroadcastTemplateItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')

  // Save / Edit Template Form
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('general')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

  // Delivery Logs Filter State
  const [logSearch, setLogSearch] = useState('')
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'SKIPPED'>('ALL')

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
  }, [fetchData, fetchTemplates])

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

  // Insert Variable into Message
  const handleInsertVariable = (varKey: string) => {
    if (!textareaRef.current) {
      setMessage((prev) => (prev ? `${prev} ${varKey}` : varKey))
      return
    }
    const el = textareaRef.current
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const nextVal = message.substring(0, start) + varKey + message.substring(end)
    setMessage(nextVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + varKey.length, start + varKey.length)
    }, 10)
    addToast({ type: 'info', message: `Inserted ${varKey}` })
  }

  // Insert Formatting Helpers
  const handleInsertFormat = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) {
      setMessage((prev) => `${prev}\n${prefix}`)
      return
    }
    const el = textareaRef.current
    const start = el.selectionStart || 0
    const end = el.selectionEnd || 0
    const selected = message.substring(start, end)
    const replacement = selected
      ? `${prefix}${selected}${suffix}`
      : `${prefix}text${suffix}`
    const nextVal = message.substring(0, start) + replacement + message.substring(end)
    setMessage(nextVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length)
    }, 10)
  }

  // Select Template
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId)
    if (!tplId) return
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      setSubject(tpl.subject)
      setMessage(tpl.body)
      addToast({ type: 'info', message: `Loaded "${tpl.name}"` })
    }
  }

  // Open Save Template Modal
  const handleOpenSaveModal = () => {
    setEditingTemplateId(null)
    setTemplateName('')
    setTemplateCategory('general')
    setTemplateSubject(subject)
    setTemplateBody(message)
    setIsSaveModalOpen(true)
  }

  // Open Edit Template Modal
  const handleOpenEditModal = (tpl: BroadcastTemplateItem) => {
    setEditingTemplateId(tpl.id)
    setTemplateName(tpl.name)
    setTemplateCategory(tpl.category || 'general')
    setTemplateSubject(tpl.subject)
    setTemplateBody(tpl.body)
    setIsSaveModalOpen(true)
  }

  // Save / Update Template API
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      addToast({ type: 'error', message: 'Please enter a template name' })
      return
    }
    if (!templateSubject.trim()) {
      addToast({ type: 'error', message: 'Please enter a subject line' })
      return
    }
    if (!templateBody.trim() || templateBody.trim().length < 5) {
      addToast({ type: 'error', message: 'Message content must be at least 5 characters' })
      return
    }

    setIsSavingTemplate(true)
    try {
      const token = await getFirebaseToken()
      const url = editingTemplateId
        ? `/api/admin/broadcast/templates/${editingTemplateId}`
        : '/api/admin/broadcast/templates'
      const method = editingTemplateId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: templateName.trim(),
          subject: templateSubject.trim(),
          body: templateBody.trim(),
          category: templateCategory,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: json.message || 'Template saved successfully' })
        setIsSaveModalOpen(false)
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
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return

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
        await fetchTemplates()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to delete template' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error deleting template' })
    }
  }

  // Load Template from Modal
  const handleApplyFromManage = (tpl: BroadcastTemplateItem) => {
    setSubject(tpl.subject)
    setMessage(tpl.body)
    setSelectedTemplateId(tpl.id)
    setIsManageModalOpen(false)
    addToast({ type: 'info', message: `Loaded template: "${tpl.name}"` })
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
  const handleSendTest = async (flowType: string = 'custom') => {
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
          toEmail: testEmail,
          flowType,
          subject: subject || undefined,
          message: message || undefined,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: json.message })
        fetchData()
      } else {
        addToast({ type: 'error', message: json.message || 'Test send failed' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error sending test email' })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Sample data parsed preview text
  const renderedSubject = useMemo(() => {
    if (!subject.trim()) return 'Subject: Platform Announcement'
    if (!useSampleData) return subject
    return subject
      .replace(/{{name}}/g, 'Alex Morgan')
      .replace(/{{email}}/g, 'alex@company.com')
      .replace(/{{plan}}/g, 'Freelancer Pro')
      .replace(/{{credits}}/g, '45')
  }, [subject, useSampleData])

  const renderedBody = useMemo(() => {
    if (!message.trim()) return ''
    if (!useSampleData) return message
    return message
      .replace(/{{name}}/g, 'Alex Morgan')
      .replace(/{{email}}/g, 'alex@company.com')
      .replace(/{{plan}}/g, 'Freelancer Pro')
      .replace(/{{credits}}/g, '45')
      .replace(/{{appUrl}}/g, 'https://leadhunterclub.com')
  }, [message, useSampleData])

  // Computed Logs
  const filteredLogs = useMemo(() => {
    return (data?.recentLogs || []).filter((log) => {
      const matchesStatus = logStatusFilter === 'ALL' || log.status === logStatusFilter
      const q = logSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        log.to.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q) ||
        log.type.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [data?.recentLogs, logStatusFilter, logSearch])

  // Filtered Templates in Modal
  const filteredTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return templates
    const q = templateSearchQuery.toLowerCase()
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    )
  }, [templates, templateSearchQuery])

  // Word and Char Count
  const charCount = message.length
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <MegaphoneIcon className="w-5 h-5 text-brand absolute inset-0 m-auto" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-text-primary">Loading Communications Hub</p>
          <p className="text-xs text-text-tertiary">Connecting to SMTP socket and email delivery services...</p>
        </div>
      </div>
    )
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative">
      {/* Background Ambient Glow */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-52 bg-gradient-to-b from-brand/10 via-brand/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border/40 pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-brand/30 via-brand/15 to-transparent border border-brand/40 text-brand shadow-lg shadow-brand/10 shrink-0">
            <MegaphoneIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Communications &amp; Broadcast Hub
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-brand/15 text-brand border border-brand/30 uppercase tracking-wide">
                Live Mailer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-tertiary mt-1 leading-relaxed">
              Custom SMTP mail engine, targeted member announcement blasts, and automated lifecycle email sequences.
            </p>
          </div>
        </div>

        {/* Diagnostics & Provider Health Card */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <div
            className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border backdrop-blur-md shadow-sm transition-all ${
              data?.smtpStatus.working
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  data?.smtpStatus.working ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {data?.smtpStatus.working && (
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </div>

            <div className="text-left leading-tight">
              <div className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                <ServerIcon className="w-3.5 h-3.5 text-text-secondary" />
                <span>
                  {data?.smtpStatus.provider === 'smtp'
                    ? 'Custom Domain SMTP'
                    : data?.smtpStatus.provider === 'resend'
                    ? 'Resend API Active'
                    : 'Development Mock Mailer'}
                </span>
              </div>
              <div className="text-[10px] text-text-tertiary font-mono">
                {data?.smtpStatus.working ? 'Socket Connected' : 'Check Credentials'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshDiagnostics}
              disabled={isRefreshingDiagnostics}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-all ml-1"
              title="Test &amp; Refresh SMTP Connection"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isRefreshingDiagnostics ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Members */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-brand/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Reachable Audience</span>
            <div className="p-2 rounded-xl bg-brand/10 text-brand group-hover:scale-110 transition-transform">
              <UserGroupIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-text-primary tabular-nums tracking-tight">
            {data?.stats.totalActive || 0}
          </div>
          <p className="text-[11px] text-text-tertiary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            100% active verified accounts
          </p>
        </div>

        {/* Paid Subscribers */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-emerald-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Paid Subscribers</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <SparklesIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tabular-nums tracking-tight">
            {data?.stats.paidSubscribers || 0}
          </div>
          <p className="text-[11px] text-text-tertiary">Freelancer Pro &amp; Agency tier members</p>
        </div>

        {/* Free Starters */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-amber-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Free Starters</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tabular-nums tracking-tight">
            {data?.stats.freeStarters || 0}
          </div>
          <p className="text-[11px] text-text-tertiary">Upgrade targets with monthly 50 credits</p>
        </div>

        {/* Delivery Reliability */}
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 hover:border-sky-500/40 backdrop-blur-sm space-y-1.5 transition-all group">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Delivery Reliability</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
              <SignalIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-400 tabular-nums tracking-tight">
            {successRate}%
          </div>
          <p className="text-[11px] text-text-tertiary">
            {sentLogs} delivered successfully in recent batches
          </p>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'composer'
              ? 'bg-brand text-white shadow-lg shadow-brand/25 scale-[1.02]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
          }`}
        >
          <PaperAirplaneIcon className="w-3.5 h-3.5" />
          <span>Broadcast Composer</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'composer' ? 'bg-white/20 text-white' : 'bg-surface border border-border text-text-tertiary'
            }`}
          >
            {audienceCount} Targets
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'flows'
              ? 'bg-brand text-white shadow-lg shadow-brand/25 scale-[1.02]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
          }`}
        >
          <BoltIcon className="w-3.5 h-3.5" />
          <span>Automated Lifecycle Sequences</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'flows' ? 'bg-white/20 text-white' : 'bg-surface border border-border text-text-tertiary'
            }`}
          >
            4 Active
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'logs'
              ? 'bg-brand text-white shadow-lg shadow-brand/25 scale-[1.02]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
          }`}
        >
          <EnvelopeIcon className="w-3.5 h-3.5" />
          <span>Live Delivery Logs</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-surface border border-border text-text-tertiary'
            }`}
          >
            {data?.recentLogs.length || 0}
          </span>
        </button>
      </div>

      {/* Tab 1: Broadcast Blast Composer */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Tools */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl shadow-xl space-y-6">
              {/* Header Title */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <span>Compose Broadcast Announcement</span>
                  </h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Broadcast direct email announcements to chosen member tiers
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject('')
                      setMessage('')
                      setSelectedTemplateId('')
                    }}
                    className="text-[11px] font-semibold text-text-tertiary hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-surface transition-all"
                  >
                    Clear Form
                  </button>
                </div>
              </div>

              {/* Audience Segmentation Cards */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>1. Target Audience Segment</span>
                  <span className="text-[11px] font-normal text-text-tertiary font-mono">
                    Selected: {audienceCount} recipients
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* All Members */}
                  <button
                    type="button"
                    onClick={() => setAudience('ALL')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      audience === 'ALL'
                        ? 'border-brand bg-brand/10 shadow-md shadow-brand/10 ring-1 ring-brand/40'
                        : 'border-border/60 bg-surface/40 hover:border-border hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-text-primary">All Members</div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          audience === 'ALL' ? 'border-brand bg-brand' : 'border-border'
                        }`}
                      >
                        {audience === 'ALL' && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-lg font-black text-text-primary mt-1 tabular-nums">
                      {data?.stats.totalActive || 0}
                    </div>
                    <p className="text-[10.5px] text-text-tertiary mt-0.5">Entire community</p>
                  </button>

                  {/* Paid Subscribers */}
                  <button
                    type="button"
                    onClick={() => setAudience('PAID')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      audience === 'PAID'
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                        : 'border-border/60 bg-surface/40 hover:border-border hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-emerald-400">Paid Subscribers</div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          audience === 'PAID' ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                        }`}
                      >
                        {audience === 'PAID' && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-lg font-black text-emerald-400 mt-1 tabular-nums">
                      {data?.stats.paidSubscribers || 0}
                    </div>
                    <p className="text-[10.5px] text-text-tertiary mt-0.5">Pro &amp; Agency members</p>
                  </button>

                  {/* Free Starters */}
                  <button
                    type="button"
                    onClick={() => setAudience('FREE')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      audience === 'FREE'
                        ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                        : 'border-border/60 bg-surface/40 hover:border-border hover:bg-surface/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-amber-400">Free Starters</div>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          audience === 'FREE' ? 'border-amber-500 bg-amber-500' : 'border-border'
                        }`}
                      >
                        {audience === 'FREE' && <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3]" />}
                      </div>
                    </div>
                    <div className="text-lg font-black text-amber-400 mt-1 tabular-nums">
                      {data?.stats.freeStarters || 0}
                    </div>
                    <p className="text-[10.5px] text-text-tertiary mt-0.5">50 credits monthly tier</p>
                  </button>
                </div>
              </div>

              {/* Template Quick Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-surface/80 via-surface/50 to-surface/80 border border-border/70 space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon className="w-4 h-4 text-brand" />
                    <span className="text-xs font-bold text-text-primary">Ready-to-Use Templates</span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-mono">
                      {templates.length} Saved
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenSaveModal}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-[11px] font-bold text-text-primary hover:border-brand/40 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Save the current Subject &amp; Message as a new reusable template"
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-brand" />
                      <span>Save as Template</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsManageModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-[11px] font-bold text-text-primary hover:border-brand/40 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <DocumentTextIcon className="w-3.5 h-3.5 text-brand" />
                      <span>Manage All</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border/80 text-text-primary text-xs focus:outline-none focus:border-brand transition-all cursor-pointer font-medium appearance-none"
                  >
                    <option value="">⚡ Click to load a preset template...</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.category.toUpperCase()}] {tpl.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-tertiary">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                  <span>2. Email Subject Line</span>
                  <span className="text-[11px] font-normal text-text-tertiary font-mono">
                    {subject.length} chars
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 🚀 Fresh High-Ticket Client Leads Just Dropped"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border/80 text-text-primary text-sm font-medium focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-text-tertiary"
                />
              </div>

              {/* Dynamic Variables & Formatting Toolbar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    3. Message Body
                  </label>
                  <div className="text-[11px] text-text-tertiary font-mono">
                    {wordCount} words &bull; {charCount} chars
                  </div>
                </div>

                {/* Variable Pills */}
                <div className="p-2.5 rounded-xl bg-surface/60 border border-border/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-text-tertiary uppercase tracking-wider mr-1">
                    Insert:
                  </span>
                  {DYNAMIC_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="px-2 py-1 rounded-lg bg-background hover:bg-brand/15 hover:text-brand hover:border-brand/40 border border-border/70 text-[11px] font-mono text-text-secondary transition-all flex items-center gap-1 shadow-xs"
                      title={`Insert ${v.label} (e.g. ${v.sample})`}
                    >
                      <span>{v.key}</span>
                      <span className="text-[9.5px] text-text-tertiary hidden sm:inline">({v.label})</span>
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={9}
                  placeholder="Write your announcement here. Paragraphs and line breaks are automatically formatted into responsive email blocks..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-background border border-border/80 text-text-primary text-sm font-sans focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-y leading-relaxed"
                />

                {/* Formatting Quick-Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-text-tertiary">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('**', '**')}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-text-secondary font-bold text-[11px]"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('*', '*')}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-text-secondary italic text-[11px]"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('\n• ')}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-text-secondary text-[11px]"
                      title="Bullet list item"
                    >
                      &bull; List
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('\n\n---\n\n')}
                      className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border/60 text-text-secondary text-[11px]"
                      title="Divider line"
                    >
                      &mdash; Line
                    </button>
                  </div>
                  <span className="text-[10.5px]">Emails delivered in safe 15-recipient chunks</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50">
                <div className="text-xs text-text-secondary">
                  Ready to dispatch to <strong className="text-text-primary">{audienceCount} members</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isSending || audienceCount === 0 || !subject.trim() || !message.trim()}
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-brand to-rose-600 hover:from-brand-hover hover:to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSending ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Dispatching Blast in Chunks...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>Dispatch Broadcast ({audienceCount} Recipients)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Send Box */}
            <div className="p-4 rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                <EnvelopeIcon className="w-4 h-4 text-brand" />
                <span className="font-semibold">Send Test Preview:</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                <input
                  type="email"
                  placeholder="Enter your email to test draft..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/70 text-xs text-text-primary focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => handleSendTest('custom')}
                  disabled={isSendingTest || !testEmail.includes('@')}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-xs font-bold text-text-primary transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isSendingTest ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Send Test</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Responsive Preview Client */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeIcon className="w-4 h-4 text-brand" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Live Email Preview
                </span>
              </div>

              {/* Viewport Switcher & Sample Data Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseSampleData((prev) => !prev)}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-all ${
                    useSampleData
                      ? 'bg-brand/10 border-brand/30 text-brand'
                      : 'bg-surface border-border text-text-tertiary'
                  }`}
                  title="Toggle between raw variable tags and sample simulated member data"
                >
                  {useSampleData ? 'Sample Data ON' : 'Raw Tags'}
                </button>

                <div className="p-0.5 rounded-lg bg-surface border border-border/70 flex items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                    title="Desktop Preview"
                  >
                    <ComputerDesktopIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-text-tertiary hover:text-text-primary'
                    }`}
                    title="Smartphone Preview"
                  >
                    <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Client Shell */}
            <div
              className={`transition-all duration-300 ${
                previewDevice === 'mobile' ? 'max-w-[360px] mx-auto' : 'w-full'
              }`}
            >
              <div className="rounded-3xl border border-white/10 bg-[#09090b] shadow-2xl overflow-hidden font-sans">
                {/* Simulated Window Top Bar */}
                <div className="px-4 py-3 bg-[#121214] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {previewDevice === 'mobile' ? 'iPhone 15 Viewport' : 'Email Client Desktop'}
                  </span>
                  <span className="w-4" />
                </div>

                {/* Email Header Info */}
                <div className="p-4 bg-[#141417] border-b border-white/5 space-y-1.5 text-xs text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">From:</span>
                    <span className="font-semibold text-zinc-300">
                      Lead Hunter Club &lt;noreply@leadhunterclub.com&gt;
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">To:</span>
                    <span className="text-zinc-400">
                      {useSampleData ? 'Alex Morgan <alex@company.com>' : '{{name}} <{{email}}>'}
                    </span>
                  </div>
                  <div className="pt-1 text-sm font-bold text-white border-t border-white/5 mt-2 truncate">
                    {renderedSubject}
                  </div>
                </div>

                {/* Email Interior Canvas */}
                <div className="p-5 sm:p-6 bg-[#09090b] space-y-5 text-left">
                  {/* Branded Logo Bar */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand to-rose-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                        LH
                      </div>
                      <span className="text-sm font-extrabold text-white tracking-tight">
                        Lead Hunter Club
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                      Announcement
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 rounded-2xl bg-[#131316] border border-white/5 space-y-4">
                    <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">
                      {renderedBody ? (
                        renderedBody
                      ) : (
                        <span className="text-zinc-600 italic">
                          Type your announcement in the composer. Your formatted text, links, and line breaks
                          will render here in real time...
                        </span>
                      )}
                    </div>

                    {/* Action CTA Button */}
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dc3b4c] text-white text-xs font-bold shadow-lg shadow-brand/20 cursor-default">
                        <span>Open Lead Hunter Dashboard</span>
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-[11px] text-zinc-600 text-center space-y-1 pt-2 border-t border-white/5">
                    <p>Lead Hunter Club &bull; High-intent client discovery &amp; closing engine</p>
                    <p className="text-[10px] text-zinc-700">
                      You are receiving this notification because you are a registered member.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Automated Lifecycle Sequences */}
      {activeTab === 'flows' && (
        <div className="space-y-6">
          {/* Quick Notice Banner */}
          <div className="p-5 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Automated Platform Triggers (4 Workflows)
                </h3>
                <p className="text-xs text-text-tertiary">
                  Fired automatically on key member milestones with built-in database anti-spam rate limiting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="Send all tests to this email..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-text-primary focus:outline-none focus:border-brand w-full md:w-64"
              />
            </div>
          </div>

          {/* 4 Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AUTOMATED_FLOWS.map((flow) => (
              <div
                key={flow.id}
                className="p-6 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl space-y-5 flex flex-col justify-between hover:border-brand/40 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider border bg-gradient-to-r ${flow.accent}`}
                    >
                      {flow.badge} Flow
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-text-primary group-hover:text-brand transition-colors">
                      {flow.title}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {flow.description}
                    </p>
                  </div>

                  {/* Flow Details & Rate Limit */}
                  <div className="p-3 rounded-xl bg-background/50 border border-border/60 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <ClockIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                      <strong className="text-text-secondary">Trigger:</strong> {flow.trigger}
                    </div>
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <strong className="text-text-secondary">Protection:</strong> {flow.rateLimit}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-text-tertiary font-mono truncate">
                    {flow.templateName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSendTest(flow.id)}
                    disabled={isSendingTest}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-primary flex items-center gap-2 shadow-sm transition-all hover:border-brand/40 shrink-0"
                  >
                    <PaperAirplaneIcon className="w-3.5 h-3.5 text-brand" />
                    <span>Send Test Sample</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Delivery Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl border border-border/70 bg-surface/50 backdrop-blur-xl shadow-md space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span>Live Dispatch Audit Trail</span>
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Real-time database records from db.emailLog for all delivered and skipped emails
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search recipient or subject..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="pl-9 pr-3.5 py-1.5 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand w-56"
                  />
                </div>

                {/* Status Filter Pills */}
                <div className="p-1 rounded-xl bg-background border border-border flex items-center gap-1">
                  {(['ALL', 'SENT', 'FAILED', 'SKIPPED'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setLogStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                        logStatusFilter === status
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={fetchData}
                  className="p-2 rounded-xl border border-border hover:bg-surface text-text-tertiary hover:text-text-primary transition-all"
                  title="Refresh Logs"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            {filteredLogs.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-border/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 border-b border-border/50 text-text-tertiary uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Category Flow</th>
                      <th className="py-3 px-4 text-right">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 bg-background/30">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4 text-text-tertiary font-mono whitespace-nowrap text-[11px]">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-text-primary whitespace-nowrap">
                          {log.to}
                        </td>
                        <td className="py-3 px-4 text-text-secondary max-w-xs truncate font-medium" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-border/60 text-[10px] font-mono font-bold text-text-tertiary uppercase">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold ${
                              log.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : log.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}
                          >
                            {log.status === 'SENT' && <CheckCircleIcon className="w-3.5 h-3.5" />}
                            {log.status === 'FAILED' && <XCircleIcon className="w-3.5 h-3.5" />}
                            {log.status === 'SKIPPED' && <ClockIcon className="w-3.5 h-3.5" />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-text-tertiary space-y-2">
                <EnvelopeIcon className="w-8 h-8 text-text-tertiary mx-auto opacity-40" />
                <p className="font-semibold text-text-secondary">No delivery logs found</p>
                <p>Try clearing your search query or send a test email to populate the audit table.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Save or Edit Template */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-surface border border-border shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-brand/15 text-brand">
                    <BookmarkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {editingTemplateId ? 'Edit Broadcast Template' : 'Save as New Reusable Template'}
                    </h3>
                    <p className="text-[11px] text-text-tertiary">
                      Reusable preset stored in PostgreSQL for all admins
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-1.5 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Template Name / Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly High-Intent Drops, Weekend Top-Up Promo"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Category Group</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="general">General Broadcast</option>
                    <option value="leads">Leads Drop Alert</option>
                    <option value="update">Platform &amp; Feature Update</option>
                    <option value="promo">Promo &amp; Refill Special</option>
                    <option value="announcement">Scheduled Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Subject Line</label>
                  <input
                    type="text"
                    placeholder="Email subject line..."
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary">Message Content Body</label>
                  <textarea
                    rows={6}
                    placeholder="Message body. Supports variables like {{name}} or {{appUrl}}..."
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand resize-y leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-md shadow-brand/20 disabled:opacity-50"
                >
                  {isSavingTemplate ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Manage Templates */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl rounded-3xl bg-surface border border-border shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-brand/15 text-brand">
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">
                      Manage Broadcast Templates ({templates.length})
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      Create, edit, or load ready-made email templates into the composer
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null)
                      setTemplateName('')
                      setTemplateCategory('general')
                      setTemplateSubject('')
                      setTemplateBody('')
                      setIsSaveModalOpen(true)
                    }}
                    className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand/20 transition-all"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>New Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(false)}
                    className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Template Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-text-tertiary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search templates by title, subject, or category..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                />
              </div>

              {/* Template Cards List */}
              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {filteredTemplates.length === 0 ? (
                  <div className="py-16 text-center text-xs text-text-tertiary space-y-2">
                    <DocumentTextIcon className="w-8 h-8 text-text-tertiary mx-auto opacity-40" />
                    <p className="font-semibold text-text-secondary">No templates found</p>
                    <p>Click &quot;New Template&quot; above to create your first announcement template.</p>
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-5 rounded-2xl border border-border/70 bg-background/60 hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-primary truncate">{tpl.name}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              tpl.category === 'leads'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                : tpl.category === 'update'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                                : tpl.category === 'promo'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : tpl.category === 'announcement'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                            }`}
                          >
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary font-medium truncate">
                          <strong className="text-text-tertiary">Subject:</strong> {tpl.subject}
                        </p>
                        <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
                          {tpl.body.replace(/\n+/g, ' ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApplyFromManage(tpl)}
                          className="px-3.5 py-2 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 text-xs font-bold transition-all shadow-xs"
                        >
                          Use in Composer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tpl)}
                          className="p-2 rounded-xl hover:bg-surface text-text-secondary hover:text-text-primary border border-border/60 transition-all"
                          title="Edit Template"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="p-2 rounded-xl hover:bg-rose-500/15 text-text-tertiary hover:text-rose-400 border border-border/60 transition-all"
                          title="Delete Template"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
