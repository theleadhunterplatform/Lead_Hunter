'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/solid'
import { Loader2, ClipboardPaste } from 'lucide-react'
import { getFirebaseToken } from '@/lib/firebase'
import { useToast } from '@/components/ui/Toast'
import type { ExternalPost } from '@/lib/external-api/client'

interface ManualContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lead: ExternalPost | null
}

export default function ManualContactModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
}: ManualContactModalProps) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('Found manually on ContactOut')
  const [creditCost, setCreditCost] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (!isOpen || !lead) return
    setEmail(lead.email || lead.contact_info?.emails?.[0]?.email || '')
    setPhone(lead.contact_info?.phone_numbers?.[0]?.number || '')
    setNote('Found manually on ContactOut')
    setCreditCost(
      lead.credit_cost !== null && lead.credit_cost !== undefined
        ? String(lead.credit_cost)
        : '',
    )
    setError(null)
  }, [isOpen, lead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedEmail && !trimmedPhone) {
      setError('Enter at least an email or phone number.')
      return
    }

    const parsedCost =
      creditCost.trim() === '' ? undefined : parseInt(creditCost.trim(), 10)

    try {
      setIsSaving(true)
      setError(null)
      const token = await getFirebaseToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`/api/admin/leads/${lead.id}/contact`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          note: note.trim() || undefined,
          credit_cost: isNaN(parsedCost as number) ? undefined : parsedCost,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to save contact.')

      addToast({
        type: 'success',
        message: data?.message || 'Contact saved successfully.',
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save contact.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !lead) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-md bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardPaste size={16} className="text-accent-mint" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-mint">
                  Manual Contact
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {lead.author?.name || 'Lead Contact'}
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Paste email/phone from ContactOut to save API tokens.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1.5 flex items-center gap-1.5">
                <EnvelopeIcon className="w-3.5 h-3.5 text-accent-mint" />
                <span>Email</span>
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1.5 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-accent-mint" />
                <span>Phone</span>
              </label>
              <input
                type="tel"
                placeholder="+1 555 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1.5 flex items-center gap-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5 text-text-secondary" />
                <span>Note (optional)</span>
              </label>
              <input
                type="text"
                placeholder="Source or context"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1.5 flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">⚡</span>
                <span>Custom Credit Cost (Coins - optional)</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="Leave blank for bundle default"
                value={creditCost}
                onChange={(e) => setCreditCost(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-text-secondary hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent-mint text-black font-bold text-xs uppercase tracking-wider hover:bg-accent-mint/90 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-accent-mint/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-2" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Contact</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
