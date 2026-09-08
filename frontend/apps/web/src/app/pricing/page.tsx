'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { openRazorpayCheckout } from '@/lib/razorpay-client'
import { useToast } from '@/components/ui/Toast'
import { CustomLoader } from '@/components/ui/CustomLoader'
import {
  CheckIcon,
  SparklesIcon,
  ArrowLeftIcon,
  StarIcon,
} from '@heroicons/react/24/solid'

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

export default function PricingPage() {
  const router = useRouter()
  const { user, loading: authLoading, getToken } = useAuth()
  const { addToast } = useToast()

  const [plans, setPlans] = useState<PlanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const json = await res.json()
      if (json.success && json.data?.plans) {
        setPlans(json.data.plans)
      }
    } catch {
      setPlans([
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
          credits: 500,
          price: 999,
          description: 'Consistent lead pipeline for active independent contractors',
          features: [
            '500 credits renewed monthly',
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
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (plan.id === user?.plan) return

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
              body: JSON.stringify(response),
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

  if (authLoading || loading) {
    return <CustomLoader fullscreen />
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-mint/10 border border-accent-mint/20 text-accent-mint text-xs font-bold uppercase tracking-wider">
            <SparklesIcon className="w-4 h-4" />
            Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Choose the Perfect Plan for Your Growth
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Every plan includes verified contact data, direct email reveals, and deep AI strategic intelligence reports to help you close more high-ticket clients.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id.toUpperCase()
            const isPopular = plan.id.toUpperCase() === 'FREELANCER'

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-8 rounded-4xl border transition-all duration-300 ${
                  isCurrent
                    ? 'bg-surface/60 border-accent-mint/40 shadow-2xl ring-2 ring-accent-mint/40'
                    : isPopular
                      ? 'bg-gradient-to-b from-surface-elevated to-surface/50 border-accent-purple/40 shadow-2xl ring-1 ring-accent-purple/30'
                      : 'bg-surface/40 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-accent-mint text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                    Your Current Plan
                  </div>
                )}
                {!isCurrent && isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-accent-purple text-white font-extrabold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
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

                  <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between text-xs font-semibold">
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
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                      isCurrent
                        ? 'bg-white/5 text-text-secondary border border-white/10 cursor-default'
                        : isPopular
                          ? 'bg-accent-purple text-white hover:bg-accent-purple/90 shadow-accent-purple/20'
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
      </div>
    </div>
  )
}
