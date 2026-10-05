'use client'

import { useState } from 'react'
import { auth, firebaseSignOut } from '@/lib/firebase'

type Mode = 'idle' | 'confirm'

interface RecoveryEmailPanelProps {
  accentClass?: string
}

export function RecoveryEmailPanel({ accentClass }: RecoveryEmailPanelProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleStartOver = async () => {
    const user = auth.currentUser
    if (!user) {
      window.location.assign('/register')
      return
    }

    setBusy(true)
    setError('')

    try {
      const token = await user.getIdToken().catch(() => null)
      if (token) {
        const res = await fetch('/api/auth/me', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok && res.status !== 401) {
          setError('Could not reset your account. Please try again.')
          setBusy(false)
          return
        }
        const json = await res.json().catch(() => null)
        const refCode = json?.data?.referralCode
        if (typeof refCode === 'string' && refCode) {
          try {
            localStorage.setItem('lh_ref_code', refCode)
          } catch {}
        }
      }
    } catch {
      setError('Could not reset your account. Please try again.')
      setBusy(false)
      return
    }

    // The server deletes the Firebase account via the admin SDK when available;
    // this is the fallback (no-op / caught if the account is already gone).
    try {
      await user.delete()
    } catch {}

    await firebaseSignOut(auth).catch(() => {})
    // Hard navigation: avoids ClientLayout's stale-user redirect racing the
    // sign-out state update and bouncing back to /verify-email.
    window.location.assign('/register')
  }

  return (
    <div className="mt-6">
      {mode === 'idle' ? (
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode('confirm')
              setError('')
            }}
            disabled={busy}
            className="text-xs text-text-secondary/60 hover:text-text-secondary transition-colors underline underline-offset-2 decoration-white/15 disabled:opacity-50"
          >
            Wrong email? Go back and sign up again
          </button>
        </div>
      ) : (
        <div className="text-left p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400/90 leading-relaxed">
            This deletes your current signup and takes you back to the sign-up form so you can
            enter the correct email. Your referral bonus will be re-applied when you sign up again.
          </p>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleStartOver}
              disabled={busy}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                accentClass ||
                'bg-primary hover:bg-primary/90 text-black shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)]'
              }`}
            >
              {busy ? (
                <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                'Back to sign up'
              )}
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-text-secondary text-sm font-medium hover:bg-white/[0.04] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
