'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api/client'
import { normalizePhone } from '@/lib/phone'
import {
  auth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  sendEmailVerification,
  type ConfirmationResult,
} from '@/lib/firebase'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/solid'

const SERVICES = [
  // Development
  'Web Development',
  'Mobile App Development',
  'Software Development',
  'API Development & Integration',
  'E-commerce Development',
  'WordPress Development',
  'CRM Development & Integration',
  'Cloud Infrastructure (AWS/GCP/Azure)',
  'DevOps & CI/CD',
  'Database Design & Management',
  'AI / Machine Learning',
  // Design
  'UI/UX Design',
  'Graphic Design',
  'Brand Identity & Logo Design',
  'Packaging Design',
  'Print Design',
  'Motion Graphics',
  '3D Modeling & Animation',
  'Product Design',
  'Presentation Design',
  'Illustration',
  // Marketing
  'SEO / Growth',
  'Social Media Management',
  'Email Marketing',
  'Paid Ads (Google/Meta/etc.)',
  'Content Marketing',
  'Influencer Marketing',
  'Affiliate Marketing',
  'Marketing Automation',
  'Conversion Rate Optimization (CRO)',
  // Content
  'Copywriting',
  'Video Production',
  'Photography',
  'Podcast Production',
  'Technical Writing',
  'Scriptwriting',
  // Business
  'Marketing Strategy',
  'Sales Consulting',
  'Business Consulting',
  'Lead Generation',
  'Data Analysis & Analytics',
  'Project Management',
  'Brand Strategy',
  'CRM Setup & Management',
  'Other',
]

const LEAD_CATEGORIES = [
  'SaaS',
  'E-commerce',
  'Agency',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Education',
  'Enterprise',
  'B2B Services',
  'DTC / Consumer',
  'Marketplaces',
  'Other',
]

const EXPERIENCE_LEVELS = [
  { value: 'none', label: 'No experience yet' },
  { value: 'beginner', label: 'Beginner (1-3 months)' },
  { value: 'intermediate', label: 'Intermediate (3-12 months)' },
  { value: 'advanced', label: 'Advanced (1-3 years)' },
  { value: 'expert', label: 'Expert (3+ years)' },
]

const DISCOVERY_SOURCES = [
  'Twitter / X',
  'LinkedIn',
  'Instagram',
  'Meta Ads (Facebook/Instagram)',
  'Google Search',
  'Google Ads',
  'Friend / Referral',
  'YouTube',
  'TikTok',
  'Discord',
  'Podcast',
  'Newsletter',
  'Facebook Groups',
  'Indie Hackers',
  'Reddit',
  'Product Hunt',
  'Other',
]

const MAX_OTP_ATTEMPTS = 3

function OnboardingSkeleton() {
  return (
    <main className="min-h-screen bg-bg-main flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
              {s < 3 && <div className="w-12 h-px bg-white/5 animate-pulse" />}
            </div>
          ))}
        </div>
        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-4xl p-8 md:p-10">
          <div className="space-y-4">
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse mx-auto" />
            <div className="h-4 w-64 bg-white/5 rounded animate-pulse mx-auto" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse mt-6" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitRetry, setSubmitRetry] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [checkingVerification, setCheckingVerification] = useState(true)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [phoneError, setPhoneError] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState(0)

  const [portfolio, setPortfolio] = useState('')
  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [dribbble, setDribbble] = useState('')
  const [behance, setBehance] = useState('')
  const [github, setGithub] = useState('')
  const [twitter, setTwitter] = useState('')
  const [servicesOffered, setServicesOffered] = useState<string[]>([])
  const [preferredLeadCategories, setPreferredLeadCategories] = useState<string[]>([])
  const [outreachExperience, setOutreachExperience] = useState('')
  const [discoverySource, setDiscoverySource] = useState('')
  const [step1Error, setStep1Error] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_step')
    if (saved) setStep(parseInt(saved))
    const savedData = localStorage.getItem('onboarding_data')
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        setPortfolio(data.portfolio || '')
        setWebsite(data.website || '')
        setLinkedin(data.linkedin || '')
        setInstagram(data.instagram || '')
        setDribbble(data.dribbble || '')
        setBehance(data.behance || '')
        setGithub(data.github || '')
        setTwitter(data.twitter || '')
        setServicesOffered(data.servicesOffered || [])
        setPreferredLeadCategories(data.preferredLeadCategories || [])
        setOutreachExperience(data.outreachExperience || '')
        setDiscoverySource(data.discoverySource || '')
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (step < 1 || step > 3) return
    localStorage.setItem('onboarding_step', step.toString())
    const data = {
      portfolio,
      website,
      linkedin,
      instagram,
      dribbble,
      behance,
      github,
      twitter,
      servicesOffered,
      preferredLeadCategories,
      outreachExperience,
      discoverySource,
    }
    localStorage.setItem('onboarding_data', JSON.stringify(data))
  }, [step, portfolio, website, linkedin, instagram, dribbble, behance, github, twitter, servicesOffered, preferredLeadCategories, outreachExperience, discoverySource])

  useEffect(() => {
    if (otpCountdown <= 0) return
    const id = setInterval(() => setOtpCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [otpCountdown])

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
            setEmailVerified(true)
            setCheckingVerification(false)
            if (intervalId) clearInterval(intervalId)
          }
        } else if (active) {
          setCheckingVerification(false)
        }
      } catch {
        // retry next cycle
      }
    }

    if (auth.currentUser?.emailVerified) {
      setEmailVerified(true)
      setCheckingVerification(false)
    } else {
      refreshVerification()
      intervalId = setInterval(refreshVerification, 2000)
    }

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  const handleResendVerification = async () => {
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

  // OTP verification is temporarily disabled
  // OTP functions below are kept for future re-enablement

  if (loading) {
    return <OnboardingSkeleton />
  }

  if (!user) {
    router.push('/login')
    return null
  }

  if (checkingVerification) {
    return <OnboardingSkeleton />
  }

  if (!emailVerified) {
    return (
      <main className="min-h-dvh bg-bg-main flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.06)_0%,transparent_60%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 p-8 text-center"
        >
          <ShieldExclamationIcon className="w-10 h-10 text-accent-mint mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Verify your email</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            We sent a verification link to{' '}
            <strong className="text-text-primary">{auth.currentUser?.email}</strong>. Please verify
            your email to continue setting up your account.
          </p>
          <p className="text-xs text-text-secondary/60 mt-3">
            Didn&apos;t receive it? Check your spam folder or click Resend.
          </p>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="px-5 py-3 rounded-xl bg-accent-mint hover:bg-accent-mint/90 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                setCheckingVerification(true)
                if (auth.currentUser) {
                  auth.currentUser
                    .reload()
                    .then(() => {
                      if (auth.currentUser?.emailVerified) {
                        setEmailVerified(true)
                      }
                    })
                    .catch(() => {})
                    .finally(() => setCheckingVerification(false))
                } else {
                  setCheckingVerification(false)
                }
              }}
              className="px-5 py-3 rounded-xl border border-white/[0.06] text-text-secondary text-sm font-medium hover:bg-white/[0.04] transition-all"
            >
              I&apos;ve verified &mdash; refresh
            </button>
          </div>
        </motion.div>
      </main>
    )
  }

  const createRecaptchaVerifier = async (): Promise<RecaptchaVerifier | null> => {
    for (let i = 0; i < 20; i++) {
      const el = document.getElementById('recaptcha-container')
      if (el) {
        return new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      await new Promise((r) => setTimeout(r, 100))
    }
    return null
  }

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const normalized = normalizePhone(phoneNumber.trim())
      const verifier = await createRecaptchaVerifier()
      if (!verifier) {
        setPhoneError('Recaptcha failed to load. You can skip this step and add phone later.')
        return
      }
      const result = await signInWithPhoneNumber(auth, normalized, verifier)
      setConfirmationResult(result)
      setOtpCountdown(60)
    } catch {
      setPhoneError('Failed to send OTP. Check the phone number and try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setConfirmationResult(null)
    setVerificationCode('')
    setPhoneError('')
  }

  const handleVerifyOtp = async () => {
    if (!verificationCode.trim() || !confirmationResult) return
    setPhoneLoading(true)
    setPhoneError('')
    try {
      const cred = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode.trim(),
      )
      await linkWithCredential(auth.currentUser!, cred)
    } catch {
      setOtpAttempts((c) => c + 1)
      setPhoneError('Invalid verification code. Please try again.')
    } finally {
      setPhoneLoading(false)
    }
  }

  // handleSkipPhone removed — OTP is temporarily disabled

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]

  const canProceedFromStep2 =
    servicesOffered.length > 0 && preferredLeadCategories.length > 0 && outreachExperience !== ''

  const handleSubmit = async () => {
    if (!discoverySource) return
    if (!phoneNumber.trim()) { setError('Phone number is required'); return }
    if (!portfolio && !website && !linkedin && !instagram && !dribbble && !behance && !github && !twitter) {
      setError('At least one profile link is required'); return
    }
    if (servicesOffered.length === 0) { setError('Select at least one service'); return }
    if (preferredLeadCategories.length === 0) { setError('Select at least one lead category'); return }
    if (!outreachExperience) { setError('Select your outreach experience'); return }

    setIsSubmitting(true)
    setError('')
    setSubmitRetry(false)

    try {
      await api.post('/onboarding', {
        phone: phoneNumber,
        portfolio: portfolio || undefined,
        website: website || undefined,
        linkedin: linkedin || undefined,
        instagram: instagram || undefined,
        dribbble: dribbble || undefined,
        behance: behance || undefined,
        github: github || undefined,
        twitter: twitter || undefined,
        servicesOffered,
        preferredLeadCategories,
        outreachExperience,
        discoverySource,
      })
      localStorage.removeItem('onboarding_step')
      localStorage.removeItem('onboarding_data')
      router.push('/pending-approval')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit onboarding')
      setSubmitRetry(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-bg-main flex flex-col items-center justify-start px-4 relative overflow-y-auto pt-12 pb-8 scrollbar-hide">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-accent-mint),0.06)_0%,transparent_60%)] pointer-events-none" />

      {step > 1 && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setStep(step - 1)}
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors group"
        >
          <ArrowLeftIcon className="w-[14px] h-[14px] group-hover:-translate-x-0.5 transition-transform" />
          Back
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s < step
                    ? 'bg-accent-mint text-black'
                    : s === step
                      ? 'bg-accent-mint text-white shadow-[0_0_16px_rgba(var(--rgb-accent-mint),0.3)]'
                      : 'bg-white/5 text-text-secondary/40'
                }`}
              >
                {s < step ? <CheckCircleIcon className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-px transition-all duration-300 ${
                    s < step ? 'bg-accent-mint' : 'bg-white/5'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 w-full p-8 md:p-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <SparklesIcon className="w-8 h-8 text-accent-mint mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      Let&apos;s set up your profile
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      Add your profile links so leads know who they&apos;re talking to
                    </p>
                    <p className="text-xs text-accent-mint mt-1 font-medium">
                      At least one profile link required
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Portfolio URL
                      </label>
                      <input
                        value={portfolio}
                        onChange={(e) => { setPortfolio(e.target.value); setStep1Error('') }}
                        placeholder="https://your-portfolio.com"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Website
                      </label>
                      <input
                        value={website}
                        onChange={(e) => { setWebsite(e.target.value); setStep1Error('') }}
                        placeholder="https://your-company.com"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        LinkedIn
                      </label>
                      <input
                        value={linkedin}
                        onChange={(e) => { setLinkedin(e.target.value); setStep1Error('') }}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Instagram
                      </label>
                      <input
                        value={instagram}
                        onChange={(e) => { setInstagram(e.target.value); setStep1Error('') }}
                        placeholder="https://instagram.com/your-handle"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Dribbble
                      </label>
                      <input
                        value={dribbble}
                        onChange={(e) => { setDribbble(e.target.value); setStep1Error('') }}
                        placeholder="https://dribbble.com/your-handle"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Behance
                      </label>
                      <input
                        value={behance}
                        onChange={(e) => { setBehance(e.target.value); setStep1Error('') }}
                        placeholder="https://behance.net/your-profile"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        GitHub
                      </label>
                      <input
                        value={github}
                        onChange={(e) => { setGithub(e.target.value); setStep1Error('') }}
                        placeholder="https://github.com/your-handle"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Twitter / X
                      </label>
                      <input
                        value={twitter}
                        onChange={(e) => { setTwitter(e.target.value); setStep1Error('') }}
                        placeholder="https://twitter.com/your-handle"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="border-t border-white/[0.06] pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Phone number <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setStep1Error('') }}
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                        />
                        <p className="text-xs text-text-secondary/60 mt-0.5">
                          We need this number to contact you, so provide your real number only
                        </p>
                      </div>
                    </div>
                  </div>

                  {step1Error && (
                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                      <ShieldExclamationIcon className="w-4 h-4 shrink-0" />
                      <span>{step1Error}</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const hasAnyLink = portfolio || website || linkedin || instagram || dribbble || behance || github || twitter
                      if (!hasAnyLink) {
                        setStep1Error('Please provide at least one profile link to continue')
                        return
                      }
                      if (!phoneNumber.trim()) {
                        setStep1Error('Phone number is required')
                        return
                      }
                      setStep1Error('')
                      setStep(2)
                    }}
                    className="mt-6 w-full bg-accent-mint hover:bg-accent-mint/90 text-white rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)] px-4 py-3 font-medium"
                  >
                    Continue
                  </button>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push('/login')}
                      className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <SparklesIcon className="w-8 h-8 text-accent-mint mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      What do you offer?
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      Help us match you with the right leads
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Services you offer
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SERVICES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setServicesOffered(toggleArrayItem(servicesOffered, s))}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                              servicesOffered.includes(s)
                                ? 'bg-accent-mint/20 border-accent-mint/40 text-accent-mint'
                                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Preferred lead categories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {LEAD_CATEGORIES.map((c) => (
                          <button
                            key={c}
                            onClick={() =>
                              setPreferredLeadCategories(
                                toggleArrayItem(preferredLeadCategories, c),
                              )
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                              preferredLeadCategories.includes(c)
                                ? 'bg-accent-mint/20 border-accent-mint/40 text-accent-mint'
                                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Outreach experience
                      </label>
                      <select
                        value={outreachExperience}
                        onChange={(e) => setOutreachExperience(e.target.value)}
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-4 py-3"
                      >
                        <option value="" disabled>
                          Select your experience level
                        </option>
                        {EXPERIENCE_LEVELS.map((el) => (
                          <option key={el.value} value={el.value}>
                            {el.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedFromStep2}
                    className={`mt-8 w-full rounded-xl active:scale-98 transition-all px-4 py-3 font-medium ${
                      canProceedFromStep2
                        ? 'bg-accent-mint hover:bg-accent-mint/90 text-white shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)]'
                        : 'bg-white/5 text-text-secondary/40 cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push('/login')}
                      className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-8">
                    <SparklesIcon className="w-8 h-8 text-accent-mint mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      Almost there!
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      One last thing — how did you find us?
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {DISCOVERY_SOURCES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setDiscoverySource(s)}
                          className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            discoverySource === s
                              ? 'bg-accent-mint/20 border-accent-mint/40 text-accent-mint'
                              : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                        <ShieldExclamationIcon className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                        {submitRetry && (
                          <button
                            onClick={handleSubmit}
                            className="ml-auto shrink-0 px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[11px] font-medium transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!discoverySource || isSubmitting}
                    className={`mt-8 w-full rounded-xl active:scale-98 transition-all px-4 py-3 font-medium flex items-center justify-center gap-2 ${
                      discoverySource && !isSubmitting
                        ? 'bg-accent-mint hover:bg-accent-mint/90 text-white shadow-[0_4px_20px_rgba(var(--rgb-accent-mint),0.15)]'
                        : 'bg-white/5 text-text-secondary/40 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>

                  <p className="text-xs text-text-secondary/40 text-center mt-4">
                    Your application will be reviewed by our team
                  </p>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => router.push('/login')}
                      className="text-xs text-text-secondary/40 hover:text-text-secondary transition-colors"
                    >
                      Back to login
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </motion.div>
    </main>
  )
}
