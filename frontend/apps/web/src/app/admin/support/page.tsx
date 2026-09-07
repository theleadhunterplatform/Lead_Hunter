'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon, LifebuoyIcon } from '@heroicons/react/24/solid'
import { Badge, Select, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

interface AdminTicket {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  user: { name: string; email: string; plan: string }
  _count: { messages: number }
}

const statusColor: Record<string, 'mint' | 'purple'> = {
  OPEN: 'mint',
  IN_PROGRESS: 'purple',
  RESOLVED: 'purple',
  CLOSED: 'purple',
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [search, setSearch] = useState('')
  const { addToast } = useToast()

  const load = async () => {
    try {
      const token = await getFirebaseToken()
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (priority) params.set('priority', priority)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json.data) setTickets(json.data)
    } catch {
      addToast({ type: 'error', message: 'Failed to load tickets' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority])

  const runSearch = () => {
    setLoading(true)
    load()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
          <LifebuoyIcon className="w-6 h-6 text-text-secondary" />
          Support Tickets
        </h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search subject, name, email..."
            className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-border-subtle transition-all"
          />
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(v) => setStatus(v)}
            size="sm"
            placeholder="Status"
            options={[
              { label: 'Open', value: 'OPEN' },
              { label: 'In Progress', value: 'IN_PROGRESS' },
              { label: 'Resolved', value: 'RESOLVED' },
              { label: 'Closed', value: 'CLOSED' },
            ]}
          />
        </div>
        <div className="w-40">
          <Select
            value={priority}
            onChange={(v) => setPriority(v)}
            size="sm"
            placeholder="Priority"
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'High', value: 'high' },
              { label: 'Urgent', value: 'urgent' },
            ]}
          />
        </div>
      </div>

      {/* Queue */}
      <div className="metallic-card overflow-hidden">
        {tickets.length === 0 && !loading && (
          <div className="p-14 text-center">
            <LifebuoyIcon className="w-8 h-8 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary text-sm">No tickets match.</p>
          </div>
        )}

        {tickets.length > 0 && (
          <div className="divide-y divide-white/[0.03]">
            {tickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-1 flex items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      ticket.status === 'OPEN'
                        ? 'bg-accent-mint'
                        : ticket.status === 'IN_PROGRESS'
                          ? 'bg-accent-purple'
                          : 'bg-white/20'
                    }`}
                  />
                </div>
                <div className="col-span-5">
                  <Link
                    href={`/admin/support/${ticket.id}`}
                    className="block group-hover:text-accent-mint transition-colors"
                  >
                    <div className="text-sm font-bold text-text-primary">{ticket.subject}</div>
                    <div className="text-xxs text-text-secondary mt-0.5 capitalize">
                      {ticket.category}
                    </div>
                  </Link>
                </div>
                <div className="col-span-3">
                  <div className="text-sm font-medium text-text-primary">{ticket.user.name}</div>
                  <div className="text-xxs text-text-secondary">{ticket.user.email}</div>
                </div>
                <div className="col-span-1">
                  <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="col-span-1">
                  <span className={`text-xxs font-bold uppercase tracking-wide ${
                    ticket.priority === 'urgent'
                      ? 'text-accent-mint'
                      : ticket.priority === 'high'
                        ? 'text-accent-purple'
                        : 'text-text-secondary'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="col-span-1 text-right text-xxs text-text-secondary">
                  {ticket._count.messages}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {loading && <CustomLoader page="admin" />}
      </div>
    </div>
  )
}