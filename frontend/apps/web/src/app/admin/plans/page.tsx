'use client'

import { useState, useEffect } from 'react'
import { getFirebaseToken } from '@/lib/firebase'
import { useToast } from '@/components/ui/Toast'
import { CustomLoader } from '@/components/ui/CustomLoader'
import {
  CreditCardIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  BoltIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'

interface PlanItem {
  id: string
  name: string
  credits: number
  price: number
  description: string
  features: string[]
  razorpayPlanId?: string
  isActive?: boolean
}

interface RefillPackItem {
  id: string
  tokens: number
  price: number
  label: string
  isActive?: boolean
}

export default function AdminPlansPage() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'plans' | 'refills'>('plans')

  const [plans, setPlans] = useState<PlanItem[]>([])
  const [refillPacks, setRefillPacks] = useState<RefillPackItem[]>([])

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success && json.data) {
        setPlans(json.data.plans || [])
        setRefillPacks(json.data.refillPacks || [])
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to load configurations' })
      }
    } catch {
      addToast({ type: 'error', message: 'Network error loading plan settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plans, refillPacks }),
      })
      const json = await res.json()
      if (json.success) {
        addToast({ type: 'success', message: 'Plan & Refill configurations saved successfully!' })
      } else {
        addToast({ type: 'error', message: json.message || 'Failed to save configurations' })
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // Plan handlers
  const updatePlan = (index: number, field: keyof PlanItem, value: any) => {
    setPlans((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addPlanFeature = (planIndex: number, featureText: string) => {
    if (!featureText.trim()) return
    setPlans((prev) => {
      const copy = [...prev]
      copy[planIndex] = {
        ...copy[planIndex],
        features: [...copy[planIndex].features, featureText.trim()],
      }
      return copy
    })
  }

  const removePlanFeature = (planIndex: number, featureIndex: number) => {
    setPlans((prev) => {
      const copy = [...prev]
      const updatedFeatures = copy[planIndex].features.filter((_, i) => i !== featureIndex)
      copy[planIndex] = { ...copy[planIndex], features: updatedFeatures }
      return copy
    })
  }

  const addNewPlan = () => {
    const newId = `PLAN_${Date.now()}`
    setPlans((prev) => [
      ...prev,
      {
        id: newId,
        name: 'New Custom Plan',
        credits: 250,
        price: 499,
        description: 'Description of the new plan tier',
        features: ['Access to Lead Hunter', 'Monthly credit refresh'],
        razorpayPlanId: '',
        isActive: true,
      },
    ])
  }

  const deletePlan = (index: number) => {
    if (!confirm('Are you sure you want to remove this plan?')) return
    setPlans((prev) => prev.filter((_, i) => i !== index))
  }

  // Refill handlers
  const updateRefillPack = (index: number, field: keyof RefillPackItem, value: any) => {
    setRefillPacks((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addNewRefillPack = () => {
    const newTokens = 25
    setRefillPacks((prev) => [
      ...prev,
      {
        id: `topup_${Date.now()}`,
        tokens: newTokens,
        price: 199,
        label: `${newTokens} Credits Pack`,
        isActive: true,
      },
    ])
  }

  const deleteRefillPack = (index: number) => {
    if (!confirm('Delete this credit refill pack?')) return
    setRefillPacks((prev) => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return <CustomLoader page="admin" />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2.5">
            <CreditCardIcon className="w-7 h-7 text-accent-mint" />
            Plans & Refill Pricing Configuration
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure subscription tiers, credit limits, and top-up refill pack pricing.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-mint text-black text-sm font-bold shadow-lg shadow-accent-mint/20 hover:bg-accent-mint/90 transition-all disabled:opacity-50 cursor-pointer"
        >
          <CheckCircleIcon className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'plans'
              ? 'bg-accent-mint text-black shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('refills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'refills'
              ? 'bg-accent-mint text-black shadow'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          <BoltIcon className="w-4 h-4" />
          Credit Refill Packs ({refillPacks.length})
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
              Configured Subscription Tiers
            </h2>
            <button
              onClick={addNewPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-accent-mint hover:bg-white/10 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Add New Plan Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p, idx) => (
              <div
                key={p.id}
                className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between shadow-xl relative"
              >
                <div className="space-y-4">
                  {/* Top Bar: Name & Active Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePlan(idx, 'name', e.target.value)}
                      className="text-base font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent-mint outline-none transition-colors w-full"
                      placeholder="Plan Name"
                    />
                    <label className="flex items-center gap-1.5 text-xxs font-bold uppercase tracking-wider cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={p.isActive !== false}
                        onChange={(e) => updatePlan(idx, 'isActive', e.target.checked)}
                        className="rounded border-white/20 text-accent-mint focus:ring-0"
                      />
                      <span className={p.isActive !== false ? 'text-accent-mint' : 'text-zinc-500'}>
                        {p.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {/* Price & Credits Inputs */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-black/30 rounded-xl border border-white/5">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                        Monthly Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={p.price}
                        onChange={(e) => updatePlan(idx, 'price', Number(e.target.value))}
                        className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-accent-mint"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                        Monthly Credits
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={p.credits}
                        onChange={(e) => updatePlan(idx, 'credits', Number(e.target.value))}
                        className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-accent-mint"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                      Short Description
                    </label>
                    <textarea
                      rows={2}
                      value={p.description}
                      onChange={(e) => updatePlan(idx, 'description', e.target.value)}
                      className="w-full bg-surface-elevated border border-white/10 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent-mint"
                      placeholder="Summary for pricing card..."
                    />
                  </div>

                  {/* Razorpay Plan ID */}
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-1">
                      Razorpay Plan ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={p.razorpayPlanId || ''}
                      onChange={(e) => updatePlan(idx, 'razorpayPlanId', e.target.value)}
                      className="w-full bg-surface-elevated border border-white/10 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-accent-mint"
                      placeholder="e.g. plan_N384xklfjs"
                    />
                  </div>

                  {/* Features List */}
                  <div>
                    <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mb-2">
                      Feature Bullets
                    </label>
                    <div className="space-y-1.5">
                      {p.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1.5 text-xs">
                          <span className="text-accent-mint">✓</span>
                          <span className="flex-1 text-zinc-300 text-[11px] truncate">{feat}</span>
                          <button
                            type="button"
                            onClick={() => removePlanFeature(idx, fIdx)}
                            className="text-zinc-500 hover:text-red-400 p-0.5"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Feature input */}
                    <div className="flex gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Add feature bullet..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addPlanFeature(idx, e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                        className="flex-1 bg-surface-elevated border border-white/10 text-xs text-white px-2.5 py-1 rounded-lg outline-none focus:border-accent-mint"
                      />
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-4 mt-4 border-t border-white/5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => deletePlan(idx)}
                    className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Delete Tier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: REFILL PACKS */}
      {activeTab === 'refills' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
              Configured Credit Refill Packs
            </h2>
            <button
              onClick={addNewRefillPack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-accent-mint hover:bg-white/10 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Add Refill Pack
            </button>
          </div>

          <div className="bg-surface/40 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Pack ID</th>
                  <th className="px-6 py-4">Label</th>
                  <th className="px-6 py-4">Credits / Tokens</th>
                  <th className="px-6 py-4">Price (INR ₹)</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {refillPacks.map((pack, idx) => (
                  <tr key={pack.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                      <input
                        type="text"
                        value={pack.id}
                        onChange={(e) => updateRefillPack(idx, 'id', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent-mint text-white outline-none font-mono text-xs w-32"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={pack.label}
                        onChange={(e) => updateRefillPack(idx, 'label', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent-mint text-white font-medium outline-none text-sm w-44"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="1"
                        value={pack.tokens}
                        onChange={(e) => updateRefillPack(idx, 'tokens', Number(e.target.value))}
                        className="bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm font-bold w-24 outline-none focus:border-accent-mint"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 text-sm font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={pack.price}
                          onChange={(e) => updateRefillPack(idx, 'price', Number(e.target.value))}
                          className="bg-surface-elevated border border-white/10 text-accent-mint rounded-lg px-3 py-1.5 text-sm font-bold w-28 outline-none focus:border-accent-mint"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pack.isActive !== false}
                          onChange={(e) => updateRefillPack(idx, 'isActive', e.target.checked)}
                          className="rounded border-white/20 text-accent-mint focus:ring-0"
                        />
                        <span className={pack.isActive !== false ? 'text-accent-mint' : 'text-zinc-500'}>
                          {pack.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRefillPack(idx)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete pack"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
