import { describe, it, expect } from 'vitest'
import { getPlanCredits, getPlan, getPlanByRazorpayPlanId, PLANS } from '@/lib/config/plans'

describe('PLANS config', () => {
  it('defines the three core plans', () => {
    expect(Object.keys(PLANS)).toEqual(['FREE', 'FREELANCER', 'AGENCY'])
  })

  it('FREE gives 50 credits at 0 price', () => {
    expect(PLANS.FREE.credits).toBe(50)
    expect(PLANS.FREE.price).toBe(0)
  })

  it('FREELANCER gives 500 credits', () => {
    expect(PLANS.FREELANCER.credits).toBe(500)
  })

  it('AGENCY gives 1000 credits', () => {
    expect(PLANS.AGENCY.credits).toBe(1000)
  })
})

describe('getPlanCredits', () => {
  it('returns credits for a known plan', () => {
    expect(getPlanCredits('FREE')).toBe(50)
    expect(getPlanCredits('FREELANCER')).toBe(500)
    expect(getPlanCredits('AGENCY')).toBe(1000)
  })

  it('falls back to FREE credits for unknown/invalid plans', () => {
    expect(getPlanCredits('ENTERPRISE')).toBe(50)
    expect(getPlanCredits('')).toBe(50)
    expect(getPlanCredits('bogus')).toBe(50)
  })
})

describe('getPlan', () => {
  it('returns the plan config for known ids', () => {
    expect(getPlan('AGENCY')?.name).toBe('Agency')
  })

  it('returns null for unknown ids', () => {
    expect(getPlan('NOT_A_PLAN')).toBeNull()
  })
})

describe('getPlanByRazorpayPlanId', () => {
  it('returns null when no razorpay plan ids are configured', () => {
    // None of the plans define razorpayPlanId in this config
    expect(getPlanByRazorpayPlanId('anything')).toBeNull()
  })

  it('matches a plan when a razorpay plan id exists', () => {
    const original = PLANS.FREELANCER.razorpayPlanId
    ;(PLANS.FREELANCER as { razorpayPlanId?: string }).razorpayPlanId = 'rp_plan_freelancer'

    const result = getPlanByRazorpayPlanId('rp_plan_freelancer')
    expect(result?.id).toBe('FREELANCER')

    ;(PLANS.FREELANCER as { razorpayPlanId?: string }).razorpayPlanId = original
  })
})