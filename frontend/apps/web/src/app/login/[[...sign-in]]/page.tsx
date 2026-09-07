'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon } from '@heroicons/react/24/solid'
import { useState, useCallback } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail, auth } from '@/lib/firebase'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
}

function extractFirebaseCode(message: string): string {
  const match = message.match(/\((\w+\/[\w-]+)\)/)
  return match ? match[1] : ''
}

function friendlyFirebaseError(message: string): string {
  const code = extractFirebaseCode(message)
  return FIREBASE_ERRORS[code] || 'Failed to sign in. Please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleForgotPassword = async () => {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const email = emailInput?.value
    if (!email) {
      setError('Enter your email address first, then click "Forgot password?"')
      return
    }
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? friendlyFirebaseError(err.message) : 'Failed to send reset email',
      )
    }
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const redirectTo = searchParams.get('redirect') || '/dashboard'

    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push(redirectTo)
    } catch (err: unknown) {
      setError(err instanceof Error ? friendlyFirebaseError(err.message) : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg-main flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.08)_0%,transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-8 left-8 z-20"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors group"
        >
          <ArrowLeftIcon className="w-[14px] h-[14px] group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Lead Hunter Club"
              width={48}
              height={48}
              className="w-12 h-12 rounded-xl mx-auto mb-4 shadow-[0_0_20px_rgba(var(--rgb-accent-mint),0.15)] hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-2">Sign in to your account to continue</p>
        </div>

        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {resetSent && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                Reset link sent! Check your inbox and follow the instructions. Didn&apos;t see it? Check your spam folder.
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Email address
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-accent-mint hover:text-accent-mint/80 font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-text-secondary">
                {"Don't have an account? "}
                <Link
                  href="/register"
                  className="text-accent-mint hover:text-accent-mint/80 font-semibold"
                >
                  Sign up
                </Link>
              </p>
              <p className="text-[11px] text-text-secondary/40 mt-3">
                By continuing, you agree to our{" "}
                <a href="/terms" className="underline hover:text-text-secondary">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline hover:text-text-secondary">
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </main>
  )
}
