'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  auth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  type ConfirmationResult,
} from '@/lib/firebase'
import { normalizePhone } from '@/lib/phone'
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry'
import {
  findCountryByDialCode,
  validatePhoneNumberLength,
  DEFAULT_COUNTRY,
} from '@/lib/countries'
import { motion } from 'framer-motion'
import { getFirebaseToken } from '@/lib/firebase'
import { useToast } from '@/components/ui/Toast'
import { openRazorpayCheckout, loadRazorpayScript } from '@/lib/razorpay-client'
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
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CreditCardIcon,
  LinkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid'
import {
  SERVICE_CATEGORIES,
  CLIENT_NICHE_CATEGORIES,
  EXPERIENCE_LEVELS,
  DISCOVERY_SOURCES,
} from '@/lib/onboarding-options'

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  FREELANCER: 'Freelancer',
  AGENCY: 'Agency',
}

const PLAN_CREDITS: Record<string, number> = {
  FREE: 50,
  FREELANCER: 1000,
  AGENCY: 1000,
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout, firebaseUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name || '')

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // Password Reset Email State
  const [resetEmailLoading, setResetEmailLoading] = useState(false)
  const [resetEmailCountdown, setResetEmailCountdown] = useState(0)

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
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91')
  const [phoneFormPhone, setPhoneFormPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneStep, setPhoneStep] = useState<'idle' | 'send' | 'verify'>('idle')
  const [otpCountdown, setOtpCountdown] = useState(0)

  const selectedPhoneCountry = useMemo(
    () => findCountryByDialCode(phoneCountryCode) || DEFAULT_COUNTRY,
    [phoneCountryCode],
  )
  const phoneValidation = useMemo(
    () => validatePhoneNumberLength(selectedPhoneCountry, phoneFormPhone),
    [selectedPhoneCountry, phoneFormPhone],
  )

  const { addToast } = useToast()
  const [billingLoading, setBillingLoading] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planCredits, setPlanCredits] = useState<Record<string, number>>(PLAN_CREDITS)

  // Payment History State
  const [payments, setPayments] = useState<Array<{
    id: string
    createdAt: string
    amount: number
    currency: string
    status: string
    itemType: 'plan' | 'topup'
    itemLabel: string
    paymentId: string
    orderId: string
    tokensAdded: number
  }>>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Profile & Socials State (settings editor for the onboarding data)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [pfLinkedin, setPfLinkedin] = useState('')
  const [pfPortfolio, setPfPortfolio] = useState('')
  const [pfWebsite, setPfWebsite] = useState('')
  const [pfTwitter, setPfTwitter] = useState('')
  const [pfInstagram, setPfInstagram] = useState('')
  const [pfGithub, setPfGithub] = useState('')
  const [pfDribbble, setPfDribbble] = useState('')
  const [pfBehance, setPfBehance] = useState('')
  const [pfServices, setPfServices] = useState<string[]>([])
  const [pfNiches, setPfNiches] = useState<string[]>([])
  const [pfExperience, setPfExperience] = useState('')
  const [pfDiscovery, setPfDiscovery] = useState('')
  const [openServiceGroups, setOpenServiceGroups] = useState<string[]>(['dev'])
  const [openNicheGroups, setOpenNicheGroups] = useState<string[]>(['tech'])

  useEffect(() => {
    let active = true
    async function loadProfile() {
      try {
        const token = await getFirebaseToken()
        if (!token) return
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => null)
        const d = json?.data
        if (active && d) {
          setPfLinkedin(d.linkedin || '')
          setPfPortfolio(d.portfolio || '')
          setPfWebsite(d.website || '')
          setPfTwitter(d.twitter || '')
          setPfInstagram(d.instagram || '')
          setPfGithub(d.github || '')
          setPfDribbble(d.dribbble || '')
          setPfBehance(d.behance || '')
          setPfServices(Array.isArray(d.servicesOffered) ? d.servicesOffered : [])
          setPfNiches(Array.isArray(d.preferredLeadCategories) ? d.preferredLeadCategories : [])
          setPfExperience(d.outreachExperience || '')
          setPfDiscovery(d.discoverySource || '')
        }
      } catch (err) {
        console.error('Failed to load profile & socials:', err)
      } finally {
        if (active) setProfileLoading(false)
      }
    }
    loadProfile()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    async function loadPayments() {
      try {
        const token = await getFirebaseToken()
        if (!token) return
        const res = await fetch('/api/user/payments', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (json.success && Array.isArray(json.payments)) {
          setPayments(json.payments)
        }
      } catch (err) {
        console.error('Failed to load user payments:', err)
      } finally {
        setLoadingPayments(false)
      }
    }
    loadPayments()
  }, [])

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.plans)) {
          const map: Record<string, number> = { ...PLAN_CREDITS }
          data.data.plans.forEach((p: any) => {
            if (p.id && typeof p.credits === 'number') {
              map[p.id.toUpperCase()] = p.credits
            }
          })
          setPlanCredits(map)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (otpCountdown <= 0) return
    const id = setInterval(() => setOtpCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [otpCountdown])

  useEffect(() => {
    if (resetEmailCountdown <= 0) return
    const id = setInterval(() => setResetEmailCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [resetEmailCountdown])

  const isGoogleUser = useMemo(() => {
    if (!firebaseUser?.providerData?.length) return false
    const hasGoogle = firebaseUser.providerData.some((p) => p.providerId === 'google.com')
    const hasPassword = firebaseUser.providerData.some((p) => p.providerId === 'password')
    return hasGoogle && !hasPassword
  }, [firebaseUser])

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
    if (!phoneValidation.valid) {
      setPhoneError(phoneValidation.message || 'Please enter a valid phone number')
      return
    }
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const verifier = verifierRef.current
      if (!verifier) {
        setPhoneError('Could not initialize verification. Please try again.')
        return
      }
      const fullPhone = `${phoneCountryCode}${phoneFormPhone.trim()}`
      const normalized = normalizePhone(fullPhone)
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

      const fullPhone = `${phoneCountryCode}${phoneFormPhone.trim()}`
      const normalized = normalizePhone(fullPhone)

      const token = await auth.currentUser?.getIdToken().catch(() => null)
      if (token) {
        await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phone: normalized }),
        }).catch(() => {})
      }

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    const trimmedCurrent = currentPassword.trim()
    const trimmedNew = newPassword.trim()
    const trimmedConfirm = confirmPassword.trim()

    if (!trimmedCurrent) {
      setPasswordError('Please enter your current password.')
      return
    }
    if (!trimmedNew) {
      setPasswordError('Please enter a new password.')
      return
    }
    if (trimmedNew.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }
    if (trimmedNew === trimmedCurrent) {
      setPasswordError('New password must be different from your current password.')
      return
    }
    if (trimmedNew !== trimmedConfirm) {
      setPasswordError('New passwords do not match.')
      return
    }

    const email = firebaseUser?.email || user?.email
    if (!firebaseUser || !email) {
      setPasswordError('Authentication session not found. Please reload the page.')
      return
    }

    setPasswordLoading(true)
    try {
      // 1. Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(email, trimmedCurrent)
      await reauthenticateWithCredential(firebaseUser, credential)

      // 2. Update password in Firebase
      await updatePassword(firebaseUser, trimmedNew)

      // 3. Clear inputs & indicate success
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Password successfully updated!')
      addToast({ type: 'success', message: 'Your password has been changed successfully.' })
    } catch (err: any) {
      const code = err?.code || ''
      let friendlyMsg = 'Failed to update password. Please check your credentials and try again.'
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        friendlyMsg = 'The current password you entered is incorrect.'
      } else if (code === 'auth/weak-password') {
        friendlyMsg = 'The new password must be at least 6 characters long.'
      } else if (code === 'auth/requires-recent-login') {
        friendlyMsg = 'For security, please sign out and sign back in before changing your password.'
      } else if (code === 'auth/too-many-requests') {
        friendlyMsg = 'Too many attempts. Please wait a few moments and try again.'
      } else if (code === 'auth/network-request-failed') {
        friendlyMsg = 'Network error. Please check your connection and try again.'
      }
      setPasswordError(friendlyMsg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSendResetEmail = async () => {
    const email = firebaseUser?.email || user?.email
    if (!email) {
      addToast({ type: 'error', message: 'No registered email found.' })
      return
    }
    setPasswordError('')
    setPasswordSuccess('')
    setResetEmailLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailCountdown(60)
      setPasswordSuccess(`Password reset link sent to ${email}. Check your inbox!`)
      addToast({
        type: 'success',
        message: `Password reset link sent to ${email}.`,
      })
    } catch (err: any) {
      const code = err?.code || ''
      let friendlyMsg = 'Failed to send password reset email. Please try again.'
      if (code === 'auth/too-many-requests') {
        friendlyMsg = 'Too many requests. Please wait a moment before trying again.'
      } else if (code === 'auth/user-not-found') {
        friendlyMsg = 'No user account found with this email address.'
      }
      setPasswordError(friendlyMsg)
      addToast({ type: 'error', message: friendlyMsg })
    } finally {
      setResetEmailLoading(false)
    }
  }

  const handleSaveProfile = () => {
    setIsEditing(false)
  }

  const toggleProfileItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]

  const toggleServiceGroup = (id: string) =>
    setOpenServiceGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    )

  const toggleNicheGroup = (id: string) =>
    setOpenNicheGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    )

  const toggleAllServiceGroups = () =>
    setOpenServiceGroups((prev) =>
      prev.length === SERVICE_CATEGORIES.length ? [] : SERVICE_CATEGORIES.map((c) => c.id),
    )

  const toggleAllNicheGroups = () =>
    setOpenNicheGroups((prev) =>
      prev.length === CLIENT_NICHE_CATEGORIES.length
        ? []
        : CLIENT_NICHE_CATEGORIES.map((c) => c.id),
    )

  const handleSaveSocials = async () => {
    if (!pfLinkedin.trim()) {
      addToast({ type: 'error', message: 'LinkedIn profile link is required.' })
      return
    }
    if (pfServices.length === 0) {
      addToast({ type: 'error', message: 'Select at least one service you offer.' })
      return
    }
    if (pfNiches.length === 0) {
      addToast({ type: 'error', message: 'Select at least one target client niche.' })
      return
    }
    if (!pfExperience) {
      addToast({ type: 'error', message: 'Select your outreach experience.' })
      return
    }
    if (!pfDiscovery) {
      addToast({ type: 'error', message: 'Select how you discovered us.' })
      return
    }

    setProfileSaving(true)
    try {
      const token = await getFirebaseToken()
      if (!token) {
        addToast({ type: 'error', message: 'Authentication session not found. Please reload the page.' })
        return
      }
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          linkedin: pfLinkedin.trim(),
          portfolio: pfPortfolio.trim(),
          website: pfWebsite.trim(),
          twitter: pfTwitter.trim(),
          instagram: pfInstagram.trim(),
          github: pfGithub.trim(),
          dribbble: pfDribbble.trim(),
          behance: pfBehance.trim(),
          servicesOffered: pfServices,
          preferredLeadCategories: pfNiches,
          outreachExperience: pfExperience,
          discoverySource: pfDiscovery,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        addToast({
          type: 'error',
          message: json?.message || 'Failed to update profile & socials.',
        })
        return
      }
      addToast({ type: 'success', message: 'Profile & socials updated.' })
    } catch {
      addToast({ type: 'error', message: 'Network error. Please try again.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const startCheckout = async (plan: string, mode: 'one_time' | 'subscription') => {
    setBillingLoading(true)
    try {
      const token = await getFirebaseToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan, mode }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        addToast({ type: 'error', message: json.message || 'Checkout is unavailable right now.' })
        return
      }
      const orderData = json.data || json
      const checkoutKey =
        mode === 'subscription' && orderData.subscription_id
          ? { subscription_id: orderData.subscription_id }
          : { order_id: orderData.order_id || orderData.id }
      const result = await openRazorpayCheckout({
        key: orderData.key_id,
        ...checkoutKey,
        amount: (orderData.amount ?? 0) * 100,
        currency: orderData.currency || 'INR',
        name: orderData.name || 'Lead Hunter Club',
        description: orderData.description || (mode === 'subscription' ? 'Plan subscription' : 'One-time credits'),
        prefill: orderData.prefill || { name: user?.name, email: user?.email },
        theme: { color: '#7c3aed' },
      })
      if (result.succeeded) {
        addToast({
          type: 'success',
          message: 'Payment received: your credits will update shortly.',
        })
      } else if (result.canceled) {
        addToast({ type: 'error', message: 'Checkout was cancelled.' })
      }
    } catch {
      addToast({ type: 'error', message: 'Checkout failed. Please try again.' })
    } finally {
      setBillingLoading(false)
    }
  }

  const handleRefillCredits = () => {
    router.push('/pricing?tab=refills')
  }

  const handleChangePlan = (_planId?: string) => {
    setPlanModalOpen(false)
    router.push('/pricing')
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancel your subscription? Your plan will reset to Free.')) return
    setBillingLoading(true)
    try {
      const token = await getFirebaseToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/payments/razorpay/cancel', {
        method: 'POST',
        headers,
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({ type: 'success', message: json.message })
        window.location.reload()
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to cancel subscription.' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error during cancellation.' })
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-8 pb-28 md:py-12 relative scrollbar-hide">
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
            className="metallic-card p-6 sm:p-8"
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

          {/* Profile & Socials Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="metallic-card p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center shrink-0">
                  <LinkIcon className="w-6 h-6 text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-text-primary">Profile & Socials</h2>
                  <p className="text-sm text-text-secondary">
                    Your links, services & target niches
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveSocials}
                disabled={profileLoading || profileSaving}
                className="px-5 py-2.5 rounded-xl bg-accent-mint text-text-on-accent text-xs font-bold hover:bg-accent-mint/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {profileSaving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                ) : profileLoading ? (
                  'Loading...'
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

            {profileLoading ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-accent-mint/20 border-t-accent-mint animate-spin" />
                <span className="text-xs text-text-secondary">Loading your profile...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      LinkedIn Profile <span className="text-accent-mint">*</span>
                      <span className="ml-2 text-[10px] text-accent-mint font-bold normal-case">
                        Required
                      </span>
                    </label>
                    <input
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      value={pfLinkedin}
                      onChange={(e) => setPfLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/your-profile"
                      className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all placeholder:text-text-secondary/40"
                    />
                  </div>

                  {[
                    {
                      label: 'Portfolio',
                      placeholder: 'https://your-portfolio.com',
                      value: pfPortfolio,
                      set: setPfPortfolio,
                    },
                    {
                      label: 'Website',
                      placeholder: 'https://your-company.com',
                      value: pfWebsite,
                      set: setPfWebsite,
                    },
                    {
                      label: 'X / Twitter',
                      placeholder: 'https://twitter.com/your-handle',
                      value: pfTwitter,
                      set: setPfTwitter,
                    },
                    {
                      label: 'Instagram',
                      placeholder: 'https://instagram.com/your-handle',
                      value: pfInstagram,
                      set: setPfInstagram,
                    },
                    {
                      label: 'GitHub',
                      placeholder: 'https://github.com/your-handle',
                      value: pfGithub,
                      set: setPfGithub,
                    },
                    {
                      label: 'Dribbble',
                      placeholder: 'https://dribbble.com/your-handle',
                      value: pfDribbble,
                      set: setPfDribbble,
                    },
                    {
                      label: 'Behance',
                      placeholder: 'https://behance.net/your-profile',
                      value: pfBehance,
                      set: setPfBehance,
                    },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                        {field.label}
                      </label>
                      <input
                        type="url"
                        inputMode="url"
                        value={field.value}
                        onChange={(e) => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all placeholder:text-text-secondary/40"
                      />
                    </div>
                  ))}
                </div>

                {/* Services you offer */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Services you offer <span className="text-accent-mint">*</span>
                      {pfServices.length > 0 && (
                        <span className="ml-2 text-accent-mint font-bold normal-case">
                          ({pfServices.length} selected)
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllServiceGroups}
                      className="text-[11px] text-text-secondary/60 hover:text-accent-mint transition-colors font-medium"
                    >
                      {openServiceGroups.length === SERVICE_CATEGORIES.length
                        ? 'Collapse all'
                        : 'Expand all'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {SERVICE_CATEGORIES.map((cat) => {
                      const isOpen = openServiceGroups.includes(cat.id)
                      const selectedCount = cat.items.filter((item) =>
                        pfServices.includes(item),
                      ).length
                      return (
                        <div
                          key={cat.id}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                            selectedCount > 0
                              ? 'border-accent-mint/30 bg-accent-mint/[0.03]'
                              : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleServiceGroup(cat.id)}
                            className="w-full px-3.5 py-3 min-h-[44px] flex items-center justify-between text-left transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base leading-none">{cat.icon}</span>
                              <span className="text-xs font-semibold text-text-primary tracking-tight">
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {selectedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-accent-mint/15 border border-accent-mint/30 text-accent-mint text-[10px] font-bold">
                                  {selectedCount} selected
                                </span>
                              )}
                              <ChevronDownIcon
                                className={`w-3.5 h-3.5 text-text-secondary/60 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180 text-accent-mint' : ''
                                }`}
                              />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3.5 pt-1 flex flex-wrap gap-1.5 border-t border-white/[0.04]">
                              {cat.items.map((s) => {
                                const isSelected = pfServices.includes(s)
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setPfServices(toggleProfileItem(pfServices, s))}
                                    className={`px-3 py-2 min-h-[36px] rounded-xl text-xs font-medium border transition-all duration-200 ${
                                      isSelected
                                        ? 'bg-accent-mint/15 border-accent-mint/40 text-accent-mint font-semibold'
                                        : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5 hover:border-white/10'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Target Client Niches */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Target Client Niches <span className="text-accent-mint">*</span>
                      {pfNiches.length > 0 && (
                        <span className="ml-2 text-accent-mint font-bold normal-case">
                          ({pfNiches.length} selected)
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={toggleAllNicheGroups}
                      className="text-[11px] text-text-secondary/60 hover:text-accent-mint transition-colors font-medium"
                    >
                      {openNicheGroups.length === CLIENT_NICHE_CATEGORIES.length
                        ? 'Collapse all'
                        : 'Expand all'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {CLIENT_NICHE_CATEGORIES.map((cat) => {
                      const isOpen = openNicheGroups.includes(cat.id)
                      const selectedCount = cat.items.filter((item) =>
                        pfNiches.includes(item),
                      ).length
                      return (
                        <div
                          key={cat.id}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                            selectedCount > 0
                              ? 'border-accent-mint/30 bg-accent-mint/[0.03]'
                              : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleNicheGroup(cat.id)}
                            className="w-full px-3.5 py-3 min-h-[44px] flex items-center justify-between text-left transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base leading-none">{cat.icon}</span>
                              <span className="text-xs font-semibold text-text-primary tracking-tight">
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {selectedCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-accent-mint/15 border border-accent-mint/30 text-accent-mint text-[10px] font-bold">
                                  {selectedCount} selected
                                </span>
                              )}
                              <ChevronDownIcon
                                className={`w-3.5 h-3.5 text-text-secondary/60 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180 text-accent-mint' : ''
                                }`}
                              />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3.5 pt-1 flex flex-wrap gap-1.5 border-t border-white/[0.04]">
                              {cat.items.map((c) => {
                                const isSelected = pfNiches.includes(c)
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setPfNiches(toggleProfileItem(pfNiches, c))}
                                    className={`px-3 py-2 min-h-[36px] rounded-xl text-xs font-medium border transition-all duration-200 ${
                                      isSelected
                                        ? 'bg-accent-mint/15 border-accent-mint/40 text-accent-mint font-semibold'
                                        : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5 hover:border-white/10'
                                    }`}
                                  >
                                    {c}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Experience + discovery source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      Outreach experience <span className="text-accent-mint">*</span>
                    </label>
                    <select
                      value={pfExperience}
                      onChange={(e) => setPfExperience(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all"
                    >
                      <option value="" disabled>
                        Select your experience level
                      </option>
                      {EXPERIENCE_LEVELS.map((el) => (
                        <option key={el.value} value={el.value} className="bg-[#161718] text-white">
                          {el.label}
                        </option>
                      ))}
                      {pfExperience &&
                        !EXPERIENCE_LEVELS.some((el) => el.value === pfExperience) && (
                          <option value={pfExperience} className="bg-[#161718] text-white">
                            {pfExperience}
                          </option>
                        )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      How you found us <span className="text-accent-mint">*</span>
                    </label>
                    <select
                      value={pfDiscovery}
                      onChange={(e) => setPfDiscovery(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all"
                    >
                      <option value="" disabled>
                        Select how you found us
                      </option>
                      {DISCOVERY_SOURCES.map((src) => (
                        <option key={src} value={src} className="bg-[#161718] text-white">
                          {src}
                        </option>
                      ))}
                      {pfDiscovery && !DISCOVERY_SOURCES.includes(pfDiscovery) && (
                        <option value={pfDiscovery} className="bg-[#161718] text-white">
                          {pfDiscovery}
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <p className="text-xxs text-text-secondary/50">
                  These details come from your sign-up application and help us match you with the
                  right leads. LinkedIn and the starred fields are required.
                </p>
              </div>
            )}
          </motion.div>

          {/* Phone Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="metallic-card p-6 sm:p-8"
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
                    <div className="flex flex-col gap-1.5 max-w-sm">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Phone number
                        </label>
                        <span className="text-[11px] text-text-secondary/70">
                          {selectedPhoneCountry.name} ({selectedPhoneCountry.digits ? `${selectedPhoneCountry.digits} digits` : `${selectedPhoneCountry.minDigits}-${selectedPhoneCountry.maxDigits} digits`})
                        </span>
                      </div>

                      <PhoneInputWithCountry
                        countryCode={phoneCountryCode}
                        onCountryCodeChange={(code) => {
                          setPhoneCountryCode(code)
                          setPhoneError('')
                        }}
                        phoneNumber={phoneFormPhone}
                        onPhoneNumberChange={(num) => {
                          setPhoneFormPhone(num)
                          setPhoneError('')
                        }}
                        error={phoneError}
                      />

                      {phoneFormPhone.trim().length > 0 && (
                        <p
                          className={`text-xs mt-0.5 flex items-center gap-1 ${
                            phoneValidation.valid ? 'text-accent-mint' : 'text-red-400'
                          }`}
                        >
                          {phoneValidation.valid ? (
                            <>
                              <span aria-hidden>✓</span> Valid {selectedPhoneCountry.name} phone number
                            </>
                          ) : (
                            phoneValidation.message
                          )}
                        </p>
                      )}
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

          {/* Password & Security Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="metallic-card p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-surface-secondary border border-border-subtle flex items-center justify-center">
                  <KeyIcon className="w-6 h-6 text-text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Password & Security</h2>
                  <p className="text-sm text-text-secondary">Manage your password and authentication</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-text-secondary border border-white/10">
                {isGoogleUser ? 'Google Account' : 'Password Protected'}
              </span>
            </div>

            {isGoogleUser ? (
              <div className="p-5 rounded-2xl bg-surface-elevated/50 border border-subtle/50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheckIcon className="w-5 h-5 text-accent-mint" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Authenticated via Google</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    You signed in using Google (<span className="text-text-primary font-medium">{firebaseUser?.email || user?.email}</span>). Your password is authenticated and protected directly by Google, so password changes are handled through your Google Account settings.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordSuccess && (
                  <div className="p-3.5 rounded-xl bg-accent-mint/10 border border-accent-mint/20 text-xs text-accent-mint flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                    <ShieldExclamationIcon className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value)
                          setPasswordError('')
                          setPasswordSuccess('')
                        }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all placeholder:text-text-secondary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text-primary transition-colors"
                        tabIndex={-1}
                        aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          setPasswordError('')
                          setPasswordSuccess('')
                        }}
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all placeholder:text-text-secondary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text-primary transition-colors"
                        tabIndex={-1}
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setPasswordError('')
                          setPasswordSuccess('')
                        }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-elevated border border-subtle text-text-primary text-sm outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all placeholder:text-text-secondary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/60 hover:text-text-primary transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={
                      passwordLoading ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }
                    className="px-6 py-2.5 rounded-xl bg-accent-mint text-text-on-accent text-sm font-bold hover:bg-accent-mint/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--rgb-primary),0.2)]"
                  >
                    {passwordLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    ) : (
                      'Update Password'
                    )}
                  </button>

                  <div className="text-xs text-text-secondary flex items-center gap-1.5 flex-wrap">
                    <span>Forgot your current password?</span>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={resetEmailLoading || resetEmailCountdown > 0}
                      className="text-accent-mint hover:underline font-semibold disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                    >
                      {resetEmailLoading ? (
                        'Sending link...'
                      ) : resetEmailCountdown > 0 ? (
                        `Resend reset email in ${resetEmailCountdown}s`
                      ) : (
                        'Send reset email'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>

          {/* Credits & Tokens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="metallic-card p-6 sm:p-8"
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
                Credits are consumed when revealing lead identities: the exact cost depends on the
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

            <Link
              href="/pricing?tab=refills"
              className="w-full py-3.5 rounded-xl bg-accent-purple text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-secondary transition-all shadow-[0_0_20px_rgba(var(--rgb-tab-purple),0.15)] hover:bg-accent-purple/90"
            >
              <BoltIcon className="w-4 h-4" />
              Refill Credits
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Subscription */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="metallic-card p-6 sm:p-8"
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
                    {planCredits[user?.plan || 'FREE'] || user?.creditAccount?.subscriptionBalance || 1000} credits/mo
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
              <Link
                href="/pricing"
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all text-center flex items-center justify-center"
              >
                Change Plan
              </Link>
              <button
                onClick={handleCancelSubscription}
                disabled={billingLoading}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-xs font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Subscription
              </button>
            </div>

            {planModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setPlanModalOpen(false)}
              >
                <div
                  className="metallic-card p-6 sm:p-8 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-text-primary">Choose a Plan</h3>
                    <button
                      onClick={() => setPlanModalOpen(false)}
                      className="text-text-secondary hover:text-text-primary text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleChangePlan('FREELANCER')}
                      disabled={billingLoading}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/[0.06] hover:border-accent-purple/40 transition-all text-left disabled:opacity-50"
                    >
                      <div>
                        <div className="text-sm font-bold text-text-primary">Freelancer</div>
                        <div className="text-xs text-text-secondary mt-1">{planCredits['FREELANCER'] || 1000} credits / month</div>
                      </div>
                      <div className="text-sm font-bold text-accent-purple">₹999/mo</div>
                    </button>
                    <button
                      onClick={() => {
                        setPlanModalOpen(false)
                        addToast({ type: 'error', message: 'Agency plan is available on request: contact support.' })
                      }}
                      className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/[0.06] hover:border-accent-purple/40 transition-all text-left"
                    >
                      <div>
                        <div className="text-sm font-bold text-text-primary">Agency</div>
                        <div className="text-xs text-text-secondary mt-1">{planCredits['AGENCY'] || 1000} credits / month</div>
                      </div>
                      <div className="text-sm font-bold text-accent-purple">Contact us</div>
                    </button>
                  </div>
                  <p className="text-xxs text-text-secondary/60 mt-5">
                    You&apos;ll be taken to a secure Razorpay checkout to complete your subscription.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Payment & Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="metallic-card p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent-mint/10 border border-accent-mint/20 flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-accent-mint" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Payment History</h2>
                  <p className="text-sm text-text-secondary">Your subscription and credit refill transactions</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-text-secondary">
                {payments.length} Transaction{payments.length === 1 ? '' : 's'}
              </span>
            </div>

            {loadingPayments ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-accent-mint/20 border-t-accent-mint animate-spin" />
                <span className="text-xs text-text-secondary">Loading payment records...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-elevated/40 border border-subtle/50 text-center">
                <CreditCardIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-primary">No payment history yet</p>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  When you purchase a subscription or refill credits, your payment records, receipts, and Razorpay transaction IDs will be displayed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-text-secondary/70 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3 font-semibold">Date & Time</th>
                      <th className="pb-3 px-3 font-semibold">Description</th>
                      <th className="pb-3 px-3 font-semibold">Amount</th>
                      <th className="pb-3 px-3 font-semibold">Payment ID</th>
                      <th className="pb-3 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3 text-text-secondary whitespace-nowrap">
                          {new Date(p.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-text-primary block">{p.itemLabel}</span>
                          {p.tokensAdded > 0 && (
                            <span className="text-[10px] text-accent-mint font-medium">
                              +{p.tokensAdded} Credits
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-text-primary text-sm">
                            ₹{p.amount?.toLocaleString('en-IN') || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-text-secondary">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-text-primary font-medium">{p.paymentId}</span>
                            {p.orderId && p.orderId !== '—' && (
                              <span className="text-[10px] text-text-secondary/60">Order: {p.orderId}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircleIcon className="w-3 h-3" />
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="metallic-card p-6 sm:p-8 border-red-500/10 bg-red-500/[0.02]"
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
