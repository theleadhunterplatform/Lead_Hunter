'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  type ConfirmationResult,
  auth,
} from '@/lib/firebase'
import { normalizePhone } from '@/lib/phone'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
}

function extractFirebaseCode(message: string): string {
  const match = message.match(/\((\w+\/[\w-]+)\)/)
  return match ? match[1] : ''
}

function friendlyFirebaseError(message: string): string {
  const code = extractFirebaseCode(message)
  return FIREBASE_ERRORS[code] || 'Failed to create account. Please try again.'
}

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneStep, setPhoneStep] = useState<'hidden' | 'send' | 'verify'>('hidden')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [emailVerified, setEmailVerified] = useState(!!auth.currentUser?.emailVerified)
  const [resending, setResending] = useState(false)
  const verifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    const check = setInterval(async () => {
      if (!auth.currentUser) return
      try {
        await auth.currentUser.reload()
        if (auth.currentUser.emailVerified) {
          await auth.currentUser.getIdToken(true).catch(() => {})
          setEmailVerified(true)
          clearInterval(check)
        }
      } catch {
        // retry next cycle
      }
    }, 2000)
    return () => clearInterval(check)
  }, [])

  useEffect(() => {
    if (phoneStep !== 'send') {
      if (verifierRef.current) {
        verifierRef.current.clear()
        verifierRef.current = null
      }
      return
    }

    try {
      verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      })
    } catch (err) {
      console.error('[Register] Failed to create RecaptchaVerifier:', err)
    }

    return () => {
      if (verifierRef.current) {
        verifierRef.current.clear()
        verifierRef.current = null
      }
    }
  }, [phoneStep])

  const handleResendVerification = async () => {
    setResending(true)
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
      }
    } catch {
      // silently fail
    } finally {
      setResending(false)
    }
  }

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const normalized = normalizePhone(phoneNumber.trim())
      const verifier = verifierRef.current
      if (!verifier) {
        throw new Error('RecaptchaVerifier not initialized')
      }
      const result = await signInWithPhoneNumber(auth, normalized, verifier)
      setConfirmationResult(result)
      setPhoneStep('verify')
    } catch (err) {
      console.error('[Register] sendOtp failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('recaptcha')) {
        setPhoneError('reCAPTCHA verification failed. Please try again.')
      } else if (msg.includes('invalid-phone-number') || msg.includes('phone')) {
        setPhoneError('Invalid phone number format. Please check and try again.')
      } else if (msg.includes('too-many-requests')) {
        setPhoneError('Too many attempts. Please wait a minute and try again.')
      } else {
        setPhoneError('Failed to send OTP. Check the phone number and try again.')
      }
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!verificationCode.trim() || !confirmationResult) return
    if (!emailVerified) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const cred = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode.trim(),
      )
      await linkWithCredential(auth.currentUser!, cred)
      router.push('/onboarding')
    } catch (err) {
      console.error('[Register] verifyOtp failed:', err)
      setPhoneError('Invalid verification code. Please try again.')
      setPhoneLoading(false)
    }
  }

  const handleSkipPhone = () => {
    if (emailVerified) {
      router.push('/onboarding')
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(auth.currentUser!)
      setPhoneStep('send')
    } catch (err: unknown) {
      setError(
        err instanceof Error ? friendlyFirebaseError(err.message) : 'Failed to create account',
      )
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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-text-secondary mt-2">Join LeadHunterClub and start closing more deals</p>
        </div>

        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-8">
          {auth.currentUser && !emailVerified && (
            <div className="mb-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400">Verify your email</p>
                  <p className="text-xs text-yellow-400/70 mt-1">
                    We sent a verification email to <strong>{auth.currentUser.email}</strong>.
                    Please verify before continuing.
                  </p>
                  <p className="text-[11px] text-yellow-400/50 mt-1.5">
                    Didn&apos;t receive it? Check your spam folder or click Resend.
                  </p>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend'}
                </button>
              </div>
            </div>
          )}

          {auth.currentUser && emailVerified && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-400">Email verified</p>
                  <p className="text-xs text-emerald-400/70 mt-0.5">{auth.currentUser.email}</p>
                </div>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-all"
                >
                  Continue &rarr;
                </button>
              </div>
            </motion.div>
          )}

          {phoneStep !== 'hidden' ? (
            <div className="flex flex-col gap-5">
              {phoneStep === 'send' && (
                <>
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-text-primary tracking-tight">
                      Add phone (optional)
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      Get SMS alerts and secure your account
                    </p>
                  </div>

                  <div id="recaptcha-container" />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Phone number
                    </label>
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                    />
                  </div>

                  {phoneError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={phoneLoading || !phoneNumber.trim()}
                    className="mt-2 bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {phoneLoading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    ) : (
                      'Send OTP'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipPhone}
                    disabled={!emailVerified}
                    className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors text-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emailVerified
                      ? 'Skip — I’ll do this later'
                      : 'Verify your email first to continue'}
                  </button>
                </>
              )}

              {phoneStep === 'verify' && (
                <>
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-text-primary tracking-tight">
                      Enter verification code
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">Sent to {phoneNumber}</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      6-digit code
                    </label>
                    <input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      maxLength={6}
                      className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3 text-center text-lg tracking-ultra"
                    />
                  </div>

                  {phoneError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={phoneLoading || verificationCode.length < 6 || !emailVerified}
                    className="mt-2 bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {phoneLoading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    ) : (
                      'Verify & Continue'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipPhone}
                    disabled={!emailVerified}
                    className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors text-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emailVerified
                      ? 'Skip — I’ll do this later'
                      : 'Verify your email first to continue'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-5">
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
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  name="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                  required
                  minLength={6}
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
                  'Create Account'
                )}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-text-secondary">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-accent-mint hover:text-accent-mint/80 font-semibold"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
