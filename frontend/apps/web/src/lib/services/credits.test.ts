import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { rolloverExpiryDate } from '@/lib/services/rollover'
import { getPlanCredits } from '@/lib/config/plans'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(fakeTx)),
    creditAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

let fakeTx: any

import { db } from '@/lib/db'

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

describe('creditService.grantInTx', () => {
  it('grants bonus credits to the bonus pool by default', async () => {
    const auditCreate = vi.fn().mockResolvedValue({})
    const update = vi.fn(async ({ data, select }) => ({
      subscriptionBalance: select?.subscriptionBalance ? 500 : undefined,
      bonusBalance: 100,
      renewalDate: null,
    }))
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(makeAccount()),
        update,
      },
      auditLog: { create: auditCreate },
    }

    const result = await creditService.grantInTx(tx, 'user-1', 100, 'admin_test', 'admin-1')
    expect(result.bonusBalance).toBe(100)

    const updateCall = update.mock.calls[0][0]
    expect(updateCall.data.bonusBalance).toEqual({ increment: 100 })

    const auditDetails = auditCreate.mock.calls[0][0].data.details
    expect(auditDetails.type).toBe('grant')
    expect(auditDetails.pool).toBe('bonus')
    expect(auditDetails.amount).toBe(100)
    expect(auditCreate.mock.calls[0][0].data.adminId).toBe('admin-1')
  })

  it('grants to the subscription pool when requested', async () => {
    const auditCreate = vi.fn().mockResolvedValue({})
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(makeAccount()),
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: 500 + data.subscriptionBalance.increment,
          bonusBalance: 0,
          renewalDate: null,
        })),
      },
      auditLog: { create: auditCreate },
    }

    await creditService.grantInTx(tx, 'user-1', 50, 'promo', undefined, 'subscription')
    const updateCall = (tx.creditAccount.update as any).mock.calls[0][0]
    expect(updateCall.data.subscriptionBalance).toEqual({ increment: 50 })
  })

  it('throws when the credit account does not exist', async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: { findUnique: vi.fn().mockResolvedValue(null) },
      auditLog: { create: vi.fn() },
    }
    await expect(creditService.grantInTx(tx, 'ghost', 10, 'test')).rejects.toThrow(
      'CreditAccount not found',
    )
  })
})

describe('creditService.checkAndRenewInTx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-renews when renewalDate has passed', async () => {
    const past = new Date(Date.now() - 1000)
    const account = makeAccount({
      subscriptionBalance: 100,
      renewalDate: past,
    })
    const auditCreate = vi.fn().mockResolvedValue({})
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(account),
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: account.bonusBalance,
          rolloverBalance: data.rolloverBalance ?? account.rolloverBalance,
          rolloverExpiresAt: data.rolloverExpiresAt,
          renewalDate: data.renewalDate,
        })),
      },
      auditLog: { create: auditCreate },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
    vi.mocked(db.creditAccount.findUnique).mockResolvedValue(
      makeAccount({
        subscriptionBalance: getPlanCredits('FREELANCER'),
        renewalDate: new Date(Date.now() + 100000),
      }) as never,
    )

    const result = await creditService.getBalances('user-1')
    const limit = getPlanCredits('FREELANCER')
    expect(result.subscriptionBalance).toBe(limit)
    expect(auditCreate).toHaveBeenCalled()
    const details = auditCreate.mock.calls[0][0].data.details
    expect(details.type).toBe('renewal')
    expect(details.reason).toBe('auto_renewal')
  })

  it('does not renew when renewalDate is in the future', async () => {
    const future = new Date(Date.now() + 100000)
    const auditCreate = vi.fn()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(
          makeAccount({ subscriptionBalance: 200, renewalDate: future }),
        ),
        update: vi.fn(),
      },
      auditLog: { create: auditCreate },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
    vi.mocked(db.creditAccount.findUnique).mockResolvedValue(
      makeAccount({ subscriptionBalance: 200, renewalDate: future }) as never,
    )

    const result = await creditService.getBalances('user-1')
    expect(result.subscriptionBalance).toBe(200)
    expect(fakeTx.creditAccount.update).not.toHaveBeenCalled()
    expect(auditCreate).not.toHaveBeenCalled()
  })

  it('returns zeros when account is missing', async () => {
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
    vi.mocked(db.creditAccount.findUnique).mockResolvedValue(null)

    const result = await creditService.getBalances('ghost')
    expect(result.total).toBe(0)
  })
})

describe('creditService.assignPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      user: { update: vi.fn().mockResolvedValue({}) },
      creditAccount: {
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: 0,
          rolloverBalance: 0,
          rolloverExpiresAt: null,
          renewalDate: data.renewalDate,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('updates the plan and sets subscription balance to the plan limit', async () => {
    const result = await creditService.assignPlan('user-1', 'AGENCY')

    expect(fakeTx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { plan: 'AGENCY' },
    })
    expect(result.subscriptionBalance).toBe(getPlanCredits('AGENCY'))
    expect(result.renewalDate.getTime()).toBeGreaterThan(Date.now())
  })

  it('logs an audit entry for plan assignment', async () => {
    await creditService.assignPlan('user-1', 'FREE')

    const auditCall = fakeTx.auditLog.create.mock.calls[0][0]
    expect(auditCall.data.action).toBe('CREDIT_CHANGE')
    expect(auditCall.data.details.type).toBe('plan_assignment')
    expect(auditCall.data.details.plan).toBe('FREE')
    expect(auditCall.data.details.subscriptionCredits).toBe(50)
  })
})

describe('creditService.renewSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(
          makeAccount({
            subscriptionBalance: 100,
            rolloverBalance: 200,
            rolloverExpiresAt: rolloverExpiryDate(new Date()),
            renewalDate: new Date(),
          }),
        ),
        update: vi.fn(async ({ data }) => ({
          subscriptionBalance: data.subscriptionBalance,
          bonusBalance: 0,
          rolloverBalance: data.rolloverBalance,
          rolloverExpiresAt: data.rolloverExpiresAt,
          renewalDate: data.renewalDate,
        })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('resets subscription to plan limit and carries over rollover', async () => {
    const result = await creditService.renewSubscription('user-1')

    const limit = getPlanCredits('FREELANCER')
    expect(result.subscriptionBalance).toBe(limit)
    // leftover 100 is carried into rollover (200 + 100 = 300)
    expect(result.rolloverBalance).toBe(300)
    expect(result.rolloverExpiresAt).not.toBeNull()
  })

  it('throws when the account does not exist', async () => {
    fakeTx.creditAccount.findUnique.mockResolvedValue(null)
    await expect(creditService.renewSubscription('ghost')).rejects.toThrow(
      'CreditAccount not found',
    )
  })
})

describe('creditService.getBalances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeTx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(
          makeAccount({
            subscriptionBalance: 100,
            bonusBalance: 50,
            rolloverBalance: 25,
            renewalDate: new Date(Date.now() + 100000),
          }),
        ),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    }
    vi.mocked(db.$transaction).mockImplementation(async (fn: any) => fn(fakeTx))
    vi.mocked(db.creditAccount.findUnique).mockResolvedValue(
      makeAccount({
        subscriptionBalance: 100,
        bonusBalance: 50,
        rolloverBalance: 25,
        renewalDate: new Date(Date.now() + 100000),
      }) as never,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns totals across all three pools', async () => {
    const result = await creditService.getBalances('user-1')
    expect(result.subscriptionBalance).toBe(100)
    expect(result.bonusBalance).toBe(50)
    expect(result.rolloverBalance).toBe(25)
    expect(result.total).toBe(175)
  })

  it('returns zeros when the account is missing', async () => {
    vi.mocked(db.creditAccount.findUnique).mockResolvedValue(null)
    fakeTx.creditAccount.findUnique.mockResolvedValue(null)
    const result = await creditService.getBalances('ghost')
    expect(result.total).toBe(0)
  })
})

describe('creditService.deductInTx spend order', () => {
  function makeDeductTx(accountState: {
    subscriptionBalance: number
    bonusBalance: number
    rolloverBalance: number
    rolloverExpiresAt: Date | null
  }) {
    const auditCreate = vi.fn().mockResolvedValue({})
    const update = vi.fn()
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn(async ({ include }) => {
          const row = {
            userId: 'user-1',
            renewalDate: null,
            ...accountState,
            user: include?.user ? { plan: 'FREELANCER' } : undefined,
          }
          return row
        }),
        update: vi.fn(async ({ data, select }) => {
          update({ data, select })
          const result = {
            subscriptionBalance: accountState.subscriptionBalance,
            bonusBalance: accountState.bonusBalance,
            rolloverBalance: accountState.rolloverBalance,
            rolloverExpiresAt: accountState.rolloverExpiresAt,
            renewalDate: null,
          }
          if (data.subscriptionBalance?.decrement !== undefined)
            result.subscriptionBalance -= data.subscriptionBalance.decrement
          if (data.bonusBalance?.decrement !== undefined)
            result.bonusBalance -= data.bonusBalance.decrement
          if (data.rolloverBalance?.decrement !== undefined)
            result.rolloverBalance -= data.rolloverBalance.decrement
          if (data.rolloverExpiresAt === null) result.rolloverExpiresAt = null
          return result
        }),
      },
      auditLog: { create: auditCreate },
    }
    return { tx, update, auditCreate }
  }

  it('draws rollover first, then subscription, then bonus', async () => {
    const { tx, auditCreate } = makeDeductTx({
      subscriptionBalance: 500,
      bonusBalance: 50,
      rolloverBalance: 300,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    const result = await creditService.deductInTx(tx, 'user-1', 400, 'lead_reveal')

    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(400)
    expect(result.bonusBalance).toBe(50)

    const details = auditCreate.mock.calls[0][0].data.details
    expect(details.rolloverUsed).toBe(300)
    expect(details.subscriptionUsed).toBe(100)
    expect(details.bonusUsed).toBe(0)
  })

  it('draws across all three pools correctly', async () => {
    const { tx, auditCreate } = makeDeductTx({
      subscriptionBalance: 20,
      bonusBalance: 40,
      rolloverBalance: 100,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    const result = await creditService.deductInTx(tx, 'user-1', 150, 'lead_reveal')

    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(0)
    expect(result.bonusBalance).toBe(10)

    const details = auditCreate.mock.calls[0][0].data.details
    expect(details.rolloverUsed).toBe(100)
    expect(details.subscriptionUsed).toBe(20)
    expect(details.bonusUsed).toBe(30)
  })

  it('uses only subscription/bonus when no rollover exists', async () => {
    const { tx } = makeDeductTx({
      subscriptionBalance: 500,
      bonusBalance: 100,
      rolloverBalance: 0,
      rolloverExpiresAt: null,
    })

    const result = await creditService.deductInTx(tx, 'user-1', 100, 'generate')
    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(400)
    expect(result.bonusBalance).toBe(100)
  })

  it('throws InsufficientCreditsError when total < amount', async () => {
    const { tx } = makeDeductTx({
      subscriptionBalance: 5,
      bonusBalance: 5,
      rolloverBalance: 5,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    await expect(creditService.deductInTx(tx, 'user-1', 16, 'reveal')).rejects.toThrow(
      /Insufficient credits/,
    )
  })

  it('clears rolloverExpiresAt when rollover is fully consumed', async () => {
    const { tx, update } = makeDeductTx({
      subscriptionBalance: 500,
      bonusBalance: 0,
      rolloverBalance: 50,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    await creditService.deductInTx(tx, 'user-1', 50, 'reveal')

    const updateCall = update.mock.calls[0][0]
    expect(updateCall.data.rolloverExpiresAt).toBeNull()
  })
})

describe('creditService.deduct edge cases', () => {
  it('deducts the exact rollover balance and clears expiry', async () => {
    const { deductInTx } = creditService
    const future = rolloverExpiryDate(new Date())
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(
          makeAccount({
            subscriptionBalance: 0,
            bonusBalance: 0,
            rolloverBalance: 100,
            rolloverExpiresAt: future,
            renewalDate: null,
          }),
        ),
        update: vi.fn(async ({ data }) => {
          const row = { subscriptionBalance: 0, bonusBalance: 0, rolloverBalance: 100, rolloverExpiresAt: future, renewalDate: null }
          if (data.rolloverBalance?.decrement !== undefined) row.rolloverBalance -= data.rolloverBalance.decrement
          if (data.rolloverExpiresAt === null) row.rolloverExpiresAt = null
          return row
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    }

    const result = await deductInTx(tx, 'user-1', 100, 'reveal')
    expect(result.rolloverBalance).toBe(0)
    expect(result.rolloverExpiresAt).toBeNull()
  })

  it('does not go negative when amount exceeds total', async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue([{}]),
      creditAccount: {
        findUnique: vi.fn().mockResolvedValue(
          makeAccount({ subscriptionBalance: 5, bonusBalance: 0, rolloverBalance: 0, renewalDate: null }),
        ),
        update: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    }
    await expect(creditService.deductInTx(tx, 'user-1', 10, 'reveal')).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    )
  })
})