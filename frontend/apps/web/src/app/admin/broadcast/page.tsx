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
import { CustomLoader } from '@/components/ui/CustomLoader'

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
    accent: 'bg-tertiary/15 border-tertiary/30 text-tertiary',
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
    accent: 'bg-secondary/15 border-secondary/30 text-secondary',
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
    accent: 'bg-primary/20 border-primary/40 text-primary',
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
    accent: 'bg-white/10 border-white/20 text-white',
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
                Direct custom SMTP mail engine, targeted member announcement blasts, and automated lifecycle email sequences.
              </p>
            </div>
          </div>

          {/* Diagnostics & Provider Health Card */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-sm transition-all ${
                data?.smtpStatus.working
                  ? 'bg-secondary/10 border-secondary/30 text-secondary'
                  : 'bg-primary/10 border-primary/30 text-primary'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    data?.smtpStatus.working ? 'bg-secondary' : 'bg-primary'
                  }`}
                />
                {data?.smtpStatus.working && (
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-secondary animate-ping opacity-75" />
                )}
              </div>

              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ServerIcon className="w-3.5 h-3.5 text-text-secondary" />
                  <span>
                    {data?.smtpStatus.provider === 'smtp'
                      ? 'Custom Domain SMTP'
                      : data?.smtpStatus.provider === 'resend'
                      ? 'Resend API Active'
                      : 'Development Mock Mailer'}
                  </span>
                </div>
                <div className="text-[10px] text-text-secondary/70 font-mono">
                  {data?.smtpStatus.working ? 'Socket Connected' : 'Check Credentials'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleRefreshDiagnostics}
                disabled={isRefreshingDiagnostics}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white transition-all ml-1 cursor-pointer"
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
          <div className="p-5 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-1.5 transition-all">
            <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span>Reachable Audience</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <UserGroupIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              {data?.stats.totalActive || 0}
            </div>
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              100% active verified accounts
            </p>
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
                <SignalIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-tertiary tabular-nums tracking-tight">
              {successRate}%
            </div>
            <p className="text-xs text-text-secondary">
              {sentLogs} delivered in recent batches
            </p>
          </div>
        </div>

        {/* Modern Tab Bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('composer')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'composer'
                ? 'bg-primary text-black font-extrabold shadow-[0_4px_16px_rgba(var(--rgb-primary),0.25)]'
                : 'text-text-secondary hover:text-white hover:bg-surface'
            }`}
          >
            <PaperAirplaneIcon className="w-3.5 h-3.5" />
            <span>Broadcast Composer</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'composer' ? 'bg-black/20 text-black' : 'bg-surface-elevated border border-white/10 text-text-secondary'
              }`}
            >
              {audienceCount} Targets
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flows')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'flows'
                ? 'bg-primary text-black font-extrabold shadow-[0_4px_16px_rgba(var(--rgb-primary),0.25)]'
                : 'text-text-secondary hover:text-white hover:bg-surface'
            }`}
          >
            <BoltIcon className="w-3.5 h-3.5" />
            <span>Automated Lifecycle Sequences</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'flows' ? 'bg-black/20 text-black' : 'bg-surface-elevated border border-white/10 text-text-secondary'
              }`}
            >
              4 Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-primary text-black font-extrabold shadow-[0_4px_16px_rgba(var(--rgb-primary),0.25)]'
                : 'text-text-secondary hover:text-white hover:bg-surface'
            }`}
          >
            <EnvelopeIcon className="w-3.5 h-3.5" />
            <span>Live Delivery Logs</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'logs' ? 'bg-black/20 text-black' : 'bg-surface-elevated border border-white/10 text-text-secondary'
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
              <div className="p-6 md:p-7 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6">
                {/* Header Title */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">Compose Broadcast Announcement</h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Send direct email announcements to chosen member tiers
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
                      className="text-xs font-semibold text-text-secondary hover:text-white px-2.5 py-1 rounded-lg hover:bg-surface transition-all cursor-pointer"
                    >
                      Clear Form
                    </button>
                  </div>
                </div>

                {/* Audience Segmentation Cards */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                    <span>1. Target Audience Segment</span>
                    <span className="text-xs text-text-secondary font-normal font-mono">
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

                {/* Template Quick Bar */}
                <div className="p-4 rounded-2xl bg-surface-elevated/80 border border-white/10 space-y-3 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookmarkIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-white">Broadcast Templates</span>
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono font-bold">
                        {templates.length} Saved
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenSaveModal}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-primary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Save current Subject &amp; Message as a new reusable template"
                      >
                        <PlusIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Save Template</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsManageModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-primary hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <DocumentTextIcon className="w-3.5 h-3.5 text-primary" />
                        <span>Manage All</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-white text-xs focus:outline-none focus:border-primary transition-all cursor-pointer font-medium appearance-none"
                    >
                      <option value="">Choose a pre-built template or custom preset...</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          [{tpl.category.toUpperCase()}] {tpl.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Subject Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                    <span>2. Email Subject Line</span>
                    <span className="text-[11px] text-text-secondary font-normal font-mono">
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

                {/* Dynamic Variables & Formatting Toolbar */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      3. Message Body
                    </label>
                    <div className="text-[11px] text-text-secondary font-mono">
                      {wordCount} words &bull; {charCount} chars
                    </div>
                  </div>

                  {/* Variable Pills */}
                  <div className="p-2.5 rounded-xl bg-surface-elevated/70 border border-white/10 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mr-1">
                      Insert:
                    </span>
                    {DYNAMIC_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleInsertVariable(v.key)}
                        className="px-2 py-1 rounded-lg bg-surface hover:bg-primary/15 hover:text-primary hover:border-primary/30 border border-white/10 text-[11px] font-mono text-text-secondary transition-all flex items-center gap-1 cursor-pointer"
                        title={`Insert ${v.label} (e.g. ${v.sample})`}
                      >
                        <span>{v.key}</span>
                        <span className="text-[9.5px] text-text-secondary/60 hidden sm:inline">({v.label})</span>
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
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-lowest border border-white/10 text-white text-sm font-sans focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-y leading-relaxed placeholder:text-text-secondary/50"
                  />

                  {/* Formatting Quick-Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-xs text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('**', '**')}
                        className="px-2.5 py-0.5 rounded-lg bg-surface hover:bg-white/10 border border-white/10 text-white font-bold text-xs cursor-pointer"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('*', '*')}
                        className="px-2.5 py-0.5 rounded-lg bg-surface hover:bg-white/10 border border-white/10 text-white italic text-xs cursor-pointer"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('\n• ')}
                        className="px-2.5 py-0.5 rounded-lg bg-surface hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs cursor-pointer"
                        title="Bullet list item"
                      >
                        &bull; List
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertFormat('\n\n---\n\n')}
                        className="px-2.5 py-0.5 rounded-lg bg-surface hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white text-xs cursor-pointer"
                        title="Divider line"
                      >
                        &mdash; Line
                      </button>
                    </div>
                    <span className="text-[11px] text-text-secondary/70">Safe batch chunking (15/batch)</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.08]">
                  <div className="text-xs text-text-secondary">
                    Ready to dispatch to <strong className="text-white">{audienceCount} members</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={isSending || audienceCount === 0 || !subject.trim() || !message.trim()}
                    className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-black text-xs font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Dispatching Blast...</span>
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
              <div className="p-4 rounded-2xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                  <EnvelopeIcon className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-white">Send Test Preview:</span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                  <input
                    type="email"
                    placeholder="Enter your email to test draft..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendTest('custom')}
                    disabled={isSendingTest || !testEmail.includes('@')}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
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
                  <EyeIcon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Live Email Preview
                  </span>
                </div>

                {/* Viewport Switcher & Sample Data Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseSampleData((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      useSampleData
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-surface border-white/10 text-text-secondary'
                    }`}
                    title="Toggle between raw variable tags and sample simulated member data"
                  >
                    {useSampleData ? 'Sample Data ON' : 'Raw Tags'}
                  </button>

                  <div className="p-0.5 rounded-lg bg-surface border border-white/10 flex items-center">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-primary text-black font-bold shadow-xs'
                          : 'text-text-secondary hover:text-white'
                      }`}
                      title="Desktop Preview"
                    >
                      <ComputerDesktopIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-primary text-black font-bold shadow-xs'
                          : 'text-text-secondary hover:text-white'
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
                        {useSampleData ? 'Alex Morgan <alex@company.com>' : '{{name}} <{{email}}>'}
                      </span>
                    </div>
                    <div className="pt-1 text-sm font-bold text-white border-t border-white/5 mt-2 truncate">
                      {renderedSubject}
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
                        {renderedBody ? (
                          renderedBody
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
                          <span>Open Lead Hunter Dashboard</span>
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

        {/* Tab 2: Automated Lifecycle Sequences */}
        {activeTab === 'flows' && (
          <div className="space-y-6">
            {/* Quick Notice Banner */}
            <div className="p-5 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-secondary/15 text-secondary">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Automated Platform Triggers (4 Workflows)
                  </h3>
                  <p className="text-xs text-text-secondary">
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
                  className="px-3.5 py-2 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary w-full md:w-64"
                />
              </div>
            </div>

            {/* 4 Flow Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {AUTOMATED_FLOWS.map((flow) => (
                <div
                  key={flow.id}
                  className="p-6 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl space-y-5 flex flex-col justify-between hover:border-white/20 transition-all shadow-md group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${flow.accent}`}
                      >
                        {flow.badge} Flow
                      </span>
                      <span className="text-xs font-mono text-secondary flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        Active
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {flow.title}
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {flow.description}
                      </p>
                    </div>

                    {/* Flow Details & Rate Limit */}
                    <div className="p-3 rounded-2xl bg-surface-container-lowest/60 border border-white/5 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <ClockIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <strong className="text-white">Trigger:</strong> {flow.trigger}
                      </div>
                      <div className="flex items-center gap-2 text-text-secondary">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <strong className="text-white">Protection:</strong> {flow.rateLimit}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                    <span className="text-xs text-text-secondary font-mono truncate">
                      {flow.templateName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendTest(flow.id)}
                      disabled={isSendingTest}
                      className="px-4 py-2 rounded-xl bg-surface hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all hover:border-primary/40 shrink-0 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="w-3.5 h-3.5 text-primary" />
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
            <div className="p-6 md:p-7 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl shadow-md space-y-5">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white">Live Dispatch Audit Trail</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Real-time database records from db.emailLog for all delivered and skipped emails
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search Input */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search recipient or subject..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-9 pr-3.5 py-2 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary w-56"
                    />
                  </div>

                  {/* Status Filter Pills */}
                  <div className="p-1 rounded-xl bg-surface-container-lowest border border-white/10 flex items-center gap-1">
                    {(['ALL', 'SENT', 'FAILED', 'SKIPPED'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setLogStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          logStatusFilter === status
                            ? 'bg-primary text-black font-extrabold shadow-sm'
                            : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={fetchData}
                    className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-text-secondary hover:text-white transition-all cursor-pointer"
                    title="Refresh Logs"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Table */}
              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated border-b border-white/10 text-text-secondary uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Category Flow</th>
                        <th className="py-3 px-4 text-right">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-surface-container-lowest/40">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-3 px-4 text-text-secondary font-mono whitespace-nowrap text-[11px]">
                            {new Date(log.sentAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            {log.to}
                          </td>
                          <td className="py-3 px-4 text-text-secondary max-w-xs truncate font-medium" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-white/10 text-[10px] font-mono font-bold text-text-secondary uppercase">
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                log.status === 'SENT'
                                  ? 'bg-secondary/15 text-secondary border border-secondary/30'
                                  : log.status === 'FAILED'
                                  ? 'bg-error/15 text-error border border-error/30'
                                  : 'bg-white/10 text-text-secondary border border-white/15'
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
                <div className="py-16 text-center text-xs text-text-secondary space-y-2">
                  <EnvelopeIcon className="w-8 h-8 text-text-secondary/50 mx-auto" />
                  <p className="font-bold text-white text-sm">No delivery logs found</p>
                  <p>Try clearing your search query or send a test email to populate the audit table.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Save or Edit Template */}
        <AnimatePresence>
          {isSaveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg rounded-3xl bg-surface border border-white/15 shadow-2xl p-6 md:p-7 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/15 text-primary">
                      <BookmarkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {editingTemplateId ? 'Edit Broadcast Template' : 'Save as New Reusable Template'}
                      </h3>
                      <p className="text-[11px] text-text-secondary">
                        Reusable preset stored in PostgreSQL for all admins
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="p-1.5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all cursor-pointer"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary">Category Group</label>
                    <select
                      value={templateCategory}
                      onChange={(e) => setTemplateCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary">Message Content Body</label>
                    <textarea
                      rows={6}
                      placeholder="Message body. Supports variables like {{name}} or {{appUrl}}..."
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary resize-y leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-black text-xs font-bold transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-3xl rounded-3xl bg-surface border border-white/15 shadow-2xl p-6 md:p-7 space-y-5 max-h-[85vh] flex flex-col"
              >
                {/* Modal Top Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/15 text-primary">
                      <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Manage Broadcast Templates ({templates.length})
                      </h3>
                      <p className="text-xs text-text-secondary">
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
                      className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>New Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManageModalOpen(false)}
                      className="p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Template Search Bar */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search templates by title, subject, or category..."
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-surface-container-lowest border border-white/10 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Template Cards List */}
                <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                  {filteredTemplates.length === 0 ? (
                    <div className="py-16 text-center text-xs text-text-secondary space-y-2">
                      <DocumentTextIcon className="w-8 h-8 text-text-secondary/50 mx-auto" />
                      <p className="font-bold text-white text-sm">No templates found</p>
                      <p>Click &quot;New Template&quot; above to create your first announcement template.</p>
                    </div>
                  ) : (
                    filteredTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-5 rounded-2xl border border-white/[0.08] bg-surface-container-lowest/60 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white truncate">{tpl.name}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                tpl.category === 'leads'
                                  ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                                  : tpl.category === 'update'
                                  ? 'bg-secondary/15 text-secondary border-secondary/30'
                                  : tpl.category === 'promo'
                                  ? 'bg-primary/15 text-primary border-primary/30'
                                  : tpl.category === 'announcement'
                                  ? 'bg-white/10 text-white border-white/20'
                                  : 'bg-surface border-white/10 text-text-secondary'
                              }`}
                            >
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary font-medium truncate">
                            <strong className="text-white">Subject:</strong> {tpl.subject}
                          </p>
                          <p className="text-xs text-text-secondary/70 line-clamp-2 leading-relaxed">
                            {tpl.body.replace(/\n+/g, ' ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApplyFromManage(tpl)}
                            className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            Use in Composer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tpl)}
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  )
}
