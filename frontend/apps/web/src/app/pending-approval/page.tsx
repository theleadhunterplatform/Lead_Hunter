'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ClockIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { CustomLoader } from '@/components/ui/CustomLoader'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getFirebaseToken } from '@/lib/firebase'

export default function PendingApprovalPage() {
  const router = useRouter()
  const { user, loading, getToken } = useAuth()
  const [checking, setChecking] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      router.push('/dashboard')
      return
    }

    if (user?.status === 'REJECTED' || user?.status === 'SUSPENDED') {
      return
    }

    let pollCount = 0
    const schedulePoll = () => {
      const delay = Math.min(10_000 * Math.pow(2, pollCount), 60_000)
      pollCount++
      setTimeout(async () => {
        if (!mountedRef.current) return
        setChecking(true)
        const token = await getFirebaseToken()
        if (!token) {
          setChecking(false)
          schedulePoll()
          return
        }

        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const json = await res.json()
          if (!mountedRef.current) return
          if (json.data?.status === 'ACTIVE') {
            router.push('/dashboard')
            return
          }
          if (json.data?.status === 'REJECTED') {
            setChecking(false)
            return
          }
        } catch {
          // retry next cycle
        } finally {
          if (!mountedRef.current) return
          setChecking(false)
          schedulePoll()
        }
      }, delay)
    }

    schedulePoll()
    return () => {
      mountedRef.current = false
    }
  }, [user, router, getToken])

  if (loading) {
    return <CustomLoader page="onboarding" fullscreen />
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-bg-main flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-4">
            Not signed in
          </h1>
          <Link
            href="/login"
            className="inline-block bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl px-6 py-3 font-medium transition-all"
          >
            Sign In
          </Link>
        </motion.div>
      </main>
    )
  }

  const isRejected = user.status === 'REJECTED' || user.status === 'SUSPENDED'

  return (
    <main className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.06)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-10 text-center">
          {isRejected ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <ClockIcon className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-3">
                Application Not Approved
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed mb-8">
                Unfortunately, your application was not approved at this time. If you believe this
                is a mistake, please contact support.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center mx-auto mb-6">
                <ClockIcon className="w-8 h-8 text-accent-mint" />
              </div>

              <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-3">
                Application Under Review
              </h1>

              <p className="text-sm text-text-secondary leading-relaxed mb-8">
                Thanks for completing your profile! Our team is reviewing your application. This
                page refreshes automatically — you&apos;ll be redirected to the dashboard once
                approved.
              </p>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-8 text-left">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  What happens next?
                </h3>
                <ul className="space-y-3">
                  {[
                    'Our team reviews your profile and services',
                    'This page checks for updates automatically',
                    "Once approved, you'll be auto-redirected to your dashboard",
                    'Start hunting leads and closing clients',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-mint mt-1 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {checking && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span className="text-xs text-text-secondary/60">Checking status...</span>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-text-secondary/40">
            Need help?{' '}
            <span className="text-text-secondary/60 hover:text-text-primary transition-colors cursor-pointer">
              Contact support
            </span>
          </p>
        </div>
      </motion.div>
    </main>
  )
}
