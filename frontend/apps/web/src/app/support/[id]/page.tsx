'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LifebuoyIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  HomeIcon,
} from '@heroicons/react/24/solid'
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
    <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 pb-24 relative scrollbar-hide">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[900px] mx-auto relative z-10">
        {/* Breadcrumb Navigation & Back Link */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-secondary">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <ChevronRightIcon className="w-3 h-3 text-text-secondary/40" />
            <Link
              href="/support"
              className="hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <LifebuoyIcon className="w-3.5 h-3.5 text-accent-orange" />
              <span>Support</span>
            </Link>
            <ChevronRightIcon className="w-3 h-3 text-text-secondary/40" />
            <span className="text-text-primary font-medium font-mono text-xxs truncate max-w-[200px]">
              #{ticketId?.slice(0, 8)}
            </span>
          </nav>

          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/10 transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>All Tickets</span>
          </Link>
        </div>

        {loading && <CustomLoader page="default" />}

        {!loading && ticket && (
          <>
            <div className="metallic-card p-6 rounded-2xl border border-white/[0.06] mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0 mt-0.5 shadow-[0_0_15px_rgba(var(--rgb-accent-orange),0.12)]">
                    <LifebuoyIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">{ticket.subject}</h2>
                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                      <span className="text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-text-secondary capitalize">
                        {ticket.category}
                      </span>
                      <Badge size="sm" color={statusColor[ticket.status] || 'purple'}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-text-secondary capitalize">
                        · {ticket.priority} priority
                      </span>
                      <span className="text-xs text-text-secondary">
                        · Opened {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {ticket.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    color="mint"
                    size="sm"
                    onClick={handleClose}
                    className="self-start sm:self-center shrink-0"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Close Ticket
                  </Button>
                )}
              </div>
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