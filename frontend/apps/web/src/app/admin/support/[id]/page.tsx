'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid'
import { Badge, Button, Select, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

interface Message {
  id: string
  authorId: string
  authorRole: string
  body: string
  isInternal: boolean
  createdAt: string
}

interface AdminTicketDetail {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  assigneeId: string | null
  createdAt: string
  resolvedAt: string | null
  messages: Message[]
  user: { name: string; email: string }
}

const statusColor: Record<string, 'mint' | 'purple'> = {
  OPEN: 'mint',
  IN_PROGRESS: 'purple',
  RESOLVED: 'purple',
  CLOSED: 'purple',
}

export default function AdminSupportThreadPage() {
  const params = useParams<{ id: string }>()
  const ticketId = params.id
  const router = useRouter()
  const { addToast } = useToast()
  const [ticket, setTicket] = useState<AdminTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)

  const load = async () => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json.data) setTicket(json.data)
      else addToast({ type: 'error', message: json.message || 'Ticket not found' })
    } catch {
      addToast({ type: 'error', message: 'Failed to load ticket' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId])

  const handleUpdate = async (patch: Record<string, unknown>) => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (res.ok) {
        addToast({ type: 'success', message: '✓ Ticket updated' })
        load()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to update ticket' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    }
  }

  const handleSend = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: reply, isInternal }),
      })
      const json = await res.json()
      if (res.ok) {
        setReply('')
        setIsInternal(false)
        addToast({
          type: 'success',
          message: isInternal ? '✓ Internal note added' : '✓ Reply sent to user',
        })
        load()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to send' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-[900px] space-y-6">
      <button
        onClick={() => router.push('/admin/support')}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Queue
      </button>

      {loading && <CustomLoader page="admin" />}

      {!loading && ticket && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">{ticket.subject}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xxs text-text-secondary capitalize">{ticket.category}</span>
                <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
                <span className="text-xxs text-text-secondary">
                  · {ticket.user.name} ({ticket.user.email})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-40">
                <Select
                  value={ticket.status}
                  onChange={(v) => handleUpdate({ status: v })}
                  size="sm"
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
                  value={ticket.priority}
                  onChange={(v) => handleUpdate({ priority: v })}
                  size="sm"
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Normal', value: 'normal' },
                    { label: 'High', value: 'high' },
                    { label: 'Urgent', value: 'urgent' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-3">
            {ticket.messages.map((msg, i) => {
              const isUser = msg.authorRole === 'user'
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.isInternal
                      ? 'self-center w-full max-w-none bg-accent-purple/[0.06] border border-dashed border-accent-purple/30'
                      : isUser
                        ? 'self-start bg-white/[0.04] border border-white/10'
                        : 'self-end bg-accent-mint/10 border border-accent-mint/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-10 font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                      {msg.isInternal && <LockClosedIcon className="w-3 h-3 text-accent-purple" />}
                      {msg.isInternal ? 'Internal Note' : isUser ? ticket.user.name : 'Support Team'}
                    </span>
                    <span className="text-10 text-text-secondary">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary/90 leading-relaxed whitespace-pre-wrap">
                    {msg.body}
                  </p>
                </motion.div>
              )
            })}
          </div>

          {/* Reply composer */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setIsInternal(!isInternal)}
                className={`flex items-center gap-2 text-10 font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all ${
                  isInternal
                    ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/30'
                    : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                }`}
              >
                <LockClosedIcon className="w-3 h-3" />
                Internal Note
              </button>
              <span className="text-xxs text-text-secondary">
                {isInternal
                  ? 'Visible only to admins — not emailed to the user.'
                  : 'Reply will be emailed to the user.'}
              </span>
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder={isInternal ? 'Internal note...' : 'Reply to user...'}
              className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-border-subtle transition-all resize-none mb-3"
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                color={isInternal ? 'purple' : 'mint'}
                size="sm"
                onClick={handleSend}
                loading={sending}
                disabled={!reply.trim()}
              >
                <PaperAirplaneIcon className="w-3 h-3" />
                {isInternal ? 'Add Note' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}