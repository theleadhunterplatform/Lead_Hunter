'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { LifebuoyIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
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

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
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
    load()
  }, [addToast])

  const handleCreate = async () => {
    if (!subject || !message) {
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
        body: JSON.stringify({ subject, category, firstMessage: message }),
      })
      const json = await res.json()
      if (res.ok) {
        addToast({ type: 'success', message: '✓ Support ticket created' })
        setCreateOpen(false)
        setSubject('')
        setMessage('')
        setCategory('general')
        const reload = await fetch('/api/support/tickets', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const reloadJson = await reload.json()
        if (reloadJson.data) setTickets(reloadJson.data)
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to create ticket' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10 relative scrollbar-hide">
      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
            <LifebuoyIcon className="w-6 h-6 text-text-secondary" />
            Support
          </h2>
          <Button variant="primary" color="mint" size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="w-3 h-3" />
            New Ticket
          </Button>
        </div>

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
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe what you need help with..."
                className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-border-subtle transition-all resize-none"
              />
            </div>
          </div>
        </Modal>

        <div className="metallic-card overflow-hidden">
          {tickets.length === 0 && !loading && (
            <div className="p-14 text-center">
              <LifebuoyIcon className="w-8 h-8 text-text-secondary mx-auto mb-4" />
              <p className="text-text-secondary text-sm mb-1">No support tickets yet.</p>
              <p className="text-xxs text-text-secondary mb-6">
                Need help? Open a ticket and our team will get back to you.
              </p>
              <Button variant="primary" color="mint" onClick={() => setCreateOpen(true)}>
                Create Ticket
              </Button>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="divide-y divide-white/[0.03]">
              {tickets.map((ticket, i) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-8 py-5 items-center group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-5">
                    <Link href={`/support/${ticket.id}`} className="block group-hover:text-accent-mint transition-colors">
                      <div className="text-sm font-bold text-text-primary">{ticket.subject}</div>
                      <div className="text-xxs text-text-secondary mt-0.5 capitalize">{ticket.category}</div>
                    </Link>
                  </div>
                  <div className="col-span-2">
                    <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xxs font-medium text-text-secondary capitalize">
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="col-span-2 text-xxs text-text-secondary">
                    {ticket._count.messages} msg{ ticket._count.messages === 1 ? '' : 's'}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ArrowRightIcon className="w-4 h-4 text-text-secondary" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {loading && <CustomLoader page="default" />}
        </div>
      </div>
    </main>
  )
}