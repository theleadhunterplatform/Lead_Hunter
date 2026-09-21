'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api/client'
import { normalizePhone } from '@/lib/phone'
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry'
import { extractCountryAndLocalNumber } from '@/lib/countries'
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
  ChevronDownIcon,
} from '@heroicons/react/24/solid'

interface CategoryGroup {
  id: string
  name: string
  icon: string
  items: string[]
}

const SERVICE_CATEGORIES: CategoryGroup[] = [
  {
    id: 'dev',
    name: 'Development & Engineering',
    icon: '💻',
    items: [
      'Web Development',
      'Mobile App Development',
      'Software & Full-Stack',
      'AI & Machine Learning',
      'DevOps & Cloud Infrastructure',
      'WordPress & Webflow',
    ],
  },
  {
    id: 'design',
    name: 'Design & Creative',
    icon: '🎨',
    items: [
      'UI/UX & Product Design',
      'Graphic & Brand Identity',
      'Motion Graphics & 3D',
      'Packaging & Print Design',
      'Presentations & Pitch Decks',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Growth',
    icon: '🚀',
    items: [
      'SEO & Organic Growth',
      'Paid Ads (Google / Meta / TikTok)',
      'Social Media Marketing',
      'Email Marketing & Lifecycle',
      'Conversion Rate Optimization (CRO)',
      'Influencer & Affiliate Marketing',
    ],
  },
  {
    id: 'content',
    name: 'Content & Media',
    icon: '✍️',
    items: [
      'Copywriting & Messaging',
      'Content Marketing & SEO Blogs',
      'Video Production & Editing',
      'Podcast & Audio Production',
      'Technical Writing',
    ],
  },
  {
    id: 'sales',
    name: 'Sales & Business Operations',
    icon: '💼',
    items: [
      'Lead Generation & Cold Outreach',
      'Sales Consulting & GTM Strategy',
      'CRM & Workflow Automation',
      'Data Analytics & Business Intelligence',
      'Project Management',
    ],
  },
]

const CLIENT_NICHE_CATEGORIES: CategoryGroup[] = [
  {
    id: 'tech',
    name: 'Tech & Software',
    icon: '⚡',
    items: [
      'B2B SaaS',
      'AI & DeepTech',
      'Mobile Apps & Marketplaces',
      'FinTech & InsurTech',
      'DevTools & Infrastructure',
    ],
  },
  {
    id: 'commerce',
    name: 'E-Commerce & Retail',
    icon: '🛍️',
    items: [
      'DTC Brands & E-commerce',
      'Amazon & Marketplace Sellers',
      'Fashion, Apparel & Luxury',
      'Food & Beverage / CPG',
    ],
  },
  {
    id: 'professional',
    name: 'Professional & B2B Services',
    icon: '🏢',
    items: [
      'Agencies & Consultancies',
      'Corporate & Enterprise Services',
      'Financial & Legal Services',
      'Logistics & Supply Chain',
    ],
  },
  {
    id: 'real-estate',
    name: 'Real Estate & Construction',
    icon: '🏡',
    items: [
      'Commercial & Residential Real Estate',
      'Property Management & Development',
      'Home Services & Contractors',
      'Architecture & Interior Design',
    ],
  },
  {
    id: 'health-edu',
    name: 'Health, Wellness & Education',
    icon: '🩺',
    items: [
      'Healthcare & Medical Practices',
      'HealthTech & Digital Health',
      'Fitness, Wellness & Beauty',
      'EdTech & Online Learning',
    ],
  },
  {
    id: 'other',
    name: 'Other Sectors',
    icon: '🌐',
    items: [
      'Web3 & Crypto',
      'Non-Profit & Social Impact',
      'Hospitality, Travel & Leisure',
      'Media, Entertainment & Gaming',
      'Other',
    ],
  },
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

function formatUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

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

  const [countryCode, setCountryCode] = useState('+91')
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
  const [openServices, setOpenServices] = useState<string[]>(['dev'])
  const [openNiches, setOpenNiches] = useState<string[]>(['tech'])

  const toggleOpenService = (id: string) => {
    setOpenServices((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id],
    )
  }

  const toggleOpenNiche = (id: string) => {
    setOpenNiches((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id],
    )
  }

  const toggleAllServices = () => {
    if (openServices.length === SERVICE_CATEGORIES.length) {
      setOpenServices([])
    } else {
      setOpenServices(SERVICE_CATEGORIES.map((c) => c.id))
    }
  }

  const toggleAllNiches = () => {
    if (openNiches.length === CLIENT_NICHE_CATEGORIES.length) {
      setOpenNiches([])
    } else {
      setOpenNiches(CLIENT_NICHE_CATEGORIES.map((c) => c.id))
    }
  }

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
        if (data.countryCode) {
          setCountryCode(data.countryCode)
        }
        if (data.phoneNumber) {
          setPhoneNumber(data.phoneNumber)
        } else if (data.phone) {
          const parsed = extractCountryAndLocalNumber(data.phone)
          setCountryCode(parsed.dialCode)
          setPhoneNumber(parsed.localNumber)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (step < 1 || step > 3) return
    localStorage.setItem('onboarding_step', step.toString())
    const data = {
      countryCode,
      phoneNumber,
      phone: `${countryCode} ${phoneNumber.trim()}`,
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
  }, [step, countryCode, phoneNumber, portfolio, website, linkedin, instagram, dribbble, behance, github, twitter, servicesOffered, preferredLeadCategories, outreachExperience, discoverySource])

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
      const token = await auth.currentUser.getIdToken().catch(() => null)
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: auth.currentUser.email }),
      })
      if (!res.ok) {
        await sendEmailVerification(auth.currentUser).catch(() => {})
      }
    } catch {
      await sendEmailVerification(auth.currentUser).catch(() => {})
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-primary),0.08)_0%,transparent_60%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl shadow-elevation-4 p-8 text-center"
        >
          <ShieldExclamationIcon className="w-10 h-10 text-primary mx-auto mb-4" />
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
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-semibold text-sm transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
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
      const fullPhone = phoneNumber.trim().startsWith('+')
        ? phoneNumber.trim()
        : `${countryCode}${phoneNumber.trim()}`
      const normalized = normalizePhone(fullPhone)
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
    if (!linkedin.trim()) { setError('LinkedIn profile link is required'); return }
    if (!phoneNumber.trim()) { setError('Phone number is required'); return }
    if (servicesOffered.length === 0) { setError('Select at least one service'); return }
    if (preferredLeadCategories.length === 0) { setError('Select at least one lead category'); return }
    if (!outreachExperience) { setError('Select your outreach experience'); return }

    setIsSubmitting(true)
    setError('')
    setSubmitRetry(false)

    const fullPhone = phoneNumber.trim().startsWith('+')
      ? phoneNumber.trim()
      : `${countryCode} ${phoneNumber.trim()}`

    try {
      await api.post('/onboarding', {
        phone: fullPhone,
        portfolio: portfolio ? formatUrl(portfolio) : undefined,
        website: website ? formatUrl(website) : undefined,
        linkedin: formatUrl(linkedin),
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(var(--rgb-primary),0.08)_0%,transparent_60%)] pointer-events-none" />

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
                    ? 'bg-primary text-black'
                    : s === step
                      ? 'bg-primary text-black shadow-[0_0_16px_rgba(var(--rgb-primary),0.35)]'
                      : 'bg-white/5 text-text-secondary/40'
                }`}
              >
                {s < step ? <CheckCircleIcon className="w-4 h-4 text-black" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-px transition-all duration-300 ${
                    s < step ? 'bg-primary' : 'bg-white/5'
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
                    <SparklesIcon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      Let&apos;s set up your profile
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      Add your profile links so leads know who they&apos;re talking to
                    </p>
                    <p className="text-xs text-primary mt-1 font-medium">
                      LinkedIn profile and phone number are required
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                        <span>
                          LinkedIn Profile <span className="text-primary">*</span>
                        </span>
                        <span className="text-[10px] text-primary font-medium normal-case">
                          Required
                        </span>
                      </label>
                      <input
                        value={linkedin}
                        onChange={(e) => { setLinkedin(e.target.value); setStep1Error('') }}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Portfolio URL
                      </label>
                      <input
                        value={portfolio}
                        onChange={(e) => { setPortfolio(e.target.value); setStep1Error('') }}
                        placeholder="https://your-portfolio.com"
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
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
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
                      />
                    </div>

                    <div className="border-t border-white/[0.06] pt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                          <span>
                            Phone number <span className="text-primary">*</span>
                          </span>
                          <span className="text-[10px] text-primary font-medium normal-case">
                            Required
                          </span>
                        </label>
                        <PhoneInputWithCountry
                          countryCode={countryCode}
                          onCountryCodeChange={(code) => {
                            setCountryCode(code)
                            setStep1Error('')
                          }}
                          phoneNumber={phoneNumber}
                          onPhoneNumberChange={(num) => {
                            setPhoneNumber(num)
                            setStep1Error('')
                          }}
                          error={step1Error && !phoneNumber.trim() ? step1Error : undefined}
                        />
                        <p className="text-xs text-text-secondary/60 mt-0.5">
                          Defaulted to India (+91). Select your country code if outside India.
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
                      if (!linkedin.trim()) {
                        setStep1Error('LinkedIn profile link is required')
                        return
                      }
                      if (!phoneNumber.trim()) {
                        setStep1Error('Phone number is required')
                        return
                      }
                      setStep1Error('')
                      setStep(2)
                    }}
                    className="mt-6 w-full bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl active:scale-98 transition-all shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)] px-4 py-3"
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
                    <SparklesIcon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      What do you offer?
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      Help us match you with the right leads
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Services Section */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <span>Services you offer</span>
                          {servicesOffered.length > 0 && (
                            <span className="text-[11px] text-primary font-bold normal-case">
                              ({servicesOffered.length} selected)
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={toggleAllServices}
                          className="text-[11px] text-text-secondary/60 hover:text-primary transition-colors font-medium"
                        >
                          {openServices.length === SERVICE_CATEGORIES.length
                            ? 'Collapse all'
                            : 'Expand all'}
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {SERVICE_CATEGORIES.map((cat) => {
                          const isOpen = openServices.includes(cat.id)
                          const selectedCount = cat.items.filter((item) =>
                            servicesOffered.includes(item),
                          ).length

                          return (
                            <div
                              key={cat.id}
                              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                selectedCount > 0
                                  ? 'border-primary/30 bg-white/[0.03]'
                                  : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleOpenService(cat.id)}
                                className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base leading-none">{cat.icon}</span>
                                  <span className="text-xs font-semibold text-text-primary tracking-tight">
                                    {cat.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {selectedCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold">
                                      {selectedCount} selected
                                    </span>
                                  )}
                                  <ChevronDownIcon
                                    className={`w-3.5 h-3.5 text-text-secondary/60 transition-transform duration-200 ${
                                      isOpen ? 'rotate-180 text-primary' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    key="content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3.5 pt-1 flex flex-wrap gap-1.5 border-t border-white/[0.04]">
                                      {cat.items.map((s) => {
                                        const isSelected = servicesOffered.includes(s)
                                        return (
                                          <button
                                            key={s}
                                            type="button"
                                            onClick={() =>
                                              setServicesOffered(toggleArrayItem(servicesOffered, s))
                                            }
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-[0_0_12px_rgba(var(--rgb-primary),0.12)]'
                                                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5 hover:border-white/10'
                                            }`}
                                          >
                                            {s}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Client Niches Section */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                          <span>Target Client Niches</span>
                          {preferredLeadCategories.length > 0 && (
                            <span className="text-[11px] text-primary font-bold normal-case">
                              ({preferredLeadCategories.length} selected)
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={toggleAllNiches}
                          className="text-[11px] text-text-secondary/60 hover:text-primary transition-colors font-medium"
                        >
                          {openNiches.length === CLIENT_NICHE_CATEGORIES.length
                            ? 'Collapse all'
                            : 'Expand all'}
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {CLIENT_NICHE_CATEGORIES.map((cat) => {
                          const isOpen = openNiches.includes(cat.id)
                          const selectedCount = cat.items.filter((item) =>
                            preferredLeadCategories.includes(item),
                          ).length

                          return (
                            <div
                              key={cat.id}
                              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                selectedCount > 0
                                  ? 'border-primary/30 bg-white/[0.03]'
                                  : 'border-white/[0.06] bg-white/[0.015] hover:border-white/10'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleOpenNiche(cat.id)}
                                className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base leading-none">{cat.icon}</span>
                                  <span className="text-xs font-semibold text-text-primary tracking-tight">
                                    {cat.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {selectedCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold">
                                      {selectedCount} selected
                                    </span>
                                  )}
                                  <ChevronDownIcon
                                    className={`w-3.5 h-3.5 text-text-secondary/60 transition-transform duration-200 ${
                                      isOpen ? 'rotate-180 text-primary' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    key="content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3.5 pt-1 flex flex-wrap gap-1.5 border-t border-white/[0.04]">
                                      {cat.items.map((c) => {
                                        const isSelected = preferredLeadCategories.includes(c)
                                        return (
                                          <button
                                            key={c}
                                            type="button"
                                            onClick={() =>
                                              setPreferredLeadCategories(
                                                toggleArrayItem(preferredLeadCategories, c),
                                              )
                                            }
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-[0_0_12px_rgba(var(--rgb-primary),0.12)]'
                                                : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5 hover:border-white/10'
                                            }`}
                                          >
                                            {c}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Outreach experience
                      </label>
                      <select
                        value={outreachExperience}
                        onChange={(e) => setOutreachExperience(e.target.value)}
                        className="bg-surface-elevated border border-white/5 text-white rounded-xl outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all px-4 py-3"
                      >
                        <option value="" disabled>
                          Select your experience level
                        </option>
                        {EXPERIENCE_LEVELS.map((el) => (
                          <option key={el.value} value={el.value} className="bg-[#161718] text-white">
                            {el.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedFromStep2}
                    className={`mt-8 w-full rounded-xl active:scale-98 transition-all px-4 py-3 font-semibold ${
                      canProceedFromStep2
                        ? 'bg-primary hover:bg-primary/90 text-black shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)]'
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
                    <SparklesIcon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                      Almost there!
                    </h1>
                    <p className="text-sm text-text-secondary mt-2">
                      One last thing: how did you find us?
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
                              ? 'bg-primary/15 border-primary/40 text-primary font-semibold shadow-[0_0_12px_rgba(var(--rgb-primary),0.12)]'
                              : 'bg-white/[0.02] border-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/5 hover:border-white/10'
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
                    className={`mt-8 w-full rounded-xl active:scale-98 transition-all px-4 py-3 font-semibold flex items-center justify-center gap-2 ${
                      discoverySource && !isSubmitting
                        ? 'bg-primary hover:bg-primary/90 text-black shadow-[0_4px_20px_rgba(var(--rgb-primary),0.25)]'
                        : 'bg-white/5 text-text-secondary/40 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
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
