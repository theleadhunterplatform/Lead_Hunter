'use client'

import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { openRazorpayCheckout } from '@/lib/razorpay-client'
import {
  ArrowLeftIcon,
  CheckIcon,
  SparklesIcon,
  StarIcon,
  BoltIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

interface PlanConfig {
  id: string
  name: string
  credits: number
  price: number
  description: string
  features: string[]
  razorpayPlanId?: string
  isActive?: boolean
}

interface RefillPack {
  id: string
  tokens: number
  price: number
  label: string
  isActive?: boolean
}

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'FREE',
    name: 'Free Starter',
    credits: 50,
    price: 0,
    description: 'Explore verified leads with 50 monthly credits',
    features: [
      '50 credits renewed monthly',
      'Full verified contact data reveal',
      'AI Strategic Intelligence breakdown',
      'Community Support',
    ],
  },
  {
    id: 'FREELANCER',
    name: 'Freelancer Pro',
    credits: 1000,
    price: 999,
    description: 'Consistent lead pipeline for active independent contractors',
    features: [
      '1000 credits renewed monthly',
      'Unused credits rollover (up to 30 days)',
      'Priority lead delivery & email reveals',
      'Deep AI strategic intelligence report',
      'Google Sheets export integration',
    ],
  },
  {
    id: 'AGENCY',
    name: 'Agency Scale',
    credits: 1000,
    price: 2499,
    description: 'Maximum velocity for high-growth agencies and teams',
    features: [
      '1,000 credits renewed monthly',
      'Full 30-day rollover support',
      'Automated CRM sync',
      'VIP priority support channel',
      'Multi-seat ready',
    ],
  },
]

const DEFAULT_REFILL_PACKS: RefillPack[] = [
  { id: 'topup_10', tokens: 10, price: 99, label: '10 Credits' },
  { id: 'topup_50', tokens: 50, price: 399, label: '50 Credits (Popular)' },
  { id: 'topup_100', tokens: 100, price: 699, label: '100 Credits (Best Value)' },
]

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'refills' ? 'refills' : 'plans'

  const { user, getToken } = useAuth()
  const { addToast } = useToast()

  const [activeTab, setActiveTab] = useState<'plans' | 'refills'>(initialTab)
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS)
  const [refillPacks, setRefillPacks] = useState<RefillPack[]>(DEFAULT_REFILL_PACKS)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)
  const [processingPack, setProcessingPack] = useState<string | null>(null)
  const [confirmDowngradePlan, setConfirmDowngradePlan] = useState<PlanConfig | null>(null)
  const [downgrading, setDowngrading] = useState(false)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'refills') setActiveTab('refills')
  }, [searchParams])

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/plans')
      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.plans && json.data.plans.length > 0) setPlans(json.data.plans)
        if (json.data.refillPacks && json.data.refillPacks.length > 0) setRefillPacks(json.data.refillPacks)
      }
    } catch {
      // Graceful fallback to static cache
    }
  }

  const handleConfirmDowngrade = async () => {
    if (!confirmDowngradePlan) return
    setDowngrading(true)
    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/payments/razorpay/cancel', {
        method: 'POST',
        headers,
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          message: json.message || 'Your plan has been reset to Free Starter (50 monthly credits).',
        })
        setConfirmDowngradePlan(null)
        setTimeout(() => {
          window.location.reload()
        }, 1200)
      } else {
        addToast({
          type: 'error',
          message: json.message || 'Failed to downgrade to Free plan.',
        })
        setDowngrading(false)
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Network error during downgrade.',
      })
      setDowngrading(false)
    }
  }

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (plan.id.toUpperCase() === currentPlanId) return

    if (plan.price === 0 || plan.id.toUpperCase() === 'FREE') {
      setConfirmDowngradePlan(plan)
      return
    }

    setSubscribingPlan(plan.id)
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: plan.id.toLowerCase() }),
      })

      const data = await res.json()
      if (data.success && data.isFreePlan) {
        addToast({
          type: 'success',
          message: data.message || 'Your plan has been reset to Free Starter (50 monthly credits).',
        })
        setTimeout(() => {
          window.location.reload()
        }, 1200)
        return
      }

      if (data.success && data.data?.order_id) {
        await openRazorpayCheckout({
          key: data.data.key_id,
          order_id: data.data.order_id,
          amount: data.data.amount,
          currency: data.data.currency,
          name: data.data.name,
          description: data.data.description,
          prefill: data.data.prefill,
          handler: async (response: any) => {
            const vRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...response, plan: plan.id }),
            })
            const vData = await vRes.json()
            if (vRes.ok && vData.success) {
              addToast({
                type: 'success',
                message: `Successfully upgraded to ${plan.name}!`,
              })
              setTimeout(() => {
                window.location.reload()
              }, 1200)
            } else {
              addToast({
                type: 'error',
                message: vData.message || 'Payment verification failed',
              })
            }
          },
        })
      } else {
        addToast({
          type: 'error',
          message: data.message || 'Failed to initialize subscription order',
        })
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Payment failed',
      })
    } finally {
      setSubscribingPlan(null)
    }
  }

  const handleBuyPack = async (pack: RefillPack) => {
    setProcessingPack(pack.id)
    try {
      const token = await getToken()
      const res = await fetch('/api/payments/razorpay/topup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pack: pack.id }),
      })

      const data = await res.json()
      if (data.success && data.data?.order_id) {
        await openRazorpayCheckout({
          key: data.data.key_id,
          order_id: data.data.order_id,
          amount: data.data.amount,
          currency: data.data.currency,
          name: data.data.name,
          description: data.data.description,
          prefill: data.data.prefill,
          handler: async (response: any) => {
            const vRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...response, pack: pack.id, tokens: pack.tokens }),
            })
            const vData = await vRes.json()
            if (vRes.ok && vData.success) {
              addToast({
                type: 'success',
                message: `Successfully added ${pack.tokens} credits to your account!`,
              })
              const currentBalance = user?.creditAccount?.total ?? 0
              window.dispatchEvent(
                new CustomEvent('credits-updated', {
                  detail: { creditsRemaining: currentBalance + pack.tokens },
                }),
              )
              setTimeout(() => {
                window.location.reload()
              }, 1200)
            } else {
              addToast({
                type: 'error',
                message: vData.message || 'Payment verification failed',
              })
            }
          },
        })
      } else {
        addToast({
          type: 'error',
          message: data.message || 'Failed to initialize top-up order',
        })
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Payment failed',
      })
    } finally {
      setProcessingPack(null)
    }
  }

  const currentPlanId = (user?.plan || 'FREE').toUpperCase()

  return (
    <div className="min-h-screen bg-bg-main text-text-primary p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Page Hero */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
            <SparklesIcon className="w-4 h-4" />
            Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Choose the Perfect Plan for Your Growth
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Every plan includes verified contact data, direct email reveals, and deep AI strategic intelligence reports to help you close more high-ticket clients.
          </p>

          {/* Tab Switcher: Subscription Plans vs Refill Packs */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-surface/80 border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'plans'
                    ? 'bg-primary text-black shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Monthly Plans
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('refills')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'refills'
                    ? 'bg-primary text-black shadow-lg shadow-primary/20'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <BoltIcon className="w-3.5 h-3.5" />
                Instant Credit Top-ups
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: Subscription Plans Grid */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
            {plans.map((plan) => {
              const isCurrent = currentPlanId === plan.id.toUpperCase()
              const isPopular = plan.id.toUpperCase() === 'FREELANCER'

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-8 rounded-4xl border transition-all duration-300 ${
                    isCurrent
                      ? 'metallic-card ring-2 ring-primary/40'
                      : isPopular
                        ? 'metallic-card ring-1 ring-primary/30 bg-gradient-to-b from-surface-elevated to-surface/50'
                        : 'metallic-card'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-primary text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                      Your Current Plan
                    </div>
                  )}
                  {!isCurrent && isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-primary text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                      <StarIcon className="w-3 h-3" />
                      Recommended
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                      <p className="text-xs text-text-secondary mt-1 min-h-[32px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 pt-2 border-t border-white/5">
                      <span className="text-4xl font-black text-white tracking-tight">₹{plan.price}</span>
                      <span className="text-xs text-text-secondary font-medium">/ 30 days</span>
                    </div>

                    <div className="metallic-card p-3 flex items-center justify-between text-xs font-semibold">
                      <span className="text-text-secondary">Monthly Allowance</span>
                      <span className="text-white font-bold">{plan.credits} Credits</span>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        Included with this tier:
                      </p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                            <CheckIcon className="w-4 h-4 text-accent-mint shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 mt-8 border-t border-white/5">
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent || subscribingPlan === plan.id}
                      className={`w-full min-h-[44px] py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                        isCurrent
                          ? 'bg-white/5 text-text-secondary border border-white/10 cursor-default'
                          : isPopular
                            ? 'bg-primary text-black hover:bg-primary/90 shadow-primary/20'
                            : 'bg-white text-black hover:bg-white/90'
                      }`}
                    >
                      {isCurrent
                        ? 'Active Plan'
                        : subscribingPlan === plan.id
                          ? 'Processing...'
                          : plan.price === 0
                            ? 'Downgrade to Free'
                            : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 2: Instant Credit Top-ups Grid */}
        {activeTab === 'refills' && (
          <div className="space-y-8 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {refillPacks.map((pack) => {
                const isPopular = pack.id === 'topup_50'

                return (
                  <div
                    key={pack.id}
                    className={`relative flex flex-col justify-between p-8 rounded-4xl border transition-all duration-300 ${
                      isPopular
                        ? 'metallic-card ring-1 ring-accent-orange/40 bg-gradient-to-b from-surface-elevated to-surface/50'
                        : 'metallic-card'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-accent-orange text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        Most Popular
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange">
                          <BanknotesIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-accent-orange uppercase tracking-wider bg-accent-orange/10 px-2.5 py-1 rounded-lg">
                          Never Expires
                        </span>
                      </div>

                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">{pack.label}</h3>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          Instant addition of {pack.tokens} lead reveal credits to your account balance.
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1 pt-2 border-t border-white/5">
                        <span className="text-4xl font-black text-white tracking-tight">₹{pack.price}</span>
                        <span className="text-xs text-text-secondary font-medium">one-time</span>
                      </div>

                      <div className="space-y-2.5 pt-2 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-accent-mint shrink-0" />
                          <span>Instant delivery to balance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-accent-mint shrink-0" />
                          <span>Reveals full email & phone contacts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckIcon className="w-4 h-4 text-accent-mint shrink-0" />
                          <span>Unlocks deep strategic intelligence</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 mt-8 border-t border-white/5">
                      <button
                        onClick={() => handleBuyPack(pack)}
                        disabled={processingPack === pack.id}
                        className={`w-full min-h-[44px] py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                          isPopular
                            ? 'bg-accent-orange text-black hover:bg-accent-orange/90 shadow-accent-orange/20'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        {processingPack === pack.id ? 'Processing...' : `Buy ${pack.tokens} Credits`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top-up Value Assurance Banner */}
            <div className="metallic-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheckIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Instant Credit Rollover Guarantee</h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Purchased credits stack on top of your monthly allowance and never expire while your membership is active.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary shrink-0">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4 text-accent-mint" /> 24/7 Auto-Credit
                </span>
                <span>•</span>
                <span>100% Secure Razorpay Checkout</span>
              </div>
            </div>
          </div>
        )}

        {/* In-App Downgrade Confirmation Modal */}
        {confirmDowngradePlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-surface border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Downgrade to Free Starter?</h3>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Your account will reset to the Free Starter plan with 50 monthly credits. Any active paid subscription will be cancelled and will not renew.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={downgrading}
                  onClick={() => setConfirmDowngradePlan(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Keep My Plan
                </button>
                <button
                  type="button"
                  disabled={downgrading}
                  onClick={handleConfirmDowngrade}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-red-900/30 disabled:opacity-50"
                >
                  {downgrading ? 'Downgrading...' : 'Yes, Downgrade'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-main" />}>
      <PricingContent />
    </Suspense>
  )
}
