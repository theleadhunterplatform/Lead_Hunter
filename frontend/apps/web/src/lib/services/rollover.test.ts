import { describe, it, expect, vi } from 'vitest'
import {
  ROLLOVER_VALIDITY_DAYS,
  rolloverExpiryDate,
  expireRolloverInTx,
  rolloverOnRenewal,
} from '@/lib/services/rollover'

describe('rolloverExpiryDate', () => {
  it('adds exactly 15 days', () => {
    const from = new Date('2026-01-10T00:00:00.000Z')
    const result = rolloverExpiryDate(from)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(25)
  })
})

describe('rolloverOnRenewal', () => {
  it('carries full leftover, no cap, and refreshes expiry', () => {
    const account = {
      rolloverBalance: 0,
      rolloverExpiresAt: null as Date | null,
    }
    const result = rolloverOnRenewal(account, 300)
    expect(result.rolloverBalance).toBe(300)
    // exactly 15 days from now
    const expected = rolloverExpiryDate(new Date())
    expect(result.rolloverExpiresAt?.getTime()).toBeCloseTo(expected.getTime(), -2)
  })

  it('adds leftover onto existing active rollover', () => {
    const future = rolloverExpiryDate(new Date())
    const account = {
      rolloverBalance: 100,
      rolloverExpiresAt: future,
    }
    const result = rolloverOnRenewal(account, 200)
    expect(result.rolloverBalance).toBe(300)
  })

  it('does not carry anything when leftover is 0', () => {
    const result = rolloverOnRenewal({ rolloverBalance: 0, rolloverExpiresAt: null }, 0)
    expect(result.rolloverBalance).toBe(0)
    expect(result.rolloverExpiresAt).toBeNull()
  })

  it('zeroes expired rollover before carrying new leftover', () => {
    const past = new Date(Date.now() - 1000)
    const account = {
      rolloverBalance: 500,
      rolloverExpiresAt: past,
    }
    const result = rolloverOnRenewal(account, 80)
    // old expired rollover dropped, only new leftover carried
    expect(result.rolloverBalance).toBe(80)
  })
})

describe('expireRolloverInTx', () => {
  it('zeroes and audits an expired rollover', async () => {
    const update = vi.fn().mockResolvedValue({})
    const auditCreate = vi.fn().mockResolvedValue({})
    const tx = {
      creditAccount: { update },
      auditLog: { create: auditCreate },
    } as any

    const past = new Date(Date.now() - 1000)
    const expired = await expireRolloverInTx(tx, 'user-1', {
      rolloverBalance: 250,
      rolloverExpiresAt: past,
    })

    expect(expired).toBe(true)
    expect(update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { rolloverBalance: 0, rolloverExpiresAt: null },
    })
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREDIT_CHANGE',
          details: expect.objectContaining({
            type: 'rollover_expired',
            amount: 250,
          }),
        }),
      }),
    )
  })

  it('does nothing when rollover is not expired', async () => {
    const update = vi.fn()
    const auditCreate = vi.fn()
    const tx = {
      creditAccount: { update },
      auditLog: { create: auditCreate },
    } as any

    const future = rolloverExpiryDate(new Date())
    const expired = await expireRolloverInTx(tx, 'user-1', {
      rolloverBalance: 100,
      rolloverExpiresAt: future,
    })

    expect(expired).toBe(false)
    expect(update).not.toHaveBeenCalled()
    expect(auditCreate).not.toHaveBeenCalled()
  })
})