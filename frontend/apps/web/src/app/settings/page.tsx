'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  auth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  type ConfirmationResult,
} from '@/lib/firebase'
import { normalizePhone } from '@/lib/phone'
import { motion } from 'framer-motion'
import {
  UserIcon,
  EnvelopeIcon,
  BanknotesIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  LockClosedIcon,
  CalendarIcon,
  StarIcon,
  ClockIcon,
  PhoneIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/solid'

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  FREELANCER: 'Freelancer',
  AGENCY: 'Agency',
}

const PLAN_CREDITS: Record<string, number> = {
  FREE: 50,
  FREELANCER: 500,
  AGENCY: 1000,
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const handleSaveProfile = async () => {
    try {
      const token = await import('@/lib/firebase').then(m => m.getFirebaseToken())
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName }),
      })
    } catch (err) {
      console.error('Failed to save profile:', err)
    }
    setIsEditing(false)
  }

  const handleRefillCredits = async () => {
    setPaymentLoading(true)
    try {
      const token = await import('@/lib/firebase').then(m => m.getFirebaseToken())
      const res = await fetch('/api/payments/razorpay/topup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: 'topup_50' }),
      })
      const data = await res.json()
      if (data.success && data.data?.order_id) {
        const rzp = new (window as any).Razorpay({
          key: data.data.key_id,
          order_id: data.data.order_id,
          amount: data.data.amount,
          currency: data.data.currency,
          name: data.data.name,
          description: data.data.description,
          prefill: data.data.prefill,
          handler: async (response: any) => {
            await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            window.location.reload()
          },
        })
        rzp.open()
      }
    } catch (err) {
      console.error('Refill failed:', err)
    }
    setPaymentLoading(false)
  }

  const handleChangePlan = async (planId: string) => {
    setPaymentLoading(true)
    try {
      const token = await import('@/lib/firebase').then(m => m.getFirebaseToken())
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId.toLowerCase() }),
      })
      const data = await res.json()
      if (data.success && data.data?.order_id) {
        const rzp = new (window as any).Razorpay({
          key: data.data.key_id,
          order_id: data.data.order_id,
          amount: data.data.amount,
          currency: data.data.currency,
          name: data.data.name,
          description: data.data.description,
          prefill: data.data.prefill,
          handler: async (response: any) => {
            await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            window.location.reload()
          },
        })
        rzp.open()
      }
    } catch (err) {
      console.error('Change plan failed:', err)
    }
    setPaymentLoading(false)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will be moved to the free plan.')) return
    setCancelLoading(true)
    try {
      const token = await import('@/lib/firebase').then(m => m.getFirebaseToken())
      await fetch('/api/plans/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      window.location.reload()
    } catch (err) {
      console.error('Cancel failed:', err)
    }
    setCancelLoading(false)
  }

  const remainingDays = useMemo(() => {
    if (!user?.creditAccount?.renewalDate) return null
    const now = new Date()
    const renewal = new Date(user.creditAccount.renewalDate)
    const diff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }, [user?.creditAccount?.renewalDate])

  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(
    null,
  )
  const [phoneFormPhone, setPhoneFormPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneStep, setPhoneStep] = useState<'idle' | 'send' | 'verify'>('idle')
  const [otpCountdown, setOtpCountdown] = useState(0)

  useEffect(() => {
    if (otpCountdown <= 0) return
    const id = setInterval(() => setOtpCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [otpCountdown])

  const verifierRef = useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    if (phoneStep !== 'send') {
      if (verifierRef.current) {
        try {
          verifierRef.current.clear()
        } catch {}
        verifierRef.current = null
      }
      return
    }

    const initVerifier = async () => {
      for (let i = 0; i < 20; i++) {
        const el = document.getElementById('settings-recaptcha-container')
        if (el) {
          verifierRef.current = new RecaptchaVerifier(auth, 'settings-recaptcha-container', {
            size: 'invisible',
          })
          return
        }
        await new Promise((r) => setTimeout(r, 100))
      }
    }
    initVerifier()

    return () => {
      if (verifierRef.current) {
        try {
          verifierRef.current.clear()
        } catch {}
        verifierRef.current = null
      }
    }
  }, [phoneStep])

  const handlePhoneSendOtp = async () => {
    if (!phoneFormPhone.trim()) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const verifier = verifierRef.current
      if (!verifier) {
        setPhoneError('Could not initialize verification. Please try again.')
        return
      }
      const normalized = normalizePhone(phoneFormPhone.trim())
      const result = await signInWithPhoneNumber(auth, normalized, verifier)
      setPhoneConfirmationResult(result)
      setPhoneStep('verify')
      setOtpCountdown(60)
    } catch {
      setPhoneError('Failed to send OTP. Check the phone number and try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handlePhoneVerifyOtp = async () => {
    if (!phoneVerificationCode.trim() || !phoneConfirmationResult) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const cred = PhoneAuthProvider.credential(
        phoneConfirmationResult.verificationId,
        phoneVerificationCode.trim(),
      )
      await linkWithCredential(auth.currentUser!, cred)
      setPhoneStep('idle')
      setPhoneFormPhone('')
      setPhoneVerificationCode('')
      window.location.reload()
    } catch {
      setPhoneError('Invalid verification code. Please try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-10 py-12 relative scrollbar-hide">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] glow-mint-soft pointer-events-none" />

      <div className="max-w-[1000px] mx-auto relative z-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Settings</h1>
          <p className="text-text-secondary mt-2">
            Manage your account, credits, and subscription.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-4xl border-subtle bg-surface/40 p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center font-bold text-text-secondary hover:text-text-primary transition-colors text-xl">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Profile</h2>
                  <p className="text-sm text-text-secondary">Your personal information</p>
                </div>
              </div>
              <button
                onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isEditing
                    ? 'bg-accent-mint text-text-on-accent hover:bg-surface-secondary'
                    : 'bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                  <UserIcon className="w-3 h-3 inline mr-1" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50"
                  />
                ) : (
                  <p className="text-sm text-text-primary font-medium px-4 py-3 rounded-xl bg-surface-elevated/50 border border-subtle/50">
                    {user?.name || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                  <EnvelopeIcon className="w-3 h-3 inline mr-1" />
                  Email
                </label>
                <p className="text-sm text-text-primary font-medium px-4 py-3 rounded-xl bg-surface-elevated/50 border border-subtle/50 flex items-center justify-between">
                  {user?.email || '—'}
                  <CheckCircleIcon className="w-[14px] h-[14px] text-text-secondary shrink-0" />
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                  <LockClosedIcon className="w-3 h-3 inline mr-1" />
                  Role
                </label>
                <p className="text-sm text-text-primary font-medium px-4 py-3 rounded-xl bg-surface-elevated/50 border border-subtle/50 capitalize">
                  {user?.role || 'user'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                  <CalendarIcon className="w-3 h-3 inline mr-1" />
                  Member Since
                </label>
                <p className="text-sm text-text-primary font-medium px-4 py-3 rounded-xl bg-surface-elevated/50 border border-subtle/50">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Phone Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel rounded-4xl border-subtle bg-surface/40 p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center">
                  <PhoneIcon className="w-6 h-6 text-text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Phone Verification</h2>
                  <p className="text-sm text-text-secondary">Secure your account with SMS</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  user?.phone
                    ? 'bg-accent-mint/10 text-accent-mint border border-accent-mint/20'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}
              >
                {user?.phone ? 'Verified' : 'Not Verified'}
              </span>
            </div>

            {user?.phone ? (
              <p className="text-sm text-text-secondary">Phone: {user.phone}</p>
            ) : phoneStep === 'idle' ? (
              <button
                onClick={() => setPhoneStep('send')}
                className="px-5 py-2.5 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-accent-mint text-sm font-medium hover:bg-accent-mint/20 transition-all"
              >
                Add Phone Number
              </button>
            ) : (
              <div className="space-y-4">
                <div id="settings-recaptcha-container" />

                {phoneStep === 'send' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Phone number
                      </label>
                      <input
                        value={phoneFormPhone}
                        onChange={(e) => setPhoneFormPhone(e.target.value)}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3 max-w-xs"
                      />
                    </div>

                    {phoneError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        {phoneError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handlePhoneSendOtp}
                        disabled={phoneLoading || !phoneFormPhone.trim()}
                        className="px-5 py-2.5 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-accent-mint text-sm font-medium hover:bg-accent-mint/20 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {phoneLoading ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        ) : (
                          'Send OTP'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneStep('idle')
                          setPhoneError('')
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white/5 text-text-secondary text-sm font-medium hover:text-text-primary transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {phoneStep === 'verify' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        6-digit code
                      </label>
                      <input
                        value={phoneVerificationCode}
                        onChange={(e) => setPhoneVerificationCode(e.target.value)}
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3 text-center text-lg tracking-ultra max-w-[200px]"
                      />
                    </div>

                    {phoneError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        {phoneError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handlePhoneVerifyOtp}
                        disabled={phoneLoading || phoneVerificationCode.length < 6}
                        className="px-5 py-2.5 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-accent-mint text-sm font-medium hover:bg-accent-mint/20 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {phoneLoading ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneStep('idle')
                          setPhoneError('')
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white/5 text-text-secondary text-sm font-medium hover:text-text-primary transition-all"
                      >
                        Cancel
                      </button>
                    </div>

                    {otpCountdown > 0 ? (
                      <p className="text-xs text-text-secondary/60">
                        Resend code in {otpCountdown}s
                      </p>
                    ) : (
                      <button
                        onClick={() => {
                          setPhoneStep('send')
                          setPhoneVerificationCode('')
                          setPhoneError('')
                        }}
                        className="text-xs text-accent-mint hover:text-accent-mint/80 transition-colors flex items-center gap-1"
                      >
                        <ArrowPathIcon className="w-3 h-3" />
                        Resend code
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>

          {/* Credits & Tokens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-4xl border-subtle bg-surface/40 p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Credits & Tokens</h2>
                <p className="text-sm text-text-secondary">Your intelligence token balance</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-subtle/50 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-text-secondary">Available Credits</span>
                <span className="text-2xl font-bold text-text-primary">
                  {user?.creditAccount?.total ?? 0}
                </span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, ((user?.creditAccount?.total ?? 0) / 1000) * 100)}%`,
                  }}
                  className="h-full bg-accent-purple rounded-full"
                />
              </div>
              <p className="text-xxs text-text-secondary/50 mt-3">
                Credits are consumed when revealing lead identities — the exact cost depends on the
                contact data available (phone, email, or profile link).
              </p>
              {user?.creditAccount?.rolloverBalance ? (
                <p className="text-xxs text-accent-purple/80 mt-2 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {user.creditAccount.rolloverBalance} rollover credits
                  {user.creditAccount.rolloverExpiresAt
                    ? ` · expires ${new Date(user.creditAccount.rolloverExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : ''}
                </p>
              ) : null}
            </div>

            <button
              onClick={handleRefillCredits}
              disabled={paymentLoading}
              className="w-full py-3.5 rounded-xl bg-accent-purple text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-secondary transition-all shadow-[0_0_20px_rgba(var(--rgb-tab-purple),0.15)] hover:bg-accent-purple/90 disabled:opacity-50"
            >
              <BoltIcon className="w-4 h-4" />
              {paymentLoading ? 'Processing...' : 'Refill Credits'}
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Subscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel rounded-4xl border-subtle bg-surface/40 p-8"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center">
                <StarIcon className="w-6 h-6 text-accent-purple" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Subscription</h2>
                <p className="text-sm text-text-secondary">Your current plan and billing</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-elevated/50 border border-subtle/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    {PLAN_LABELS[user?.plan || 'FREE'] || user?.plan || 'Free'} Plan
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-secondary border border-border-subtle text-9 font-bold text-text-secondary uppercase tracking-widest">
                    {PLAN_CREDITS[user?.plan || 'FREE'] || 50} credits/mo
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-accent-mint/10 border border-accent-mint/20 text-9 font-bold text-accent-mint uppercase tracking-widest">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {user?.creditAccount?.renewalDate && remainingDays !== null && (
                  <p className="text-xs text-text-secondary flex items-center gap-1.5">
                    <ClockIcon className="w-3 h-3" />
                    {remainingDays > 0
                      ? `Renews in ${remainingDays} day${remainingDays === 1 ? '' : 's'} (${new Date(user.creditAccount.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
                      : `Renewal ${remainingDays === 0 ? 'today' : `${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? '' : 's'} ago`}`}
                  </p>
                )}
                {user?.creditAccount && (
                  <p className="text-xs text-text-secondary flex items-center gap-1.5">
                    <BanknotesIcon className="w-3 h-3" />
                    {user.creditAccount.subscriptionBalance} subscription credits
                    {user.creditAccount.rolloverBalance
                      ? ` + ${user.creditAccount.rolloverBalance} rollover`
                      : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleChangePlan('paid')}
                disabled={paymentLoading}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Change Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-4xl border border-red-500/10 bg-red-500/[0.02] p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <LockClosedIcon className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Danger Zone</h2>
                <p className="text-sm text-text-secondary">Irreversible account actions</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="text-sm font-medium text-text-primary">Sign Out</p>
                <p className="text-xs text-text-secondary">End your current session</p>
              </div>
              <button
                onClick={() => {
                  logout()
                }}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
