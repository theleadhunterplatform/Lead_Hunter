'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  EnvelopeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid'
import { auth, sendEmailVerification, applyActionCode } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [checking, setChecking] = useState(true)
  const [verified, setVerified] = useState(false)

  const handleVerified = () => {
    const target =
      redirectTo && !redirectTo.startsWith('/login') && !redirectTo.startsWith('/register')
        ? redirectTo
        : '/onboarding'
    router.replace(target)
  }

  // Handle direct verification link (oobCode) if present
  useEffect(() => {
    const oobCode = searchParams.get('oobCode')
    if (oobCode) {
      applyActionCode(auth, oobCode)
        .then(async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload()
            await auth.currentUser.getIdToken(true).catch(() => {})
          }
          setVerified(true)
          setChecking(false)
        })
        .catch((err) => {
          console.error('[Verify Email] Failed to apply action code:', err)
          setChecking(false)
        })
    }
  }, [searchParams])

  useEffect(() => {
    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const refreshVerification = async () => {
      if (!auth.currentUser) return
      try {
        await auth.currentUser.reload()
        if (auth.currentUser.emailVerified) {
          await auth.currentUser.getIdToken(true).catch(() => {})
          if (active) {
            setVerified(true)
            setChecking(false)
            if (intervalId) clearInterval(intervalId)
          }
        } else if (active) {
          setChecking(false)
        }
      } catch {
        // retry next cycle
      }
    }

    if (auth.currentUser?.emailVerified) {
      setVerified(true)
      setChecking(false)
    } else {
      refreshVerification()
      intervalId = setInterval(refreshVerification, 2000)
    }

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const handleResend = async () => {
    if (!auth.currentUser) return
    setResending(true)
    setResendMessage('')
    try {
      const token = await auth.currentUser.getIdToken().catch(() => null)
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: auth.currentUser.email }),
      })
      if (res.ok) {
        setResendMessage('Verification email sent! Check your inbox.')
      } else {
        await sendEmailVerification(auth.currentUser)
        setResendMessage('Verification email sent! Check your inbox.')
      }
    } catch {
      await sendEmailVerification(auth.currentUser).catch(() => {})
      setResendMessage('Verification email sent! Check your inbox.')
    } finally {
      setResending(false)
    }
  }

  if (checking) {
    return <CustomLoader page="onboarding" fullscreen />
  }

  return (
    <main className="min-h-screen bg-bg-main flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-primary),0.08)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-10 text-center">
          {verified ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-3">
                Email verified
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed mb-8">
                Your email has been verified. Taking you to the next step…
              </p>
              <button
                onClick={handleVerified}
                className="w-full px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-semibold text-sm transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] active:scale-98"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <EnvelopeIcon className="w-8 h-8 text-primary" />
              </div>

              <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-3">
                Verify your email
              </h1>

              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                We sent a verification link to{' '}
                <strong className="text-text-primary">{auth.currentUser?.email}</strong>. Please
                verify your email to continue.
              </p>

              <p className="text-xs text-text-secondary/60 mb-8">
                Didn&apos;t receive it? Check your spam folder or click Resend below.
              </p>

              {resendMessage && (
                <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                  {resendMessage}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-semibold text-sm transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4" />
                      Resend verification email
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setChecking(true)
                    if (auth.currentUser) {
                      auth.currentUser
                        .reload()
                        .then(() => {
                          if (auth.currentUser?.emailVerified) {
                            setVerified(true)
                          }
                        })
                        .catch(() => {})
                        .finally(() => setChecking(false))
                    } else {
                      setChecking(false)
                    }
                  }}
                  className="w-full px-5 py-3 rounded-xl border border-white/[0.06] text-text-secondary text-sm font-medium hover:bg-white/[0.04] transition-all"
                >
                  I&apos;ve verified &mdash; refresh
                </button>
              </div>
            </>
          )}

          <div className="mt-8">
            <Link
              href="/login"
              className="text-xs text-text-secondary/50 hover:text-text-secondary transition-colors"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<CustomLoader page="onboarding" fullscreen />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
