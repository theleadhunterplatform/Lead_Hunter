export type PlanId = 'FREE' | 'FREELANCER' | 'AGENCY'

export interface PlanConfig {
  id: PlanId
  name: string
  credits: number
  price: number // INR, per 30 days
  /**
   * Razorpay Plan ID (from Razorpay Dashboard → Plans).
   * Leave empty until the plan is created on the Razorpay account —
   * subscription checkout will refuse plans without an ID.
   */
  razorpayPlanId?: string
}

export const PLANS: Record<PlanId, PlanConfig> = {
  FREE: { id: 'FREE', name: 'Free', credits: 50, price: 0 },
  FREELANCER: { id: 'FREELANCER', name: 'Freelancer', credits: 500, price: 999 },
  AGENCY: { id: 'AGENCY', name: 'Agency', credits: 1000, price: 0 },
}

export function getPlanCredits(planId: string): number {
  return PLANS[planId as PlanId]?.credits ?? PLANS.FREE.credits
}

export function getPlan(planId: string): PlanConfig | null {
  return PLANS[planId as PlanId] ?? null
}

export function getPlanByRazorpayPlanId(razorpayPlanId: string): PlanConfig | null {
  const match = Object.values(PLANS).find((p) => p.razorpayPlanId === razorpayPlanId)
  return match ?? null
}
