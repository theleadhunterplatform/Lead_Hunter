'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LifebuoyIcon,
  PlusIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  HomeIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BookOpenIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/solid'
import { Badge, Button, Input, Select, Modal, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

interface TicketSummary {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  _count: { messages: number }
}

const statusColor: Record<string, 'mint' | 'purple'> = {
  OPEN: 'mint',
  IN_PROGRESS: 'purple',
  RESOLVED: 'purple',
  CLOSED: 'purple',
}

type StatusTab = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED_CLOSED'

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const { addToast } = useToast()

  const loadTickets = async () => {
    try {
      setLoading(true)
      const token = await getFirebaseToken()
      const res = await fetch('/api/support/tickets', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json.data) setTickets(json.data)
    } catch {
      addToast({ type: 'error', message: 'Failed to load support tickets' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      addToast({ type: 'error', message: 'Subject and message are required' })
      return
    }
    setCreating(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subject.trim(), category, priority, firstMessage: message.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        addToast({ type: 'success', message: '✓ Support ticket created' })
        setCreateOpen(false)
        setSubject('')
        setMessage('')
        setCategory('general')
        setPriority('normal')
        await loadTickets()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to create ticket' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    } finally {
      setCreating(false)
    }
  }

  const counts = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === 'OPEN').length
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length
    const resolvedClosed = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length
    return { total, open, inProgress, resolvedClosed }
  }, [tickets])

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Status filter
      if (activeTab === 'OPEN' && ticket.status !== 'OPEN') return false
      if (activeTab === 'IN_PROGRESS' && ticket.status !== 'IN_PROGRESS') return false
      if (
        activeTab === 'RESOLVED_CLOSED' &&
        ticket.status !== 'RESOLVED' &&
        ticket.status !== 'CLOSED'
      )
        return false

      // Category filter
      if (selectedCategory !== 'all' && ticket.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSubject = ticket.subject.toLowerCase().includes(q)
        const matchCategory = ticket.category.toLowerCase().includes(q)
        const matchId = ticket.id.toLowerCase().includes(q)
        if (!matchSubject && !matchCategory && !matchId) return false
      }

      return true
    })
  }, [tickets, activeTab, selectedCategory, searchQuery])

  return (
    <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 pb-24 relative scrollbar-hide">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Breadcrumb Navigation Bar */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <ChevronRightIcon className="w-3 h-3 text-text-secondary/40" />
          <span className="text-text-primary font-medium flex items-center gap-1.5">
            <LifebuoyIcon className="w-3.5 h-3.5 text-accent-orange" />
            Support Center
          </span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shadow-[0_0_20px_rgba(var(--rgb-accent-orange),0.12)]">
                <LifebuoyIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                    Support Center
                  </h1>
                  <Badge size="sm" color="mint">
                    {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Submit requests, follow up with our team, or browse help resources.
                </p>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/10 transition-colors"
            >
              <Squares2X2Icon className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <Button variant="primary" color="mint" size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </Button>
          </div>
        </div>

        {/* Quick Resource Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/leads"
            className="group relative p-5 metallic-card rounded-2xl border border-white/[0.06] hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-accent-orange/10 text-accent-orange">
                <BookOpenIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-orange transition-colors flex items-center justify-between">
                  <span>Lead Intelligence Guides</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-xxs text-text-secondary mt-1">
                  How buyer intent signals are calculated, filtered, and saved.
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="group relative p-5 metallic-card rounded-2xl border border-white/[0.06] hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-accent-orange/10 text-accent-orange">
                <BanknotesIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-orange transition-colors flex items-center justify-between">
                  <span>Billing & Credits FAQ</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-xxs text-text-secondary mt-1">
                  Learn about credit rollovers, quota resets, and invoices.
                </p>
              </div>
            </div>
          </Link>

          <div
            onClick={() => setCreateOpen(true)}
            className="group relative p-5 metallic-card rounded-2xl border border-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-accent-orange/10 text-accent-orange">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-orange transition-colors flex items-center justify-between">
                  <span>Dedicated Support Team</span>
                  <PlusIcon className="w-3.5 h-3.5 text-accent-orange opacity-80 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xxs text-text-secondary mt-1">
                  Submit a question or bug report for rapid response.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs and Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          {/* Status Tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-accent-orange text-black shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span>All Tickets</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'ALL' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.total}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('OPEN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'OPEN'
                  ? 'bg-accent-orange text-black shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span>Open</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'OPEN' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.open}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'IN_PROGRESS'
                  ? 'bg-accent-orange text-black shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span>In Progress</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'IN_PROGRESS' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.inProgress}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('RESOLVED_CLOSED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === 'RESOLVED_CLOSED'
                  ? 'bg-accent-orange text-black shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span>Resolved</span>
              <span
                className={`text-10 px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'RESOLVED_CLOSED' ? 'bg-black/20 text-black' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {counts.resolvedClosed}
              </span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <MagnifyingGlassIcon className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-secondary/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-orange/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-36 shrink-0">
              <Select
                value={selectedCategory}
                onChange={(v) => setSelectedCategory(v)}
                size="sm"
                options={[
                  { label: 'All Categories', value: 'all' },
                  { label: 'General', value: 'general' },
                  { label: 'Billing', value: 'billing' },
                  { label: 'Leads', value: 'leads' },
                  { label: 'Account', value: 'account' },
                  { label: 'Technical', value: 'technical' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Modal for Creating New Ticket */}
        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Open a Support Ticket"
          size="md"
          actions={
            <>
              <Button variant="ghost" color="mint" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" color="mint" onClick={handleCreate} loading={creating}>
                Submit Ticket
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xxs font-bold text-text-secondary uppercase tracking-widest mb-2">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xxs font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={(v) => setCategory(v)}
                  options={[
                    { label: 'General', value: 'general' },
                    { label: 'Billing', value: 'billing' },
                    { label: 'Leads', value: 'leads' },
                    { label: 'Account', value: 'account' },
                    { label: 'Technical', value: 'technical' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xxs font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Priority
                </label>
                <Select
                  value={priority}
                  onChange={(v) => setPriority(v)}
                  options={[
                    { label: 'Normal', value: 'normal' },
                    { label: 'Low', value: 'low' },
                    { label: 'High', value: 'high' },
                    { label: 'Urgent', value: 'urgent' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-xxs font-bold text-text-secondary uppercase tracking-widest mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe what you need help with in detail..."
                className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-accent-orange/40 transition-all resize-none text-text-primary"
              />
            </div>
          </div>
        </Modal>

        {/* Tickets Container */}
        <div className="metallic-card rounded-2xl overflow-hidden border border-white/[0.06]">
          {/* Table Column Headers */}
          {tickets.length > 0 && (
            <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3.5 bg-white/[0.02] border-b border-white/[0.04] text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <div className="col-span-5">Ticket Subject</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2">Messages</div>
              <div className="col-span-1 text-right">View</div>
            </div>
          )}

          {/* Empty State - No Tickets At All */}
          {tickets.length === 0 && !loading && (
            <div className="p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange mx-auto mb-4">
                <LifebuoyIcon className="w-7 h-7" />
              </div>
              <p className="text-text-primary text-base font-bold mb-1">No support tickets opened yet</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto mb-6">
                Have a question about lead feeds, billing, or features? Submit a ticket and our team will get back to you promptly.
              </p>
              <Button variant="primary" color="mint" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="w-3.5 h-3.5" />
                Create First Ticket
              </Button>
            </div>
          )}

          {/* Empty State - Filter Has No Matches */}
          {tickets.length > 0 && filteredTickets.length === 0 && !loading && (
            <div className="p-14 text-center">
              <FunnelIcon className="w-8 h-8 text-text-secondary/60 mx-auto mb-3" />
              <p className="text-text-primary text-sm font-semibold mb-1">No tickets match your filter</p>
              <p className="text-xxs text-text-secondary mb-4">
                Try resetting your status filter, category, or search query.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('ALL')
                    setSelectedCategory('all')
                    setSearchQuery('')
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Clear Filters
                </button>
                <Button variant="primary" color="mint" size="sm" onClick={() => setCreateOpen(true)}>
                  New Ticket
                </Button>
              </div>
            </div>
          )}

          {/* Ticket Rows */}
          {filteredTickets.length > 0 && (
            <div className="divide-y divide-white/[0.04]">
              {filteredTickets.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.03 }}
                >
                  <Link
                    href={`/support/${ticket.id}`}
                    className="grid grid-cols-12 gap-4 px-6 sm:px-8 py-4.5 items-center group hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <div className="text-sm font-bold text-text-primary group-hover:text-accent-orange transition-colors flex items-center gap-2">
                        <span className="truncate">{ticket.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-10 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-text-secondary uppercase tracking-wider capitalize">
                          {ticket.category}
                        </span>
                        <span className="text-10 text-text-secondary">
                          Opened {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="col-span-4 md:col-span-2">
                      <span className="text-xs font-medium text-text-secondary capitalize">
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="col-span-3 md:col-span-2 text-xs text-text-secondary flex items-center gap-1.5">
                      <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-text-secondary/70" />
                      <span>
                        {ticket._count.messages} {ticket._count.messages === 1 ? 'msg' : 'msgs'}
                      </span>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/0 group-hover:bg-white/5 text-text-secondary group-hover:text-accent-orange transition-all">
                        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {loading && (
            <div className="py-12">
              <CustomLoader page="default" />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}