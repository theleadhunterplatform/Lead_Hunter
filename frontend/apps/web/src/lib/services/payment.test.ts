import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { paymentService } from '@/lib/services/payment'
import { getPlanCredits } from '@/lib/config/plans'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(fakeTx)),
  },
}))

let fakeTx: any

function makeAccount(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: 'user-1',
    subscriptionBalance: 500,
    bonusBalance: 0,
    rolloverBalance: 0,
    rolloverExpiresAt: null as Date | null,
    renewalDate: null as Date | null,
    user: { plan: 'FREELANCER' },
    ...overrides,
  }
}

describe('paymentService.activatePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: 0,
          renewalDate: data.renewalDate,
        })),
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: 0,
          renewalDate: data.renewalDate,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates a credit account and sets plan credits for a new user', async () => {
    const result = await paymentService.activatePlan({
      userId: 'user-1',
      plan: 'FREELANCER',
      provider: 'razorpay',
      customerId: 'cus_123',
      subscriptionId: 'sub_123',
      priceId: 'price_123',
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    expect(fakeTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'FREELANCER',
          paymentProvider: 'razorpay',
          razorpayCustomerId: 'cus_123',
          razorpaySubscriptionId: 'sub_123',
          razorpayPlanId: 'price_123',
        }),
      }),
    )
    expect(fakeTx.creditAccount.create).toHaveBeenCalled()
    expect(result.subscriptionBalance).toBe(getPlanCredits('FREELANCER'))
  })

  it('updates an existing credit account when the user already has one', async () => {
    fakeTx.creditAccount.findUnique.mockResolvedValue(makeAccount())
    const result = await paymentService.activatePlan({
      userId: 'user-1',
      plan: 'AGENCY',
      provider: 'razorpay',
      customerId: 'rzp_cus',
    })

    expect(fakeTx.creditAccount.update).toHaveBeenCalled()
    expect(fakeTx.creditAccount.create).not.toHaveBeenCalled()
    expect(result.subscriptionBalance).toBe(getPlanCredits('AGENCY'))
  })

  it('sets razorpay provider fields on the user', async () => {
    fakeTx.creditAccount.findUnique.mockResolvedValue(makeAccount())
    await paymentService.activatePlan({
      userId: 'user-1',
      plan: 'FREELANCER',
      provider: 'razorpay',
      customerId: 'rzp_cus',
    })

    const userUpdate = fakeTx.user.update.mock.calls[0][0].data
    expect(userUpdate.razorpayCustomerId).toBe('rzp_cus')
    expect(userUpdate.paymentProvider).toBe('razorpay')
  })

  it('logs a plan assignment audit entry', async () => {
    fakeTx.creditAccount.findUnique.mockResolvedValue(makeAccount())
    await paymentService.activatePlan({
      userId: 'user-1',
      plan: 'FREE',
      provider: 'razorpay',
    })

    const auditCall = fakeTx.auditLog.create.mock.calls[0][0]
    expect(auditCall.data.action).toBe('CREDIT_CHANGE')
    expect(auditCall.data.details.type).toBe('plan_assignment')
    expect(auditCall.data.details.plan).toBe('FREE')
  })
})

describe('paymentService.renew', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(makeAccount()),
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: 0,
          rolloverBalance: data.rolloverBalance ?? 0,
          rolloverExpiresAt: data.rolloverExpiresAt ?? null,
          renewalDate: data.renewalDate,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('resets subscription credits to the plan limit on renewal', async () => {
    const result = await paymentService.renew('user-1', 'razorpay', new Date())

    expect(result.subscriptionBalance).toBe(getPlanCredits('FREELANCER'))
    expect(fakeTx.user.update).toHaveBeenCalled()
  })

  it('throws when the credit account does not exist', async () => {
    fakeTx.creditAccount.findUnique.mockResolvedValue(null)
    await expect(paymentService.renew('ghost', 'razorpay')).rejects.toThrow(
      'CreditAccount not found',
    )
  })

  it('updates the correct provider period-end field', async () => {
    const periodEnd = new Date()
    await paymentService.renew('user-1', 'razorpay', periodEnd)

    const userUpdate = fakeTx.user.update.mock.calls[0][0].data
    expect(userUpdate.razorpayCurrentPeriodEnd).toBe(periodEnd)
  })
})

describe('paymentService.cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditAccount: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('resets plan to FREE and grants free credits', async () => {
    await paymentService.cancel('user-1', 'razorpay')

    const userUpdate = fakeTx.user.update.mock.calls[0][0].data
    expect(userUpdate.plan).toBe('FREE')

    const creditUpdate = fakeTx.creditAccount.update.mock.calls[0][0].data
    expect(creditUpdate.subscriptionBalance).toBe(getPlanCredits('FREE'))
  })

  it('clears provider references on cancel', async () => {
    await paymentService.cancel('user-1', 'razorpay')

    const userUpdate = fakeTx.user.update.mock.calls[0][0].data
    expect(userUpdate.razorpayCustomerId).toBeNull()
    expect(userUpdate.razorpaySubscriptionId).toBeNull()
  })

  it('logs a subscription cancelled audit entry', async () => {
    await paymentService.cancel('user-1', 'razorpay')

    const auditCall = fakeTx.auditLog.create.mock.calls[0][0]
    expect(auditCall.data.details.type).toBe('subscription_cancelled')
    expect(auditCall.data.details.provider).toBe('razorpay')
  })
})