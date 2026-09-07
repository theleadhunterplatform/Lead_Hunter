'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { EnvelopeIcon, PaperAirplaneIcon, UserPlusIcon } from '@heroicons/react/24/solid'
import { Badge, Button, CustomLoader } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { getFirebaseToken } from '@/lib/firebase'

interface Subscriber {
  id: string
  email: string
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED' | 'BOUNCED'
  source: string
  createdAt: string
}

interface BroadcastForm {
  subject: string
  bodyHtml: string
  bodyText: string
}

const statusColor: Record<string, 'mint' | 'purple'> = {
  SUBSCRIBED: 'mint',
  UNSUBSCRIBED: 'purple',
  BOUNCED: 'purple',
}

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)
  const [addingEmail, setAddingEmail] = useState('')
  const [form, setForm] = useState<BroadcastForm>({
    subject: '',
    bodyHtml: '',
    bodyText: '',
  })
  const { addToast } = useToast()

  const load = async () => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/newsletter', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (json.data) {
        setSubscribers(json.data)
        setTotal(json.total ?? 0)
        setByStatus(json.byStatus ?? {})
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to load subscribers' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendBroadcast = async () => {
    if (!form.subject.trim() || !form.bodyHtml.trim() || !form.bodyText.trim()) {
      addToast({ type: 'error', message: 'Subject, HTML and plain text are all required' })
      return
    }
    setBroadcasting(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'broadcast', ...form }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json.message || 'Broadcast failed' })
        return
      }
      addToast({
        type: 'success',
        message: `Broadcast sent to ${json.data?.sent ?? 0} subscribers`,
      })
      setForm({ subject: '', bodyHtml: '', bodyText: '' })
    } catch {
      addToast({ type: 'error', message: 'Broadcast failed' })
    } finally {
      setBroadcasting(false)
    }
  }

  const addSubscriber = async () => {
    const email = addingEmail.trim()
    if (!email) return
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'subscribe', email, source: 'admin' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json.message || 'Failed to add subscriber' })
        return
      }
      addToast({ type: 'success', message: 'Subscriber added' })
      setAddingEmail('')
      load()
    } catch {
      addToast({ type: 'error', message: 'Failed to add subscriber' })
    }
  }

  const setStatus = async (email: string, status: string) => {
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'update', email, status }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json.message || 'Update failed' })
        return
      }
      addToast({ type: 'success', message: 'Subscriber updated' })
      load()
    } catch {
      addToast({ type: 'error', message: 'Update failed' })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-3">
          <EnvelopeIcon className="w-6 h-6 text-text-secondary" />
          Newsletter
        </h2>
        <div className="flex items-center gap-2">
          <Badge size="sm" color="mint">
            {byStatus.SUBSCRIBED ?? 0} subscribed
          </Badge>
          <Badge size="sm">Total {total}</Badge>
        </div>
      </div>

      {/* Compose broadcast */}
      <div className="metallic-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <PaperAirplaneIcon className="w-5 h-5 text-accent-mint" />
          <h3 className="text-lg font-bold text-text-primary">Send Broadcast</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xxs font-bold text-text-secondary uppercase tracking-wide block mb-1.5">
              Subject
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="e.g. New feature: lead reveal tiers"
              className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-accent-mint/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xxs font-bold text-text-secondary uppercase tracking-wide block mb-1.5">
              HTML body
            </label>
            <textarea
              value={form.bodyHtml}
              onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
              placeholder="<p>Great update, hunters!</p>"
              rows={6}
              className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm font-mono focus:outline-none focus:border-accent-mint/40 transition-all"
            />
          </div>
          <div>
            <label className="text-xxs font-bold text-text-secondary uppercase tracking-wide block mb-1.5">
              Plain text fallback
            </label>
            <textarea
              value={form.bodyText}
              onChange={(e) => setForm((f) => ({ ...f, bodyText: e.target.value }))}
              placeholder="Great update, hunters!"
              rows={3}
              className="w-full bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-accent-mint/40 transition-all"
            />
          </div>
          <div className="flex justify-end">
            <Button color="mint" loading={broadcasting} onClick={sendBroadcast}>
              {broadcasting ? '' : <PaperAirplaneIcon className="w-4 h-4" />}
              Send to {byStatus.SUBSCRIBED ?? 0} subscribers
            </Button>
          </div>
        </div>
      </div>

      {/* Add subscriber */}
      <div className="metallic-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlusIcon className="w-5 h-5 text-accent-purple" />
          <h3 className="text-lg font-bold text-text-primary">Add Subscriber</h3>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={addingEmail}
            onChange={(e) => setAddingEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubscriber()}
            placeholder="you@company.com"
            className="flex-1 bg-surface-secondary/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-accent-purple/40 transition-all"
          />
          <Button color="purple" onClick={addSubscriber}>
            <UserPlusIcon className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Subscriber list */}
      <div className="metallic-card overflow-hidden">
        {subscribers.length === 0 && !loading && (
          <div className="p-14 text-center">
            <EnvelopeIcon className="w-8 h-8 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary text-sm">No subscribers yet.</p>
          </div>
        )}

        {subscribers.length > 0 && (
          <div className="divide-y divide-white/[0.03]">
            {subscribers.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.02 }}
                className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-5">
                  <div className="text-sm font-bold text-text-primary">{sub.email}</div>
                  <div className="text-xxs text-text-secondary mt-0.5 capitalize">{sub.source}</div>
                </div>
                <div className="col-span-2">
                  <Badge size="sm" color={statusColor[sub.status] || 'purple'}>
                    {sub.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="col-span-3 text-xxs text-text-secondary">
                  {new Date(sub.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  {sub.status !== 'SUBSCRIBED' ? (
                    <Button size="sm" color="mint" variant="ghost" onClick={() => setStatus(sub.email, 'SUBSCRIBED')}>
                      Resubscribe
                    </Button>
                  ) : (
                    <Button size="sm" color="purple" variant="ghost" onClick={() => setStatus(sub.email, 'UNSUBSCRIBED')}>
                      Unsubscribe
                    </Button>
                  )}
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