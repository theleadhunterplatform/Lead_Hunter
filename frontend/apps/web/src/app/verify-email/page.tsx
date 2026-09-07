'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  EnvelopeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid'
import { auth, sendEmailVerification, firebaseSignOut } from '@/lib/firebase'
import { CustomLoader } from '@/components/ui/CustomLoader'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || ''
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(true)
  const [verified, setVerified] = useState(false)

  const handleVerified = () => {
    const target =
      redirectTo && !redirectTo.startsWith('/login') && !redirectTo.startsWith('/register')
        ? redirectTo
        : '/onboarding'
    router.replace(target)
  }

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
    try {
      await sendEmailVerification(auth.currentUser)
    } catch {
      // silently fail
    } finally {
      setResending(false)
    }
  }

  if (checking) {
    return <CustomLoader page="onboarding" fullscreen />
  }

  return (
    <main className="min-h-screen bg-bg-main flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.06)_0%,transparent_60%)] pointer-events-none" />

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
                className="w-full px-5 py-3 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-white text-sm font-medium transition-all"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center mx-auto mb-6">
                <EnvelopeIcon className="w-8 h-8 text-accent-mint" />
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

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full px-5 py-3 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
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
            <button
              onClick={async () => {
                await firebaseSignOut(auth)
                router.push('/login')
              }}
              className="text-xs text-text-secondary/50 hover:text-text-secondary transition-colors"
            >
              Sign in with a different account
            </button>
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
