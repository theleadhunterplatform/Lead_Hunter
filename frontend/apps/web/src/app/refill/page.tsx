'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { openRazorpayCheckout } from '@/lib/razorpay-client'
import { useToast } from '@/components/ui/Toast'
import { CustomLoader } from '@/components/ui/CustomLoader'
import {
  BanknotesIcon,
  BoltIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid'

interface RefillPack {
  id: string
  tokens: number
  price: number
  label: string
  isActive?: boolean
}

export default function RefillPage() {
  const router = useRouter()
  const { user, loading: authLoading, getToken } = useAuth()
  const { addToast } = useToast()

  const [packs, setPacks] = useState<RefillPack[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPack, setProcessingPack] = useState<string | null>(null)

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async () => {
    try {
      const res = await fetch('/api/plans')
      const json = await res.json()
      if (json.success && json.data?.refillPacks) {
        setPacks(json.data.refillPacks)
      }
    } catch {
      // Fallback packs
      setPacks([
        { id: 'topup_10', tokens: 10, price: 99, label: '10 Credits' },
        { id: 'topup_50', tokens: 50, price: 399, label: '50 Credits (Popular)' },
        { id: 'topup_100', tokens: 100, price: 699, label: '100 Credits (Best Value)' },
      ])
    } finally {
      setLoading(false)
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
              body: JSON.stringify(response),
            })
            const vData = await vRes.json()
            if (vRes.ok && vData.success) {
              addToast({
                type: 'success',
                message: `Successfully added ${pack.tokens} credits to your account!`,
              })
              // Dispatch event to update sidebar in real-time
              const currentBalance = user?.creditAccount?.total ?? 0
              window.dispatchEvent(
                new CustomEvent('credits-updated', {
                  detail: { creditsRemaining: currentBalance + pack.tokens },
                }),
              )
              setTimeout(() => {
                router.push('/leads')
              }, 1500)
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
          message: data.message || 'Failed to initialize payment',
        })
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Payment failed to initialize',
      })
    } finally {
      setProcessingPack(null)
    }
  }

  if (authLoading || loading) {
    return <CustomLoader fullscreen />
  }

  const creditTotal = user?.creditAccount?.total ?? 0

  return (
    <div className="min-h-screen bg-bg-main text-text-primary p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Page Hero */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs font-bold uppercase tracking-wider">
            <BoltIcon className="w-4 h-4" />
            Instant Credit Refill
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Refill Your Lead Hunter Pipeline
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Need extra contact reveals without changing your monthly subscription plan? Top up instant credits that never expire as long as your account is active.
          </p>
        </div>

        {/* Current Balance Banner */}
        <div className="p-6 rounded-3xl bg-surface/50 border border-white/[0.08] backdrop-blur-xl flex items-center justify-between flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange">
              <BanknotesIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
                Current Available Credits
              </p>
              <p className="text-2xl font-black text-white mt-0.5 tabular-nums">
                {creditTotal}{' '}
                <span className="text-xs font-medium text-text-secondary uppercase">credits</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-text-secondary">
            {user?.creditAccount?.rolloverBalance ? (
              <div className="flex items-center gap-1.5 text-accent-purple font-semibold">
                <ClockIcon className="w-4 h-4" />
                <span>{user.creditAccount.rolloverBalance} rollover credits</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5 text-accent-mint font-semibold">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Instant Unlocks</span>
            </div>
          </div>
        </div>

        {/* Top-up Pack Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          {packs.map((pack) => {
            const isPopular = pack.id === 'topup_50' || pack.tokens === 50
            const isBestValue = pack.id === 'topup_100' || pack.tokens === 100

            return (
              <div
                key={pack.id}
                className={`relative flex flex-col justify-between p-7 rounded-3xl border transition-all duration-300 ${
                  isPopular
                    ? 'bg-gradient-to-b from-surface-elevated/90 to-surface/50 border-accent-orange/40 shadow-2xl shadow-accent-orange/10 ring-1 ring-accent-orange/30'
                    : 'bg-surface/40 border-white/[0.08] hover:border-white/20'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-orange text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                    Most Popular
                  </div>
                )}
                {isBestValue && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-mint text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md">
                    Best Value
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <SparklesIcon
                      className={`w-5 h-5 ${isPopular ? 'text-accent-orange' : 'text-accent-mint'}`}
                    />
                    <h3 className="text-base font-bold text-white">{pack.label}</h3>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight">₹{pack.price}</span>
                    <span className="text-xs text-text-secondary">one-time</span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    Adds <strong className="text-white font-bold">{pack.tokens} reveal credits</strong>{' '}
                    directly to your balance for immediate contact unlocking.
                  </p>

                  <div className="pt-2 space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-accent-mint shrink-0" />
                      <span>Unlock up to {Math.floor(pack.tokens / 5)} full lead profiles</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-accent-mint shrink-0" />
                      <span>Instant balance credit</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={processingPack === pack.id}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
                      isPopular
                        ? 'bg-accent-orange text-black hover:bg-accent-orange/90 shadow-accent-orange/20'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {processingPack === pack.id ? 'Processing...' : `Refill ${pack.tokens} Credits`}
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
