'use client'

import { useState, type FormEvent } from 'react'
import { useToast } from '@/components/ui/Toast'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      addToast({ type: 'error', message: 'Please enter your email address' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'footer' }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json.message || 'Could not subscribe' })
        return
      }
      addToast({ type: 'success', message: 'Subscribed! Check your inbox to confirm.' })
      setEmail('')
    } catch {
      addToast({ type: 'error', message: 'Could not subscribe' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:border-accent-purple/30 focus:bg-white/[0.05] transition-all duration-300 font-light"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-bold text-text-primary hover:bg-white/[0.1] hover:border-white/15 transition-all duration-300 shrink-0 disabled:opacity-50"
      >
        {loading ? '...' : 'Subscribe'}
      </button>
    </form>
  )
}