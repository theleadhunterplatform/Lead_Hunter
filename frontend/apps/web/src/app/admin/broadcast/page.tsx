'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ExclamationTriangleIcon,
  BookmarkIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid'
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
    trigger: 'Fired immediately upon onboarding submission',
    description:
      'Informs candidate members that their profile, service offerings, and LinkedIn links are received and currently under admin review.',
    templateName: 'renderApplicationReceived',
  },
  {
    id: 'approved',
    title: 'Account Approved & Credits Unlocked',
    badge: 'Activation',
    trigger: 'Fired when admin approves an applicant',
    description:
      'Congratulates the member on joining Lead Hunter Club, confirms their allocated plan, and notifies them of their starter credits balance.',
    templateName: 'renderApproved',
  },
  {
    id: 'low_credits',
    title: 'Low Credits Nudge (≤ 2 Credits)',
    badge: 'Retention',
    trigger: 'Fired when balance hits ≤ 2 credits after a lead reveal (rate-limited to 1 alert per 48h)',
    description:
      'Warns members that their credit pool is running low to prevent pausing their outreach pipeline, with 1-click CTA links to refill or upgrade.',
    templateName: 'renderLowCreditsNudge',
  },
  {
    id: 'renewal_reminder',
    title: '3-Day Renewal Notice',
    badge: 'Billing',
    trigger: 'Scanned daily by background cron 3 days before renewal date',
    description:
      'Reminds paying subscribers of their upcoming renewal and reassures them that unused credits roll over safely.',
    templateName: 'renderRenewalReminder',
  },
]

export default function AdminBroadcastPage() {
  const { addToast } = useToast()
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

  // Template Management State
  const [templates, setTemplates] = useState<BroadcastTemplateItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

  // Save / Edit Template Form
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('general')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)

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
    }
  }, [addToast])

  useEffect(() => {
    fetchData()
    fetchTemplates()
  }, [fetchData, fetchTemplates])

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId)
    if (!tplId) return
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      setSubject(tpl.subject)
      setMessage(tpl.body)
      addToast({ type: 'info', message: `Loaded "${tpl.name}" template` })
    }
  }

  const handleOpenSaveModal = () => {
    setEditingTemplateId(null)
    setTemplateName('')
    setTemplateCategory('general')
    setTemplateSubject(subject)
    setTemplateBody(message)
    setIsSaveModalOpen(true)
  }

  const handleOpenEditModal = (tpl: BroadcastTemplateItem) => {
    setEditingTemplateId(tpl.id)
    setTemplateName(tpl.name)
    setTemplateCategory(tpl.category || 'general')
    setTemplateSubject(tpl.subject)
    setTemplateBody(tpl.body)
    setIsSaveModalOpen(true)
  }

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

  const handleApplyFromManage = (tpl: BroadcastTemplateItem) => {
    setSubject(tpl.subject)
    setMessage(tpl.body)
    setSelectedTemplateId(tpl.id)
    setIsManageModalOpen(false)
    addToast({ type: 'info', message: `Loaded template: "${tpl.name}"` })
  }

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

    if (!confirm(`Are you sure you want to blast this announcement to ${recipientCount} member(s)?`)) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <CustomLoader size={36} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Loading Communications Center...
        </span>
      </div>
    )
  }

  const audienceCount =
    audience === 'ALL'
      ? data?.stats.totalActive || 0
      : audience === 'PAID'
      ? data?.stats.paidSubscribers || 0
      : data?.stats.freeStarters || 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-brand/20 via-brand/10 to-transparent border border-brand/30 text-brand">
              <MegaphoneIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                Communications & Broadcast Hub
              </h1>
              <p className="text-xs text-text-tertiary">
                Direct custom SMTP mailer, member announcement broadcasts, and automated lifecycle email flows
              </p>
            </div>
          </div>
        </div>

        {/* SMTP Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-surface/80 backdrop-blur-sm">
          <ServerIcon className="w-4 h-4 text-text-tertiary" />
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                data?.smtpStatus.working ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-text-primary capitalize">
              {data?.smtpStatus.provider === 'smtp'
                ? 'Custom SMTP Active'
                : data?.smtpStatus.provider === 'resend'
                ? 'Resend API Active'
                : 'Development Mock Mailer'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Total Active Members</span>
            <UserGroupIcon className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-bold text-text-primary tabular-nums">
            {data?.stats.totalActive || 0}
          </div>
          <p className="text-[11px] text-text-tertiary">Total verified and active platform accounts</p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Paid Subscribers</span>
            <SparklesIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">
            {data?.stats.paidSubscribers || 0}
          </div>
          <p className="text-[11px] text-text-tertiary">Freelancer Pro & Agency members</p>
        </div>

        <div className="p-5 rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary">
            <span>Free Starter Members</span>
            <ClockIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 tabular-nums">
            {data?.stats.freeStarters || 0}
          </div>
          <p className="text-[11px] text-text-tertiary">Exploring platform with monthly 50 credits</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'composer'
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
        >
          <PaperAirplaneIcon className="w-3.5 h-3.5" />
          <span>Broadcast Composer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('flows')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'flows'
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Automated Lifecycle Flows (4)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface'
          }`}
        >
          <EnvelopeIcon className="w-3.5 h-3.5" />
          <span>Live Delivery Logs</span>
        </button>
      </div>

      {/* Tab 1: Broadcast Blast Composer */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Composer Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm space-y-5">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>Compose Announcement Blast</span>
              </h2>

              {/* Audience Segment Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary">Select Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAudience('ALL')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      audience === 'ALL'
                        ? 'border-brand bg-brand/10 text-text-primary shadow-sm'
                        : 'border-border/60 bg-surface/60 text-text-secondary hover:border-border'
                    }`}
                  >
                    <div className="text-xs font-bold">All Members</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      {data?.stats.totalActive || 0} recipients
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudience('PAID')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      audience === 'PAID'
                        ? 'border-emerald-500 bg-emerald-500/10 text-text-primary shadow-sm'
                        : 'border-border/60 bg-surface/60 text-text-secondary hover:border-border'
                    }`}
                  >
                    <div className="text-xs font-bold text-emerald-400">Paid Subscribers</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      {data?.stats.paidSubscribers || 0} recipients
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudience('FREE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      audience === 'FREE'
                        ? 'border-amber-500 bg-amber-500/10 text-text-primary shadow-sm'
                        : 'border-border/60 bg-surface/60 text-text-secondary hover:border-border'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-400">Free Starters</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      {data?.stats.freeStarters || 0} recipients
                    </div>
                  </button>
                </div>
              </div>

              {/* Template Quick-Picker & Actions */}
              <div className="p-3.5 rounded-xl bg-surface/60 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon className="w-4 h-4 text-brand" />
                    <span className="text-xs font-bold text-text-primary">Email Templates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenSaveModal}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border/80 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all flex items-center gap-1"
                      title="Save current Subject & Message as a new reusable template"
                    >
                      <PlusIcon className="w-3 h-3 text-brand" />
                      <span>Save as Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManageModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border/80 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-brand/40 transition-all flex items-center gap-1"
                    >
                      <DocumentTextIcon className="w-3 h-3 text-brand" />
                      <span>Manage ({templates.length})</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border/80 text-text-primary text-xs focus:outline-none focus:border-brand transition-all cursor-pointer font-medium"
                  >
                    <option value="">Choose a pre-built template or custom preset...</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.category.toUpperCase()}] {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Email Subject Line</label>
                <input
                  type="text"
                  placeholder="e.g., Important update on new high-intent lead filters"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-text-primary text-sm focus:outline-none focus:border-brand transition-all"
                />
              </div>

              {/* Message Content Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Message Content</label>
                <textarea
                  rows={8}
                  placeholder="Write your announcement here. Paragraphs and line breaks are automatically formatted into responsive email blocks..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border/80 text-text-primary text-sm focus:outline-none focus:border-brand transition-all resize-y"
                />
                <p className="text-[11px] text-text-tertiary">
                  Emails are delivered in safe batches of 15 to safeguard sender domain reputation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40">
                <div className="text-xs text-text-tertiary">
                  Ready to send to <strong className="text-text-primary">{audienceCount} members</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isSending || audienceCount === 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand/20 transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>Dispatch Broadcast ({audienceCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Send Box */}
            <div className="p-4 rounded-xl border border-border/40 bg-surface/20 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <input
                  type="email"
                  placeholder="Enter your email to test send this draft..."
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/60 text-xs text-text-primary focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSendTest('custom')}
                disabled={isSendingTest}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-hover text-xs font-semibold text-text-primary flex items-center justify-center gap-1.5 transition-all shrink-0"
              >
                {isSendingTest ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Send Test Preview</span>
              </button>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold text-text-secondary flex items-center justify-between">
              <span>Live Email Preview</span>
              <span className="text-[11px] text-text-tertiary">Responsive Layout</span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-[#0a0a0a] p-6 shadow-2xl space-y-4 font-sans text-left">
              <div className="border-b border-white/10 pb-4">
                <div className="text-xs text-zinc-500 font-mono">From: Lead Hunter Club</div>
                <div className="text-sm font-bold text-white mt-1">
                  {subject.trim() ? subject : 'Preview: Announcement Subject Line'}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#141414] border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white">Lead Hunter Club</h3>

                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {message.trim() ? (
                    message
                  ) : (
                    <span className="text-zinc-600 italic">
                      Your announcement content will render here in real time...
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <div className="inline-block px-5 py-2.5 rounded-xl bg-[#dc3b4c] text-white text-xs font-semibold">
                    Open Lead Hunter Dashboard
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 text-center pt-2">
                Lead Hunter Club &mdash; Find & close your ideal clients
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Automated Lifecycle Flows */}
      {activeTab === 'flows' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border/40 bg-surface/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
              <p className="text-xs text-text-secondary">
                All 4 lifecycle email flows run automatically in the background without manual intervention.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Test email address..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background border border-border/60 text-xs text-text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUTOMATED_FLOWS.map((flow) => (
              <div
                key={flow.id}
                className="p-6 rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-brand/10 text-brand border border-brand/20">
                      {flow.badge}
                    </span>
                    <span className="text-[11px] text-text-tertiary font-mono">Status: Active</span>
                  </div>

                  <h3 className="text-base font-bold text-text-primary">{flow.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{flow.description}</p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-text-tertiary">
                    <ClockIcon className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span>{flow.trigger}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-text-tertiary font-mono">{flow.templateName}</span>
                  <button
                    type="button"
                    onClick={() => handleSendTest(flow.id)}
                    disabled={isSendingTest}
                    className="px-3.5 py-1.5 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <PaperAirplaneIcon className="w-3 h-3 text-brand" />
                    <span>Send Test to Me</span>
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
          <div className="p-6 rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-text-primary">Recent Delivery Logs</h2>
              <button
                type="button"
                onClick={fetchData}
                className="p-2 rounded-xl border border-border/60 hover:bg-surface text-text-tertiary hover:text-text-primary transition-all"
                title="Refresh Logs"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>

            {data?.recentLogs && data.recentLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-text-tertiary uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {data.recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface/60 transition-colors">
                        <td className="py-3 px-4 text-text-tertiary whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-text-primary whitespace-nowrap">
                          {log.to}
                        </td>
                        <td className="py-3 px-4 text-text-secondary max-w-xs truncate" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-surface border border-border/60 text-[10.5px] font-mono text-text-tertiary">
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              log.status === 'SENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : log.status === 'FAILED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}
                          >
                            {log.status === 'SENT' && <CheckCircleIcon className="w-3 h-3" />}
                            {log.status === 'FAILED' && <XCircleIcon className="w-3 h-3" />}
                            {log.status === 'SKIPPED' && <ClockIcon className="w-3 h-3" />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-text-tertiary">
                No delivery logs recorded yet. Send a test email or broadcast to view entries.
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal: Save or Edit Template */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-surface border border-border/80 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="w-5 h-5 text-brand" />
                  <h3 className="text-sm font-bold text-text-primary">
                    {editingTemplateId ? 'Edit Broadcast Template' : 'Save as New Template'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Template Name / Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Weekly High-Intent Drops, Weekend Top-Up Promo"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Category</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                  >
                    <option value="general">General</option>
                    <option value="leads">Leads Alert</option>
                    <option value="update">Product Update</option>
                    <option value="promo">Promo & Refill</option>
                    <option value="announcement">Announcement & Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Subject Line</label>
                  <input
                    type="text"
                    placeholder="Email subject line..."
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Message Content Body</label>
                  <textarea
                    rows={6}
                    placeholder="Message body. You can use variables like {{name}} or {{appUrl}}..."
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-brand resize-y"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
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
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-md shadow-brand/20 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl rounded-2xl bg-surface border border-border/80 shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-brand" />
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Manage Broadcast Templates</h3>
                    <p className="text-[11px] text-text-tertiary">
                      Create, edit, or load pre-saved email announcement templates
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
                    className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>New Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(false)}
                    className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-all"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {templates.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-tertiary">
                    No templates found. Click "New Template" above to create one.
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-xl border border-border/70 bg-background/50 hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-text-primary truncate">{tpl.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tpl.category === 'leads'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : tpl.category === 'update'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : tpl.category === 'promo'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : tpl.category === 'announcement'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                            }`}
                          >
                            {tpl.category}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary font-medium truncate">
                          Subject: {tpl.subject}
                        </p>
                        <p className="text-[11px] text-text-tertiary line-clamp-1">
                          {tpl.body.replace(/\n+/g, ' ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApplyFromManage(tpl)}
                          className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 text-xs font-bold transition-all"
                        >
                          Use in Composer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tpl)}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all"
                          title="Edit Template"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-text-tertiary hover:text-rose-400 transition-all"
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
