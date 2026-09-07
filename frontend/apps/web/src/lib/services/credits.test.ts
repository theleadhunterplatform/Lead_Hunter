import { describe, it, expect, vi } from 'vitest'
import { creditService } from '@/lib/services/credits'
import { rolloverExpiryDate } from '@/lib/services/rollover'

const { deductInTx } = creditService

function makeTx(accountState: {
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
        return result
      }),
    },
    auditLog: { create: auditCreate },
  } as any

  return { tx, update, auditCreate }
}

describe('deductInTx spend order', () => {
  it('draws rollover first, then subscription, then bonus', async () => {
    const { tx, auditCreate } = makeTx({
      subscriptionBalance: 500,
      bonusBalance: 50,
      rolloverBalance: 300,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    const result = await deductInTx(tx, 'user-1', 400, 'lead_reveal')

    // 300 from rollover + 100 from subscription (bonus untouched)
    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(400)
    expect(result.bonusBalance).toBe(50)

    const details = auditCreate.mock.calls[0][0].data.details
    expect(details.rolloverUsed).toBe(300)
    expect(details.subscriptionUsed).toBe(100)
    expect(details.bonusUsed).toBe(0)
  })

  it('draws across all three pools correctly', async () => {
    const { tx, auditCreate } = makeTx({
      subscriptionBalance: 20,
      bonusBalance: 40,
      rolloverBalance: 100,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    const result = await deductInTx(tx, 'user-1', 150, 'lead_reveal')

    // 100 rollover + 20 subscription + 30 bonus
    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(0)
    expect(result.bonusBalance).toBe(10)

    const details = auditCreate.mock.calls[0][0].data.details
    expect(details.rolloverUsed).toBe(100)
    expect(details.subscriptionUsed).toBe(20)
    expect(details.bonusUsed).toBe(30)
  })

  it('uses only subscription/bonus when no rollover exists', async () => {
    const { tx } = makeTx({
      subscriptionBalance: 500,
      bonusBalance: 100,
      rolloverBalance: 0,
      rolloverExpiresAt: null,
    })

    const result = await deductInTx(tx, 'user-1', 100, 'generate')
    expect(result.rolloverBalance).toBe(0)
    expect(result.subscriptionBalance).toBe(400)
    expect(result.bonusBalance).toBe(100)
  })

  it('throws InsufficientCreditsError when rollover + subscription + bonus < amount', async () => {
    const { tx } = makeTx({
      subscriptionBalance: 5,
      bonusBalance: 5,
      rolloverBalance: 5,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    await expect(deductInTx(tx, 'user-1', 16, 'reveal')).rejects.toThrow(/Insufficient credits/)
  })

  it('clears rolloverExpiresAt when rollover is fully consumed', async () => {
    const { tx, update } = makeTx({
      subscriptionBalance: 500,
      bonusBalance: 0,
      rolloverBalance: 50,
      rolloverExpiresAt: rolloverExpiryDate(new Date()),
    })

    await deductInTx(tx, 'user-1', 50, 'reveal')

    const updateCall = update.mock.calls[0][0]
    expect(updateCall.data.rolloverExpiresAt).toBeNull()
  })
})