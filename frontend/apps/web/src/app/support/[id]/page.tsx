'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LifebuoyIcon, ArrowLeftIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { Badge, Button, CustomLoader } from '@/components/ui'
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

interface TicketDetail {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  createdAt: string
  resolvedAt: string | null
  messages: Message[]
}

const statusColor: Record<string, 'mint' | 'purple'> = {
  OPEN: 'mint',
  IN_PROGRESS: 'purple',
  RESOLVED: 'purple',
  CLOSED: 'purple',
}

export default function SupportThreadPage() {
  const params = useParams<{ id: string }>()
  const ticketId = params.id
  const router = useRouter()
  const { addToast } = useToast()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [adminName, setAdminName] = useState('Support Team')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getFirebaseToken()
        const res = await fetch(`/api/support/tickets/${ticketId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json()
        if (json.data) {
          setTicket(json.data)
          const me = await fetch('/api/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          const meJson = await me.json()
          if (meJson.data?.name) setAdminName(meJson.data.name)
        } else {
          addToast({ type: 'error', message: json.message || 'Ticket not found' })
        }
      } catch {
        addToast({ type: 'error', message: 'Failed to load ticket' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticketId, addToast])

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
        body: JSON.stringify({ body: reply }),
      })
      const json = await res.json()
      if (res.ok) {
        setReply('')
        addToast({ type: 'success', message: '✓ Reply sent' })
        const reload = await fetch(`/api/support/tickets/${ticketId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const reloadJson = await reload.json()
        if (reloadJson.data) setTicket(reloadJson.data)
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to send reply' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    } finally {
      setSending(false)
    }
  }

  const handleClose = async () => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ state: 'CLOSED' }),
      })
      const json = await res.json()
      if (res.ok) {
        setTicket((t) => (t ? { ...t, status: 'CLOSED', resolvedAt: new Date().toISOString() } : t))
        addToast({ type: 'success', message: '✓ Ticket closed' })
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to close ticket' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error' })
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-10 relative scrollbar-hide">
      <div className="max-w-[900px] mx-auto relative z-10">
        <button
          onClick={() => router.push('/support')}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Support
        </button>

        {loading && <CustomLoader page="default" />}

        {!loading && ticket && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <LifebuoyIcon className="w-6 h-6 text-text-secondary" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary tracking-tight">{ticket.subject}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xxs text-text-secondary capitalize">{ticket.category}</span>
                    <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xxs text-text-secondary capitalize">· {ticket.priority} priority</span>
                  </div>
                </div>
              </div>
              {ticket.status !== 'CLOSED' && (
                <Button
                  variant="outline"
                  color="mint"
                  size="sm"
                  onClick={handleClose}
                >
                  <CheckCircleIcon className="w-3 h-3" />
                  Close Ticket
                </Button>
              )}
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-4 mb-8">
              {ticket.messages.length === 0 && (
                <p className="text-sm text-text-secondary">No messages yet.</p>
              )}
              {ticket.messages.map((msg, i) => {
                const isUser = msg.authorRole === 'user'
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      isUser
                        ? 'self-end bg-accent-mint/10 border border-accent-mint/20'
                        : 'self-start bg-white/[0.04] border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-10 font-bold text-text-primary uppercase tracking-wide">
                        {isUser ? adminName : 'Support Team'}
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

            {/* Reply box */}
            {ticket.status !== 'CLOSED' && (
              <div className="bg-surface border border-border-subtle rounded-2xl p-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Type your reply..."
                  className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-border-subtle transition-all resize-none mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    color="mint"
                    size="sm"
                    onClick={handleSend}
                    loading={sending}
                    disabled={!reply.trim()}
                  >
                    <PaperAirplaneIcon className="w-3 h-3" />
                    Send Reply
                  </Button>
                </div>
              </div>
            )}

            {ticket.status === 'CLOSED' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-sm text-text-secondary">This ticket is closed.</p>
                <p className="text-xxs text-text-secondary mt-1">
                  You can reply to reopen it, and our team will be notified.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}