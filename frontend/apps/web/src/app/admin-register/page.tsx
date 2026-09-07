'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, auth } from '@/lib/firebase'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':
    'This email is already registered. We found your existing account and will upgrade it to admin.',
  'auth/credential-already-in-use':
    'This email is already linked to another account. Use a different email or sign in with the existing account.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with this email. A new one will be created.',
  'auth/wrong-password':
    'Incorrect password. If you already have a consumer account, enter its password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
}

function friendlyFirebaseError(code: string, fallback: string): string {
  return FIREBASE_ERRORS[code] || fallback
}

function extractFirebaseCode(message: string): string {
  const match = message.match(/\((\w+\/[\w-]+)\)/)
  return match ? match[1] : ''
}

export default function AdminRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'key' | 'register'>('key')
  const [registrationKey, setRegistrationKey] = useState('')
  const [keyError, setKeyError] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setKeyError('')
    setKeyLoading(true)

    const trimmed = registrationKey.trim()
    if (!trimmed) {
      setKeyError('Enter the registration key')
      setKeyLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/register/validate?key=${encodeURIComponent(trimmed)}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || 'Invalid registration key')
      }
      setStep('register')
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Invalid registration key')
    } finally {
      setKeyLoading(false)
    }
  }

  async function ensureLocalUser(token: string): Promise<void> {
    const syncRes = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!syncRes.ok) {
      const json = await syncRes.json()
      throw new Error(json.message || 'Failed to sync user account')
    }
  }

  async function upgradeToAdmin(token: string): Promise<void> {
    const res = await fetch('/api/admin/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: registrationKey }),
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.message || 'Admin upgrade failed')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let token: string

      // Try signing in first (user may already exist as consumer)
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        token = await cred.user.getIdToken()
      } catch (signInErr: unknown) {
        const code = signInErr instanceof Error ? extractFirebaseCode(signInErr.message) : ''

        // If user-not-found, create a new Firebase account
        if (code === 'auth/user-not-found') {
          const result = await createUserWithEmailAndPassword(auth, email, password)
          token = await result.user.getIdToken()
        } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
          setError(
            'That email is already registered as a consumer account. Please use the correct password, or use a different email for the admin account.',
          )
          setLoading(false)
          return
        } else {
          throw signInErr
        }
      }

      // Ensure local DB record exists
      await ensureLocalUser(token)

      // Upgrade to admin
      await upgradeToAdmin(token)

      router.push('/admin')
    } catch (err: unknown) {
      if (err instanceof Error) {
        const code = extractFirebaseCode(err.message)
        const msg = friendlyFirebaseError(code, err.message)
        setError(msg)
        console.error('[AdminRegister] Error:', err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.06)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-6 h-6 text-accent-mint" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Admin Registration
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              Restricted to authorized team members only
            </p>
          </div>

          {step === 'key' ? (
            <form onSubmit={handleKeySubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Registration Key
                </label>
                <input
                  value={registrationKey}
                  onChange={(e) => setRegistrationKey(e.target.value)}
                  type="password"
                  placeholder="Enter your team registration key"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                />
              </div>

              {keyError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {keyError}
                </div>
              )}

              <button
                type="submit"
                disabled={keyLoading}
                className="mt-2 bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium"
              >
                {keyLoading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@company.com"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Min 8 characters"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    Creating admin account...
                  </>
                ) : (
                  'Create Admin Account'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('key')}
                className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors text-center mt-2"
              >
                Back to key entry
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
